import React, { useState } from "react";
import "./ResultsTable.css";

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "designation", label: "Designation" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "mobile", label: "Mobile" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "products", label: "Products" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
];

// val ko safely string mein convert karo
const safeVal = (val) => {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

function downloadCSV(results) {
  const headers = ["Filename", ...FIELDS.map((f) => f.label)];

  const rows = results.map((r) => {
    const row = [r.filename || ""];
    FIELDS.forEach((f) => {
      const val = safeVal(r.data?.[f.key]).replace(/"/g, '""');
      row.push(`"${val}"`);
    });
    return row.join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `visiting_cards_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ResultsTable({ results, onClear }) {
  const [activeTab, setActiveTab] = useState(0);
  const current = results[activeTab];

  return (
    <div className="results-wrap">
      {/* Header bar */}
      <div className="results-header">
        <div className="results-title">
          <span>✅</span>
          {results.length} Card{results.length > 1 ? "s" : ""} Extracted
        </div>
        <div className="results-actions">
          <button className="btn-csv" onClick={() => downloadCSV(results)}>
            ⬇ Download CSV
          </button>
          <button className="btn-clear" onClick={onClear}>
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Tabs (if multiple) */}
      {results.length > 1 && (
        <div className="tabs">
          {results.map((r, i) => (
            <button
              key={i}
              className={`tab ${activeTab === i ? "active" : ""} ${r.status === "error" ? "tab-error" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {r.status === "error" ? "⚠️" : "✅"} Card {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {current?.status === "error" ? (
        <div className="tab-error-msg">
          Could not extract: {current.error}
        </div>
      ) : (
        <div className="details-grid">
          {FIELDS.map((f) => {
            const val = safeVal(current?.data?.[f.key]);
            return (
              <div key={f.key} className={`detail-row ${!val ? "empty" : ""}`}>
                <div className="detail-label">{f.label}</div>
                <div className="detail-value">{val || "—"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filename badge */}
      <div className="filename-badge">
        📄 {current?.filename}
      </div>
    </div>
  );
}

export default ResultsTable;