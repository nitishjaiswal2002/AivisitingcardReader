import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { saveCard, getAllCards } from "./Controller/cardController.js";
import { User } from "./Models/User.js";
import crypto from "crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

// ── Firebase Admin (for verifying Google Sign-In tokens) ─────────────────────
// Stored as base64 in .env to avoid JSON-escaping/newline issues that
// plain .env files (especially on Windows) have with the private_key field.
// Get the raw service-account JSON from Firebase Console → Project Settings
// → Service Accounts → Generate new private key, then base64-encode it:
//   node -e "console.log(Buffer.from(require('fs').readFileSync('./serviceAccountKey.json')).toString('base64'))"
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 missing in .env");
const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
initializeApp({
  credential: cert(JSON.parse(serviceAccountJson)),
});

const CF_BASE    = process.env.CF_BASE_URL || "https://sandbox.cashfree.com";
const CF_VERSION = "2023-08-01";
const CF_APP_ID  = process.env.CASHFREE_APP_ID;
const CF_SECRET  = process.env.CASHFREE_SECRET_KEY;

const PLANS = {
  pack_10:   { label: "Starter",   amount: 8,   scans: 10 },
  pack_25:   { label: "Popular",   amount: 20,  scans: 25 },
  pack_50:   { label: "Pro",       amount: 40,  scans: 50 },
  unlimited: { label: "Unlimited", amount: 200, scans: 999999 },
};

if (!process.env.MONGO_URI) throw new Error("❌ MONGO_URI missing in .env");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const OCR_MODEL       = "mistral-ocr-latest";
const EXTRACT_MODEL   = "mistral-medium-latest";

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const CARD_DETECTION_RULES = `
CARD DETECTION RULES — VERY IMPORTANT:
- ONE card: Same person/company with multiple contact details → return SINGLE JSON object
- MULTIPLE cards: Clearly different people/companies with different names → return JSON ARRAY

MERGING RULES:
1. MULTIPLE ADDRESSES on same card → combine: "Office: 123 ABC Road | Factory: 456 XYZ Nagar"
2. MULTIPLE EMAILS on same card → comma separated: "info@co.com, sales@co.com"
3. MULTIPLE PHONES → first in phone field, second in mobile field
4. Same name/company + multiple addresses = ONE card (merge address)
5. Different names/companies = MULTIPLE cards (return array)
6. Do NOT split one card into multiple objects
7. Do NOT merge different people into one object
`;

const PROMPTS = {
  english: `You are the world's best business card data extraction specialist.
Given OCR text from a business card image, extract information into JSON.
${CARD_DETECTION_RULES}
CRITICAL RULES:
1. Roman numerals (III, IV, VI) — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only (grnail→gmail, yarnoo→yahoo, rediffrnail→rediffmail)
3. Do NOT change email username (before @)
4. PHONE: ONLY digits 0-9, +, -, (), space — remove any letters
5. NAMES: Proper case, keep exact spelling
6. ADDRESS: Extract complete address — building, street, area, city, pincode
7. City → city field, State → state field separately
8. Country → "India" if address looks Indian
9. Return ONLY JSON — no markdown, no explanation
10. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
11. Sirf woh fields return karo jo actually card pe hain
12. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  hindi: `You are the world's best business card data extraction specialist for Hindi and English cards.
Given OCR text from a business card image, extract information into JSON.
${CARD_DETECTION_RULES}
HINDI RULES:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner", "निदेशक" → "Director")
- Translate Hindi company types (e.g. "प्राइवेट लिमिटेड" → "Pvt Ltd")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES:
1. Roman numerals — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only, do NOT change username
3. PHONE: ONLY digits 0-9, +, -, (), space
4. NAMES: Proper case after transliteration
5. Return ONLY JSON — no markdown, no explanation

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  auto: `You are the world's best business card data extraction specialist.
Given OCR text from a business card image, extract information into JSON.
Card may be in English, Hindi (Devanagari), or mixed.
${CARD_DETECTION_RULES}
HINDI HANDLING:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES:
1. Roman numerals (III, IV, VI, IX) — keep EXACTLY as written, never convert
2. EMAIL: fix domain OCR errors only (grnail→gmail, yarnoo→yahoo, rediffrnail→rediffmail)
3. Do NOT change email username (before @)
4. PHONE: ONLY digits 0-9, +, -, (), space
5. NAMES: Proper case, exact spelling — never autocorrect
6. COMPANY: Keep original spelling, Roman numerals as-is
7. ADDRESS: Complete address. City → city field. State → state field. 6-digit Indian pincodes.
8. Country → "India" if address looks Indian and country not mentioned
9. SOCIAL: LinkedIn URL/username, Twitter/Instagram handle, WhatsApp number
10. Return ONLY JSON — no markdown, no explanation
11. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
12. Sirf woh fields return karo jo actually card pe hain
13. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,
};

const FRONTBACK_PROMPT = `You are the world's best business card data extraction specialist.
You are given OCR text from BOTH SIDES of a single business card.
Combine into ONE complete JSON object.
${CARD_DETECTION_RULES}
FRONT+BACK MERGING RULES:
1. ADDRESS: Merge both sides into one complete address
2. PHONE/MOBILE: Different numbers → phone and mobile separately
3. EMAIL: Same → keep one. Different → comma separated
4. NAME/COMPANY/DESIGNATION: Prefer front side values
5. PRODUCTS/SERVICES: Back side product list → products field
6. SOCIAL MEDIA: Back side usually has social links

CRITICAL RULES:
1. Roman numerals — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only, do NOT change username
3. PHONE: ONLY digits 0-9, +, -, (), space
4. Return ONLY ONE JSON object — no array
5. Return ONLY JSON — no markdown, no explanation
6. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
7. Sirf woh fields return karo jo actually card pe hain
8. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`;

const BATCH_CONFIG = {
  english: { batchSize: 5, batchDelay: 2000 },
  auto:    { batchSize: 5, batchDelay: 2000 },
  hindi:   { batchSize: 3, batchDelay: 5000 },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only images allowed"));
  },
});

app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// ── Identify user by whichever identifier is present ─────────────────────────
// Frontend now sends `email` (Google Sign-In). `phone` is kept as a fallback
// for any user records created before the Google-auth switch, and for the
// optional phone-verification-at-payment flow.
const getUserFilter = (source) => {
  const email = source.email;
  const phone = source.phone;
  if (email) return { email };
  if (phone) return { phone };
  return null;
};

// SCAN quota middleware
const checkScanQuota = async (req, res, next) => {
  try {
    const source = { ...req.query, ...req.body };
    const filter = getUserFilter(source);
    if (!filter) return res.status(401).json({
      error: "Login required", code: "AUTH_REQUIRED",
      message: "Pehle login karo",
    });

    const user = await User.findOne(filter);
    if (!user) return res.status(404).json({
      error: "User not found", code: "USER_NOT_FOUND",
      message: "Account nahi mila, dobara login karo",
    });

    let scanCount = 1;
    if (req.files) {
      if (Array.isArray(req.files)) scanCount = req.files.length;
      else if (req.files.cards) scanCount = req.files.cards.length;
    } else if (req.file) {
      scanCount = 1;
    }

    const status = user.canScan(scanCount);
    if (!status.allowed) {
      if (status.reason === "excited" || status.reason === "expired")
        return res.status(402).json({
          error: "Premium expired", showPaywall: true,
          message: "Aapka unlimited plan expire ho gya.",
        });
      return res.status(402).json({
        error: "Scan limit reached", showPaywall: true,
        message: status.reason === "exhausted"
          ? "Aapka 5 free scans complete ho gaye. Premium lo!"
          : "Aapke scans khatam ho gaye",
      });
    }
    req.scanUser = user;
    req.scanCount = scanCount;
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const deductAfterScan = async (req) => {
  if (!req.scanUser) return;
  req.scanUser.deductScan(req.scanCount || 1);
  await req.scanUser.save();
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

// ── OCR ───────────────────────────────────────────────────────────────────────
async function ocrImage(buffer, mimeType, retries = 3) {
  const base64 = buffer.toString("base64");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OCR_MODEL,
          document: { type: "image_url", image_url: `data:${mimeType};base64,${base64}` },
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`OCR error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      return data.pages?.map(p => p.markdown || p.text || "").join("\n") || "";
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("OCR timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Extract from OCR ──────────────────────────────────────────────────────────
async function extractFromOCR(ocrText, language = "auto", retries = 3) {
  const prompt = PROMPTS[language] || PROMPTS.auto;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          messages: [{ role: "user", content: `${prompt}\n\nOCR Text:\n${ocrText}` }],
          max_tokens: 1500,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`Extract error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      try { return JSON.parse(raw); } catch {
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (arrMatch) return JSON.parse(arrMatch[0]);
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error("Parse failed: " + raw.slice(0, 100));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("Extract timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Extract Front+Back ────────────────────────────────────────────────────────
async function extractFromFrontBack(frontOCR, backOCR, retries = 3) {
  const combinedText = `=== FRONT SIDE ===\n${frontOCR}\n\n=== BACK SIDE ===\n${backOCR}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          messages: [{ role: "user", content: `${FRONTBACK_PROMPT}\n\n${combinedText}` }],
          max_tokens: 1500,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`FrontBack error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      try { return JSON.parse(raw); } catch {
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error("FrontBack parse failed: " + raw.slice(0, 100));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("FrontBack timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Clean helpers ─────────────────────────────────────────────────────────────
const cleanEmail = (val) => {
  if (!val || typeof val !== "string") return val;
  const emails = val.split(",").map(e => e.trim()).filter(Boolean);
  const cleaned = emails.map(email => {
    if (!email.includes("@")) return email;
    const atIndex = email.lastIndexOf("@");
    const username = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1).toLowerCase();
    const domainFixes = {
      "grnail.com": "gmail.com", "gmial.com": "gmail.com", "gmai.com": "gmail.com",
      "yarnoo.com": "yahoo.com", "yahooo.com": "yahoo.com", "yah00.com": "yahoo.com",
      "hotrnail.com": "hotmail.com", "hotmai.com": "hotmail.com",
      "rediffrnail.com": "rediffmail.com", "redifmail.com": "rediffmail.com",
      "icloud.corn": "icloud.com", "gmail.corn": "gmail.com",
      "yahoo.corn": "yahoo.com", "hotmail.corn": "hotmail.com",
    };
    return `${username}@${domainFixes[domain] || domain}`;
  });
  const unique = [...new Set(cleaned)];
  return unique.join(", ");
};

const cleanPhone = (val) => {
  if (!val || typeof val !== "string") return val;
  return val
    .replace(/[OoIlSB]/g, (c) => ({ O:"0", o:"0", I:"1", l:"1", S:"5", B:"8" }[c] || c))
    .replace(/[^0-9+\-() ]/g, "")
    .trim();
};

const cleanAddress = (val) => {
  if (!val || typeof val !== "string") return val;
  const parts = val.split("|").map(p => p.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(" | ");
};

// ── Blank fields remover ──────────────────────────────────────────────────────
const BLANK_VALUES = new Set([
  "", "N/A", "n/a", "NA", "na", "-", "--", "none", "None",
  "NONE", "null", "NULL", "undefined", "not available",
  "Not Available", "N.A.", "n.a."
]);

const removeBlankFields = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      value !== null &&
      value !== undefined &&
      !BLANK_VALUES.has(String(value).trim())
    ) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// ── Clean result ──────────────────────────────────────────────────────────────
const cleanResult = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const result = {
    ...obj,
    email:    cleanEmail(obj.email),
    phone:    cleanPhone(obj.phone),
    mobile:   cleanPhone(obj.mobile),
    whatsapp: cleanPhone(obj.whatsapp),
    address:  cleanAddress(obj.address),
  };
  return removeBlankFields(result);
};

async function extractFromImage(buffer, mimeType, language = "auto") {
  const ocrText = await ocrImage(buffer, mimeType);
  console.log("OCR:", ocrText.slice(0, 200));
  const parsed = await extractFromOCR(ocrText, language);
  if (Array.isArray(parsed)) return parsed.map(cleanResult);
  return cleanResult(parsed);
}

async function extractFromImages(frontBuf, frontMime, backBuf, backMime) {
  const [frontOCR, backOCR] = await Promise.all([
    ocrImage(frontBuf, frontMime),
    ocrImage(backBuf, backMime),
  ]);
  return cleanResult(await extractFromFrontBack(frontOCR, backOCR));
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/google-login ───────────────────────────────────────────────
// Primary auth route now. Frontend sends the Firebase ID token after
// signInWithPopup(GoogleAuthProvider); we verify it server-side.
app.post("/api/auth/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Token missing" });

    // Critical step — verifies the token was actually issued by Google/
    // Firebase and hasn't been tampered with. A forged token throws here.
    const decoded = await getAuth().verifyIdToken(idToken);

    const { email, name, uid, picture } = decoded;
    if (!email) return res.status(400).json({ error: "Email not available from Google account" });

    let user = await User.findOne({ email });
    if (!user) {
      try {
        user = await User.create({
          email,
          name: name || email.split("@")[0],
          googleUid: uid,
          picture: picture || null,
        });
      } catch (err) {
        if (err.code === 11000) user = await User.findOne({ email }); // race guard
        else throw err;
      }
    }

    const s = user.canScan();
    res.json({
      success: true,
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone || null,
        plan: user.plan, isPremium: user.isPremium,
        freeScansUsed: user.freeScansUsed,
        freeScansLeft: Math.max(0, 5 - user.freeScansUsed),
        scansRemaining: user.scansRemaining,
        premiumExpiry: user.premiumExpiry,
        canScan: s.allowed, scanReason: s.reason,
      },
    });
  } catch (err) {
    console.error("google-login error:", err.message);
    res.status(401).json({ error: "Invalid Google login, dobara try karo" });
  }
});

// ── GET /api/user/status ──────────────────────────────────────────────────────
// Accepts either ?email= or ?phone=
app.get("/api/user/status", async (req, res) => {
  try {
    const filter = getUserFilter(req.query);
    if (!filter) return res.status(400).json({ error: "Email ya phone required" });
    const user = await User.findOne(filter);
    if (!user) return res.status(404).json({ error: "User not Found" });
    const s = user.canScan();
    res.json({
      success: true,
      user: {
        id: user._id, name: user.name, email: user.email || null, phone: user.phone || null,
        plan: user.plan, isPremium: user.isPremium,
        freeScansUsed: user.freeScansUsed,
        freeScansLeft: Math.max(0, 5 - user.freeScansUsed),
        scansRemaining: user.scansRemaining,
        premiumExpiry: user.premiumExpiry,
        canScan: s.allowed, scanReason: s.reason,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/user/add-phone ──────────────────────────────────────────────────
// Optional: collect + verify phone at premium-purchase time (Cashfree wants
// a phone number). Call this after your OTP-verify step, before create-order,
// if the logged-in (Google) user doesn't have a phone on file yet.
app.post("/api/user/add-phone", async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) return res.status(400).json({ error: "Email aur phone dono required" });
    const user = await User.findOneAndUpdate({ email }, { phone }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: { id: user._id, email: user.email, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/payment/create-order ────────────────────────────────────────────
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { email, phone, plan } = req.body;
    const filter = getUserFilter({ email, phone });
    if (!filter) return res.status(400).json({ error: "Email ya phone required" });
    if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });

    const user = await User.findOne(filter);
    if (!user) return res.status(404).json({ error: "User not found" });

    const planInfo = PLANS[plan];
    const orderId = `order_${user._id}_${Date.now()}`;

    // Cashfree needs a phone number on the order. If the user only has a
    // Google account (no phone yet), fall back to a placeholder — but for
    // real payment compliance you should call /api/user/add-phone first
    // and collect a real number before checkout.
    const customerPhone = user.phone || "9999999999";

    const response = await fetch(`${CF_BASE}/pg/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CF_VERSION,
        "x-client-id" : CF_APP_ID,
        "x-client-secret" : CF_SECRET,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: planInfo.amount,
        order_currency: "INR",
        customer_details: {
          customer_id: user._id.toString(),
          customer_name : user.name,
          customer_phone: customerPhone,
          customer_email: user.email || undefined,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/status?order_id={order_id}`,
          notify_url: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payment/webhook`,
        },
        order_note: `Card Scanner - ${planInfo.label}`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Order create failed");

    user.payments.push({ orderId, plan, amount: planInfo.amount, scans: planInfo.scans, status: "pending", cfOrderId: data.order_id });
    await user.save();

    res.json({
      success: true, orderId,
      paymentSessionId: data.payment_session_id,
      amount: planInfo.amount, planInfo,
      userName: user.name, userEmail: user.email,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/payment/verify ──────────────────────────────────────────────────
app.post("/api/payment/verify", async (req, res) => {
  try {
    const { orderId, email, phone, plan } = req.body;
    const response = await fetch(`${CF_BASE}/pg/orders/${orderId}`, {
      method: "GET",
      headers: { "x-api-version": CF_VERSION, "x-client-id": CF_APP_ID, "x-client-secret": CF_SECRET },
    });

    const orderData = await response.json();
    if (!response.ok) throw new Error(orderData.message || "Order fetch failed");
    if (orderData.order_status !== "PAID")
      return res.status(400).json({ error: "Payment not completed", status: orderData.order_status });

    const filter = getUserFilter({ email, phone });
    if (!filter) return res.status(400).json({ error: "Email ya phone required" });
    const user = await User.findOne(filter);
    if (!user) return res.status(404).json({ error: "User not found" });

    const planInfo = PLANS[plan];
    const payment = user.payments.find(p => p.orderId === orderId);
    if (payment) { payment.status = "success"; payment.paidAt = new Date(); }

    user.isPremium = true; user.plan = plan; user.premiumActivatedAt = new Date();
    if (plan === "unlimited") {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      user.premiumExpiry = expiry; user.scansRemaining = 999999;
    } else {
      user.scansRemaining = (user.scansRemaining || 0) + planInfo.scans;
      user.premiumExpiry = null;
    }

    await user.save();
    res.json({
      success: true, message: `Payment successful! ${planInfo.label} activated.`,
      user: {
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        plan: user.plan,
        isPremium: user.isPremium,
        scansRemaining: user.scansRemaining,
        premiumExpiry: user.premiumExpiry,
        freeScansLeft: 0
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/payment/webhook ─────────────────────────────────────────────────
app.post("/api/payment/webhook", async (req, res) => {
  try {
    const orderId = req.body.data?.order?.order_id;
    const user = await User.findOne({ "payments.orderId": orderId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const payment = user.payments.find(p => p.orderId === orderId);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const expected = crypto.createHmac("sha256", CF_SECRET).update(timestamp + JSON.stringify(req.body)).digest("base64");
    if (expected !== signature) return res.status(400).json({ error: "Invalid signature" });
    if (req.body.type !== "PAYMENT_SUCCESS_WEBHOOK") return res.json({ received: true });

    const planInfo = PLANS[payment.plan];
    payment.status = "success"; payment.paidAt = new Date();
    user.isPremium = true; user.plan = payment.plan; user.premiumActivatedAt = new Date();

    if (payment.plan === "unlimited") {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      user.premiumExpiry = expiry; user.scansRemaining = 999999;
    } else {
      user.scansRemaining = (user.scansRemaining || 0) + planInfo.scans;
    }

    await user.save();
    console.log(`✅ Webhook verified: ${user.email || user.phone} — ${payment.plan}`);
    res.json({ received: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/extract ─────────────────────────────────────────────────────────
app.post("/api/extract", upload.single("card"), checkScanQuota, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const language = req.body.language || "auto";
    const parsed = await extractFromImage(req.file.buffer, req.file.mimetype, language);
    await deductAfterScan(req);

    if (Array.isArray(parsed)) {
      const saved = await Promise.all(parsed.map(data => saveCard(data).catch(() => null)));
      res.json({
        success: true, multiple: true,
        results: parsed.map((data, i) => ({
          filename: `${req.file.originalname} — Card ${i + 1}`,
          status: "success",
          savedId: saved[i]?._id,
          data,
        })),
      });
    } else {
      const saved = await saveCard(parsed).catch(e => { console.error(e.message); return null; });
      res.json({ success: true, multiple: false, savedId: saved?._id, data: parsed });
    }
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/extract-frontback ───────────────────────────────────────────────
app.post("/api/extract-frontback",
  upload.fields([{ name: "front", maxCount: 1 }, { name: "back", maxCount: 1 }]), checkScanQuota,
  async (req, res) => {
    try {
      const frontFile = req.files?.front?.[0];
      const backFile  = req.files?.back?.[0];
      if (!frontFile) return res.status(400).json({ error: "Front image nahi mili" });
      if (!backFile)  return res.status(400).json({ error: "Back image nahi mili" });

      const data  = await extractFromImages(frontFile.buffer, frontFile.mimetype, backFile.buffer, backFile.mimetype);
      await deductAfterScan(req);
      const saved = await saveCard(data).catch(e => { console.error(e.message); return null; });

      res.json({ success: true, savedId: saved?._id, data });
    } catch (err) {
      console.error("FrontBack error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/extract-bulk ────────────────────────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50), checkScanQuota, async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: "Koi image nahi mili" });

    const language = req.body.language || "auto";
    const { batchSize, batchDelay } = BATCH_CONFIG[language] || BATCH_CONFIG.auto;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    const results = new Array(req.files.length);

    for (let i = 0; i < req.files.length; i += batchSize) {
      await Promise.all(
        req.files.slice(i, i + batchSize).map(async (file, j) => {
          const idx = i + j;
          try {
            const parsed = await extractFromImage(file.buffer, file.mimetype, language);
            const dataArr = Array.isArray(parsed) ? parsed : [parsed];
            await Promise.all(dataArr.map(d => saveCard(d).catch(() => null)));
            results[idx] = dataArr.map((data, k) => ({
              filename: Array.isArray(parsed) ? `${file.originalname} — Card ${k + 1}` : file.originalname,
              status: "success",
              data,
            }));
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = [{ filename: file.originalname, status: "error", error: err.message, data: {} }];
            console.log(`✗ ${file.originalname}`);
          }
        })
      );
      res.write(" ");
      if (i + batchSize < req.files.length) await delay(batchDelay);
    }

    await deductAfterScan(req);
    res.end(JSON.stringify({ success: true, results: results.flat() }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/cards ────────────────────────────────────────────────────────────
app.get("/api/cards", getAllCards);

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, () => console.log(`🚀 Server running on: http://localhost:${PORT}`));