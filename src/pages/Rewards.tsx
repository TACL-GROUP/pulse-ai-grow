import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  coin_cost: number;
}

export default function Rewards() {
  const { profile, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rewards").select("*").eq("is_active", true).order("coin_cost");
    setRewards((data as Reward[]) ?? []);
    setLoading(false);
  };

  const redeem = async (r: Reward) => {
    setRedeeming(r.id);
    const { error } = await supabase.rpc("redeem_reward", { _reward_id: r.id });
    setRedeeming(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Requested ${r.name}! Awaiting manager approval.`);
    refreshProfile();
  };

  return (
    <AppLayout>
      <div className="flex items-start justify-between mb-8 gap-6 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold mb-2">Spend your coins 🌑</h1>
          <p className="text-muted-foreground">Redeem for real perks. Requests go to your manager for approval.</p>
        </div>
        <Card className="rounded-full px-7 py-4 shadow-md border-0">
          <div className="text-xs tracking-wider text-muted-foreground font-medium">YOUR BALANCE</div>
          <div className="text-coin font-bold text-lg">🌑 {profile?.coins_balance ?? 0}</div>
        </Card>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rewards.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground rounded-3xl border-0 shadow-sm">
          No rewards available yet. Ask your manager to add some.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => {
            const canAfford = (profile?.coins_balance ?? 0) >= r.coin_cost;
            return (
              <Card key={r.id} className="p-6 rounded-3xl border-0 shadow-sm">
                <div className="text-4xl mb-3">{r.emoji || "🎁"}</div>
                <h3 className="font-semibold mb-1">{r.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">{r.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-coin font-bold">🌑 {r.coin_cost}</span>
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={!canAfford || redeeming === r.id}
                    onClick={() => redeem(r)}
                  >
                    {redeeming === r.id ? "…" : canAfford ? "Redeem" : "Not enough"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
