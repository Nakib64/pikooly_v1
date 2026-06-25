// Firebase Cloud Messaging HTTP v1 helper
// Mints an OAuth2 access token from a service account JSON and sends FCM messages.

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function parseServiceAccount(raw: string): ServiceAccount {
  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("Invalid service account JSON: missing client_email, private_key, or project_id");
  }
  // Handle escaped newlines from textarea storage
  sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");
  return sa as ServiceAccount;
}

let cachedToken: { token: string; exp: number; sa: string } | null = null;

export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = sa.client_email;
  if (cachedToken && cachedToken.sa === key && cachedToken.exp - 60 > now) {
    return cachedToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = new TextEncoder();
  const unsigned = `${base64UrlEncode(enc.encode(JSON.stringify(header)))}.${base64UrlEncode(enc.encode(JSON.stringify(claim)))}`;

  const keyData = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth token error: ${JSON.stringify(data)}`);

  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600), sa: key };
  return data.access_token;
}

export interface FcmSendResult {
  ok: boolean;
  status: number;
  body: any;
  token?: string;
  topic?: string;
  unregistered?: boolean;
}

export async function sendFcmMessage(
  sa: ServiceAccount,
  accessToken: string,
  message: {
    token?: string;
    topic?: string;
    notification: { title: string; body: string };
    data?: Record<string, string>;
    webpush?: any;
  }
): Promise<FcmSendResult> {
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  const body = await res.json().catch(() => ({}));
  const errStatus = body?.error?.status || "";
  const errCode = body?.error?.details?.[0]?.errorCode || "";
  const unregistered =
    errStatus === "NOT_FOUND" ||
    errCode === "UNREGISTERED" ||
    errCode === "INVALID_ARGUMENT";
  return {
    ok: res.ok,
    status: res.status,
    body,
    token: message.token,
    topic: message.topic,
    unregistered,
  };
}

export function interpolate(template: string, vars: Record<string, any> = {}): string {
  return (template || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}
