import { NavLink, useNavigate } from "react-router-dom";
import { Calendar, BookOpen, Trophy, Gift, Settings, LogOut, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

const baseNav = [
  { to: "/today", label: "Today", icon: Calendar },
  { to: "/library", label: "Task Library", icon: BookOpen },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/rewards", label: "Rewards", icon: Gift },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { workspace, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (workspace?.name?.[0] ?? "D").toUpperCase();

  const nav = role === "manager"
    ? [...baseNav, { to: "/manage", label: "Manage", icon: Settings }]
    : baseNav;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sidebar-foreground truncate">{workspace?.name ?? "DailyAI"}</div>
            <div className="text-xs text-sidebar-foreground/70 truncate">Build the AI habit</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-2 py-1 text-xs text-sidebar-foreground/70 truncate">
            {profile?.full_name ?? profile?.email}
            <span className="ml-1 capitalize text-primary">· {role}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 relative">
        <div className="absolute top-6 right-8">
          <Button className="rounded-full gap-2 shadow-md" onClick={() => navigate("/today")}>
            <Download className="h-4 w-4" /> Get extension
          </Button>
        </div>
        <div className="px-10 py-12 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
