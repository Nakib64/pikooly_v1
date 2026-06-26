// Cloudflare R2 (S3 compatible) upload helper with AWS SigV4 signing.
// Uses fetch + Web Crypto — no external SDK required.

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;   // e.g. https://pub-xxx.r2.dev
  endpoint?: string;    // e.g. https://<accountId>.r2.cloudflarestorage.com
};

export async function getR2ConfigFromSettings(supabase: any): Promise<R2Config> {
  const { data: rows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "r2_account_id",
      "r2_access_key_id",
      "r2_secret_access_key",
      "r2_bucket_name",
      "r2_public_url",
      "r2_endpoint",
    ]);
  const m: Record<string, string> = {};
  rows?.forEach((r: any) => { if (r.value) m[r.key] = String(r.value).trim(); });

  return {
    accountId: m["r2_account_id"] || "",
    accessKeyId: m["r2_access_key_id"] || "",
    secretAccessKey: m["r2_secret_access_key"] || "",
    bucket: m["r2_bucket_name"] || "",
    publicUrl: (m["r2_public_url"] || "").replace(/\/+$/, ""),
    endpoint: (m["r2_endpoint"] || (m["r2_account_id"] ? `https://${m["r2_account_id"]}.r2.cloudflarestorage.com` : "")).replace(/\/+$/, ""),
  };
}

export function r2HasCreds(c: R2Config): boolean {
  return !!(c.accessKeyId && c.secretAccessKey && c.bucket && c.endpoint);
}

const enc = new TextEncoder();

async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf as any);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key as any, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg) as any);
}

async function signingKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(enc.encode("AWS4" + secret), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}

function uriEncode(s: string, encodeSlash = true): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%2F/g, encodeSlash ? "%2F" : "/");
}

/** Make signed S3 request to R2. */
async function r2Request(opts: {
  cfg: R2Config;
  method: string;
  key: string;            // object key including no leading slash
  body?: Uint8Array;
  contentType?: string;
}): Promise<Response> {
  const { cfg, method, key, body, contentType } = opts;
  const host = new URL(cfg.endpoint!).host;
  const region = "auto";
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const payload = body ?? new Uint8Array();
  const payloadHash = await sha256Hex(payload);

  const canonicalUri = "/" + uriEncode(cfg.bucket, false) + "/" + key.split("/").map(p => uriEncode(p, false)).join("/");
  const canonicalQuery = "";
  const headers: Record<string, string> = {
    "host": host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;
  if (body) headers["content-length"] = String(body.length);

  const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headers[k].toString().trim()}`).join("\n") + "\n";
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const sigKey = await signingKey(cfg.secretAccessKey, dateStamp, region, service);
  const sigBuf = await hmac(sigKey, stringToSign);
  const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `${cfg.endpoint}${canonicalUri}`;
  return await fetch(url, {
    method,
    headers: { ...headers, Authorization: authorization },
    body: body && method !== "GET" && method !== "HEAD" ? body : undefined,
  });
}

/** Upload a remote image URL into R2. Returns the public URL on success or null on failure. */
export async function uploadRemoteToR2(
  cfg: R2Config,
  sourceUrl: string,
  folder: string,
  filenameHint?: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    if (!r2HasCreds(cfg)) return { ok: false, error: "R2 credentials not configured" };

    // Fetch source bytes
    const srcRes = await fetch(sourceUrl);
    if (!srcRes.ok) return { ok: false, error: `source fetch ${srcRes.status}` };
    const bytes = new Uint8Array(await srcRes.arrayBuffer());
    const contentType = srcRes.headers.get("content-type") || "application/octet-stream";

    // Derive filename
    let name = filenameHint || sourceUrl.split("/").pop()?.split("?")[0] || `${Date.now()}.bin`;
    name = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
      const ext = contentType.split("/")[1]?.split(";")[0] || "bin";
      name = `${name}.${ext}`;
    }
    const key = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${name}`;

    const res = await r2Request({ cfg, method: "PUT", key, body: bytes, contentType });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `R2 PUT ${res.status}: ${errText.slice(0, 200)}` };
    }
    await res.body?.cancel().catch(() => {});

    const publicBase = (cfg.publicUrl || "").replace(/\/+$/, "");
    const url = publicBase
      ? `${publicBase}/${key}`
      : `${cfg.endpoint}/${cfg.bucket}/${key}`;
    return { ok: true, url };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** Upload a file (Uint8Array) directly to R2. Returns the public URL on success or error on failure. */
export async function uploadBytesToR2(
  cfg: R2Config,
  bytes: Uint8Array,
  folder: string,
  filename: string,
  contentType: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    if (!r2HasCreds(cfg)) return { ok: false, error: "R2 credentials not configured" };

    // Derive key
    let name = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
      const ext = contentType.split("/")[1]?.split(";")[0] || "bin";
      name = `${name}.${ext}`;
    }
    const key = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${name}`;

    const res = await r2Request({ cfg, method: "PUT", key, body: bytes, contentType });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `R2 PUT ${res.status}: ${errText.slice(0, 200)}` };
    }
    await res.body?.cancel().catch(() => {});

    const publicBase = (cfg.publicUrl || "").replace(/\/+$/, "");
    const url = publicBase
      ? `${publicBase}/${key}`
      : `${cfg.endpoint}/${cfg.bucket}/${key}`;
    return { ok: true, url };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** HEAD bucket to validate creds + bucket access. */
export async function validateR2(cfg: R2Config): Promise<{ ok: boolean; message: string }> {
  if (!cfg.endpoint) return { ok: false, message: "Missing R2 endpoint or account ID." };
  if (!cfg.bucket) return { ok: false, message: "Missing R2 bucket name." };
  if (!cfg.accessKeyId || !cfg.secretAccessKey) return { ok: false, message: "Missing R2 access key or secret." };

  try {
    // Try HEAD on the bucket
    const host = new URL(cfg.endpoint).host;
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = await sha256Hex("");
    const canonicalUri = "/" + uriEncode(cfg.bucket, false);
    const headers: Record<string, string> = {
      host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate,
    };
    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join("\n") + "\n";
    const signedHeaders = sortedKeys.join(";");
    const canonicalRequest = ["HEAD", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
    const sigKey = await signingKey(cfg.secretAccessKey, dateStamp, region, service);
    const sigBuf = await hmac(sigKey, stringToSign);
    const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`${cfg.endpoint}${canonicalUri}`, {
      method: "HEAD", headers: { ...headers, Authorization: authorization },
    });

    if (res.ok) return { ok: true, message: `Bucket "${cfg.bucket}" reachable (HTTP ${res.status}).` };
    if (res.status === 404) return { ok: false, message: `Bucket "${cfg.bucket}" not found (404). Check bucket name.` };
    if (res.status === 403) return { ok: false, message: "Access denied (403). Check Access Key & Secret permissions." };
    if (res.status === 401) return { ok: false, message: "Unauthorized (401). Access Key or Secret is invalid." };
    return { ok: false, message: `Unexpected response: HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, message: `Network error: ${e?.message || String(e)}` };
  }
}
