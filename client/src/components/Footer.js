import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-icon">📇</span>
          <span className="footer-name">Visiting Card Extractor</span>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} Visiting Card Extractor. All rights reserved.
        </p>
        <p className="footer-tagline">
          AI-powered • English & Hindi supported • Bulk upload ready
        </p>
      </div>
    </footer>
  );
}

export default Footer;