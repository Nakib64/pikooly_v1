"use client";
import PolicyPage from "./PolicyPage";

const defaultContent = `
<h2>Our Refund & Return Commitment</h2>
<p>At Pikooly, we want every order to bring a smile. If something is not right with your delivery, we are here to help.</p>

<h3>1. Eligibility for Refund or Replacement</h3>
<ul>
  <li>Product delivered damaged, wilted, or in unsatisfactory condition.</li>
  <li>Wrong product delivered.</li>
  <li>Order not delivered on the scheduled delivery date due to our fault.</li>
</ul>

<h3>2. Reporting Window</h3>
<p>Please report any issue within <strong>24 hours</strong> of delivery with clear photos of the product and packaging via WhatsApp or email.</p>

<h3>3. Refund Process</h3>
<ul>
  <li>After verification, we will offer a free replacement or a full refund.</li>
  <li>Refunds are processed to your original payment method within 7–10 business days.</li>
  <li>For Cash on Delivery orders, refunds are sent via bKash, Nagad, or bank transfer.</li>
</ul>

<h3>4. Non-Refundable Cases</h3>
<ul>
  <li>Personalized or custom-made bouquets and cakes (unless damaged).</li>
  <li>Wrong recipient details provided by the customer.</li>
  <li>Recipient not available at the delivery address.</li>
</ul>

<h3>5. Contact Us</h3>
<p>For any refund or return request, please contact our customer support team. We are committed to resolving every concern fairly and quickly.</p>
`;

const RefundPolicy = () => (
  <PolicyPage
    prefix="refundpage"
    defaultTitle="Refund & Return Policy"
    defaultSubtitle="Our commitment to your satisfaction"
    defaultContent={defaultContent}
    path="/refund-policy"
  />
);

export default RefundPolicy;
