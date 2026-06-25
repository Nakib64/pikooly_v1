import { useCallback, useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const useFcmToken = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildConfig = () => {
    const cfg = {
      apiKey: settings.firebase_api_key,
      authDomain: settings.firebase_auth_domain,
      projectId: settings.firebase_project_id,
      storageBucket: settings.firebase_storage_bucket,
      messagingSenderId: settings.firebase_message_sender_id,
      appId: settings.firebase_app_id,
      measurementId: settings.firebase_measurement_id,
    };
    if (!cfg.apiKey || !cfg.projectId || !cfg.messagingSenderId || !cfg.appId) return null;
    return cfg;
  };

  const register = useCallback(async () => {
    setError(null);
    if (!user) return null;
    if (settings.push_enabled !== "true") return null;
    if (!(await isSupported().catch(() => false))) return null;

    const cfg = buildConfig();
    if (!cfg) {
      setError("Firebase not configured");
      return null;
    }
    const vapidKey = settings.vapid_public_key;
    if (!vapidKey) {
      setError("VAPID public key missing");
      return null;
    }

    setLoading(true);
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(cfg);
      const messaging = getMessaging(app);

      // Register & hand config to SW
      const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: "FIREBASE_CONFIG", config: cfg });

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Permission denied");
        return null;
      }

      const t = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
      if (!t) {
        setError("No FCM token returned");
        return null;
      }
      setToken(t);

      await supabase.functions.invoke("register-device-token", {
        body: {
          token: t,
          platform: "web",
          device_info: { userAgent: navigator.userAgent },
        },
      });

      onMessage(messaging, (payload) => {
        if (payload.notification && Notification.permission === "granted") {
          new Notification(payload.notification.title || "Notification", {
            body: payload.notification.body || "",
            icon: "/favicon.ico",
          });
        }
      });

      return t;
    } catch (e: any) {
      console.error("FCM register failed:", e);
      setError(e?.message || "FCM error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, settings]);

  useEffect(() => {
    // Auto-attempt registration once when user + config is ready & permission already granted
    if (user && settings.push_enabled === "true" && typeof Notification !== "undefined" && Notification.permission === "granted") {
      register();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.push_enabled, settings.firebase_project_id]);

  return { token, loading, error, register };
};
