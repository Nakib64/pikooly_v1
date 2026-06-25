"use client";
import { useEffect } from "react";
import { useNavigate, Link } from "@/lib/router-adapter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, HelpCircle, FileText, Shield, Share2, Store } from "lucide-react";
import { useSeller } from "@/hooks/useSeller";
import { toast } from "sonner";
import { AccountSkeleton } from "@/components/ui/skeletons";
import ProfileHeader from "@/components/account/ProfileHeader";
import AccountStats from "@/components/account/AccountStats";
import RecentOrders from "@/components/account/RecentOrders";
import SavedAddresses from "@/components/account/SavedAddresses";
import WishlistSection from "@/components/account/WishlistSection";
import WalletSection from "@/components/account/WalletSection";
import LoyaltyRewardsSection from "@/components/account/LoyaltyRewardsSection";
import ReduceMotionToggle from "@/components/account/ReduceMotionToggle";
import SEOHead from "@/components/seo/SEOHead";

const Account = () => {
  const { user, loading, signOut } = useAuth();
  const { seller } = useSeller();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleSaveProfile = async (name: string, phone: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, phone: phone || null })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["checkout-profile"] });
    toast.success("Profile updated!");
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading || !user) return <AccountSkeleton />;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const totalSpent = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);

  const quickLinks = [
    ...(seller && seller.is_active
      ? [{ icon: Store, label: "Seller Dashboard", href: "/seller/dashboard" }]
      : []),
    { icon: Share2, label: "Affiliate", href: "/affiliate" },
    { icon: FileText, label: "Track Order", href: "/track-order" },
    { icon: HelpCircle, label: "Contact Us", href: "/contact-us" },
    { icon: Shield, label: "About Us", href: "/about-us" },
  ];

  return (
    <main className="section-container py-4 sm:py-6 pb-6 md:pb-10 space-y-4 sm:space-y-5">
      <SEOHead title="My Account — Pikooly" description="Manage your Pikooly account, orders, addresses, wishlist and wallet balance." noindex />
      {/* Profile Header with Avatar */}
      <ProfileHeader
        userId={user.id}
        displayName={displayName}
        email={user.email || ""}
        phone={profile?.phone || null}
        avatarUrl={profile?.avatar_url || null}
        joinDate={profile?.created_at || user.created_at || new Date().toISOString()}
        onSave={handleSaveProfile}
        onAvatarUpdated={() => queryClient.invalidateQueries({ queryKey: ["profile", user.id] })}
      />

      {/* Stats Cards */}
      <AccountStats userId={user.id} orderCount={orders.length} totalSpent={totalSpent} />

      {/* Wallet */}
      <WalletSection userId={user.id} />

      {/* Loyalty Rewards */}
      <LoyaltyRewardsSection userId={user.id} />

      {/* Two-column layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <RecentOrders orders={orders} />
        <WishlistSection userId={user.id} />
      </div>

      {/* Saved Addresses */}
      <SavedAddresses userId={user.id} />

      {/* Preferences */}
      <ReduceMotionToggle />

      {/* Quick Links */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-base font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          Quick Links
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {quickLinks.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              to={href}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon size={18} className="text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </main>
  );
};

export default Account;
