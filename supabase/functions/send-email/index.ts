import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, html } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'subject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "mail_host",
        "mail_port",
        "mail_username",
        "mail_password",
        "mail_from_name",
        "mail_from_address",
        "mail_encryption",
      ]);

    if (settingsError) throw settingsError;

    const config: Record<string, string> = {};
    settings?.forEach((s: any) => {
      config[s.key] = s.value || "";
    });

    const host = config.mail_host;
    const port = parseInt(config.mail_port || "587");
    const username = config.mail_username;
    const password = config.mail_password;
    const fromName = config.mail_from_name || "Pikooly";
    const fromAddress = config.mail_from_address;
    const encryption = config.mail_encryption || "tls";

    if (!host || !username || !password || !fromAddress) {
      return new Response(
        JSON.stringify({ error: "SMTP settings are not configured. Please set them in Admin > Settings > Mail." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: encryption === "ssl",
      auth: {
        user: username,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: to,
      subject: subject,
      text: body || "",
      html: html || body || "",
    });

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
