import React from "react";
import "./Footer.css";
import { Link } from "react-router";





function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* brand */}
        <div className="footer-brand">
          <span className="footer-icon">📇</span>
          <span className="footer-name">Visiting Card Extractor</span>
        </div>


        {/* Policy Links */}
        <div className="footer-links">
          <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
          <span className="footer-divider">·</span>
          <Link to="/terms-and-conditions" className="footer-link">Terms &amp; Conditions</Link>
          <span className="footer-divider">·</span>
          <Link to="/refund-policy" className="footer-link">Refund Policy</Link>
        </div>

        {/*copyright*/}
        <p className="footer-copy">
          © {new Date().getFullYear()} Visiting Card Extractor. All rights reserved.
        </p>

        {/*tagline*/}
        <p className="footer-tagline">
          AI-powered • English & Hindi supported • Bulk upload ready
        </p>
      </div>
    </footer>
  );
}

export default Footer;