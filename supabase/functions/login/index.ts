import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sys-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Schéma de validation strict des entrées
const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Email invalide' }).max(255),
  password: z.string().min(6, { message: 'Mot de passe trop court' }).max(128),
});

// Rate limiting basique en mémoire (par IP) — 5 tentatives / 60s
const attempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Vérification du jeton système (SYS_TOKEN) — authentifie l'appelant de la requête
    const sysToken = Deno.env.get('SYS_TOKEN');
    if (!sysToken) {
      return json({ error: 'Server misconfigured: SYS_TOKEN missing' }, 500);
    }
    const provided =
      req.headers.get('x-sys-token') ??
      req.headers.get('X-Sys-Token') ??
      '';
    // Comparaison à temps constant pour éviter les timing attacks
    const a = new TextEncoder().encode(provided);
    const b = new TextEncoder().encode(sysToken);
    let equal = a.length === b.length;
    const len = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    equal = diff === 0;
    if (!equal) {
      return json({ error: 'Invalid system token' }, 401);
    }

    // Rate limit par IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('cf-connecting-ip') ??
      'unknown';
    if (!checkRateLimit(ip)) {
      return json({ error: 'Trop de tentatives, réessaie dans une minute.' }, 429);
    }

    // Parse + validation des entrées
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: 'Corps JSON invalide' }, 400);
    }
    const parsed = LoginSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'Entrées invalides', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, password } = parsed.data;

    // Authentification via Supabase Auth (utilise l'anon key)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon =
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;

    const client = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      // Message générique pour ne pas révéler si l'email existe
      return json({ error: 'Identifiants invalides' }, 401);
    }

    const { session, user } = data;

    // Réponse : token inclus dans le body ET dans un header Authorization
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };

    return new Response(
      JSON.stringify({
        success: true,
        token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        user: {
          id: user.id,
          email: user.email,
        },
      }),
      { status: 200, headers: responseHeaders },
    );
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
