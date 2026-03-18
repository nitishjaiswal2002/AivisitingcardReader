import React, { useState } from "react";
import UploadSection from "./components/UploadSection";
import ResultsTable from "./components/ResultsTable";
import Header from "./components/Header";
import "./App.css";

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single"); // "single" | "bulk"

  const handleResults = (data) => {
    setResults((prev) => [...prev, ...data]);
  };

  const clearResults = () => {
    setResults([]);
    setError("");
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "single" ? "active" : ""}`}
            onClick={() => { setMode("single"); clearResults(); }}
          >
            Single Card
          </button>
          <button
            className={`mode-btn ${mode === "bulk" ? "active" : ""}`}
            onClick={() => { setMode("bulk"); clearResults(); }}
          >
            Bulk Upload
          </button>
        </div>

        <UploadSection
          mode={mode}
          setLoading={setLoading}
          setError={setError}
          onResults={handleResults}
          clearResults={clearResults}
        />

        {error && (
          <div className="error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading && (
          <div className="loading-box">
            <div className="spinner" />
            <span>AI is reading your visiting card...</span>
          </div>
        )}

        {results.length > 0 && !loading && (
          <ResultsTable results={results} onClear={clearResults} />
        )}
      </main>
    </div>
  );
}

export default App;
