import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const DAILY_GOAL = 100;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Today() {
  const { profile, refreshProfile } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [todayCoins, setTodayCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [last14, setLast14] = useState<boolean[]>(Array(14).fill(false));

  useEffect(() => {
    refreshProfile();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    if (!profile) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const fourteenAgo = new Date(); fourteenAgo.setDate(fourteenAgo.getDate() - 14); fourteenAgo.setHours(0,0,0,0);

    const { data } = await supabase
      .from("task_completions")
      .select("status, coins_awarded, reviewed_at, created_at")
      .eq("user_id", profile.id)
      .eq("status", "approved")
      .gte("reviewed_at", fourteenAgo.toISOString());

    const approved = data ?? [];
    const today = approved.filter((c) => new Date(c.reviewed_at!) >= start);
    setTodayCount(today.length);
    setTodayCoins(today.reduce((s, c) => s + (c.coins_awarded || 0), 0));

    // streak: consecutive days with at least 1 approved completion
    const days: boolean[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      days.push(approved.some((c) => {
        const t = new Date(c.reviewed_at!);
        return t >= d && t < next;
      }));
    }
    setLast14(days);
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i]) s++;
      else break;
    }
    setStreak(s);
  };

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const pct = Math.min(100, (todayCoins / DAILY_GOAL) * 100);

  return (
    <AppLayout>
      <div className="flex items-start justify-between mb-10 gap-6 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold mb-2">{greeting}, {firstName} 👋</h1>
          <p className="text-muted-foreground">
            {todayCount} tasks completed today · <span className="text-coin font-medium">🌑 {todayCoins} coins earned</span>
          </p>
        </div>
        <Card className="rounded-full px-7 py-4 shadow-md border-0">
          <div className="text-xs tracking-wider text-muted-foreground font-medium">TODAY</div>
          <div className="text-coin font-bold text-lg">🌑 {todayCoins} / {DAILY_GOAL} coins</div>
        </Card>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Daily progress</span>
          <span className="text-sm text-muted-foreground">{todayCount}/{DAILY_GOAL/10} tasks done</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Card className="p-6 rounded-3xl shadow-sm border-0 bg-card">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-streak/10 flex items-center justify-center text-2xl">🔥</div>
          <div className="flex-1">
            <div className="font-semibold text-lg">
              🔥 You're on a {streak}-day streak — keep it up!
            </div>
            <div className="text-sm text-muted-foreground">Last 14 days</div>
            <div className="flex gap-1.5 mt-3">
              {last14.map((on, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${on ? "bg-streak" : "bg-muted"}`}
                  title={on ? "Active" : "No activity"}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
