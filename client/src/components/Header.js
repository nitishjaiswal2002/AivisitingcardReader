import React, { useState } from "react";
import "./Header.css";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo">
          <div className="logo-icon">📇</div>
          <div>
            <h1 className="header-title">Visiting Card Extractor</h1>
            <p className="header-sub">AI-powered business card reader — extract & download as CSV</p>
          </div>
        </div>

        {/* Nav — desktop */}
        <nav className="header-nav">
          <button className="nav-link" onClick={() => scrollTo("how-it-works")}>How it Works</button>
          <button className="nav-link" onClick={() => scrollTo("faq")}>FAQ</button>
          <button className="nav-link" onClick={() => scrollTo("testimonials")}>Reviews</button>
          <button className="nav-link nav-cta" onClick={() => scrollTo("upload")}>Try Now ↑</button>
        </nav>

        {/* Hamburger — mobile */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Badges */}
      <div className="header-badges-wrap">
        <div className="header-badges">
          <span className="badge badge-green">✅ 100% Free</span>
          <span className="badge badge-blue">🔒 No Data Stored</span>
          <span className="badge badge-purple">🇮🇳 Hindi Supported</span>
          <span className="badge badge-orange">⚡ Bulk Upload</span>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <button className="mobile-nav-link" onClick={() => scrollTo("how-it-works")}>How it Works</button>
          <button className="mobile-nav-link" onClick={() => scrollTo("faq")}>FAQ</button>
          <button className="mobile-nav-link" onClick={() => scrollTo("testimonials")}>Reviews</button>
          <button className="mobile-nav-link mobile-cta" onClick={() => scrollTo("upload")}>Try Now ↑</button>
        </div>
      )}
    </header>
  );
}

export default Header;