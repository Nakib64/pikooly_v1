// Hash an OTP using SHA-256 with a salt (uses SUPABASE_SERVICE_ROLE_KEY as salt source)
export async function hashOtp(otp: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${otp}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOtp(length = 6): string {
  let s = "";
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export function normalizeBdPhone(raw: string): string {
  let p = String(raw || "").trim().replace(/[\s\-()+]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("880")) return p;
  if (p.startsWith("0")) return "880" + p.slice(1);
  if (p.length === 10 && p.startsWith("1")) return "880" + p;
  return p;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
