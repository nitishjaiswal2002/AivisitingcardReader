import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import "./LoginModal.css";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Popup mode needs apis.google.com/js/api.js to load inside a hidden
// iframe + third-party cookies to talk to accounts.google.com. On slow
// networks, VPNs, ad-blockers, or browsers that block 3rd-party cookies,
// that silently times out and Firebase throws a vague "auth/internal-error".
// Redirect mode avoids the iframe/cookie dance entirely — full page
// navigation to Google and back — so it's the safer default, especially
// on mobile browsers where popups get blocked anyway.
const USE_REDIRECT = true;

export default function LoginModal({ onLogin, onClose }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [step, setStep]         = useState("signin"); // "signin" | "confirm"
  const [pendingUser, setPendingUser] = useState(null); // raw user object from backend
  const [name, setName]         = useState("");         // editable name field

  const finishLogin = async (idToken) => {
    const res  = await fetch(`${BASE_URL}/api/auth/google-login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (data.success && data.user) {
      // Naam edit karne aur scans left dikhane ke liye seedha onLogin
      // call nahi karte — pehle confirm step dikhate hain.
      setPendingUser(data.user);
      setName(data.user.name || "");
      setStep("confirm");
    } else {
      setError(data.error || "Login fail ho gaya, dobara try karo");
    }
  };

  // On redirect flow, the browser leaves the page and comes back — so we
  // must pick the result up on mount, not inside a click handler.
  useEffect(() => {
    if (!USE_REDIRECT) return;
    (async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const idToken = await result.user.getIdToken();
          await finishLogin(idToken);
        }
      } catch (err) {
        console.error("GOOGLE REDIRECT FAILURE:", err.code, err.message);
        setError("Login nahi ho paya, dobara try karo");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Lock background scroll while modal is open ───────────────────────────
  // Without this, iOS Safari lets the page behind the modal scroll/bounce
  // when you drag inside the modal, which feels broken on a phone.
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ✅ Google Sign-In → Firebase ID token → backend verify
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      // Har baar account chooser dikhe, silently last account pe login na ho
      provider.setCustomParameters({ prompt: "select_account" });

      if (USE_REDIRECT) {
        // Page navigates away here; result comes back via getRedirectResult
        // in the useEffect above after Google redirects back to this app.
        await signInWithRedirect(auth, provider);
        return;
      }

      const result  = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await finishLogin(idToken);
    } catch (err) {
      console.error("GOOGLE AUTH FAILURE:", err.code, err.message);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Popup band ho gaya, dobara try karo");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup block ho gaya — browser settings check karo");
      } else if (err.code === "auth/internal-error") {
        setError("Network/browser issue — VPN ya ad-blocker off karke try karo");
      } else {
        setError("Login nahi ho paya, dobara try karo");
      }
    } finally {
      if (!USE_REDIRECT) setLoading(false);
    }
  };

  // ✅ Confirm step: naam save karo (agar badla ho) phir modal band karo
  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Naam khaali nahi ho sakta");
    setLoading(true);
    setError("");
    try {
      let finalUser = pendingUser;
      if (name.trim() !== pendingUser.name) {
        const res  = await fetch(`${BASE_URL}/api/user/update-name`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: pendingUser.email, name: name.trim() }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          finalUser = { ...pendingUser, name: data.user.name };
        } else {
          setError(data.error || "Naam update nahi ho paya");
          setLoading(false);
          return;
        }
      }
      onLogin(finalUser);
    } catch {
      setError("Server se connect nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  // Scans left dikhane ke liye: unlimited/premium ho to scansRemaining,
  // warna freeScansLeft.
  const scansLeftLabel = pendingUser
    ? pendingUser.isPremium
      ? `${pendingUser.scansRemaining} scans bache hain`
      : `${pendingUser.freeScansLeft} free scans bache hain`
    : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {step === "signin" && (
          <>
            <div className="modal-icon">🪪</div>
            <h2 className="modal-title">Welcome to Card Scanner</h2>
            <p className="modal-sub">Google se sign in karo — 5 free scans milenge!</p>

            <div className="modal-form">
              {error && <p className="modal-error">{error}</p>}

              <button
                type="button"
                className="modal-btn google-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.6-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.3 5.2C40.7 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>

            <div className="modal-benefits">
              <div className="benefit-item">✅ 5 scans bilkul free</div>
              <div className="benefit-item">✅ Koi password nahi</div>
              <div className="benefit-item">✅ Data secure rahega</div>
            </div>
          </>
        )}

        {step === "confirm" && pendingUser && (
          <>
            <div className="modal-icon">👋</div>
            <h2 className="modal-title">Welcome, {pendingUser.name}!</h2>
            <p className="modal-sub">Apna naam confirm ya edit kar lo</p>

            <form onSubmit={handleConfirm} className="modal-form">
              <input
                type="text"
                autoComplete="name"
                placeholder="Aapka naam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modal-input"
                autoFocus
              />
              {error && <p className="modal-error">{error}</p>}
              <button type="submit" className="modal-btn" disabled={loading}>
                {loading ? "Saving..." : "Continue →"}
              </button>
            </form>

            <div className="modal-benefits">
              <div className="benefit-item">🔎 {scansLeftLabel}</div>
              {pendingUser.isPremium && (
                <div className="benefit-item">⭐ {pendingUser.plan} plan active</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}