import React from "react";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <div className="logo-icon">📇</div>
          <div>
            <h1 className="header-title">Visiting Card Extractor</h1>
            <p className="header-sub">AI-powered business card reader — extract & download as CSV</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
