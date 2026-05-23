import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import "./UploadSection.css";

// ── FIX 1: BASE_URL — fallback to localhost:5000 if env not set ───────────────
const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1000;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
          "image/jpeg", 0.82
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

function UploadSection({ mode, cardSide, bulkCardSide, language, setLoading, setError, onResults,userPhone,onPaywallNeeded,    // ← NEW: jab 402 aaye
  onLoginNeeded, }) {
  const [dragOver, setDragOver]         = useState(false);
  const [previews, setPreviews]         = useState([]);
  const [files, setFiles]               = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const [compressing, setCompressing]   = useState(false);

  const [frontFile, setFrontFile]       = useState(null);
  const [backFile, setBackFile]         = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview]   = useState(null);
  const [bulkItems, setBulkItems]       = useState([]);


  const lastClickRef   = useRef(0);
  const intervalRef    = useRef(null);
  const fileInputRef   = useRef();
  const cameraInputRef = useRef();
  const frontFileRef   = useRef();
  const frontCameraRef = useRef();
  const backFileRef    = useRef();
  const backCameraRef  = useRef();
  const bulkFileRef    = useRef();

  const isMobile = () => window.innerWidth < 769;

  // ── FIX 2: setError ko dependency array se hataao — infinite loop fix ────────
  useEffect(() => {
    setFiles([]);
    setPreviews([]);
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setBulkItems([]);
    setError("");
  }, [mode, cardSide, bulkCardSide]);

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
    const previewPromises = compressed.map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, src: e.target.result });
        reader.readAsDataURL(file);
      })
    );
    Promise.all(previewPromises).then(setPreviews);
  };

  const handleFrontFile = async (selectedFiles) => {
    const file = Array.from(selectedFiles)[0];
    if (!file) return;
    setError("");
    setCompressing(true);
    const compressed = await compressImage(file);
    setFrontFile(compressed);
    setCompressing(false);
    const reader = new FileReader();
    reader.onload = (e) => setFrontPreview({ name: compressed.name, src: e.target.result });
    reader.readAsDataURL(compressed);
  };

  const handleBackFile = async (selectedFiles) => {
    const file = Array.from(selectedFiles)[0];
    if (!file) return;
    setError("");
    setCompressing(true);
    const compressed = await compressImage(file);
    setBackFile(compressed);
    setCompressing(false);
    const reader = new FileReader();
    reader.onload = (e) => setBackPreview({ name: compressed.name, src: e.target.result });
    reader.readAsDataURL(compressed);
  };

  const handleBulkFrontBackFiles = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    setError("");
    setCompressing(true);
    const compressed = await Promise.all(fileArray.map(compressImage));
    setCompressing(false);
    const newItems = await Promise.all(
      compressed.map((file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({
              id: Math.random().toString(36).slice(2),
              file,
              preview: { name: file.name, src: e.target.result },
              role: "front",
              pairId: null,
            });
          reader.readAsDataURL(file);
        })
      )
    );
    setBulkItems((prev) => [...prev, ...newItems]);
  };

  const buildPairs = (items) => {
    const fronts   = items.filter((i) => i.role === "front");
    const backs    = [...items.filter((i) => i.role === "back")]; // copy to avoid mutation
    const pairs    = [];
    const unpaired = [];
    fronts.forEach((f) => {
      const matchIdx = backs.findIndex((b) => b.pairId === f.pairId && f.pairId !== null);
      if (matchIdx !== -1) {
        pairs.push({ front: f, back: backs.splice(matchIdx, 1)[0] });
      } else if (backs.length > 0) {
        pairs.push({ front: f, back: backs.shift() });
      } else {
        unpaired.push(f);
      }
    });
    return { pairs, unpaired, remainingBacks: backs };
  };

  const removeBulkItem = (id) => setBulkItems((prev) => prev.filter((i) => i.id !== id));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (mode === "bulk" && bulkCardSide === "frontback")
      handleBulkFrontBackFiles(e.dataTransfer.files);
    else
      handleFiles(e.dataTransfer.files);
  };

  const handleExtract = useCallback(async () => {
  
    if(!userPhone){
      onLoginNeeded();
      return
    }
  
    const now = Date.now();
    // Countdown throttle
    if (now - lastClickRef.current < 60000) {
      const remaining = Math.ceil((60000 - (now - lastClickRef.current)) / 1000);
      setCountdown(remaining);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      return;
    }
    if (isProcessing) return;

    // Validation
    if (mode === "single" && cardSide === "frontback") {
      if (!frontFile) { setError("Front side ki image upload karo"); return; }
      if (!backFile)  { setError("Back side ki image upload karo");  return; }
    } else if (mode === "bulk" && bulkCardSide === "frontback") {
      if (bulkItems.length === 0) { setError("Pehle images upload karo"); return; }
      if (bulkItems.filter((i) => i.role === "front").length === 0) {
        setError("Kam se kam ek Front image mark karo"); return;
      }
    } else {
      if (files.length === 0) { setError("Pehle image upload karo"); return; }
    }

    lastClickRef.current = now;
    setCountdown(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsProcessing(true);
    setLoading(true);
    setError("");

    // ── FIX 3: Console log for debugging ─────────────────────────────────────
    console.log("BASE_URL:", BASE_URL);
    console.log("mode:", mode, "| cardSide:", cardSide, "| bulkCardSide:", bulkCardSide);

    try {
      // ── Single front only ──────────────────────────────────────────────────
      if (mode === "single" && cardSide === "front") {
        const formData = new FormData();
        formData.append("card", files[0]);
        formData.append("language", language);
        formData.append("email",userPhone);

        console.log("Calling:", `${BASE_URL}/api/extract`);
        const res = await axios.post(`${BASE_URL}/api/extract`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });
        if (res.data.success) {
          onResults(res.data.multiple
            ? res.data.results
            : [{ filename: files[0].name, status: "success", data: res.data.data }]);
        } else { setError("Data extract nahi hua"); }
      }

      // ── Single front + back ────────────────────────────────────────────────
      else if (mode === "single" && cardSide === "frontback") {
        const formData = new FormData();
        formData.append("front", frontFile);
        formData.append("back", backFile);
        formData.append("language", language);
        formData.append("phone",userPhone);

        console.log("Calling:", `${BASE_URL}/api/extract-frontback`);
        const res = await axios.post(`${BASE_URL}/api/extract-frontback`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 180000,
        });
        if (res.data.success) {
          onResults([{ filename: frontFile.name, status: "success", data: res.data.data }]);
        } else { setError("Data extract nahi hua"); }
      }

      // ── Bulk single side ───────────────────────────────────────────────────
      else if (mode === "bulk" && bulkCardSide === "single") {
        const formData = new FormData();
        files.forEach((f) => formData.append("cards", f));
        formData.append("language", language);
        formData.append("phone",userPhone);

        console.log("Calling:", `${BASE_URL}/api/extract-bulk`);
        const response = await fetch(`${BASE_URL}/api/extract-bulk`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Server error" }));
          throw new Error(err.error || `Server error ${response.status}`);
        }
        const data = await response.json();
        if (data.success) onResults(data.results);
      }

      // ── Bulk front + back ──────────────────────────────────────────────────
      else if (mode === "bulk" && bulkCardSide === "frontback") {
        const { pairs, unpaired, remainingBacks } = buildPairs(bulkItems);
        const allResults = [];

        // Process pairs sequentially to avoid rate limits
        for (const { front, back } of pairs) {
          try {
            const formData = new FormData();
            formData.append("front", front.file);
            formData.append("back", back.file);
            formData.append("language", language);
            formData.append("phone",userPhone);

            console.log("Calling pair:", `${BASE_URL}/api/extract-frontback`);
            const res = await axios.post(`${BASE_URL}/api/extract-frontback`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 180000,
            });
            if (res.data.success) {
              allResults.push({ filename: front.file.name, status: "success", data: res.data.data });
            } else {
              allResults.push({ filename: front.file.name, status: "error", error: "Extract failed", data: {} });
            }
          } catch (e) {
            allResults.push({ filename: front.file.name, status: "error", error: e.message, data: {} });
          }
        }

        // Process unpaired as single cards
        const singleCards = [...unpaired, ...remainingBacks];
        if (singleCards.length > 0) {
          const formData = new FormData();
          singleCards.forEach((item) => formData.append("cards", item.file));
          formData.append("language", language);
          formData.append("phone",userPhone);
          try {
            const response = await fetch(`${BASE_URL}/api/extract-bulk`, { method: "POST", body: formData });
            const data = await response.json();
            if (data.success) allResults.push(...data.results);
          } catch (e) {
            singleCards.forEach((item) =>
              allResults.push({ filename: item.file.name, status: "error", error: e.message, data: {} })
            );
          }
        }

        onResults(allResults);
      }

    } catch (err) {
      console.error("Extract error:", err);
  const status  = err.response?.status;
  const errData = err.response?.data;
  const msg     = errData?.error || err.message || "";

  if (status === 402 || errData?.showPaywall) {
    onPaywallNeeded(errData?.message || "Free trial complete — Premium lo!");
    return;
  }
  if (status === 401 || errData?.code === "AUTH_REQUIRED") {
    onLoginNeeded();
    return;
  }
  if (msg.includes("404")) {
    setError(`❌ Route not found — Check REACT_APP_API_URL in .env (current: ${BASE_URL})`);
  } else if (msg.includes("429") || msg.includes("rate_limited")) {
    setError("⏳ Abhi bahut requests aa rahi hain — 1 minute baad dobara try karo");
  } else if (msg.includes("timeout") || msg.includes("ECONNABORTED")) {
    setError("⏳ Request timeout — dobara try karo");
  } else if (msg.includes("Network Error") || msg.includes("ERR_CONNECTION_REFUSED")) {
    setError(`❌ Server se connect nahi ho paya — kya server ${BASE_URL} pe chal raha hai?`);
  } else {
    setError(msg || "Server se connect nahi ho paya");
  }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [files, frontFile, backFile, cardSide, bulkCardSide, bulkItems, mode, language,userPhone, setLoading, setError, onResults,onLoginNeeded,onPaywallNeeded,isProcessing]);

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const { pairs, unpaired, remainingBacks } = buildPairs([...bulkItems]);

  const readyToExtract =
    (mode === "single" && cardSide === "frontback" && frontFile && backFile) ||
    (mode === "single" && cardSide === "front"     && files.length > 0) ||
    (mode === "bulk"   && bulkCardSide === "single" && files.length > 0) ||
    (mode === "bulk"   && bulkCardSide === "frontback" && bulkItems.length > 0);

  return (
    <div className="upload-section">

      {/* ── Single Front+Back UI ─────────────────────────────────────────── */}
      {mode === "single" && cardSide === "frontback" && (
        <div className="frontback-wrap">
          {/* Front */}
          <div className="side-upload-box">
            <div className="side-label">📄 Front Side</div>
            {frontPreview ? (
              <div className="preview-card" style={{ width: "100%" }}>
                <img src={frontPreview.src} alt="front" className="preview-img" />
                <div className="preview-name">{frontPreview.name}</div>
                <button className="preview-remove" onClick={() => { setFrontFile(null); setFrontPreview(null); }}>✕</button>
              </div>
            ) : (
              <div className="side-placeholder">No image selected</div>
            )}
            <div className="side-upload-btns">
              <button className="upload-opt-btn" onClick={() => frontFileRef.current.click()}>🖼️ Gallery</button>
              {isMobile() && (
                <button className="upload-opt-btn" onClick={() => frontCameraRef.current.click()}>📷 Camera</button>
              )}
            </div>
            <input ref={frontFileRef}   type="file" accept="image/*"                     style={{ display:"none" }} onChange={(e) => handleFrontFile(e.target.files)} />
            <input ref={frontCameraRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={(e) => handleFrontFile(e.target.files)} />
          </div>

          {/* Back */}
          <div className="side-upload-box">
            <div className="side-label">📄 Back Side</div>
            {backPreview ? (
              <div className="preview-card" style={{ width: "100%" }}>
                <img src={backPreview.src} alt="back" className="preview-img" />
                <div className="preview-name">{backPreview.name}</div>
                <button className="preview-remove" onClick={() => { setBackFile(null); setBackPreview(null); }}>✕</button>
              </div>
            ) : (
              <div className="side-placeholder">No image selected</div>
            )}
            <div className="side-upload-btns">
              <button className="upload-opt-btn" onClick={() => backFileRef.current.click()}>🖼️ Gallery</button>
              {isMobile() && (
                <button className="upload-opt-btn" onClick={() => backCameraRef.current.click()}>📷 Camera</button>
              )}
            </div>
            <input ref={backFileRef}   type="file" accept="image/*"                     style={{ display:"none" }} onChange={(e) => handleBackFile(e.target.files)} />
            <input ref={backCameraRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={(e) => handleBackFile(e.target.files)} />
          </div>
        </div>
      )}

      {/* ── Bulk Front+Back UI ───────────────────────────────────────────── */}
      {mode === "bulk" && bulkCardSide === "frontback" && (
        <div className="bulk-frontback-wrap">
          <div className="bulk-fb-info">
            <span>📌</span>
            <span>Saari images upload karo → har image ke neeche <strong>Front</strong> ya <strong>Back</strong> set karo → System automatically pair karega</span>
          </div>

          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => bulkFileRef.current.click()}
          >
            <div className="drop-icon">{compressing ? "⏳" : "📤"}</div>
            <p className="drop-title">{compressing ? "Optimizing..." : "Visiting cards upload karo (Front + Back dono)"}</p>
            <p className="drop-sub">JPG, PNG, WEBP • Max 50 images</p>
          </div>
          <input ref={bulkFileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={(e) => handleBulkFrontBackFiles(e.target.files)} />

          {compressing && <div className="compressing-msg">⏳ Optimizing images...</div>}

          {bulkItems.length > 0 && (
            <>
              <div className="bulk-fb-grid">
                {bulkItems.map((item) => (
                  <div key={item.id} className={`bulk-fb-card ${item.role}`}>
                    <button className="preview-remove" onClick={() => removeBulkItem(item.id)}>✕</button>
                    {item.pairId && <div className="pair-badge">Pair #{item.pairId}</div>}
                    <img src={item.preview.src} alt={item.preview.name} className="preview-img" />
                    <div className="preview-name">{item.preview.name}</div>
                    <div className="role-toggle">
                      <button
                        className={`role-btn ${item.role === "front" ? "role-active-front" : ""}`}
                        onClick={() => setBulkItems((prev) =>
                          prev.map((i) => i.id === item.id ? { ...i, role: "front" } : i)
                        )}
                      >📄 Front</button>
                      <button
                        className={`role-btn ${item.role === "back" ? "role-active-back" : ""}`}
                        onClick={() => setBulkItems((prev) =>
                          prev.map((i) => i.id === item.id ? { ...i, role: "back" } : i)
                        )}
                      >🔙 Back</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pair-summary">
                <div className="pair-summary-row">
                  <span>✅ Paired cards:</span>
                  <strong>{pairs.length} pairs ({pairs.length * 2} images)</strong>
                </div>
                {unpaired.length > 0 && (
                  <div className="pair-summary-row warn">
                    <span>⚠️ Unpaired fronts:</span>
                    <strong>{unpaired.length} (sirf front se extract hoga)</strong>
                  </div>
                )}
                {remainingBacks.length > 0 && (
                  <div className="pair-summary-row warn">
                    <span>⚠️ Unpaired backs:</span>
                    <strong>{remainingBacks.length} (sirf back se extract hoga)</strong>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Normal Single / Bulk Single-side UI ─────────────────────────── */}
      {((mode === "single" && cardSide === "front") ||
        (mode === "bulk" && bulkCardSide === "single")) && (
        <>
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!compressing && (!isMobile() || mode === "bulk")) fileInputRef.current.click();
            }}
          >
            <div className="drop-icon">{compressing ? "⏳" : "📤"}</div>
            <p className="drop-title">
              {compressing ? "Optimizing images..."
                : dragOver ? "Chhod do yahan!"
                : mode === "single" ? "Visiting card ki image upload karo"
                : "Visiting cards drag karo ya click karo"}
            </p>
            <p className="drop-sub">JPG, PNG, WEBP supported</p>
            <p className="drop-limit">{mode === "single" ? "1 card at a time" : "Max 50 cards at once"}</p>
            <input ref={fileInputRef}   type="file" accept="image/*" multiple={mode === "bulk"} style={{ display:"none" }} onChange={(e) => handleFiles(e.target.files)} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"      style={{ display:"none" }} onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {mode === "single" && !compressing && (
            <div className="upload-btns">
              <button className="upload-opt-btn" onClick={() => fileInputRef.current.click()}>🖼️ Gallery</button>
              {isMobile() && (
                <button className="upload-opt-btn" onClick={() => cameraInputRef.current.click()}>📷 Camera</button>
              )}
            </div>
          )}
        </>
      )}

      {compressing && <div className="compressing-msg">⏳ Optimizing images...</div>}

      {/* Normal previews */}
      {previews.length > 0 && (mode === "single" ? cardSide === "front" : bulkCardSide === "single") && (
        <div className="previews-wrap">
          <div className="previews-grid">
            {previews.map((p, i) => (
              <div key={i} className="preview-card">
                <img src={p.src} alt={p.name} className="preview-img" />
                <div className="preview-name">{p.name}</div>
                <button className="preview-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {countdown > 0 && (
        <div className="wait-msg">⏳ Please wait <strong>{countdown}s</strong> before trying again</div>
      )}

      {readyToExtract && (
        <button
          className={`extract-btn ${isProcessing ? "processing" : ""}`}
          onClick={handleExtract}
          disabled={isProcessing || compressing}
        >
          {!isProcessing && <span>🤖</span>}
          {isProcessing
            ? "🤖 Processing... please wait"
            : mode === "bulk" && bulkCardSide === "frontback"
            ? `Extract from ${pairs.length} Pairs + ${unpaired.length + remainingBacks.length} Single Cards`
            : cardSide === "frontback"
            ? "Extract Details from Front + Back"
            : `Extract Details from ${previews.length} Card${previews.length > 1 ? "s" : ""}`
          }
        </button>
      )}
    </div>
  );
}

export default UploadSection;