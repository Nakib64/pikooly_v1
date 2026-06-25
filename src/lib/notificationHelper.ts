// Helper to check notification alert settings and send notifications

const isEnabled = (v: string | undefined) =>
  ["true", "1", "yes", "on", "enabled", "enable"].includes((v || "").toLowerCase());

// Map order status to notification alert key
const statusToAlertKey: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "confirmed",
  shipped: "on_the_way",
  delivered: "delivered",
  cancelled: "canceled",
  rejected: "rejected",
};

export function shouldSendMail(settings: Record<string, string>, orderStatus: string): boolean {
  const alertKey = statusToAlertKey[orderStatus] || orderStatus;
  const enableKey = `alert_mail_${alertKey}_enabled`;
  // Default to true if setting doesn't exist (backward compat)
  return settings[enableKey] === undefined || isEnabled(settings[enableKey]);
}

export function shouldSendSms(settings: Record<string, string>, orderStatus: string): boolean {
  const alertKey = statusToAlertKey[orderStatus] || orderStatus;
  const enableKey = `alert_sms_${alertKey}_enabled`;
  return settings[enableKey] === undefined || isEnabled(settings[enableKey]);
}

export function shouldSendPush(settings: Record<string, string>, orderStatus: string): boolean {
  const alertKey = statusToAlertKey[orderStatus] || orderStatus;
  const enableKey = `alert_push_${alertKey}_enabled`;
  return settings[enableKey] === undefined || isEnabled(settings[enableKey]);
}

export function shouldSendAdminMail(settings: Record<string, string>): boolean {
  const enableKey = `alert_mail_admin_new_order_enabled`;
  return settings[enableKey] === undefined || isEnabled(settings[enableKey]);
}

export function shouldSendAdminSms(settings: Record<string, string>): boolean {
  const enableKey = `alert_sms_admin_new_order_enabled`;
  return settings[enableKey] === undefined || isEnabled(settings[enableKey]);
}

export function getCustomMessage(settings: Record<string, string>, channel: "mail" | "sms" | "push", orderStatus: string): string {
  const alertKey = statusToAlertKey[orderStatus] || orderStatus;
  const msgKey = `alert_${channel}_${alertKey}_message`;
  return settings[msgKey] || "";
}

export function getAdminMessage(settings: Record<string, string>, channel: "mail" | "sms" | "push"): string {
  const msgKey = `alert_${channel}_admin_new_order_message`;
  return settings[msgKey] || "";
}

// Browser push notification
export async function sendBrowserPush(title: string, body: string, icon?: string) {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
}
