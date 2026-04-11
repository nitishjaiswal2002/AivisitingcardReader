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

  .highlight-box {
    background: #eff4ff;
    border-left: 3px solid #1e3a8a;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
    margin-top: 12px;
    font-size: 13px;
    color: #1e3a8a;
    font-weight: 500;
    line-height: 1.7;
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
  }
`;

function PrivacyPolicy() {
  const sections = [
    {
      title: "Information We Collect",
      content: (
        <>
          <p>We collect only the minimum information necessary to provide our Service. The only personal information we collect is:</p>
          <ul>
            <li><strong>Email address</strong> — provided by you during account registration or contact form submission</li>
          </ul>
          <p>We do not collect your name, phone number, address, or any other personal details. We do not collect or store the visiting card images you upload beyond the time required to process them.</p>
          <div className="highlight-box">
            We collect only your email address — nothing else. Your visiting card images are processed and discarded immediately after extraction.
          </div>
        </>
      ),
    },
    {
      title: "How We Use Your Email",
      content: (
        <>
          <p>Your email address is used solely for the following purposes:</p>
          <ul>
            <li>Creating and managing your account</li>
            <li>Sending transactional emails such as login links, receipts, and account alerts</li>
            <li>Responding to support queries you initiate</li>
            <li>Sending service-related announcements (e.g. downtime notices, policy updates)</li>
          </ul>
          <div className="highlight-box">
            We do NOT send promotional or marketing emails without your explicit consent. We do NOT sell, rent, or share your email address with any third party.
          </div>
        </>
      ),
    },
    {
      title: "Visiting Card Images",
      content: (
        <>
          <p>Images you upload for extraction are processed in real time by our AI system. We do not store, analyse, or retain uploaded images after the extraction is complete.</p>
          <ul>
            <li>Images are processed in memory and discarded immediately after extraction</li>
            <li>No visiting card image is saved to our servers or databases</li>
            <li>Extracted text data is returned only to you and is not stored on our end unless you explicitly save it</li>
          </ul>
        </>
      ),
    },
    {
      title: "Data Storage & Security",
      content: (
        <p>Your email address is stored securely using industry-standard encryption (AES-256 at rest, TLS 1.2+ in transit). We implement access controls and regular security practices to protect the limited data we hold. Only authorised team members can access stored email records.</p>
      ),
    },
    {
      title: "Third-Party Services",
      content: (
        <>
          <p>We use the following trusted third-party services which may process your email address as part of normal operation:</p>
          <ul>
            <li><strong>Cashfree Payments</strong> — for payment processing (PCI-DSS compliant); they receive your email for transaction receipts</li>
            <li><strong>Email service provider</strong> — for sending transactional emails</li>
            <li><strong>Google Analytics</strong> — for anonymous usage statistics (no personal data)</li>
          </ul>
          <p>We do not share your email with any advertising or data broker services.</p>
        </>
      ),
    },
    {
      title: "Cookies",
      content: (
        <p>We use essential session cookies required for login and basic site functionality. We use Google Analytics cookies for anonymous usage analytics. You can disable analytics cookies via your browser settings without affecting the core Service.</p>
      ),
    },
    {
      title: "Your Rights",
      content: (
        <>
          <p>Regarding your email address, you have the right to:</p>
          <ul>
            <li>Access the email address we hold on your account</li>
            <li>Correct it if it is inaccurate</li>
            <li>Request deletion — we will permanently delete your email and account within 30 days</li>
            <li>Withdraw consent at any time by deleting your account</li>
          </ul>
          <p>To exercise any right, email us at the address below.</p>
        </>
      ),
    },
    {
      title: "Data Retention",
      content: (
        <p>We retain your email address for as long as your account is active. If you delete your account, your email is permanently removed from our systems within <strong>30 days</strong>. We do not retain any other personal data.</p>
      ),
    },
    {
      title: "Children's Privacy",
      content: (
        <p>Our Service is not directed at children under the age of 13. We do not knowingly collect email addresses from children. If you believe a child has registered with us, please contact us and we will delete the account immediately.</p>
      ),
    },
    {
      title: "Changes to This Policy",
      content: (
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via the email address on your account. The "Last Updated" date at the top reflects the most recent revision. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
      ),
    },
  ];

  return (
    <div className="policy-page">
      <style>{styles}</style>
      <div className="policy-header">
        <div className="brand">Visiting Card Extractor</div>
        <h1>Privacy Policy</h1>
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
        {sections.map((s, i) => (
          <div className="section" key={i}>
            <h2>
              <span className="num">{i + 1}</span>
              {s.title}
            </h2>
            {s.content}
          </div>
        ))}
        <div className="contact-box">
          <h3>Questions about your privacy?</h3>
          <p>We're here to help. Reach out anytime.</p>
          <a href="mailto:support@visitingcardextractor.com">
            support@visitingcardextractor.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;