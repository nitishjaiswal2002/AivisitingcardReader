import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import "./UploadSection.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

function UploadSection({ mode, language, setLoading, setError, onResults }) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastClickRef = useRef(0);
  const fileInputRef = useRef();

  const handleFiles = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    if (mode === "single" && fileArray.length > 1) {
      setError("Single mode mein ek hi card upload karo");
      return;
    }
    setError("");
    setFiles(fileArray);

    const previewPromises = fileArray.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, src: e.target.result });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then(setPreviews);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleExtract = useCallback(async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 10000) {
      alert("Please wait 10 seconds before trying again!");
      return;
    }
    if (isProcessing) return;
    lastClickRef.current = now;
    setIsProcessing(true);
    if (files.length === 0) {
      setError("Pehle image upload karo");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "single") {
        const formData = new FormData();
        formData.append("card", files[0]);
        formData.append("language", language);

        const res = await axios.post(`${BASE_URL}/api/extract`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          if (res.data.multiple) {
            // ek image mein multiple cards detect hue
            onResults(res.data.results);
          } else {
            onResults([{ filename: files[0].name, status: "success", data: res.data.data }]);
          }
        } else {
          setError("Data extract nahi hua");
        }
      } else {
        const formData = new FormData();
        files.forEach((f) => formData.append("cards", f));
        formData.append("language", language);

        const res = await axios.post(`${BASE_URL}/api/extract-bulk`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          onResults(res.data.results);
        }
      }
    } catch (err) {
      console.error("Extract error:", err);
      setError(err.response?.data?.error || "Server se connect nahi ho paya");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [files, mode, language, setLoading, setError, onResults, isProcessing]);

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <div className="drop-icon">📤</div>
        <p className="drop-title">
          {dragOver ? "Chhod do yahan!" : "Visiting card ki image drag karo"}
        </p>
        <p className="drop-sub">ya click karke select karo • JPG, PNG, WEBP supported</p>
        <p className="drop-limit">
          {mode === "single" ? "1 card at a time" : "Max 50 cards at once"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={mode === "bulk"}
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="previews-wrap">
          <div className="previews-grid">
            {previews.map((p, i) => (
              <div key={i} className="preview-card">
                <img src={p.src} alt={p.name} className="preview-img" />
                <div className="preview-name">{p.name}</div>
                <button
                  className="preview-remove"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            className={`extract-btn ${isProcessing ? "processing" : ""}`}
            onClick={handleExtract}
            disabled={isProcessing}
          >
            <span>🤖</span>
            {isProcessing
              ? "Processing... Please wait"
              : `Extract Details from ${previews.length} Card${previews.length > 1 ? "s" : ""}`
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadSection;