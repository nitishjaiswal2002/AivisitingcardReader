import React, { useState } from "react";
import "./Paywallmodal.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

const PLANS = [
  {
    id:      "pack_10",
    label:   "Starter",
    scans:   10,
    price:   8,
    perScan: "₹0.80/scan",
    color:   "#6366f1",
    badge:   "",
    desc:    "Try karne ke liye best",
  },
  {
    id:      "pack_25",
    label:   "Popular",
    scans:   25,
    price:   20,
    perScan: "₹0.80/scan",
    color:   "#8b5cf6",
    badge:   "🔥 Best Value",
    desc:    "Growing business ke liye",
  },
  {
    id:      "pack_50",
    label:   "Pro",
    scans:   50,
    price:   40,
    perScan: "₹0.80/scan",
    color:   "#06b6d4",
    badge:   "",
    desc:    "Heavy users ke liye",
  },
  {
    id:      "unlimited",
    label:   "Unlimited",
    scans:   "∞",
    price:   200,
    perScan: "Unlimited/month",
    color:   "#f59e0b",
    badge:   "⚡ Best for Teams",
    desc:    "1 mahine mein jitne chahein",
  },
];

// ── Load Cashfree SDK dynamically ─────────────────────────────
const loadCashfreeSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const script    = document.createElement("script");
    // Test: https://sdk.cashfree.com/js/v3/sandbox/cashfree.js
    // Live: https://sdk.cashfree.com/js/v3/cashfree.js
    script.src      = process.env.NODE_ENV === "production"
      ? "https://sdk.cashfree.com/js/v3/cashfree.js"
      : "https://sdk.cashfree.com/js/v3/sandbox/cashfree.js";
    script.onload   = () => resolve(window.Cashfree);
    script.onerror  = () => reject(new Error("Cashfree SDK load failed"));
    document.head.appendChild(script);
  });
};

export default function PaywallModal({ user, onSuccess, onClose }) {
  const [selected, setSelected] = useState("pack_25");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    try {
       
       // ✅ MOCK MODE — Cashfree ID milne ke baad yeh 5 lines hata dena
      if (!process.env.REACT_APP_CASHFREE_APP_ID) {
        await new Promise(r => setTimeout(r, 1500));
        const selectedPlanData = PLANS.find(p => p.id === selected);
        onSuccess(
          {
            ...user,
            isPremium:      true,
            plan:           selected,
            scansRemaining: selectedPlanData?.scans || 10,
            freeScansLeft:  0,
          },
          `✅ ${selectedPlanData?.label} plan activated! ${selectedPlanData?.scans} scans added.`
        );
        setLoading(false);
        return;
      }
      // ── MOCK MODE END ──────────────────────────────────────────
      // 1. Create order on backend
      const orderRes  = await fetch(`${BASE_URL}/api/payment/create-order`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: user.email, plan: selected }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error);

      // 2. Load Cashfree SDK
      const CashfreeSDK = await loadCashfreeSDK();
      const cashfree    = CashfreeSDK({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      // 3. Open Cashfree checkout
      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget:   "_modal", // Opens as popup — no page redirect
      };

      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        throw new Error(result.error.message || "Payment failed");
      }

      if (result.paymentDetails?.paymentStatus === "SUCCESS" || result.redirect) {
        // 4. Verify on backend
        const verifyRes  = await fetch(`${BASE_URL}/api/payment/verify`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            orderId: orderData.orderId,
            email:   user.email,
            plan:    selected,
          }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          onSuccess(verifyData.user, verifyData.message);
        } else {
          // Webhook ne handle kar liya hoga — refresh karo
          setError("Payment ho gaya! Page refresh karo ya thoda wait karo.");
        }
      } else {
        setError("Payment cancel ho gayi. Dobara try karo.");
      }

    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment mein kuch problem aayi");
    } finally {
      setLoading(false);
    }
  };

  const freeLeft    = user?.freeScansLeft ?? 0;
  const selectedPlan = PLANS.find(p => p.id === selected);

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="paywall-header">
          <div className="paywall-icon">🚀</div>
          <h2 className="paywall-title">
            {freeLeft === 0 ? "Free Trial Complete!" : "Upgrade to Premium"}
          </h2>
          <p className="paywall-sub">
            {freeLeft === 0
              ? "Aapke 5 free scans use ho gaye. Premium leke continue karo!"
              : `Sirf ${freeLeft} free scan${freeLeft !== 1 ? "s" : ""} bache hain.`}
          </p>
        </div>

        {/* Plans */}
        <div className="plans-grid">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${selected === plan.id ? "plan-selected" : ""}`}
              style={{ "--plan-color": plan.color }}
              onClick={() => setSelected(plan.id)}
            >
              {plan.badge && <div className="plan-badge">{plan.badge}</div>}
              <div className="plan-label">{plan.label}</div>
              <div className="plan-scans">
                <span className="plan-scans-num">{plan.scans}</span>
                <span className="plan-scans-text"> scans</span>
              </div>
              <div className="plan-price">₹{plan.price}</div>
              <div className="plan-per">{plan.perScan}</div>
              <div className="plan-desc">{plan.desc}</div>
            </div>
          ))}
        </div>

        {/* Why Premium */}
        <div className="paywall-why">
          <div className="why-item">⚡ Instant scan</div>
          <div className="why-item">💾 Auto-save</div>
          <div className="why-item">📊 Excel export</div>
          <div className="why-item">🔄 Bulk upload</div>
        </div>

        {error && <p className="paywall-error">{error}</p>}

        <button className="paywall-btn" onClick={handleBuy} disabled={loading}>
          {loading
            ? "Processing..."
            : `Buy ${selectedPlan?.label} — ₹${selectedPlan?.price}`}
        </button>

        <p className="paywall-secure">
          🔒 Secure payment via Cashfree · UPI / Card / Net Banking / Wallet
        </p>
      </div>
    </div>
  );
}