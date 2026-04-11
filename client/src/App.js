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

import "./App.css";

// ── Main home page content ──
function HomePage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single");
  const [language, setLanguage] = useState("auto");
  const [cardSide, setCardSide] = useState("front");
  const [bulkCardSide, setBulkCardSide] = useState("single");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const handleResults = (data) => setResults(data);

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
  }, []);

  // Upload + toggles block (shared between installed/browser mode)
  const uploadBlock = (
    <div id="upload" className="upload-box">
      <div className="toggles-wrap">

        {/* Card Mode */}
        <div className="lang-toggle-wrap">
          <span className="lang-label">Card Mode:</span>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === "single" ? "active" : ""}`}
              onClick={() => handleModeChange("single")}
            >
              Single Card
            </button>
            <button
              className={`mode-btn ${mode === "bulk" ? "active" : ""}`}
              onClick={() => handleModeChange("bulk")}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Card Side — Single */}
        {mode === "single" && (
          <div className="lang-toggle-wrap">
            <span className="lang-label">Card Side:</span>
            <div className="lang-toggle">
              <button
                className={`lang-btn ${cardSide === "front" ? "active" : ""}`}
                onClick={() => handleCardSideChange("front")}
              >
                🃏 Only Front
              </button>
              <button
                className={`lang-btn ${cardSide === "frontback" ? "active" : ""}`}
                onClick={() => handleCardSideChange("frontback")}
              >
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
              <button
                className={`lang-btn ${bulkCardSide === "single" ? "active" : ""}`}
                onClick={() => handleBulkCardSideChange("single")}
              >
                🃏 Single Side
              </button>
              <button
                className={`lang-btn ${bulkCardSide === "frontback" ? "active" : ""}`}
                onClick={() => handleBulkCardSideChange("frontback")}
              >
                🔄 Front + Back
              </button>
            </div>
          </div>
        )}

        {/* Language */}
        <div className="lang-toggle-wrap">
          <span className="lang-label">Card Language:</span>
          <div className="lang-toggle">
            <button
              className={`lang-btn ${language === "auto" ? "active" : ""}`}
              onClick={() => setLanguage("auto")}
            >
              🌐 Auto Detect
            </button>
            <button
              className={`lang-btn ${language === "english" ? "active" : ""}`}
              onClick={() => setLanguage("english")}
            >
              English
            </button>
            <button
              className={`lang-btn ${language === "hindi" ? "active" : ""}`}
              onClick={() => setLanguage("hindi")}
            >
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
        setLoading={setLoading}
        setError={setError}
        onResults={handleResults}
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
          <button onClick={handleInstall} className="install-btn">
            Install App
          </button>
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
          // Installed app: sirf upload
          uploadBlock
        ) : (
          // Browser: poora website
          <>
            <div id="how-it-works">
              <HowItWorks />
            </div>
            {uploadBlock}
            <div id="testimonials">
              <Testimonials />
            </div>
            <div id="faq">
              <FAQ />
            </div>
          </>
        )}
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

// ── App root — Router wraps everything ──
function App() {
  return (
    <Router>
      <Routes>
        {/* Home page */}
        <Route path="/" element={<HomePage />} />

        {/* Policy pages — alag page, apna Header/Footer nahi */}
        <Route path="/privacy-policy"       element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/refund-policy"        element={<RefundPolicy />} />
      </Routes>
    </Router>
  );
}

export default App;