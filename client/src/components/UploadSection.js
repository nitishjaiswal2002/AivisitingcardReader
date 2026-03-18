import React, { useState, useRef } from "react";
import axios from "axios";
import "./UploadSection.css";

function UploadSection({ mode, setLoading, setError, onResults, clearResults }) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef();

  const handleFiles = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    if (mode === "single" && fileArray.length > 1) {
      setError("Single mode mein ek hi card upload karo");
      return;
    }
    setError("");
    setFiles(fileArray);

    // Generate previews
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

  const handleExtract = async () => {
    if (files.length === 0) {
      setError("Pehle image upload karo");
      return;
    }

    setLoading(true);
    setError("");
    clearResults();

    try {
      if (mode === "single") {
        const formData = new FormData();
        formData.append("card", files[0]);

        const res = await axios.post("/api/extract", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          onResults([{ filename: files[0].name, status: "success", data: res.data.data }]);
        }
      } else {
        const formData = new FormData();
        files.forEach((f) => formData.append("cards", f));

        const res = await axios.post("/api/extract-bulk", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          onResults(res.data.results);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Server se connect nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  return (
    <div className="upload-section">
      {/* Drop Zone */}
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
          {mode === "single" ? "1 card at a time" : "Max 20 cards at once"}
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

      {/* Previews */}
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

          <button className="extract-btn" onClick={handleExtract}>
            <span>🤖</span>
            Extract Details from {previews.length} Card{previews.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadSection;
