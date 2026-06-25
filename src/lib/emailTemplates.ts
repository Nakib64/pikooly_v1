// WooCommerce-inspired email templates for Pikooly Limited

interface OrderEmailData {
  storeName?: string;
  tagline?: string;
  logoUrl?: string;
  customerName: string;
  orderNumber: string;
  deliveryAddress: string;
  deliveryDate?: string;
  deliveryTime?: string;
  recipientName?: string;
  paymentMethod?: string;
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  couponCode?: string;
  total: number;
  items: { name: string; quantity: number; total: number; imageUrl?: string }[];
  trackOrderUrl: string;
  note?: string;
}

interface StatusEmailData extends OrderEmailData {
  status: string;
  statusHeading: string;
  statusMessage: string;
  statusEmoji: string;
  statusColor: string;
}

const C = {
  purple: "#7b3fa0",
  purpleDark: "#5e2d7a",
  dark: "#333333",
  mid: "#555555",
  light: "#777777",
  muted: "#999999",
  border: "#e5e5e5",
  bg: "#f7f7f7",
  white: "#ffffff",
  link: "#1155cc",
  green: "#2ea043",
  red: "#dc3545",
  font: "Helvetica, Arial, sans-serif",
};

function wrap(content: string, storeName = "Pikooly Limited") {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${storeName}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${C.font};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:20px 10px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.white};">
        ${content}
      </table>
      <!-- Footer -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:24px 20px;text-align:center;">
          <p style="margin:0;font-size:13px;color:${C.muted};font-family:${C.font};">Pikooly® | Flowers · Cakes · Gifts</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function purpleHeader(title: string, subtitle?: string) {
  return `<tr><td style="background:${C.purple};padding:40px 30px;text-align:left;">
    <h1 style="margin:0;font-size:28px;font-weight:400;color:#ffffff;font-family:${C.font};line-height:1.3;">${title}</h1>
    ${subtitle ? `<p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.8);font-family:${C.font};">${subtitle}</p>` : ""}
  </td></tr>`;
}

function textBlock(html: string) {
  return `<tr><td style="padding:24px 30px 0;">
    <p style="margin:0;font-size:14px;color:${C.mid};line-height:1.7;font-family:${C.font};">${html}</p>
  </td></tr>`;
}

function orderLink(orderNumber: string, date: string, url: string) {
  return `<tr><td style="padding:24px 30px;">
    <p style="margin:0;font-size:18px;line-height:1.5;font-family:${C.font};">
      <a href="${url}" style="color:${C.link};text-decoration:underline;font-weight:600;">[Order #${orderNumber}]</a>
      <span style="color:${C.link};"> (${date})</span>
    </p>
  </td></tr>`;
}

function itemsTable(items: { name: string; quantity: number; total: number; imageUrl?: string }[]) {
  if (!items.length) return "";
  const rows = items.map(item => {
    const img = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="${item.name}" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:6px;display:block;border:1px solid ${C.border};" />`
      : `<div style="width:56px;height:56px;background:${C.bg};border-radius:6px;border:1px solid ${C.border};"></div>`;
    return `<tr>
      <td style="padding:12px 14px;border:1px solid ${C.border};vertical-align:middle;width:56px;">${img}</td>
      <td style="padding:12px 14px;border:1px solid ${C.border};font-size:13px;color:${C.dark};font-family:${C.font};vertical-align:middle;">${item.name}</td>
      <td style="padding:12px 14px;border:1px solid ${C.border};font-size:13px;color:${C.dark};text-align:center;font-family:${C.font};vertical-align:middle;">${item.quantity}</td>
      <td style="padding:12px 14px;border:1px solid ${C.border};font-size:13px;color:${C.dark};text-align:right;font-family:${C.font};vertical-align:middle;white-space:nowrap;">৳ ${Number(item.total).toFixed(2)}</td>
    </tr>`;
  }).join("");

  return `<tr><td style="padding:0 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:${C.bg};">
        <th style="padding:12px 14px;border:1px solid ${C.border};font-size:12px;color:${C.light};text-align:left;font-weight:600;font-family:${C.font};width:56px;">Image</th>
        <th style="padding:12px 14px;border:1px solid ${C.border};font-size:12px;color:${C.light};text-align:left;font-weight:600;font-family:${C.font};">Product</th>
        <th style="padding:12px 14px;border:1px solid ${C.border};font-size:12px;color:${C.light};text-align:center;font-weight:600;font-family:${C.font};">Qty</th>
        <th style="padding:12px 14px;border:1px solid ${C.border};font-size:12px;color:${C.light};text-align:right;font-weight:600;font-family:${C.font};">Price</th>
      </tr>
      ${rows}
    </table>
  </td></tr>`;
}

function summaryTable(rows: { label: string; value: string; bold?: boolean }[]) {
  const html = rows.filter(r => r.value).map(r =>
    `<tr>
      <td style="padding:10px 14px;border:1px solid ${C.border};font-size:13px;color:${C.dark};font-weight:${r.bold ? "700" : "600"};font-family:${C.font};">${r.label}</td>
      <td style="padding:10px 14px;border:1px solid ${C.border};font-size:13px;color:${C.dark};font-weight:${r.bold ? "700" : "400"};font-family:${C.font};">${r.value}</td>
    </tr>`
  ).join("");

  return `<tr><td style="padding:4px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${html}
    </table>
  </td></tr>`;
}

function infoCard(title: string, lines: string[]) {
  const content = lines.filter(Boolean).map(l =>
    `<p style="margin:0 0 4px;font-size:13px;color:${C.mid};line-height:1.6;font-family:${C.font};">${l}</p>`
  ).join("");

  return `<tr><td style="padding:20px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:4px;">
      <tr><td style="padding:20px 24px;">
        <h3 style="margin:0 0 14px;font-size:18px;font-weight:400;color:${C.dark};font-family:${C.font};">${title}</h3>
        ${content}
      </td></tr>
    </table>
  </td></tr>`;
}

function congratsFooter(url: string) {
  return `<tr><td style="padding:10px 30px 30px;">
    <p style="margin:0 0 10px;font-size:13px;color:${C.mid};font-family:${C.font};">Congratulations on the sale.</p>
    <p style="margin:0;font-size:13px;font-family:${C.font};"><a href="${url}" style="color:${C.link};text-decoration:underline;">Manage the order</a> with the app.</p>
  </td></tr>`;
}

function ctaButton(url: string, text: string, color = C.purple) {
  return `<tr><td style="padding:20px 30px 30px;text-align:center;">
    <a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:14px 40px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;font-family:${C.font};">${text}</a>
  </td></tr>`;
}

function noteBlock(note: string) {
  return `<tr><td style="padding:0 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:4px;background:#fffbeb;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;font-family:${C.font};">Note:</p>
        <p style="margin:0;font-size:13px;color:${C.dark};line-height:1.6;font-family:${C.font};">${note}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function spacer(h = 10) {
  return `<tr><td style="height:${h}px;"></td></tr>`;
}

// ============= PUBLIC API =============

export function buildOrderConfirmationEmail(data: OrderEmailData): string {
  const date = data.deliveryDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const content = [
    purpleHeader(`Order Confirmed`, `#${data.orderNumber}`),
    textBlock(`Hi <strong>${data.customerName}</strong>, thank you for your order! We've received it and it's now being prepared with care.`),
    orderLink(data.orderNumber, date, data.trackOrderUrl),
    itemsTable(data.items),
    summaryTable([
      { label: "Subtotal:", value: `৳ ${data.subtotal.toFixed(2)}` },
      { label: "Shipping:", value: `৳ ${data.deliveryFee.toFixed(2)}` },
      ...(data.discount && data.discount > 0 ? [{ label: `Discount:${data.couponCode ? ` (${data.couponCode})` : ""}`, value: `-৳ ${data.discount.toFixed(2)}` }] : []),
      { label: "Payment method:", value: data.paymentMethod || "N/A" },
      { label: "Total:", value: `৳ ${data.total.toFixed(2)}`, bold: true },
      { label: "Delivery Date:", value: data.deliveryDate || "" },
      { label: "Delivery Time:", value: data.deliveryTime || "" },
    ]),
    data.note ? (spacer(16) + noteBlock(data.note)) : "",
    spacer(10),
    infoCard("Delivery Information", [
      data.recipientName || data.customerName,
      data.deliveryAddress,
    ]),
    ctaButton(data.trackOrderUrl, "Track Your Order"),
  ].join("");

  return wrap(content, data.storeName);
}

export function buildStatusUpdateEmail(data: StatusEmailData): string {
  const statusColors: Record<string, string> = {
    confirmed: C.green,
    processing: "#2563eb",
    shipped: "#f59e0b",
    delivered: C.green,
    cancelled: C.red,
    rejected: C.red,
  };
  const headerColor = statusColors[data.status] || C.purple;

  const content = [
    `<tr><td style="background:${headerColor};padding:40px 30px;text-align:left;">
      <h1 style="margin:0;font-size:28px;font-weight:400;color:#ffffff;font-family:${C.font};line-height:1.3;">${data.statusEmoji} ${data.statusHeading}</h1>
      <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.8);font-family:${C.font};">Order #${data.orderNumber}</p>
    </td></tr>`,
    textBlock(`Hi <strong>${data.customerName}</strong>, ${data.statusMessage}`),
    spacer(10),
    summaryTable([
      { label: "Order:", value: `#${data.orderNumber}`, bold: true },
      { label: "Status:", value: data.status.charAt(0).toUpperCase() + data.status.slice(1), bold: true },
      { label: "Total:", value: `৳ ${data.total.toFixed(2)}`, bold: true },
      { label: "Delivery Address:", value: data.deliveryAddress },
    ]),
    spacer(10),
    itemsTable(data.items),
    spacer(10),
    ctaButton(data.trackOrderUrl, "Track Your Order"),
  ].join("");

  return wrap(content, data.storeName);
}

export function buildAdminNewOrderEmail(data: OrderEmailData & { customerPhone?: string; customerEmail?: string; billingCountry?: string }): string {
  const date = data.deliveryDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    purpleHeader(`New Order:`, `#${data.orderNumber}`),
    textBlock(`You've received the following order from ${data.customerName} :`),
    orderLink(data.orderNumber, date, data.trackOrderUrl),
    itemsTable(data.items),
    summaryTable([
      { label: "Subtotal:", value: `৳ ${data.subtotal.toFixed(2)}` },
      { label: "Shipping:", value: `৳ ${data.deliveryFee.toFixed(2)}${data.deliveryAddress ? ` via delivery` : ""}` },
      ...(data.discount && data.discount > 0 ? [{ label: `Discount:${data.couponCode ? ` (${data.couponCode})` : ""}`, value: `-৳ ${data.discount.toFixed(2)}` }] : []),
      { label: "Payment method:", value: data.paymentMethod || "N/A" },
      { label: "Total:", value: `৳ ${data.total.toFixed(2)}`, bold: true },
      { label: "Delivery Date:", value: data.deliveryDate || "" },
      { label: "Delivery Time:", value: data.deliveryTime || "" },
    ]),
    data.note ? (spacer(16) + noteBlock(data.note)) : "",
    spacer(10),
    infoCard("Billing Information", [
      data.customerName,
      data.billingCountry || "",
      data.customerPhone || "",
      data.customerEmail ? `<a href="mailto:${data.customerEmail}" style="color:${C.link};">${data.customerEmail}</a>` : "",
    ]),
    infoCard("Delivery Information", [
      data.recipientName || data.customerName,
      `<a href="https://maps.google.com/?q=${encodeURIComponent(data.deliveryAddress)}" style="color:${C.link};">${data.deliveryAddress}</a>`,
      data.customerPhone || "",
    ]),
    congratsFooter(data.trackOrderUrl),
  ].join("");

  return wrap(content, data.storeName);
}

// ── Event Booking Admin Notification ──

interface EventBookingEmailData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventDate: string;
  eventTime?: string;
  venueAddress: string;
  guestCount?: number;
  specialRequests?: string;
  packageName?: string;
  categoryName?: string;
  total: number;
  storeName?: string;
}

export function buildAdminEventBookingEmail(data: EventBookingEmailData): string {
  const rows = [
    ["Customer", data.customerName],
    ["Phone", data.customerPhone],
    ...(data.customerEmail ? [["Email", data.customerEmail]] : []),
    ["Event Date", data.eventDate],
    ...(data.eventTime ? [["Event Time", data.eventTime]] : []),
    ["Venue", data.venueAddress],
    ...(data.guestCount ? [["Guest Count", String(data.guestCount)]] : []),
    ...(data.categoryName ? [["Category", data.categoryName]] : []),
    ...(data.packageName ? [["Package", data.packageName]] : []),
    ["Total", `৳${data.total.toLocaleString()}`],
    ...(data.specialRequests ? [["Special Requests", data.specialRequests]] : []),
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 12px;font-size:13px;color:${C.light};font-family:${C.font};white-space:nowrap;border-bottom:1px solid ${C.border};vertical-align:top;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:${C.dark};font-family:${C.font};word-break:break-word;border-bottom:1px solid ${C.border};vertical-align:top;">${value}</td>
        </tr>`
    )
    .join("");

  const content = [
    purpleHeader("🎉 New Event Booking", "A new event booking has been received"),
    `<tr><td style="padding:24px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
        ${tableRows}
      </table>
    </td></tr>`,
    `<tr><td style="padding:0 30px 24px;text-align:center;">
      <a href="${window.location.origin}/admin" style="display:inline-block;padding:12px 28px;background:${C.purple};color:#fff;font-size:14px;font-family:${C.font};text-decoration:none;border-radius:6px;font-weight:600;">View in Admin Panel</a>
    </td></tr>`,
  ].join("");

  return wrap(content, data.storeName);
}

// ── Customer Event Booking Confirmation ──

export function buildCustomerEventBookingEmail(data: EventBookingEmailData): string {
  const rows = [
    ["Event Date", data.eventDate],
    ...(data.eventTime ? [["Event Time", data.eventTime]] : []),
    ["Venue", data.venueAddress],
    ...(data.guestCount ? [["Guest Count", String(data.guestCount)]] : []),
    ...(data.categoryName ? [["Category", data.categoryName]] : []),
    ...(data.packageName ? [["Package", data.packageName]] : []),
    ["Total", `৳${data.total.toLocaleString()}`],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 12px;font-size:13px;color:${C.light};font-family:${C.font};white-space:nowrap;border-bottom:1px solid ${C.border};vertical-align:top;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:${C.dark};font-family:${C.font};word-break:break-word;border-bottom:1px solid ${C.border};vertical-align:top;">${value}</td>
        </tr>`
    )
    .join("");

  const content = [
    purpleHeader("✅ Booking Confirmed!", `Thank you, ${data.customerName}`),
    textBlock(`Your event booking has been successfully confirmed. Our team will contact you shortly to finalize all the details.`),
    `<tr><td style="padding:24px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
        ${tableRows}
      </table>
    </td></tr>`,
    textBlock(`If you have any questions, feel free to contact us via WhatsApp or call us directly. We look forward to making your event special! 🎉`),
    `<tr><td style="padding:0 30px 24px;text-align:center;">
      <a href="${window.location.origin}/track-order" style="display:inline-block;padding:12px 28px;background:${C.purple};color:#fff;font-size:14px;font-family:${C.font};text-decoration:none;border-radius:6px;font-weight:600;">Visit Pikooly</a>
    </td></tr>`,
  ].join("");

  return wrap(content, data.storeName);
}
