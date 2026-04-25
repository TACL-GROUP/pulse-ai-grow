import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, BookOpen, Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="px-8 py-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">D</div>
          <div className="font-bold text-lg">DailyAI</div>
        </div>
        <Link to="/auth">
          <Button className="rounded-full">{user ? "Go to dashboard" : "Sign in"}</Button>
        </Link>
      </header>
      <main className="max-w-4xl mx-auto px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" /> Build the AI habit
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Help your team <span className="text-primary">adopt AI</span>, every day.
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          DailyAI motivates employees across departments to use AI through tasks, coins,
          streaks, leaderboards, and real rewards.
        </p>
        <Link to="/auth">
          <Button size="lg" className="rounded-full px-8">
            {user ? "Open your workspace" : "Create your workspace"}
          </Button>
        </Link>

        <div className="grid md:grid-cols-3 gap-4 mt-20 text-left">
          {[
            { icon: BookOpen, title: "Task library", desc: "Curated AI tasks per department" },
            { icon: Trophy, title: "Leaderboard", desc: "See top adopters in real time" },
            { icon: Gift, title: "Real rewards", desc: "Redeem coins for perks" },
          ].map((f) => (
            <Card key={f.title} className="p-6 rounded-3xl border-0 shadow-sm">
              <f.icon className="h-7 w-7 text-primary mb-3" />
              <div className="font-semibold mb-1">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
