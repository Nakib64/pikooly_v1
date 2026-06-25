// Lightweight Web Vitals RUM tracker.
// Sends LCP, CLS, INP, TTFB, FCP to ingest-vitals edge function.
import { onLCP, onCLS, onINP, onTTFB, onFCP } from "web-vitals";

const ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ingest-vitals`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

const queue: any[] = [];
let scheduled = false;

function flush() {
  if (!queue.length) return;
  const payload = JSON.stringify(queue.splice(0));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  };
  try {
    // sendBeacon doesn't allow custom headers; use fetch keepalive instead.
    fetch(ENDPOINT, { method: "POST", headers, body: payload, keepalive: true })
      .catch(() => {});
  } catch {}
}

function enqueue(entry: any) {
  queue.push(entry);
  if (!scheduled) {
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      flush();
    }, 1500);
  }
}

function report(metric: any) {
  enqueue({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigation_type: metric.navigationType,
    path: window.location.pathname,
  });
}

export function initRUM() {
  if (typeof window === "undefined") return;
  // Avoid noise from preview iframes / bot UA
  if (/HeadlessChrome|Lighthouse|bot|crawler/i.test(navigator.userAgent)) return;
  const host = window.location.hostname;
  if (host.includes("id-preview--") || host === "localhost" || host === "127.0.0.1") return;

  try {
    onLCP(report);
    onCLS(report);
    onINP(report);
    onTTFB(report);
    onFCP(report);
  } catch {}

  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  addEventListener("pagehide", flush);
}
