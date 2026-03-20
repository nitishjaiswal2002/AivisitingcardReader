import React, { useState } from "react";
import UploadSection from "./components/UploadSection";
import ResultsTable from "./components/ResultsTable";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single");
  const [language, setLanguage] = useState("auto");

  const handleResults = (data) => setResults(data);

  const clearAll = () => {
    setResults([]);
    setError("");
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        {/* Mode Toggle */}
        <div className="lang-toggle-wrap">
        <span className="lang-label">Card Type:</span>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "single" ? "active" : ""}`}
            onClick={() => { setMode("single"); clearAll(); }}
          >
            Single Card
          </button>
          <button
            className={`mode-btn ${mode === "bulk" ? "active" : ""}`}
            onClick={() => { setMode("bulk"); clearAll(); }}
          >
            Bulk Upload
          </button>
        </div>
       </div>


        {/* Language Toggle */}
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

        <UploadSection
          mode={mode}
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
      </main>
      <Footer/>
    </div>
  );
}

export default App;