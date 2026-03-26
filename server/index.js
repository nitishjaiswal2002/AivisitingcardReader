import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
//import mongoose from "mongoose";

//dotenv.config();

//console.log("MONGO URI:", process.env.MONGO_URI);
//if (!process.env.MONGO_URI) throw new Error("❌ MONGO_URI missing in .env");

//mongoose.connect(process.env.MONGO_URI)
  //.then(() => console.log("✅ MongoDB Connected"))
  //.catch(err => console.error("❌ Mongo Error:", err));

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const OCR_MODEL       = "mistral-ocr-latest";
const EXTRACT_MODEL   = "mistral-medium-latest";

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const PROMPTS = {
  english: `You are the world's best business card data extraction specialist.
Given OCR text from a business card, extract information into JSON.

CRITICAL RULES — READ CAREFULLY:

1. DO NOT MODIFY OR CORRECT text that looks intentional:
   - Roman numerals like III, IV, VI — keep as-is, do NOT convert to "jil" or anything else
   - Abbreviations like Pvt, Ltd, Co, Inc — keep as-is
   - ALL CAPS names/companies — convert to Proper Case but keep spelling exact
   - Unusual spellings in names/companies — keep as-is, they may be intentional

2. EMAIL addresses — fix ONLY obvious OCR errors:
   - Fix domain names only: "grnail" → "gmail", "yarnoo" → "yahoo", "rediffrnail" → "rediffmail"
   - Fix '@' if missing — look for context
   - Do NOT change the username part (before @) unless clearly wrong
   - Common domains: gmail.com, yahoo.com, hotmail.com, outlook.com, rediffmail.com, yahoo.co.in

3. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space
   - Indian mobile: 10 digits, may have +91 prefix
   - If two numbers present, put in phone and mobile separately
   - Do NOT add or remove digits

4. NAMES: Proper case. Keep exact spelling. Roman numerals — keep as written.
5. COMPANY names: Keep original spelling. Only fix case if ALL CAPS.
6. WEBSITE: Fix 'vvww' → 'www' only.
7. ADDRESS: Complete address. City in city field. State in state field. 6-digit Indian pincodes.
8. GENERAL: Multiple values → comma separated. ONE card → single JSON object. MULTIPLE → JSON array. Return ONLY JSON.

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  hindi: `You are the world's best business card data extraction specialist for Hindi and English cards.
Given OCR text from a business card, extract information into JSON.

HINDI SPECIFIC RULES:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner", "निदेशक" → "Director")
- Translate Hindi company types (e.g. "प्राइवेट लिमिटेड" → "Pvt Ltd")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES: Roman numerals — keep as-is. Fix email domains only. Phone: digits only. Return ONLY JSON.

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  auto: `You are the world's best business card data extraction specialist.
Given OCR text from a business card, extract information into JSON.
Card may be in English, Hindi (Devanagari), or mixed.

HINDI HANDLING:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES:
1. Roman numerals like III, IV — keep EXACTLY as written
2. Fix email domains only: "grnail"→"gmail", "yarnoo"→"yahoo"
3. Phone: ONLY digits 0-9, +, -, (), space
4. Names: Proper case, keep exact spelling
5. ONE card → single JSON object. MULTIPLE → JSON array. Return ONLY JSON.

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,
};

// ── Front+Back combined prompt ─────────────────────────────────────────────────
// Dono sides ka OCR text ek saath deta hai — model merge karke ek card banata hai
const FRONTBACK_PROMPT = `You are the world's best business card data extraction specialist.
You are given OCR text from BOTH SIDES of a single business card:
- FRONT SIDE: usually has name, designation, company, logo
- BACK SIDE: usually has address, additional contact info, social media, products/services

TASK: Combine information from BOTH sides into ONE complete JSON object.

MERGING RULES — VERY IMPORTANT:
1. ADDRESS: If address appears on both sides, merge them into ONE complete address — do NOT repeat, pick the most complete one or combine street + city + pincode from both
2. PHONE/MOBILE: If different numbers on each side, put first in phone, second in mobile
3. EMAIL: If same email on both sides, keep only one. If different, keep both comma separated
4. NAME/COMPANY/DESIGNATION: Prefer front side values — they are usually more accurate
5. PRODUCTS/SERVICES: If back side has product list, put in products field
6. SOCIAL MEDIA: Back side usually has social links — extract all

CRITICAL RULES:
1. Roman numerals (III, IV, VI) — keep EXACTLY as written
2. Email: fix domain OCR errors only (grnail→gmail, yarnoo→yahoo)
3. Phone/Mobile: ONLY digits 0-9, +, -, (), space
4. Names: Proper case, keep exact spelling
5. Return ONLY ONE JSON object — no array, no markdown, no explanation

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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Keep alive
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

// ── Extract from OCR text ─────────────────────────────────────────────────────
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
          messages: [{ role: "user", content: `${prompt}\n\nOCR Text from business card:\n${ocrText}` }],
          max_tokens: 1200,
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

// ── NEW: Extract from Front + Back combined ───────────────────────────────────
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
          max_tokens: 1200,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`FrontBack extract error: ${response.status} — ${err}`);
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
        throw new Error("FrontBack extract timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Clean helpers ─────────────────────────────────────────────────────────────
const cleanEmail = (val) => {
  if (!val || typeof val !== "string" || !val.includes("@")) return val;
  const atIndex = val.lastIndexOf("@");
  const username = val.substring(0, atIndex);
  const domain = val.substring(atIndex + 1).toLowerCase();
  const domainFixes = {
    "grnail.com": "gmail.com", "gmial.com": "gmail.com", "gmai.com": "gmail.com",
    "yarnoo.com": "yahoo.com", "yahooo.com": "yahoo.com", "yah00.com": "yahoo.com",
    "hotrnail.com": "hotmail.com", "hotmai.com": "hotmail.com",
    "rediffrnail.com": "rediffmail.com", "redifmail.com": "rediffmail.com",
    "outlOOk.com": "outlook.com", "outl0ok.com": "outlook.com",
    "icloud.corn": "icloud.com", "gmail.corn": "gmail.com",
    "yahoo.corn": "yahoo.com", "hotmail.corn": "hotmail.com",
  };
  return `${username}@${domainFixes[domain] || domain}`;
};

const cleanPhone = (val) => {
  if (!val || typeof val !== "string") return val;
  return val
    .replace(/[OoIlSB]/g, (c) => ({ O:"0", o:"0", I:"1", l:"1", S:"5", B:"8" }[c] || c))
    .replace(/[^0-9+\-() ]/g, "")
    .trim();
};

const cleanResult = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  return {
    ...obj,
    email:    cleanEmail(obj.email),
    phone:    cleanPhone(obj.phone),
    mobile:   cleanPhone(obj.mobile),
    whatsapp: cleanPhone(obj.whatsapp),
  };
};

// ── Single image extract ──────────────────────────────────────────────────────
async function extractFromImage(buffer, mimeType, language = "auto") {
  const ocrText = await ocrImage(buffer, mimeType);
  console.log("OCR Text:", ocrText.slice(0, 200));
  const parsed = await extractFromOCR(ocrText, language);
  if (Array.isArray(parsed)) return parsed.map(cleanResult);
  return cleanResult(parsed);
}

// ── Front+Back extract ────────────────────────────────────────────────────────
async function extractFromImages(frontBuf, frontMime, backBuf, backMime) {
  // OCR dono images parallel mein karo
  const [frontOCR, backOCR] = await Promise.all([
    ocrImage(frontBuf, frontMime),
    ocrImage(backBuf, backMime),
  ]);
  console.log("Front OCR:", frontOCR.slice(0, 150));
  console.log("Back OCR:",  backOCR.slice(0, 150));

  const parsed = await extractFromFrontBack(frontOCR, backOCR);
  return cleanResult(parsed);
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/extract — Single card (front only) ──────────────────────────────
app.post("/api/extract", upload.single("card"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const language = req.body.language || "auto";
    const parsed = await extractFromImage(req.file.buffer, req.file.mimetype, language);

    if (Array.isArray(parsed)) {
      res.json({
        success: true, multiple: true,
        results: parsed.map((data, i) => ({
          filename: `${req.file.originalname} — Card ${i + 1}`,
          status: "success", data,
        })),
      });
    } else {
      res.json({ success: true, multiple: false, data: parsed });
    }
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/extract-frontback — Single card (front + back) ─────────────────
// Frontend se: FormData mein "front" aur "back" fields
app.post("/api/extract-frontback",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back",  maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const frontFile = req.files?.front?.[0];
      const backFile  = req.files?.back?.[0];

      if (!frontFile) return res.status(400).json({ error: "Front image upload nahi hui" });
      if (!backFile)  return res.status(400).json({ error: "Back image upload nahi hui"  });

      const data = await extractFromImages(
        frontFile.buffer, frontFile.mimetype,
        backFile.buffer,  backFile.mimetype,
      );

      res.json({ success: true, data });
    } catch (err) {
      console.error("FrontBack extract error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/extract-bulk — Bulk single-side cards ──────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const language = req.body.language || "auto";
    const files = req.files;
    const { batchSize, batchDelay } = BATCH_CONFIG[language] || BATCH_CONFIG.auto;

    console.log(`Bulk: ${files.length} cards | Language: ${language} | Batch: ${batchSize}`);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    const results = new Array(files.length);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file, j) => {
          const idx = i + j;
          try {
            const parsed = await extractFromImage(file.buffer, file.mimetype, language);
            if (Array.isArray(parsed)) {
              results[idx] = parsed.map((data, k) => ({
                filename: `${file.originalname} — Card ${k + 1}`,
                status: "success", data,
              }));
            } else {
              results[idx] = [{ filename: file.originalname, status: "success", data: parsed }];
            }
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = [{ filename: file.originalname, status: "error", error: err.message, data: {} }];
            console.log(`✗ ${file.originalname}`);
          }
        })
      );
      res.write(" ");
      if (i + batchSize < files.length) await delay(batchDelay);
    }

    res.end(JSON.stringify({ success: true, results: results.flat() }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: OCR_MODEL });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});