import React from "react";
import "./HowItWorks.css";

const STEPS = [
  {
    icon: "📸",
    step: "01",
    title: "Upload Card",
    desc: "Visiting card ki photo upload karo — single ya bulk (50 cards tak). Hindi aur English dono supported.",
  },
  {
    icon: "🤖",
    step: "02",
    title: "AI Reads It",
    desc: "Hamara AI instantly name, phone, email, address aur 15 fields extract karta hai — accurately.",
  },
  {
    icon: "⬇️",
    step: "03",
    title: "Download CSV",
    desc: "Ek click mein saara data CSV mein download karo — Excel, Google Sheets, CRM sab mein import hoga.",
  },
];

function HowItWorks() {
  return (
    <section className="how-section">
      <h2 className="how-title">How It Works</h2>
      <p className="how-sub">3 simple steps — no signup, no hassle</p>
      <div className="how-grid">
        {STEPS.map((s, i) => (
          <div key={i} className="how-card">
            <div className="how-step-num">{s.step}</div>
            <div className="how-icon">{s.icon}</div>
            <h3 className="how-card-title">{s.title}</h3>
            <p className="how-card-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;