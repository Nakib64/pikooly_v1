import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Save } from "lucide-react";
import { logAdminActivity } from "@/lib/activityLog";

const AdminAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailLoading(false);
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      await logAdminActivity({
        action: "email_change",
        userId: user?.id,
        userEmail: user?.email,
        description: `Requested email change to ${newEmail.trim()}`,
      });
      toast({
        title: "Confirmation Email Sent",
        description: `A confirmation link has been sent to ${newEmail}. Please confirm to complete the change.`,
      });
      setNewEmail("");
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }

    setPwLoading(true);
    // Verify current password by attempting re-auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setPwLoading(false);
      toast({ title: "Incorrect Password", description: "Your current password is wrong.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      await logAdminActivity({
        action: "password_change",
        userId: user?.id,
        userEmail: user?.email,
        description: "Admin password updated",
      });
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your admin login email and password.
        </p>
      </div>

      {/* Current Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Account</CardTitle>
          <CardDescription>Logged in as</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Change Email
          </CardTitle>
          <CardDescription>
            A confirmation link will be sent to the new email. The change is applied after confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="newadmin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={emailLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {emailLoading ? "Sending..." : "Update Email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" /> Change Password
          </CardTitle>
          <CardDescription>Use a strong password (minimum 6 characters).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={pwLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {pwLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccount;
