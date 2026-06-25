import { supabase } from "@/integrations/supabase/client";

export type AdminActivityAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_change"
  | "email_change"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_challenge_failed"
  | "order_deleted"
  | "order_restored"
  | "orders_bulk_deleted";

interface LogParams {
  action: AdminActivityAction;
  userId?: string | null;
  userEmail?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an admin activity log entry. Failures are swallowed so they
 * never block the primary auth/account flow.
 */
export const logAdminActivity = async ({
  action,
  userId = null,
  userEmail = null,
  description,
  metadata = {},
}: LogParams) => {
  try {
    await supabase.from("admin_activity_log").insert({
      action,
      user_id: userId,
      user_email: userEmail,
      description: description ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: metadata as never,
    });
  } catch {
    // Silent — never block auth on logging errors
  }
};
