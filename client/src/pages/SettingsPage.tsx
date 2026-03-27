import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { 
  ArrowLeft, 
  LogOut, 
  Save,
  User,
  Mail,
  Building2,
  Lock,
  Bell,
  Shield,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs();
  
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    institution: user?.institution || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    contentNotifications: true,
    analyticsNotifications: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; institution?: string }) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PUT", "/api/profile/password", data);
      return await res.json();
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      fullName: profileData.fullName,
      institution: profileData.institution || undefined,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || "",
        email: user.email || "",
        institution: user.institution || "",
      });
    }
  }, [user]);

  const isOAuthUser = user?.authProvider && user.authProvider !== "email";

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="border-b border-border/40 bg-card sticky top-0 z-50" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="OECS Content Creator Logo" 
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">OECS Content Creator</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout" aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12" role="main">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Information */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center gap-6 pb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {user ? getInitials(user.fullName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{user?.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {user?.role && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-muted rounded">
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="mt-2 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed. Contact support if you need to update your email.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="institution" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Institution
                    </Label>
                    <Input
                      id="institution"
                      value={profileData.institution}
                      onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                      className="mt-2"
                      placeholder="Your school or organization"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="min-w-32"
                  >
                    {updateProfileMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change */}
          {!isOAuthUser && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="mt-2"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="min-w-32"
                    >
                      {changePasswordMutation.isPending ? (
                        "Changing..."
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Manage your notification and display preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your content and students
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="contentNotifications">Content Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when students interact with your content
                    </p>
                  </div>
                  <Switch
                    id="contentNotifications"
                    checked={preferences.contentNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, contentNotifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analyticsNotifications">Analytics Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your content performance
                    </p>
                  </div>
                  <Switch
                    id="analyticsNotifications"
                    checked={preferences.analyticsNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, analyticsNotifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your account security settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">Authentication Method</h4>
                    <p className="text-sm text-muted-foreground">
                      {isOAuthUser 
                        ? `Signed in with ${user?.authProvider === "google" ? "Google" : "Microsoft"}`
                        : "Email and Password"
                      }
                    </p>
                  </div>
                  {isOAuthUser && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      OAuth
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">Account Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-border/40 shadow-sm border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. This will permanently delete all your content, classes, and data.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure? This action cannot be undone. This will permanently delete your account, 
              all your content, classes, student data, and remove all of your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                // TODO: Implement account deletion
                toast({
                  title: "Account deletion",
                  description: "Account deletion is not yet implemented. Please contact support.",
                  variant: "destructive",
                });
                setShowDeleteDialog(false);
              }}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

