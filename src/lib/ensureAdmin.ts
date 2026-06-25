import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current session is fresh AND the user is an admin BEFORE
 * any privileged write. Returns a friendly error message if not, else null.
 *
 * This solves the common "new row violates row-level security policy"
 * error caused by stale/expired tokens or the user being signed in to a
 * non-admin account in another tab.
 */
export const ensureAdminSession = async (): Promise<string | null> => {
  // 1. Refresh the session so auth.uid() is valid in Postgres RLS.
  const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
  const session = refreshData.session ?? (await supabase.auth.getSession()).data.session;

  if (refreshErr && !session) {
    return "Your session expired. Please log out and log back in.";
  }
  if (!session?.user) {
    return "You are not signed in. Please log in as an admin and try again.";
  }

  // 2. Verify the role on the server (bypasses any stale client state).
  const { data: roleRow, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr) {
    return `Could not verify admin role: ${roleErr.message}`;
  }
  if (!roleRow) {
    return `The account "${session.user.email}" is not an admin. Please sign in with an admin account.`;
  }

  return null;
};
