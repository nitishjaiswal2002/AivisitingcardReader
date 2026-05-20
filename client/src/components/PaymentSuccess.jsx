import React, { useEffect } from "react";
import "./PaymentSuccess.css";

export default function PaymentSuccess({ user, message, onClose }) {
  useEffect(() => {
    // Auto close after 6 seconds
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  const planLabels = {
    pack_10:   "10 Scans Pack",
    pack_25:   "25 Scans Pack",
    pack_50:   "50 Scans Pack",
    unlimited: "Unlimited Plan (1 Month)",
  };

  return (
    <div className="success-overlay">
      <div className="success-box">
        {/* Animated checkmark */}
        <div className="success-check-wrap">
          <div className="success-check">✓</div>
        </div>

        <h2 className="success-title">Payment Successful! 🎉</h2>
        <p className="success-msg">{message}</p>

        <div className="success-details">
          <div className="success-row">
            <span>👤 Name</span>
            <strong>{user.name}</strong>
          </div>
          <div className="success-row">
            <span>📧 Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="success-row">
            <span>📦 Plan</span>
            <strong>{planLabels[user.plan] || user.plan}</strong>
          </div>
          {user.plan !== "unlimited" && (
            <div className="success-row">
              <span>🔢 Scans Available</span>
              <strong>{user.scansRemaining} scans</strong>
            </div>
          )}
          {user.plan === "unlimited" && user.premiumExpiry && (
            <div className="success-row">
              <span>📅 Valid Till</span>
              <strong>{new Date(user.premiumExpiry).toLocaleDateString("en-IN")}</strong>
            </div>
          )}
        </div>

        <button className="success-btn" onClick={onClose}>
          Start Scanning →
        </button>
        <p className="success-auto">Auto-closing in a few seconds...</p>
      </div>
    </div>
  );
}