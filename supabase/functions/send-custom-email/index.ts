// Sends email via SMTP credentials stored in email_settings table
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  to: string;
  subject?: string;
  html?: string;
  template_key?: string;
  variables?: Record<string, string>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Utf8(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function cleanHeader(value: string) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  const clean = cleanHeader(value);
  return /^[\x00-\x7F]*$/.test(clean) ? clean : `=?UTF-8?B?${base64Utf8(clean)}?=`;
}

function cleanEmail(value: string) {
  const clean = cleanHeader(value).replace(/^.*<([^>]+)>.*$/, "$1").trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean)) {
    throw new Error(`Invalid email address: ${clean || "empty"}`);
  }
  return clean;
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim() || "Please view this email in an HTML-compatible client.";
}

class SmtpSession {
  private buffer = "";

  constructor(public conn: Deno.Conn) {}

  async write(raw: string) {
    await this.conn.write(encoder.encode(raw));
  }

  async readLine() {
    while (!this.buffer.includes("\n")) {
      const chunk = new Uint8Array(4096);
      const read = await this.conn.read(chunk);
      if (read === null) return null;
      this.buffer += decoder.decode(chunk.subarray(0, read), { stream: true });
    }

    const idx = this.buffer.indexOf("\n");
    const line = this.buffer.slice(0, idx + 1).replace(/\r?\n$/, "");
    this.buffer = this.buffer.slice(idx + 1);
    return line;
  }

  async readResponse() {
    const lines: string[] = [];
    let code = 0;

    while (true) {
      const line = await this.readLine();
      if (line === null) throw new Error("SMTP connection closed unexpectedly");
      lines.push(line);
      code = Number(line.slice(0, 3));
      if (line.charAt(3) !== "-") break;
    }

    return { code, lines };
  }

  async command(command: string, expected: number[]) {
    await this.write(`${command}\r\n`);
    const response = await this.readResponse();
    if (!expected.includes(response.code)) {
      throw new Error(`${command.split(" ")[0]} failed: ${response.lines.join(" | ")}`);
    }
    return response;
  }
}

async function openSmtpSession(hostname: string, port: number) {
  let conn: Deno.Conn = port === 465
    ? await Deno.connectTls({ hostname, port })
    : await Deno.connect({ hostname, port });

  let session = new SmtpSession(conn);
  let greeting = await session.readResponse();
  if (greeting.code !== 220) throw new Error(`SMTP greeting failed: ${greeting.lines.join(" | ")}`);

  const ehlo = async () => session.command(`EHLO ${hostname}`, [250]);
  let ehloResponse = await ehlo();

  if (port !== 465) {
    const supportsStartTls = ehloResponse.lines.some((line) => line.toUpperCase().includes("STARTTLS"));
    if (!supportsStartTls) throw new Error("SMTP server does not support STARTTLS on this port.");
    await session.command("STARTTLS", [220]);
    conn = await Deno.startTls(conn, { hostname });
    session = new SmtpSession(conn);
    ehloResponse = await ehlo();
  }

  return { session, ehloResponse };
}

function buildMessage(input: {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
}) {
  const boundary = `pikooly_${crypto.randomUUID().replaceAll("-", "")}`;
  const text = htmlToText(input.html);
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `From: ${encodeHeader(input.fromName)} <${input.fromEmail}>`,
    `To: <${input.toEmail}>`,
    input.replyTo ? `Reply-To: <${cleanEmail(input.replyTo)}>` : null,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  return [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: Payload = await req.json();
    if (!body.to) throw new Error("Missing 'to'");

    const { data: settings } = await supabase
      .from("email_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings) {
      throw new Error("Email settings not configured. Please configure SMTP in Admin → Email Settings.");
    }

    let subject = body.subject ?? "";
    let html = body.html ?? "";
    const vars = { site_name: settings.from_name, ...(body.variables ?? {}) };

    if (body.template_key) {
      const { data: tpl } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_key", body.template_key)
        .eq("is_active", true)
        .maybeSingle();
      if (!tpl) throw new Error(`Template '${body.template_key}' not found`);
      subject = renderTemplate(tpl.subject, vars);
      html = renderTemplate(tpl.html_body, vars);
    } else {
      subject = renderTemplate(subject, vars);
      html = renderTemplate(html, vars);
    }

    const logId = (await supabase
      .from("custom_email_log")
      .insert({ to_email: body.to, subject, template_key: body.template_key ?? null, status: "pending" })
      .select("id")
      .single()).data?.id;

    try {
      const port = Number(settings.smtp_port) || 587;
      // Gmail shows app passwords as "abcd efgh ijkl mnop" — strip whitespace.
      const cleanPassword = String(settings.smtp_password).replace(/\s+/g, "");
      const cleanUsername = String(settings.smtp_username).trim();
      const hostname = cleanHeader(settings.smtp_host || "smtp.gmail.com");
      const fromEmail = cleanEmail(settings.from_email || cleanUsername);
      const toEmail = cleanEmail(body.to);

      const { session } = await openSmtpSession(hostname, port);

      await session.command(`AUTH PLAIN ${base64Utf8(`\0${cleanUsername}\0${cleanPassword}`)}`, [235]);
      await session.command(`MAIL FROM:<${fromEmail}>`, [250]);
      await session.command(`RCPT TO:<${toEmail}>`, [250, 251]);
      await session.command("DATA", [354]);

      const message = buildMessage({
        fromName: settings.from_name || "Pikooly",
        fromEmail,
        toEmail,
        replyTo: settings.reply_to,
        subject,
        html,
      });

      await session.write(`${message.replace(/^\./gm, "..")}\r\n.\r\n`);
      await session.readResponse().then((response) => {
        if (response.code !== 250) throw new Error(`DATA failed: ${response.lines.join(" | ")}`);
      });
      await session.command("QUIT", [221]).catch(() => undefined);
      session.conn.close();

      if (logId) {
        await supabase.from("custom_email_log").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", logId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (logId) {
        await supabase.from("custom_email_log").update({ status: "failed", error_message: msg }).eq("id", logId);
      }
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-custom-email error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
