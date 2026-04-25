import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, managerOnly }: { children: ReactNode; managerOnly?: boolean }) {
  const { user, loading, role } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (managerOnly && role !== "manager") return <Navigate to="/today" replace />;
  return <>{children}</>;
}
