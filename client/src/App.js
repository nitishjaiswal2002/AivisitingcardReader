import React, { useState } from "react";
import UploadSection from "./components/UploadSection";
import ResultsTable from "./components/ResultsTable";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import "./App.css";

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single");
  const [language, setLanguage] = useState("auto");
  const [cardSide, setCardSide] = useState("front");
  const [bulkCardSide, setBulkCardSide] = useState("single");

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

  return (
    <div className="app">
      <Header />

      <main className="main-content">

        <div id="how-it-works">
          <HowItWorks />
        </div>

        <div id="upload" className="upload-box">
          <div className="toggles-wrap">

            {/* Card Mode — Single / Bulk */}
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

            {/* Card Side — Single mode */}
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

            {/* Card Side — Bulk mode */}
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

            {/* Card Language */}
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

        <div id="testimonials">
          <Testimonials />
        </div>

        <div id="faq" />

      </main>

      <Footer />
    </div>
  );
}

export default App;