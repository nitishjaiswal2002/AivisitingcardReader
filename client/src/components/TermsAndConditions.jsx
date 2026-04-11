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
  .intro-box {
    background: #eff4ff;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    font-size: 14px;
    color: #1e3a8a;
    line-height: 1.7;
    border: 1px solid #c7d8f8;
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
  .warning-box {
    background: #fff7ed;
    border-left: 3px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
    margin-top: 12px;
    font-size: 13px;
    color: #92400e;
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
    .intro-box { padding: 16px; }
  }
`;

function TermsAndConditions() {
  const sections = [
    {
      title: "Acceptance of Terms",
      content: (
        <p>
          By accessing or using Visiting Card Extractor ("Service", "we", "us"),
          you agree to be bound by these Terms and Conditions. If you do not agree,
          please do not use our Service. These terms apply to all visitors and
          registered users.
        </p>
      ),
    },
    {
      title: "Description of Service",
      content: (
        <>
          <p>
            Visiting Card Extractor is an AI-powered web application that extracts
            contact information from visiting card images. The Service includes:
          </p>
          <ul>
            <li>Single and bulk upload of visiting card images (JPG, PNG, PDF)</li>
            <li>AI-powered text extraction supporting English and Hindi</li>
            <li>Export of extracted contact data in CSV and other formats</li>
            <li>Account creation using your email address</li>
          </ul>
        </>
      ),
    },
    {
      title: "User Accounts & Registration",
      content: (
        <>
          <p>
            To access the Service, you register using your email address. By
            registering, you agree to:
          </p>
          <ul>
            <li>Provide a valid and accurate email address</li>
            <li>Keep your login credentials confidential</li>
            <li>Notify us immediately of any unauthorised access to your account</li>
            <li>Take responsibility for all activity that occurs under your account</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these Terms.
          </p>
        </>
      ),
    },
    {
      title: "Permitted Use & Restrictions",
      content: (
        <>
          <p>
            You may use the Service for lawful business and personal purposes only.
            You must NOT:
          </p>
          <ul>
            <li>Upload images that violate the privacy or rights of any individual</li>
            <li>
              Use extracted contact data for spamming, harassment, or any illegal
              activity
            </li>
            <li>
              Attempt to reverse-engineer, scrape, or otherwise misuse the Service
            </li>
            <li>
              Share your account credentials with others or create multiple accounts
            </li>
            <li>
              Use automated tools or bots to upload images beyond normal usage
            </li>
          </ul>
          <div className="warning-box">
            Violation of these restrictions may result in immediate account
            termination.
          </div>
        </>
      ),
    },
    {
      title: "Subscription & Payment",
      content: (
        <>
          <p>We offer free and paid subscription plans. For paid plans:</p>
          <ul>
            <li>
              Payments are processed securely through{" "}
              <strong>Cashfree Payments</strong> (PCI-DSS compliant)
            </li>
            <li>
              Subscriptions auto-renew unless cancelled before the renewal date
            </li>
            <li>
              Prices are listed in Indian Rupees (INR) inclusive of applicable
              taxes
            </li>
            <li>
              You can cancel your subscription anytime from account settings
            </li>
          </ul>
          <p>
            We reserve the right to change pricing with 30 days' advance notice
            to registered users via email.
          </p>
        </>
      ),
    },
    {
      title: "Accuracy of Extracted Data",
      content: (
        <>
          <p>
            Our AI extraction is highly accurate but not guaranteed to be perfect
            in all cases. Accuracy may be lower for:
          </p>
          <ul>
            <li>Low-resolution, blurry, or damaged card images</li>
            <li>Unusual fonts or heavily stylised designs</li>
            <li>Cards with complex or dark backgrounds</li>
          </ul>
          <p>
            You are responsible for verifying extracted data before use. We are
            not liable for any decisions made based on inaccurately extracted
            information.
          </p>
        </>
      ),
    },
    {
      title: "Intellectual Property",
      content: (
        <>
          <p>
            The Service — including its AI models, code, design, and brand name —
            is the exclusive property of Visiting Card Extractor. You are granted
            a limited, non-exclusive licence to use the Service for its intended
            purpose.
          </p>
          <p>
            You retain full ownership of the images you upload and the contact
            data extracted from them.
          </p>
        </>
      ),
    },
    {
      title: "Limitation of Liability",
      content: (
        <>
          <p>
            To the maximum extent permitted by Indian law, Visiting Card Extractor
            shall not be liable for:
          </p>
          <ul>
            <li>
              Any indirect or consequential damages arising from use of the Service
            </li>
            <li>Errors or inaccuracies in AI-extracted contact data</li>
            <li>
              Service downtime or interruptions beyond our reasonable control
            </li>
          </ul>
          <p>
            Our total liability shall not exceed the amount paid by you in the
            3 months preceding the claim.
          </p>
        </>
      ),
    },
    {
      title: "Governing Law",
      content: (
        <p>
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts of [Your City],
          India. We encourage resolving disputes amicably — please contact us
          before initiating any legal proceedings.
        </p>
      ),
    },
    {
      title: "Changes to Terms",
      content: (
        <p>
          We may update these Terms at any time. We will notify registered users
          via email at least 15 days before significant changes take effect.
          Continued use of the Service after the effective date constitutes
          acceptance of the updated Terms.
        </p>
      ),
    },
  ];

  return (
    <div className="policy-page">
      <style>{styles}</style>
      <div className="policy-header">
        <div className="brand">Visiting Card Extractor</div>
        <h1>Terms &amp; Conditions</h1>
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
        <div className="intro-box">
          Please read these Terms carefully before using Visiting Card Extractor.
          By using the Service, you agree to be legally bound by the terms below.
        </div>
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
          <h3>Questions about our Terms?</h3>
          <p>Our support team is happy to help.</p>
          <a href="mailto:support@visitingcardextractor.com">
            support@visitingcardextractor.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;