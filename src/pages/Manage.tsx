import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Mail, Coins } from "lucide-react";

const DEPARTMENTS = ["All", "Finance", "Sales", "Legal", "HR", "Engineering"];

export default function Manage() {
  return (
    <AppLayout>
      <h1 className="text-4xl font-bold mb-2">Manage workspace</h1>
      <p className="text-muted-foreground mb-8">Add tasks, rewards, members, and review submissions.</p>
      <Tabs defaultValue="approvals">
        <TabsList className="rounded-full bg-muted p-1 h-auto">
          <TabsTrigger value="approvals" className="rounded-full">Approvals</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-full">Tasks</TabsTrigger>
          <TabsTrigger value="rewards" className="rounded-full">Rewards</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="mt-6"><ApprovalsTab /></TabsContent>
        <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
        <TabsContent value="rewards" className="mt-6"><RewardsTab /></TabsContent>
        <TabsContent value="members" className="mt-6"><MembersTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- APPROVALS ---------------- */
function ApprovalsTab() {
  const [completions, setCompletions] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);

  const load = async () => {
    const { data: c } = await supabase
      .from("task_completions")
      .select("id, note, created_at, user_id, task_id, tasks(title, coin_value), profiles!task_completions_user_id_fkey(full_name, email)")
      .eq("status", "pending")
      .order("created_at");
    setCompletions(c ?? []);

    const { data: r } = await supabase
      .from("reward_redemptions")
      .select("id, coin_cost, created_at, user_id, rewards(name, emoji), profiles!reward_redemptions_user_id_fkey(full_name, email)")
      .eq("status", "pending")
      .order("created_at");
    setRedemptions(r ?? []);
  };
  useEffect(() => { load(); }, []);

  const reviewCompletion = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc(approve ? "approve_completion" : "reject_completion", { _completion_id: id });
    if (error) toast.error(error.message);
    else { toast.success(approve ? "Approved!" : "Rejected"); load(); }
  };
  const reviewRedemption = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc(approve ? "approve_redemption" : "reject_redemption", { _redemption_id: id });
    if (error) toast.error(error.message);
    else { toast.success(approve ? "Approved!" : "Rejected & refunded"); load(); }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-bold text-lg mb-3">Task completions ({completions.length})</h3>
        {completions.length === 0 ? (
          <Card className="p-6 text-muted-foreground rounded-2xl border-0 shadow-sm">No pending submissions.</Card>
        ) : completions.map((c) => (
          <Card key={c.id} className="p-5 mb-3 rounded-2xl border-0 shadow-sm">
            <div className="flex justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">{c.tasks?.title}</div>
                <div className="text-sm text-muted-foreground">
                  By {c.profiles?.full_name || c.profiles?.email} · 🌑 {c.tasks?.coin_value}
                </div>
                {c.note && <div className="text-sm mt-2 italic">"{c.note}"</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reviewCompletion(c.id, false)}>Reject</Button>
                <Button size="sm" onClick={() => reviewCompletion(c.id, true)}>Approve</Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <h3 className="font-bold text-lg mb-3">Reward requests ({redemptions.length})</h3>
        {redemptions.length === 0 ? (
          <Card className="p-6 text-muted-foreground rounded-2xl border-0 shadow-sm">No pending requests.</Card>
        ) : redemptions.map((r) => (
          <Card key={r.id} className="p-5 mb-3 rounded-2xl border-0 shadow-sm">
            <div className="flex justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">{r.rewards?.emoji} {r.rewards?.name}</div>
                <div className="text-sm text-muted-foreground">
                  By {r.profiles?.full_name || r.profiles?.email} · 🌑 {r.coin_cost}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reviewRedemption(r.id, false)}>Reject (refund)</Button>
                <Button size="sm" onClick={() => reviewRedemption(r.id, true)}>Approve</Button>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

/* ---------------- TASKS ---------------- */
function TasksTab() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", department: "All", coin_value: 10 });

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!profile || !form.title) return;
    const { error } = await supabase.from("tasks").insert({
      ...form,
      workspace_id: profile.workspace_id,
      created_by: profile.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    setOpen(false); setForm({ title: "", description: "", department: "All", coin_value: 10 }); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4 rounded-full"><Plus className="h-4 w-4" /> New task</Button>
        </DialogTrigger>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>New AI task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Coin value</Label><Input type="number" min={0} value={form.coin_value} onChange={(e) => setForm({ ...form, coin_value: parseInt(e.target.value || "0", 10) })} /></div>
            <Button onClick={create} className="w-full rounded-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
      {tasks.length === 0 ? (
        <Card className="p-6 text-muted-foreground rounded-2xl border-0 shadow-sm">No tasks yet.</Card>
      ) : tasks.map((t) => (
        <Card key={t.id} className="p-4 mb-3 rounded-2xl border-0 shadow-sm flex justify-between gap-4 items-center">
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{t.title}</div>
            <div className="text-sm text-muted-foreground truncate">{t.description}</div>
            <div className="text-xs mt-1">
              <span className="px-2 py-0.5 bg-primary-soft text-primary rounded-full mr-2">{t.department}</span>
              <span className="text-coin font-medium">🌑 {t.coin_value}</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- REWARDS ---------------- */
function RewardsTab() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", emoji: "🎁", coin_cost: 100 });

  const load = async () => {
    const { data } = await supabase.from("rewards").select("*").order("coin_cost");
    setRewards(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!profile || !form.name || form.coin_cost <= 0) return;
    const { error } = await supabase.from("rewards").insert({
      ...form, workspace_id: profile.workspace_id, created_by: profile.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Reward added"); setOpen(false);
    setForm({ name: "", description: "", emoji: "🎁", coin_cost: 100 }); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this reward?")) return;
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4 rounded-full"><Plus className="h-4 w-4" /> New reward</Button>
        </DialogTrigger>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>New reward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Emoji</Label><Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Coin cost</Label><Input type="number" min={1} value={form.coin_cost} onChange={(e) => setForm({ ...form, coin_cost: parseInt(e.target.value || "1", 10) })} /></div>
            <Button onClick={create} className="w-full rounded-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
      {rewards.length === 0 ? (
        <Card className="p-6 text-muted-foreground rounded-2xl border-0 shadow-sm">No rewards yet.</Card>
      ) : rewards.map((r) => (
        <Card key={r.id} className="p-4 mb-3 rounded-2xl border-0 shadow-sm flex justify-between gap-4 items-center">
          <div className="flex-1 flex gap-3 items-center">
            <div className="text-2xl">{r.emoji}</div>
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted-foreground">{r.description}</div>
              <div className="text-coin text-sm font-medium">🌑 {r.coin_cost}</div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- MEMBERS ---------------- */
function MembersTab() {
  const { profile, user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data: profs } = await supabase
      .from("profiles").select("*").eq("workspace_id", profile.workspace_id);
    const { data: roles } = await supabase
      .from("user_roles").select("user_id, role").eq("workspace_id", profile.workspace_id);
    const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    setMembers((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) || "user" })));

    const { data: inv } = await supabase
      .from("invitations").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setInvitations(inv ?? []);
  };
  useEffect(() => { load(); }, [profile]);

  const invite = async () => {
    if (!email) return;
    setSending(true); setLastLink(null);
    const { data, error } = await supabase.functions.invoke("send-invitation", { body: { email } });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    setLastLink((data as any)?.invite_link ?? null);
    toast.success("Invitation created — share the link with your colleague");
    setEmail(""); load();
  };

  const removeMember = async (id: string) => {
    if (id === user?.id) { toast.error("You can't remove yourself"); return; }
    if (!confirm("Remove this member from the workspace?")) return;
    // delete role first; cascade will leave profile but they'll be locked out via RLS
    const { error: e1 } = await supabase.from("user_roles").delete().eq("user_id", id).eq("workspace_id", profile!.workspace_id);
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("profiles").delete().eq("id", id);
    if (e2) toast.error(e2.message); else { toast.success("Member removed"); load(); }
  };

  const cancelInv = async (id: string) => {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Invitation cancelled"); load(); }
  };

  return (
    <div className="space-y-8">
      <Card className="p-5 rounded-2xl border-0 shadow-sm">
        <h3 className="font-bold mb-3">Invite a colleague</h3>
        <div className="flex gap-2">
          <Input type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={invite} disabled={sending} className="rounded-full gap-2">
            <Mail className="h-4 w-4" /> {sending ? "…" : "Invite"}
          </Button>
        </div>
        {lastLink && (
          <div className="mt-3 p-3 bg-primary-soft rounded-xl text-sm">
            <div className="font-medium text-primary mb-1">Invitation link (share via email):</div>
            <div className="break-all text-xs font-mono">{lastLink}</div>
          </div>
        )}
      </Card>

      <section>
        <h3 className="font-bold mb-3">Pending invitations ({invitations.length})</h3>
        {invitations.map((i) => (
          <Card key={i.id} className="p-3 mb-2 rounded-xl border-0 shadow-sm flex justify-between items-center">
            <span>{i.email}</span>
            <Button size="sm" variant="ghost" onClick={() => cancelInv(i.id)}>Cancel</Button>
          </Card>
        ))}
        {invitations.length === 0 && <p className="text-muted-foreground text-sm">No pending invitations.</p>}
      </section>

      <section>
        <h3 className="font-bold mb-3">Members ({members.length})</h3>
        {members.map((m) => (
          <Card key={m.id} className="p-4 mb-2 rounded-xl border-0 shadow-sm flex justify-between items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{m.full_name || m.email}</div>
              <div className="text-xs text-muted-foreground truncate">
                {m.email} · {m.department || "no dept"} · <span className="text-primary capitalize">{m.role}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-coin whitespace-nowrap">🌑 {m.coins_balance ?? 0}</span>
              <AdjustCoinsDialog member={m} onDone={load} />
              {m.id !== user?.id && (
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

/* ---------------- ADJUST COINS DIALOG ---------------- */
function AdjustCoinsDialog({ member, onDone }: { member: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState<number>(10);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("coin_adjustments")
      .select("id, amount, reason, created_at, adjusted_by")
      .eq("user_id", member.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(data ?? []);
  };

  useEffect(() => {
    if (open) {
      loadHistory();
      setMode("add");
      setAmount(10);
      setReason("");
    }
  }, [open]);

  const submit = async () => {
    if (!amount || amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setSubmitting(true);
    const signedAmount = mode === "add" ? amount : -amount;
    const { error } = await supabase.rpc("adjust_user_coins", {
      _user_id: member.id,
      _amount: signedAmount,
      _reason: reason || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "add" ? `+${amount} coins added` : `−${amount} coins removed`);
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-1">
          <Coins className="h-4 w-4" /> Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Adjust wallet — {member.full_name || member.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-primary-soft rounded-xl text-sm">
            Current balance: <span className="font-semibold text-coin">🌑 {member.coins_balance ?? 0}</span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              className="flex-1 rounded-full"
              onClick={() => setMode("add")}
            >
              + Add
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "default" : "outline"}
              className="flex-1 rounded-full"
              onClick={() => setMode("remove")}
            >
              − Remove
            </Button>
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
            />
          </div>

          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Bonus for great work"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full rounded-full">
            {submitting ? "Saving…" : mode === "add" ? `Add ${amount} coins` : `Remove ${amount} coins`}
          </Button>

          {history.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Recent adjustments</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex justify-between text-xs p-2 bg-muted rounded-lg">
                    <span className={h.amount > 0 ? "text-coin font-medium" : "text-destructive font-medium"}>
                      {h.amount > 0 ? "+" : ""}{h.amount} 🌑
                    </span>
                    <span className="text-muted-foreground truncate ml-2">
                      {h.reason || "—"} · {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
