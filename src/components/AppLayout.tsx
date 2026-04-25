import { NavLink, useNavigate } from "react-router-dom";
import { Calendar, BookOpen, Trophy, Gift, Settings, Download, ChevronRight } from "lucide-react";
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
  const { workspace, profile, role } = useAuth();
  const navigate = useNavigate();
  const initial = (workspace?.name?.[0] ?? "D").toUpperCase();

  const isManager = role === "manager";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sidebar-foreground truncate">{workspace?.name ?? "DailyAI"}</div>
            <div className="text-xs text-sidebar-foreground/70 truncate">Build the AI habit</div>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-2 flex flex-col">
          <div className="space-y-1">
            {baseNav.map(({ to, label, icon: Icon }) => (
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
          </div>
          <div className="mt-auto pb-3 space-y-3">
            <Button className="w-full rounded-full gap-2 shadow-md" onClick={() => navigate("/today")}>
              <Download className="h-4 w-4" /> Get extension
            </Button>
            {isManager && (
              <NavLink
                to="/manage"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  }`
                }
              >
                <Settings className="h-5 w-5" />
                Manage
              </NavLink>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => navigate("/account")}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent/60 transition-colors text-left group"
            aria-label="Open account settings"
          >
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
              {(profile?.full_name?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name ?? profile?.email}
              </div>
              <div className="text-xs text-sidebar-foreground/70 capitalize truncate">
                {role} · 🌑 {profile?.coins_balance ?? 0}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-foreground shrink-0" />
          </button>
        </div>
      </aside>

      <main className="flex-1 relative">
        <div className="px-10 py-12 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
