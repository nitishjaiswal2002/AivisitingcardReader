import React, { useState, useEffect, useRef } from "react";
import { auth } from "./firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import "./LoginModal.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function LoginModal({ onLogin, onClose }) {
  const [phone, setPhone]                 = useState("");
  const [name, setName]                   = useState("");
  const [otp, setOtp]                     = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [step, setStep]                   = useState("phone");
  const [confirmResult, setConfirmResult] = useState(null);
  const [isNewUser, setIsNewUser]         = useState(false);

  const containerRef = useRef(null);

  // ✅ Force standard Recaptcha v2 mechanism & clear enterprise modules
  const setupRecaptcha = async () => {
    if (!containerRef.current) return;

    // Turn off testing flags if explicitly leaking, but ensure enterprise is bypassed implicitly
    auth.settings.appVerificationDisabledForTesting = false;

    // Purana instance clean karo
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (_) {}
      window.recaptchaVerifier = null;
    }

    // Clear DOM inside ref
    containerRef.current.innerHTML = "";

    // Naya structural layout instantiating
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerRef.current, {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA validation engine ready.");
      },
      "expired-callback": () => {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          setupRecaptcha();
        }
      }
    });

    try {
      await window.recaptchaVerifier.render();
    } catch (err) {
      console.warn("reCAPTCHA configuration rendering note:", err.message);
    }
  };

  useEffect(() => {
    // Mount hone par init karo
    setupRecaptcha();

    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return setError("Valid 10 digit number daalo");
    }
    setLoading(true);
    setError("");
    try {
      // ✅ DB check route matching
      const res  = await fetch(`${BASE_URL}/api/user/status?phone=${phone}`);
      const data = await res.json();

      // Returning user validation logic
      if (data.success && data.user) {
        onLogin(data.user);
        return;
      }

      // Safe initialization check fallback
      if (!window.recaptchaVerifier) {
        await setupRecaptcha();
      }

      const result = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      setConfirmResult(result);
      setIsNewUser(true); // Status response check sets flag
      setStep("otp");

    } catch (err) {
      console.error("FIREBASE AUTH FAILURE:", err.code, err.message);
      setError("OTP nahi gaya, dobara try karo");
      await setupRecaptcha(); // Reset structure token
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("6 digit OTP daalo");
    setLoading(true);
    setError("");
    try {
      if (!confirmResult) {
        throw new Error("Session expired. Please request OTP again.");
      }
      const result = await confirmResult.confirm(otp);
      const firebaseUid = result.user?.uid || "";

      if (isNewUser) {
        setStep("name");
      } else {
        await loginToBackend(phone, null, firebaseUid);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setError("Invalid OTP, dobara daalo");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Apna naam daalo");
    setLoading(true);
    setError("");
    try {
      const firebaseUid = confirmResult?.user?.uid || auth.currentUser?.uid || "";
      await loginToBackend(phone, name, firebaseUid);
    } catch (err) {
      setError("Registration flow disrupted. Retry.");
    } finally {
      setLoading(false);
    }
  };

  const loginToBackend = async (phone, name, firebaseUid) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/register-or-login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, name, firebaseUid }),
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
  };

  const subtitleText = {
    phone: "Apna mobile number daalo — 5 free scans milenge!",
    otp:   `OTP bheja gaya +91 ${phone} pe`,
    name:  "Pehli baar aa rahe ho! Naam bhi daalo 😊",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-icon">🪪</div>
        <h2 className="modal-title">Welcome to Card Scanner</h2>
        <p className="modal-sub">{subtitleText[step]}</p>

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="modal-form">
            <div className="phone-prefix">
              <span>🇮🇳 +91</span>
              <input
                type="tel"
                placeholder="10 digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                autoFocus
              />
            </div>
            {error && <p className="modal-error">{error}</p>}
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? "Sending..." : "OTP Bhejo →"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="modal-form">
            <input
              type="text"
              placeholder="— — — — — —"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="modal-input otp-input"
              maxLength={6}
              autoFocus
            />
            {error && <p className="modal-error">{error}</p>}
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP ✓"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); setupRecaptcha(); }}
              style={{ background: "none", border: "none", color: "#6366f1", fontSize: "13px", cursor: "pointer", marginTop: "4px" }}
            >
              ← Number change karo
            </button>
          </form>
        )}

        {step === "name" && (
          <form onSubmit={handleRegister} className="modal-form">
            <input
              type="text"
              placeholder="Aapka naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            {error && <p className="modal-error">{error}</p>}
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? "Registering..." : "Start Free Trial 🚀"}
            </button>
          </form>
        )}

        {/* Essential absolute container configuration layout mapping */}
        <div ref={containerRef} style={{ marginTop: "4px" }} />

        <div className="modal-benefits">
          <div className="benefit-item">✅ 5 scans bilkul free</div>
          <div className="benefit-item">✅ Koi password nahi</div>
          <div className="benefit-item">✅ Data secure rahega</div>
        </div>
      </div>
    </div>
  );
}