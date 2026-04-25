import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const inviteEmail = params.get("email");
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(inviteToken ? "signup" : "signin");
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/today", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/today`,
            data: {
              full_name: fullName,
              workspace_name: workspaceName || `${fullName || email}'s workspace`,
              department: department || null,
              invitation_token: inviteToken || null,
            },
          },
        });
        if (error) throw error;
        toast.success(inviteToken ? "Welcome aboard!" : "Workspace created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 rounded-3xl shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary text-primary-foreground items-center justify-center font-bold text-xl mb-3">
            D
          </div>
          <h1 className="text-2xl font-bold">DailyAI</h1>
          <p className="text-sm text-muted-foreground">Build the AI habit</p>
        </div>

        {inviteToken && (
          <div className="mb-5 p-3 rounded-xl bg-primary-soft text-primary text-sm text-center font-medium">
            🎉 You've been invited to join a workspace
          </div>
        )}

        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-full">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              {!inviteToken && (
                <div>
                  <Label htmlFor="ws">Company / workspace name</Label>
                  <Input id="ws" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme Inc." />
                </div>
              )}
              <div>
                <Label htmlFor="dep">Department (optional)</Label>
                <Input id="dep" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Sales, Engineering…" />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={!!inviteEmail} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {mode === "signup" && !inviteToken && "Signing up creates a new workspace where you'll be the manager."}
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back home</Link>
        </div>
      </Card>
    </div>
  );
}
