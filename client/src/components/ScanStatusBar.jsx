import React from "react";
import "./ScanStatusBar.css";

export default function ScanStatusBar({ user, onUpgrade }) {
  if (!user) return null;

  const { plan, isPremium, freeScansLeft, scansRemaining, premiumExpiry } = user;

  const isUnlimited = plan === "unlimited";
  const isExpired   = isUnlimited && premiumExpiry && new Date() > new Date(premiumExpiry);

  if (isExpired) {
    return (
      <div className="scan-bar expired">
        <span>⚠️ Aapka Unlimited plan expire ho gaya</span>
        <button className="scan-bar-btn" onClick={onUpgrade}>Renew Now</button>
      </div>
    );
  }

  if (isUnlimited) {
    const expDate = new Date(premiumExpiry).toLocaleDateString("en-IN");
    return (
      <div className="scan-bar unlimited">
        <span>⚡ Unlimited Plan Active · Valid till {expDate}</span>
        <span className="scan-bar-plan">UNLIMITED</span>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="scan-bar premium">
        <span>💎 Premium · <strong>{scansRemaining} scans</strong> remaining</span>
        <button className="scan-bar-btn" onClick={onUpgrade}>Top Up</button>
      </div>
    );
  }

  // Free user
  const pct = ((5 - freeScansLeft) / 5) * 100;
  return (
    <div className="scan-bar free">
      <div className="scan-bar-left">
        <span>🆓 Free Trial: <strong>{freeScansLeft} of 5</strong> scans left</span>
        <div className="scan-progress-wrap">
          <div className="scan-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {freeScansLeft <= 2 && (
        <button className="scan-bar-btn urgent" onClick={onUpgrade}>
          {freeScansLeft === 0 ? "Buy Now 🔓" : "Upgrade ⬆️"}
        </button>
      )}
    </div>
  );
}