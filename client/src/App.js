import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadSection from "./components/UploadSection";
import ResultsTable from "./components/ResultsTable";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import WhatsAppButton from "./components/WhatsAppButton";
import FAQ from "./components/FAQ";
import TermsAndConditions from "./components/TermsAndConditions";
import RefundPolicy from "./components/RefundPolicy";
import PrivacyPolicy from "./components/PrivacyPolicy";
import LoginModal from "./components/LoginModal";
import PaywallModal from "./components/Paywallmodal";
import PaymentSuccess from "./components/PaymentSuccess";

import "./App.css";

// ── Main home page content ──
function HomePage() {
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [mode, setMode]               = useState("single");
  const [language, setLanguage]       = useState("auto");
  const [cardSide, setCardSide]       = useState("front");
  const [bulkCardSide, setBulkCardSide] = useState("single");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS]             = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [user, setUser]               = useState(null);
  const [showLogin, setShowLogin]     = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSuccess, setShowSuccess] = useState(null);


    // handle user bar result
   const handleResults = (data) => {
  setResults(data);
  if (user?.phone) {
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/user/status?phone=${encodeURIComponent(user.phone)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setUser(d.user);
          localStorage.setItem("cardscanner_user", JSON.stringify(d.user));
        }
      })
      .catch(() => {});
  }
};

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("cardscanner_user", JSON.stringify(userData));
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("cardscanner_user");
  };

  const handlePaywallNeeded = (msg) => {
    setError(msg);
    setShowPaywall(true);
  };

  const handlePaymentSuccess = (updatedUser, message) => {
    setUser(updatedUser);
    localStorage.setItem("cardscanner_user", JSON.stringify(updatedUser));
    setShowPaywall(false);
    setShowSuccess({ user: updatedUser, message });
  };

  const clearAll = () => {
    setResults([]);
    setError("");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCardSide("front");
    setBulkCardSide("single");
    clearAll();
  };

  const handleCardSideChange = (side) => {
    setCardSide(side);
    clearAll();
  };

  const handleBulkCardSideChange = (side) => {
    setBulkCardSide(side);
    clearAll();
  };

  const handleInstall = () => {
    if (installPrompt) installPrompt.prompt();
  };

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches);
    mq.addEventListener("change", (e) => setIsInstalled(e.matches));

    // ✅ Saved user load karo
    const saved = localStorage.getItem("cardscanner_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
         // ✅ phone nahi hai toh localStorage clear karo — fresh login karwao
       if (!parsed.phone) {
        localStorage.removeItem("cardscanner_user");
        setUser(null);
        return;
       }


        // ✅ phone se refresh karo — email nahi hoga phone-auth mein
        fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/user/status?phone=${encodeURIComponent(parsed.phone)}`)
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              setUser(d.user);
              localStorage.setItem("cardscanner_user", JSON.stringify(d.user));
            }
          })
          .catch(() => {});
      } catch {}
    }
  }, []);

  const uploadBlock = (
    <div id="upload" className="upload-box">

      {/* userBar */}
      {user ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, marginBottom: 10, fontSize: 14, color: "#0369a1" }}>
          {/* ✅ phone dikhao, email nahi */}
          <span>👤 <strong>{user.name}</strong> · +91{user.phone} · {user.isPremium ? `💎 ${user.scansRemaining} scans` : `🆓 ${user.freeScansLeft} free left`}</span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #0369a1", color: "#0369a1", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Logout</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, marginBottom: 12, fontSize: 14, color: "#166534" }}>
          <span>📋 Login karo — 5 free scans milenge!</span>
          <button onClick={() => setShowLogin(true)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Login / Register</button>
        </div>
      )}

      <div className="toggles-wrap">

        {/* Card Mode */}
        <div className="lang-toggle-wrap">
          <span className="lang-label">Card Mode:</span>
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === "single" ? "active" : ""}`} onClick={() => handleModeChange("single")}>
              Single Card
            </button>
            <button className={`mode-btn ${mode === "bulk" ? "active" : ""}`} onClick={() => handleModeChange("bulk")}>
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Card Side — Single */}
        {mode === "single" && (
          <div className="lang-toggle-wrap">
            <span className="lang-label">Card Side:</span>
            <div className="lang-toggle">
              <button className={`lang-btn ${cardSide === "front" ? "active" : ""}`} onClick={() => handleCardSideChange("front")}>
                🃏 Only Front
              </button>
              <button className={`lang-btn ${cardSide === "frontback" ? "active" : ""}`} onClick={() => handleCardSideChange("frontback")}>
                🔄 Front + Back
              </button>
            </div>
          </div>
        )}

        {/* Card Side — Bulk */}
        {mode === "bulk" && (
          <div className="lang-toggle-wrap">
            <span className="lang-label">Card Side:</span>
            <div className="lang-toggle">
              <button className={`lang-btn ${bulkCardSide === "single" ? "active" : ""}`} onClick={() => handleBulkCardSideChange("single")}>
                🃏 Single Side
              </button>
              <button className={`lang-btn ${bulkCardSide === "frontback" ? "active" : ""}`} onClick={() => handleBulkCardSideChange("frontback")}>
                🔄 Front + Back
              </button>
            </div>
          </div>
        )}

        {/* Language */}
        <div className="lang-toggle-wrap">
          <span className="lang-label">Card Language:</span>
          <div className="lang-toggle">
            <button className={`lang-btn ${language === "auto" ? "active" : ""}`} onClick={() => setLanguage("auto")}>
              🌐 Auto Detect
            </button>
            <button className={`lang-btn ${language === "english" ? "active" : ""}`} onClick={() => setLanguage("english")}>
              English
            </button>
            <button className={`lang-btn ${language === "hindi" ? "active" : ""}`} onClick={() => setLanguage("hindi")}>
              Hindi
            </button>
          </div>
        </div>

      </div>

      <UploadSection
        mode={mode}
        cardSide={cardSide}
        bulkCardSide={bulkCardSide}
        language={language}
        userPhone={user?.phone}
        user={user}
        setLoading={setLoading}
        setError={setError}
        onResults={handleResults}
        onPaywallNeeded={handlePaywallNeeded}
        onLoginNeeded={() => setShowLogin(true)}
      />

      {error && (
        <div className="error-box">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>
            {language === "hindi"
              ? "AI आपका हिंदी कार्ड पढ़ रहा है..."
              : "AI is reading your visiting card..."}
          </span>
        </div>
      )}

      {results.length > 0 && !loading && (
        <ResultsTable results={results} onClear={clearAll} />
      )}
    </div>
  );

  return (
    <div className="app">
      <Header />

      {/* Android Install Banner */}
      {installPrompt && !isInstalled && (
        <div className="install-banner">
          <span>📲 App install karo — faster experience!</span>
          <button onClick={handleInstall} className="install-btn">Install App</button>
        </div>
      )}

      {/* iOS Install Instructions */}
      {isIOS && !isInstalled && (
        <div className="install-banner">
          <span>📲 Safari → Share → "Add to Home Screen" karo</span>
        </div>
      )}

      <main className="main-content">
        {isInstalled ? (
          uploadBlock
        ) : (
          <>
            {uploadBlock}
            <div id="how-it-works"><HowItWorks /></div>
            <div id="testimonials"><Testimonials /></div>
            <div id="faq"><FAQ /></div>
          </>
        )}
      </main>

      <Footer />

      {/* ✅ key prop — modal har baar fresh mount hoga, recaptcha double-init nahi hoga */}
      {showLogin && (
        <LoginModal
          key="login-modal"
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      )}

      {showPaywall && user && (
        <PaywallModal
          user={user}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaywall(false)}
        />
      )}

      {showSuccess && (
        <PaymentSuccess
          user={showSuccess.user}
          message={showSuccess.message}
          onClose={() => setShowSuccess(null)}
        />
      )}

      <WhatsAppButton />
    </div>
  );
}

// ── App root — Router wraps everything ──
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"                     element={<HomePage />} />
        <Route path="/privacy-policy"       element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/refund-policy"        element={<RefundPolicy />} />
        <Route path="/payment/status"       element={<PaymentSuccess />} />
      </Routes>
    </Router>
  );
}

export default App;