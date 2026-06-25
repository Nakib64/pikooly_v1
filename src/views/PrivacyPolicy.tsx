import PolicyPage from "./PolicyPage";

const defaultContent = `
<h2>Your Privacy Matters</h2>
<p>Pikooly respects your privacy and is committed to protecting the personal information you share with us.</p>

<h3>1. Information We Collect</h3>
<ul>
  <li>Name, phone number, email, and delivery address provided during checkout.</li>
  <li>Payment details processed securely via our payment partners.</li>
  <li>Browsing data, cookies, and device information for site improvement.</li>
</ul>

<h3>2. How We Use Your Information</h3>
<ul>
  <li>To process and deliver your orders.</li>
  <li>To send order updates, delivery notifications, and customer support.</li>
  <li>To share offers, promotions, and seasonal updates (with your consent).</li>
  <li>To improve our products, services, and website experience.</li>
</ul>

<h3>3. Information Sharing</h3>
<p>We never sell your information. We share details only with:</p>
<ul>
  <li>Delivery partners to fulfill your orders.</li>
  <li>Payment gateways to process transactions securely.</li>
  <li>Authorities when required by law.</li>
</ul>

<h3>4. Data Security</h3>
<p>We use industry-standard encryption (SSL) and secure servers to protect your data. Payment information is never stored on our servers.</p>

<h3>5. Your Rights</h3>
<p>You may request to view, update, or delete your personal information at any time by contacting our support team.</p>

<h3>6. Cookies</h3>
<p>We use cookies to enhance your browsing experience. You can disable cookies through your browser settings.</p>

<h3>7. Updates</h3>
<p>This policy may be updated from time to time. The latest version will always be available on this page.</p>
`;

const PrivacyPolicy = () => (
  <PolicyPage
    prefix="privacypage"
    defaultTitle="Privacy Policy"
    defaultSubtitle="How we protect and use your information"
    defaultContent={defaultContent}
    path="/privacy-policy"
  />
);

export default PrivacyPolicy;
