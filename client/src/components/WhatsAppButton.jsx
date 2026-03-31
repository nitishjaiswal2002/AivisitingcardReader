import React, { useState } from "react";
import "./WhatsAppButton.css";

// ── Apna WhatsApp number yahan daalo (country code ke saath, no + or spaces) ──
const WHATSAPP_NUMBER = "918896229013"; // Example: 91 = India, phir 10 digit number
const WHATSAPP_MESSAGE = "Hello! I need help with visiting card scanning.";

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <div className="wa-wrapper">
      {/* Tooltip */}
      {showTooltip && (
        <div className="wa-tooltip">
          Chat with us on WhatsApp! 💬
        </div>
      )}

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-btn"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Chat on WhatsApp"
      >
        {/* Pulse rings */}
        <span className="wa-pulse" />
        <span className="wa-pulse wa-pulse-2" />

        {/* WhatsApp SVG Icon */}
        <svg
          className="wa-icon"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          fill="white"
        >
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.738 5.49 2.027 7.8L0 32l8.418-2.01A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.79-1.857l-.487-.29-5.002 1.194 1.237-4.863-.317-.5A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.873c-.397-.199-2.352-1.16-2.717-1.292-.365-.133-.63-.199-.896.199-.265.397-1.028 1.292-1.26 1.558-.232.265-.464.298-.861.1-.397-.2-1.676-.618-3.192-1.97-1.18-1.052-1.977-2.351-2.208-2.748-.232-.397-.025-.612.174-.81.178-.177.397-.464.596-.696.199-.232.265-.397.397-.662.133-.265.066-.497-.033-.696-.1-.199-.896-2.16-1.228-2.957-.323-.776-.65-.67-.896-.683-.232-.012-.497-.015-.762-.015s-.696.1-.861.298c-.365.397-1.393 1.36-1.393 3.317 0 1.957 1.426 3.847 1.625 4.112.199.265 2.806 4.283 6.798 6.005.95.41 1.692.655 2.27.839.954.303 1.823.26 2.51.158.765-.114 2.352-.962 2.684-1.89.332-.928.332-1.724.232-1.89-.1-.165-.365-.265-.762-.464z" />
        </svg>
      </a>
    </div>
  );
}