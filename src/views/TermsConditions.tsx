"use client";
import PolicyPage from "./PolicyPage";

const defaultContent = `
<h2>Welcome to Pikooly</h2>
<p>By accessing or using our website, you agree to the following terms and conditions. Please read them carefully.</p>

<h3>1. Use of the Website</h3>
<ul>
  <li>You must be at least 18 years old or use the site under the supervision of a parent or guardian.</li>
  <li>You agree to provide accurate, complete, and current information when placing an order.</li>
  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
</ul>

<h3>2. Orders & Payments</h3>
<ul>
  <li>All orders are subject to acceptance and product availability.</li>
  <li>Prices are listed in BDT and are subject to change without prior notice.</li>
  <li>We accept secure online payments and Cash on Delivery (where available).</li>
</ul>

<h3>3. Delivery</h3>
<ul>
  <li>Same-day delivery is available in Dhaka for orders placed before our daily cutoff time.</li>
  <li>Delivery times may vary due to traffic, weather, or other unforeseen factors.</li>
  <li>An accurate phone number and address are required for successful delivery.</li>
</ul>

<h3>4. Product Variations</h3>
<p>Flowers and gifts are natural products, and small variations in color, shape, and arrangement may occur. We always ensure equal value and freshness.</p>

<h3>5. Cancellations</h3>
<p>Orders can be cancelled within 2 hours of placement and before preparation begins. Once dispatched, cancellation is not possible.</p>

<h3>6. Intellectual Property</h3>
<p>All content on this website, including images, logos, and text, is owned by Pikooly and protected by copyright laws. You may not reproduce or use any content without written permission.</p>

<h3>7. Limitation of Liability</h3>
<p>Pikooly is not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>

<h3>8. Governing Law</h3>
<p>These terms are governed by the laws of Bangladesh. Any disputes will be subject to the jurisdiction of Dhaka courts.</p>

<h3>9. Contact</h3>
<p>For any questions about these terms, please reach out to our customer support team.</p>
`;

const TermsConditions = () => (
  <PolicyPage
    prefix="termspage"
    defaultTitle="Terms & Conditions"
    defaultSubtitle="Please read carefully before using our service"
    defaultContent={defaultContent}
    path="/terms-conditions"
  />
);

export default TermsConditions;
