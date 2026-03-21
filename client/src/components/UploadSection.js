import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import "./UploadSection.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
          "image/jpeg",
          0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

function UploadSection({ mode, language, setLoading, setError, onResults }) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const lastClickRef = useRef(0);
  const intervalRef = useRef(null);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const handleFiles = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    if (mode === "single" && fileArray.length > 1) {
      setError("Single mode mein ek hi card upload karo");
      return;
    }
    setError("");
    setCompressing(true);
    const compressed = await Promise.all(fileArray.map(compressImage));
    setFiles(compressed);
    setCompressing(false);

    const previewPromises = compressed.map((file) => {
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

    if (now - lastClickRef.current < 60000) {
      const remaining = Math.ceil((60000 - (now - lastClickRef.current)) / 1000);
      setCountdown(remaining);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    if (isProcessing) return;
    lastClickRef.current = now;
    setCountdown(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
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
      const msg = err.response?.data?.error || "";
      if (msg.includes("429") || msg.includes("rate_limited")) {
        setError("⏳ Server busy hai, 1 minute baad dobara try karo");
      } else {
        setError(msg || "Server se connect nahi ho paya");
      }
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
        onClick={() => {
          if (compressing) return;
          const isDesktop = window.innerWidth >= 769;
          if (isDesktop || mode === "bulk") fileInputRef.current.click();
        }}
      >
        <div className="drop-icon">{compressing ? "⏳" : "📤"}</div>
        <p className="drop-title">
          {compressing
            ? "Optimizing images..."
            : dragOver
            ? "Chhod do yahan!"
            : mode === "single"
            ? "Visiting card ki image upload karo"
            : "Visiting cards drag karo ya click karo"}
        </p>
        <p className="drop-sub">JPG, PNG, WEBP supported</p>
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
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Mobile only — single mode mein Gallery + Camera buttons */}
      {mode === "single" && !compressing && (
        <div className="upload-btns">
          <button
            className="upload-opt-btn"
            onClick={() => fileInputRef.current.click()}
          >
            🖼️ Gallery
          </button>
          <button
            className="upload-opt-btn"
            onClick={() => cameraInputRef.current.click()}
          >
            📷 Camera
          </button>
        </div>
      )}

      {compressing && (
        <div className="compressing-msg">⏳ Optimizing images...</div>
      )}

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

          {countdown > 0 && (
            <div className="wait-msg">
              ⏳ Please wait <strong>{countdown}s</strong> before trying again
            </div>
          )}

          <button
            className={`extract-btn ${isProcessing ? "processing" : ""}`}
            onClick={handleExtract}
            disabled={isProcessing || compressing}
          >
            {!isProcessing && <span>🤖</span>}
            {isProcessing
              ? "🤖 AI is reading your card..."
              : `Extract Details from ${previews.length} Card${previews.length > 1 ? "s" : ""}`
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadSection;