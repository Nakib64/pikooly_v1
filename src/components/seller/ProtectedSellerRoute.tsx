import { Navigate, Link, useLocation } from "@/lib/router-adapter";
import { ReactNode } from "react";
import { useSeller } from "@/hooks/useSeller";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProtectedSellerRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { seller, loading } = useSeller();
  const location = useLocation();

  if (location.pathname === "/seller/login" || location.pathname === "/seller/signup") {
    return <>{children}</>;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/seller/login" replace />;

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold mb-2">Pending Admin Assignment</h2>
            <p className="text-muted-foreground text-sm">
              Your account is verified, but an admin still needs to assign you to a delivery district before you can access the dashboard. We'll notify you as soon as you're approved.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/contact-us">Contact Support</Link>
            </Button>
            <Link to="/seller/login" className="text-xs text-muted-foreground hover:underline">
              Back to seller login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!seller.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold mb-2">Account Awaiting Activation</h2>
            <p className="text-muted-foreground text-sm">
              Your seller profile is set up but currently inactive. An admin will activate your account shortly.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/contact-us">Contact Support</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedSellerRoute;
