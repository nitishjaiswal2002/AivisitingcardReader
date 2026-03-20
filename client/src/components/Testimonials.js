import React from "react";
import "./Testimonials.css";

const REVIEWS = [
  {
    name: "Rajesh Sharma",
    role: "Sales Manager, Delhi",
    text: "Bahut kaam ki cheez hai! 50 cards ek saath upload kiye aur sab CSV mein aa gaye. Ghanton ka kaam minutes mein.",
    stars: 5,
  },
  {
    name: "Priya Mehta",
    role: "Entrepreneur, Mumbai",
    text: "Hindi cards bhi perfectly read kar leta hai. Maine apne suppliers ke cards daalein — sab details bilkul sahi nikali.",
    stars: 5,
  },
  {
    name: "Amit Verma",
    role: "Marketing Executive, Jaipur",
    text: "Exhibition ke baad 200 cards the hamare paas. Bulk upload se sab kuch ek CSV mein aa gaya. Highly recommended!",
    stars: 5,
  },
  {
    name: "Sunita Agarwal",
    role: "Business Owner, Lucknow",
    text: "Free hai aur itna accurate — mujhe believe nahi hua pehle. Ab roz use karta hun apne contacts manage karne ke liye.",
    stars: 4,
  },
];

function Stars({ count }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= count ? "star filled" : "star"}>★</span>
      ))}
    </div>
  );
}

function Testimonials() {
  return (
    <section className="testimonials">
      <h2 className="testimonials-title">What Users Say</h2>
      <p className="testimonials-sub">Thousands of professionals trust our tool daily</p>
      <div className="testimonials-grid">
        {REVIEWS.map((r, i) => (
          <div key={i} className="review-card">
            <Stars count={r.stars} />
            <p className="review-text">"{r.text}"</p>
            <div className="review-author">
              <div className="review-avatar">{r.name[0]}</div>
              <div>
                <div className="review-name">{r.name}</div>
                <div className="review-role">{r.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;