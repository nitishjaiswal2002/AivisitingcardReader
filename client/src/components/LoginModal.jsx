import React, { useState } from "react";
import "./LoginModal.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function LoginModal({ onLogin, onClose }) {
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [step, setStep]     = useState("email"); // "email" | "name"

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Email dalo");
    setLoading(true);
    setError("");
    try {
      // Check if user exists
      const res  = await fetch(`${BASE_URL}/api/user/status?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) {
        // Existing user — login directly
        onLogin(data.user);
      } else {
        // New user — ask name
        setStep("name");
      }
    } catch {
      setStep("name"); // Assume new user
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Apna naam dalo");
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/register-or-login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || "Kuch galat hua");
      }
    } catch {
      setError("Server se connect nahi ho paya");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-icon">🪪</div>
        <h2 className="modal-title">Welcome to Card Scanner</h2>
        <p className="modal-sub">
          {step === "email"
            ? "Apna email dalo — 5 free scans milenge!"
            : "Pehli baar aa rahe ho! Naam bhi dalo 😊"}
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="modal-form">
            <input
              type="email"
              placeholder="aapka@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="modal-input"
              autoFocus
            />
            {error && <p className="modal-error">{error}</p>}
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? "Checking..." : "Continue →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="modal-form">
            <input
              type="text"
              placeholder="Aapka naam"
              value={name}
              onChange={e => setName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <input
              type="email"
              value={email}
              readOnly
              className="modal-input readonly"
            />
            {error && <p className="modal-error">{error}</p>}
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? "Registering..." : "Start Free Trial 🚀"}
            </button>
          </form>
        )}

        <div className="modal-benefits">
          <div className="benefit-item">✅ 5 scans bilkul free</div>
          <div className="benefit-item">✅ Koi password nahi chahiye</div>
          <div className="benefit-item">✅ Data secure rahega</div>
        </div>
      </div>
    </div>
  );
}