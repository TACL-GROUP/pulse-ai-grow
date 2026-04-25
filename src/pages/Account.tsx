import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Save } from "lucide-react";

const DEPARTMENTS = ["All", "Finance", "Sales", "Legal", "HR", "Engineering"];

export default function Account() {
  const { user, profile, workspace, role, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState<string>("All");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setDepartment(profile.department ?? "All");
    }
  }, [profile]);

  const initial = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase();

  const saveProfile = async () => {
    if (!profile) return;
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim().slice(0, 100), department })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refreshProfile();
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AppLayout>
      <h1 className="text-4xl font-bold mb-2">Account</h1>
      <p className="text-muted-foreground mb-8">Manage your personal profile and security.</p>

      <div className="space-y-6 max-w-2xl">
        {/* Profile header card */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg truncate">{profile?.full_name || profile?.email}</div>
            <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
            <div className="text-xs mt-1">
              <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary capitalize">{role}</span>
              <span className="ml-2 text-muted-foreground">in {workspace?.name}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="text-coin font-bold">🌑 {profile?.coins_balance ?? 0}</div>
          </div>
        </Card>

        {/* Profile form */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm space-y-4">
          <h2 className="font-bold text-lg">Profile</h2>
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="rounded-full gap-2">
            <Save className="h-4 w-4" /> {savingProfile ? "Saving…" : "Save changes"}
          </Button>
        </Card>

        {/* Password */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm space-y-4">
          <h2 className="font-bold text-lg">Change password</h2>
          <div>
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={savePassword} disabled={savingPassword} variant="outline" className="rounded-full">
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </Card>

        {/* Sign out */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm flex items-center justify-between">
          <div>
            <div className="font-semibold">Sign out</div>
            <div className="text-sm text-muted-foreground">End your current session on this device.</div>
          </div>
          <Button variant="outline" className="rounded-full gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
