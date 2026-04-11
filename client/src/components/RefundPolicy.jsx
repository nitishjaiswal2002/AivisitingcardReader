import React from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  .policy-page {
    font-family: 'DM Sans', sans-serif;
    background: #f8faff;
    min-height: 100vh;
    color: #1a2340;
  }
  .policy-header {
    background: #1e3a8a;
    color: white;
    padding: 48px 24px 36px;
    text-align: center;
  }
  .policy-header .brand {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 12px;
  }
  .policy-header h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(26px, 5vw, 40px);
    font-weight: 400;
    margin: 0 0 10px;
  }
  .policy-header .date {
    font-size: 13px;
    opacity: 0.6;
    margin: 0;
  }
  .policy-body {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .summary-card {
    background: white;
    border: 1px solid #e8edf8;
    border-radius: 12px;
    padding: 20px 16px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(30,58,138,0.04);
  }
  .summary-card .icon {
    font-size: 26px;
    margin-bottom: 8px;
    display: block;
  }
  .summary-card .label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7da8;
    margin-bottom: 4px;
  }
  .summary-card .value {
    font-size: 15px;
    font-weight: 600;
    color: #1e3a8a;
  }
  .section {
    background: white;
    border-radius: 12px;
    padding: 28px;
    margin-bottom: 16px;
    border: 1px solid #e8edf8;
    box-shadow: 0 1px 4px rgba(30,58,138,0.04);
  }
  .section h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 20px;
    font-weight: 400;
    color: #1e3a8a;
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section h2 .num {
    background: #1e3a8a;
    color: white;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .section p {
    font-size: 14px;
    line-height: 1.8;
    color: #3d4f6e;
    margin: 0 0 10px;
  }
  .section p:last-child { margin-bottom: 0; }
  .section ul {
    margin: 8px 0 0;
    padding-left: 20px;
  }
  .section ul li {
    font-size: 14px;
    line-height: 1.8;
    color: #3d4f6e;
    margin-bottom: 4px;
  }
  .eligible-box {
    background: #f0fdf4;
    border-left: 3px solid #22c55e;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
    margin-top: 12px;
    font-size: 13px;
    color: #15803d;
    line-height: 1.8;
  }
  .not-eligible-box {
    background: #fff7ed;
    border-left: 3px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
    margin-top: 10px;
    font-size: 13px;
    color: #92400e;
    line-height: 1.8;
  }
  .process-steps {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 12px;
  }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .step-num {
    background: #1e3a8a;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .step-text strong {
    display: block;
    font-size: 14px;
    color: #1a2340;
    margin-bottom: 2px;
  }
  .step-text span {
    font-size: 13px;
    color: #6b7da8;
  }
  .contact-box {
    background: #1e3a8a;
    color: white;
    border-radius: 12px;
    padding: 28px;
    text-align: center;
    margin-top: 24px;
  }
  .contact-box h3 {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    font-weight: 400;
    margin: 0 0 8px;
  }
  .contact-box p {
    font-size: 13px;
    opacity: 0.75;
    margin: 0 0 16px;
  }
  .contact-box a {
    display: inline-block;
    background: white;
    color: #1e3a8a;
    font-weight: 600;
    font-size: 13px;
    padding: 10px 24px;
    border-radius: 50px;
    text-decoration: none;
  }
  @media (max-width: 480px) {
    .policy-header { padding: 32px 16px 28px; }
    .section { padding: 20px 16px; }
    .section h2 { font-size: 17px; }
    .summary-grid { grid-template-columns: 1fr; }
    .summary-card { padding: 14px 16px; display: flex; align-items: center; gap: 12px; text-align: left; }
    .summary-card .icon { margin-bottom: 0; font-size: 22px; }
  }
`;

function RefundPolicy() {
  return (
    <div className="policy-page">
      <style>{styles}</style>

      <div className="policy-header">
        <div className="brand">Visiting Card Extractor</div>
        <h1>Refund &amp; Cancellation Policy</h1>
        <p className="date">
          Last Updated:{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="policy-body">

        {/* Quick summary */}
        <div className="summary-grid">
          <div className="summary-card">
            <span className="icon">🔄</span>
            <div>
              <div className="label">Refund Window</div>
              <div className="value">7 Days</div>
            </div>
          </div>
          <div className="summary-card">
            <span className="icon">⚡</span>
            <div>
              <div className="label">Processing Time</div>
              <div className="value">5–7 Business Days</div>
            </div>
          </div>
          <div className="summary-card">
            <span className="icon">📩</span>
            <div>
              <div className="label">Contact Us</div>
              <div className="value">Email / Chat</div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="section">
          <h2><span className="num">1</span>Overview</h2>
          <p>
            At Visiting Card Extractor, we want you to be completely satisfied
            with our Service. This policy explains your rights and our obligations
            regarding subscription payments made via{" "}
            <strong>Cashfree Payments</strong>.
          </p>
          <p>
            All payments are processed securely through Cashfree, a PCI-DSS
            compliant payment gateway. Approved refunds are credited back to your
            original payment method.
          </p>
        </div>

        <div className="section">
          <h2><span className="num">2</span>Eligibility for Refund</h2>
          <div className="eligible-box">
            ✅ <strong>Eligible for refund:</strong><br />
            • You request a refund within 7 days of your subscription purchase<br />
            • You were charged incorrectly (duplicate charge or wrong amount)<br />
            • The Service was unavailable for more than 24 continuous hours due to our fault<br />
            • A technical issue prevented you from using the Service despite multiple support attempts
          </div>
          <div className="not-eligible-box">
            ❌ <strong>Not eligible for refund:</strong><br />
            • Refund request made after 7 days of purchase<br />
            • You have already used a significant portion of your monthly extraction quota<br />
            • Dissatisfaction due to AI accuracy on poor-quality or handwritten card images<br />
            • Free plan users (no payment collected)<br />
            • Cancellation after the 7-day window (access continues till period end)
          </div>
        </div>

        <div className="section">
          <h2><span className="num">3</span>Subscription Cancellation</h2>
          <p>
            You can cancel your subscription at any time from your Account
            Settings. Upon cancellation:
          </p>
          <ul>
            <li>Your plan remains active until the end of the current billing period</li>
            <li>You will not be charged for the next billing cycle</li>
            <li>
              No partial refund is given for the unused days of a billing period,
              unless you cancel within the 7-day refund window
            </li>
            <li>
              Annual subscribers who cancel within 7 days receive a full refund;
              after 7 days, no prorated refund is available
            </li>
          </ul>
        </div>

        <div className="section">
          <h2><span className="num">4</span>How to Request a Refund</h2>
          <p>To initiate a refund, follow these steps:</p>
          <div className="process-steps">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-text">
                <strong>Email us within 7 days of purchase</strong>
                <span>Send to support@visitingcardextractor.com with subject "Refund Request"</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-text">
                <strong>Include your details</strong>
                <span>Your registered email address, Cashfree transaction/order ID, and reason for refund</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text">
                <strong>We review within 2 business days</strong>
                <span>Our team will evaluate and respond with the decision via email</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div className="step-text">
                <strong>Refund credited in 5–7 business days</strong>
                <span>Approved refunds are processed via Cashfree to your original payment method</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2><span className="num">5</span>Refund Timelines by Payment Method</h2>
          <p>
            Once approved, refunds are credited to your original payment method:
          </p>
          <ul>
            <li><strong>Credit / Debit Card:</strong> 5–7 business days</li>
            <li><strong>UPI / Net Banking:</strong> 3–5 business days</li>
            <li><strong>Wallets (Paytm, PhonePe, etc.):</strong> 1–3 business days</li>
            <li><strong>EMI transactions:</strong> May take one full billing cycle</li>
          </ul>
          <p>
            Refunds are issued only to the original payment method used at the
            time of purchase. We do not transfer refunds to a different account
            or payment method.
          </p>
        </div>

        <div className="section">
          <h2><span className="num">6</span>Disputed or Unauthorised Transactions</h2>
          <p>
            If you notice an unauthorised or incorrect charge, please contact us
            at <strong>support@visitingcardextractor.com</strong> before raising
            a chargeback with your bank. We are committed to resolving genuine
            issues quickly and fairly.
          </p>
          <p>
            Raising a chargeback without first contacting us may result in
            account suspension while the dispute is under review.
          </p>
        </div>

        <div className="section">
          <h2><span className="num">7</span>Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Any changes will be
            communicated via email to registered users and reflected on this page
            with an updated "Last Updated" date. Continued use of the Service
            after changes constitutes acceptance of the revised policy.
          </p>
        </div>

        <div className="contact-box">
          <h3>Need a refund or have a question?</h3>
          <p>We typically respond within 24 business hours.</p>
          <a href="mailto:support@visitingcardextractor.com">
            support@visitingcardextractor.com
          </a>
        </div>

      </div>
    </div>
  );
}

export default RefundPolicy;