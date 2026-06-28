import { Navigate } from "@/lib/router-adapter";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSeller } from "@/hooks/useSeller";

/**
 * Protects customer-only routes (e.g. /account).
 * - Not logged in → /auth
 * - Admin → /admin (admins shouldn't browse customer account UI)
 * - Active seller → /seller/dashboard
 */
const ProtectedUserRoute = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const { seller, loading: sellerLoading } = useSeller();
  const pathname = usePathname();

  if (loading || sellerLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: pathname }} />;
  }
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (seller && seller.is_active) return <Navigate to="/seller/dashboard" replace />;

  return <>{children}</>;
};

export default ProtectedUserRoute;
