import React, { useState } from "react";
import "./FAQ.css";

const faqs = [
  {
    icon: "🤖",
    question: "AI Visiting Card Scanner kaise kaam karta hai?",
    answer:
      "Aap apni visiting card ki photo upload karte ho — humara AI OCR technology se card ki image padh ke automatically Name, Phone Number, Email, Company aur Address extract kar leta hai. Koi manual entry nahi chahiye.",
  },
  {
    icon: "🌐",
    question: "Kaunsi languages support hoti hain?",
    answer:
      "Hamara tool Hindi aur English dono languages ki visiting cards support karta hai. Aap 'Auto Detect' mode use kar sakte ho jisme AI khud language identify kar leta hai, ya manually Hindi/English select kar sakte ho.",
  },
  {
    icon: "📁",
    question: "CSV aur Excel mein export kaise kare?",
    answer:
      "Data extract hone ke baad Results table ke neeche 'Download CSV' ya 'Download Excel' button dikhega. Ek click mein saari details spreadsheet mein save ho jayengi — seedha Excel ya Google Sheets mein khol sakte ho.",
  },
  {
    icon: "📦",
    question: "Bulk upload kaise kaam karta hai?",
    answer:
      "'Bulk Upload' mode select karo aur ek saath 50 tak visiting card images upload karo. Sab cards ek saath process honge aur ek hi file mein saara data milega. Front+Back dono sides bhi support hoti hain.",
  },
  {
    icon: "🔄",
    question: "Front aur Back dono sides scan kar sakte hain?",
    answer:
      "Haan! 'Front + Back' mode select karo — pehle front side upload karo, phir back side. AI dono se data combine karke ek complete contact entry banega. Bulk mode mein bhi yeh feature available hai.",
  },
  {
    icon: "🔒",
    question: "Mera data secure hai?",
    answer:
      "Bilkul. Aapki uploaded images sirf processing ke liye use hoti hain aur kahi store nahi hoti. Koi personal data save nahi kiya jaata. Aapki privacy hamari priority hai.",
  },
  {
    icon: "💸",
    question: "Kya yeh tool bilkul free hai?",
    answer:
      "Haan, yeh tool completely free hai. Koi signup, registration ya payment ki zaroorat nahi. Seedha visit karo, card upload karo, aur data extract karo.",
  },
  {
    icon: "📱",
    question: "Mobile pe use kar sakte hain?",
    answer:
      "Haan! Mobile browser pe kaam karta hai. Mobile pe aapko Camera ka option bhi milta hai — seedha card ki photo kheench ke upload kar sakte ho bina gallery mein save kiye.",
  },
  {
    icon: "⚠️",
    question: "Agar data galat extract ho to kya kare?",
    answer:
      "Clear aur achhi lighting wali photo use karo. Blurry ya dark images mein accuracy kam ho sakti hai. Agar phir bhi galat aaye to Results table mein directly edit kar sakte ho export se pehle.",
  },
  {
    icon: "🖼️",
    question: "Kaunse image formats supported hain?",
    answer:
      "JPG, PNG aur WEBP formats support hote hain. Best results ke liye high resolution image use karo jisme text clearly visible ho.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="faq-section" id="faq">
      <div className="faq-header">
        <span className="faq-badge">FAQ</span>
        <h2 className="faq-title">Aksar Puche Jaane Wale Sawaal</h2>
        <p className="faq-subtitle">
          Visiting Card Scanner ke baare mein aapke saare sawaalon ke jawaab yahan hain
        </p>
      </div>

      <div className="faq-list">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className={`faq-item ${openIndex === i ? "open" : ""}`}
            onClick={() => toggle(i)}
          >
            <div className="faq-question">
              <span className="faq-icon">{faq.icon}</span>
              <span className="faq-q-text">{faq.question}</span>
              <span className="faq-chevron">{openIndex === i ? "▲" : "▼"}</span>
            </div>
            {openIndex === i && (
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}