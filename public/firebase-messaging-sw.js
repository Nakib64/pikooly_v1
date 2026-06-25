// Firebase Cloud Messaging service worker
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    try {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title || "Notification";
        const options = {
          body: payload.notification?.body || "",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: { url: payload.data?.url || "/" },
        };
        self.registration.showNotification(title, options);
      });
    } catch (e) {
      console.error("FCM SW init failed", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
