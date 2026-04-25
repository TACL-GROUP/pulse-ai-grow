import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const DEPARTMENTS = ["All", "Finance", "Sales", "Legal", "HR", "Engineering"];

interface Task {
  id: string;
  title: string;
  description: string | null;
  department: string;
  coin_value: number;
}

export default function Library() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState("All");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Task | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  };

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.department === filter);

  const submit = async () => {
    if (!active || !profile) return;
    setSubmitting(true);
    const { error } = await supabase.from("task_completions").insert({
      task_id: active.id,
      user_id: profile.id,
      workspace_id: profile.workspace_id,
      note: note || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Submitted! Awaiting manager approval.");
    setActive(null); setNote("");
  };

  return (
    <AppLayout>
      <h1 className="text-4xl font-bold mb-2">AI Task Library</h1>
      <p className="text-muted-foreground mb-6">Browse all tasks. New tasks added every week.</p>

      <div className="flex gap-2 mb-8 flex-wrap">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              filter === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground rounded-3xl border-0 shadow-sm">
          No tasks yet. {filter !== "All" && <>Try another department, or </>}
          ask your manager to add some in the Manage section.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-6 rounded-3xl border-0 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => setActive(t)}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold">{t.title}</h3>
                <span className="text-coin font-bold whitespace-nowrap">🌑 {t.coin_value}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
              <div className="text-xs px-2.5 py-1 bg-primary-soft text-primary rounded-full inline-block font-medium">
                {t.department}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{active?.description}</p>
          <div className="text-coin font-bold">🌑 {active?.coin_value} coins on approval</div>
          <Textarea
            placeholder="Add a note for your manager (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl"
          />
          <Button onClick={submit} disabled={submitting} className="rounded-full">
            {submitting ? "Submitting…" : "Mark as done & submit"}
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
