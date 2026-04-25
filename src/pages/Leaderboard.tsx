import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";

interface Row {
  user_id: string;
  full_name: string;
  department: string | null;
  coins: number;
  tasks: number;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [depts, setDepts] = useState<{ name: string; coins: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) load(); }, [profile]);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email, department")
      .eq("workspace_id", profile.workspace_id);

    const { data: comps } = await supabase
      .from("task_completions")
      .select("user_id, coins_awarded")
      .eq("workspace_id", profile.workspace_id)
      .eq("status", "approved")
      .gte("reviewed_at", monthStart.toISOString());

    const map = new Map<string, Row>();
    (profs ?? []).forEach((p) => {
      map.set(p.id, {
        user_id: p.id,
        full_name: p.full_name || p.email,
        department: p.department,
        coins: 0,
        tasks: 0,
      });
    });
    (comps ?? []).forEach((c) => {
      const r = map.get(c.user_id);
      if (r) { r.coins += c.coins_awarded || 0; r.tasks += 1; }
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.coins - a.coins);
    setRows(sorted);

    const dmap = new Map<string, number>();
    sorted.forEach((r) => {
      const k = r.department || "Unassigned";
      dmap.set(k, (dmap.get(k) || 0) + r.coins);
    });
    setDepts(Array.from(dmap.entries())
      .map(([name, coins]) => ({ name, coins }))
      .sort((a, b) => b.coins - a.coins));
    setLoading(false);
  };

  return (
    <AppLayout>
      <h1 className="text-4xl font-bold mb-2">This month's top AI adopters</h1>
      <p className="text-muted-foreground mb-8">Updated in real time.</p>

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_120px_120px] px-6 py-4 text-xs tracking-wider text-muted-foreground font-bold border-b">
          <div>RANK</div>
          <div>NAME</div>
          <div>DEPARTMENT</div>
          <div className="text-right">🌑 COINS</div>
          <div className="text-right">TASKS DONE</div>
        </div>
        {loading ? (
          <div className="p-6 text-muted-foreground">Loading…</div>
        ) : rows.length === 0 || rows.every((r) => r.coins === 0) ? (
          <div className="p-10 text-center text-muted-foreground">No data yet this month.</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.user_id} className="grid grid-cols-[60px_1fr_1fr_120px_120px] px-6 py-4 border-b last:border-0 items-center">
              <div className="font-bold text-primary">#{i + 1}</div>
              <div className="font-medium">{r.full_name}</div>
              <div className="text-muted-foreground">{r.department || "—"}</div>
              <div className="text-right text-coin font-semibold">🌑 {r.coins}</div>
              <div className="text-right">{r.tasks}</div>
            </div>
          ))
        )}
      </Card>

      <Card className="mt-8 p-6 rounded-3xl border-0 shadow-sm">
        <h2 className="font-bold text-lg mb-4">Top departments this month</h2>
        {depts.length === 0 || depts.every((d) => d.coins === 0) ? (
          <p className="text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {depts.map((d) => (
              <div key={d.name} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{d.name}</span>
                <span className="text-coin font-bold">🌑 {d.coins}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
