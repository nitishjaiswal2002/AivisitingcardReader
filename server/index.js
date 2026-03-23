import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const OCR_MODEL = "mistral-ocr-latest";
const EXTRACT_MODEL = "mistral-medium-latest"; // best available vision model

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

4. NAMES:
   - Proper case — "RAHUL SHARMA" → "Rahul Sharma"
   - Keep exact spelling — do NOT guess or autocorrect names
   - Roman numerals in names (III, Jr, Sr) — keep exactly as written

5. COMPANY names:
   - Keep original spelling exactly
   - Only fix case if ALL CAPS → Proper Case
   - Roman numerals (III, IV) — keep as-is

6. WEBSITE:
   - Fix 'vvww' → 'www' only
   - Keep rest exactly as written

7. ADDRESS:
   - Extract complete address
   - Put city in city field, state in state field separately
   - Indian pincodes are 6 digits
   - Country default "India" if address looks Indian

8. GENERAL:
   - Multiple values → comma separated
   - If ONE card → single JSON object
   - If MULTIPLE cards → JSON array
   - Return ONLY JSON. No explanation, no markdown, no code blocks.
   - Use "" if field not found

Return ONLY this JSON:
{
  "name": "",
  "designation": "",
  "company": "",
  "email": "",
  "phone": "",
  "mobile": "",
  "website": "",
  "address": "",
  "city": "",
  "state": "",
  "country": "",
  "products": "",
  "linkedin": "",
  "twitter": "",
  "instagram": "",
  "whatsapp": ""
}`,

  hindi: `You are the world's best business card data extraction specialist for Hindi and English cards.
Given OCR text from a business card, extract information into JSON.

HINDI SPECIFIC RULES:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner", "निदेशक" → "Director")
- Translate Hindi company types (e.g. "प्राइवेट लिमिटेड" → "Pvt Ltd")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES — READ CAREFULLY:

1. DO NOT MODIFY OR CORRECT text that looks intentional:
   - Roman numerals like III, IV, VI — keep as-is
   - Abbreviations — keep as-is
   - Unusual spellings — keep as-is, they may be intentional

2. EMAIL addresses — fix ONLY obvious OCR errors:
   - Fix domain names only: "grnail" → "gmail", "yarnoo" → "yahoo"
   - Common domains: gmail.com, yahoo.com, hotmail.com, rediffmail.com, yahoo.co.in
   - Do NOT change username part unless clearly wrong

3. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space
   - Indian mobile: 10 digits, may have +91 prefix
   - Do NOT add or remove digits

4. NAMES:
   - Proper case after transliteration
   - Keep exact spelling — do NOT autocorrect

5. ADDRESS:
   - Extract complete address
   - City in city field, state in state field separately
   - Indian pincodes are 6 digits

6. GENERAL:
   - Multiple values → comma separated
   - If ONE card → single JSON object
   - If MULTIPLE cards → JSON array
   - Return ONLY JSON. No explanation, no markdown.
   - Use "" if field not found

Return ONLY this JSON:
{
  "name": "",
  "designation": "",
  "company": "",
  "email": "",
  "phone": "",
  "mobile": "",
  "website": "",
  "address": "",
  "city": "",
  "state": "",
  "country": "",
  "products": "",
  "linkedin": "",
  "twitter": "",
  "instagram": "",
  "whatsapp": ""
}`,

  auto: `You are the world's best business card data extraction specialist.
Given OCR text from a business card, extract information into JSON.
Card may be in English, Hindi (Devanagari), or mixed.

HINDI HANDLING:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES — READ CAREFULLY:

1. DO NOT MODIFY OR CORRECT text that looks intentional:
   - Roman numerals like III, IV, VI, IX — keep EXACTLY as written, never convert to letters
   - "III" is THREE in Roman numerals — NOT "jil", NOT "lll", NOT anything else
   - Abbreviations like Pvt, Ltd, Co, Inc, Sr, Jr — keep as-is
   - Unusual name spellings — keep as-is, they are intentional
   - ALL CAPS → convert to Proper Case but keep exact spelling

2. EMAIL addresses — fix ONLY obvious OCR domain errors:
   - "grnail" → "gmail", "yarnoo" → "yahoo", "rediffrnail" → "rediffmail"
   - "hotrnail" → "hotmail", "outlOOk" → "outlook"
   - Common Indian domains: gmail.com, yahoo.com, yahoo.co.in, hotmail.com, outlook.com, rediffmail.com
   - Do NOT change the username part (before @) — it may have intentional spellings
   - '@' must be present

3. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space
   - Indian mobile: 10 digits, may have +91 prefix
   - Landline: STD code + number e.g. (022) 12345678
   - Do NOT add or remove any digit
   - If two numbers found: first in phone, second in mobile

4. NAMES:
   - Proper case — "JOHN DOE" → "John Doe"
   - Keep EXACT spelling — never autocorrect or guess
   - Roman numerals (III, Jr, Sr) — keep exactly as written

5. COMPANY names:
   - Keep original spelling exactly
   - Roman numerals — keep as-is (e.g. "ABC III Enterprises" stays "ABC III Enterprises")

6. WEBSITE:
   - Fix only 'vvww' → 'www'
   - Keep everything else exactly as written

7. ADDRESS:
   - Complete address — door, building, street, area, city, state, pincode
   - City → city field, State → state field
   - Country → "India" if address looks Indian and country not mentioned
   - Indian pincodes are exactly 6 digits

8. SOCIAL MEDIA:
   - LinkedIn: URL or username
   - Twitter/X: handle with or without @
   - Instagram: handle
   - WhatsApp: number in mobile format

9. GENERAL:
   - Multiple values → comma separated
   - ONE card → single JSON object
   - MULTIPLE cards → JSON array, one object per card
   - Return ONLY JSON. No explanation, no markdown, no code blocks.
   - Use "" if field not found

Return ONLY this JSON:
{
  "name": "",
  "designation": "",
  "company": "",
  "email": "",
  "phone": "",
  "mobile": "",
  "website": "",
  "address": "",
  "city": "",
  "state": "",
  "country": "",
  "products": "",
  "linkedin": "",
  "twitter": "",
  "instagram": "",
  "whatsapp": ""
}`,
};

const BATCH_CONFIG = {
  english: { batchSize: 5, batchDelay: 2000 },
  auto: { batchSize: 5, batchDelay: 2000 },
  hindi: { batchSize: 3, batchDelay: 5000 },
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
    fetch(`${RENDER_URL}/api/health`)
      .then(() => console.log("Keep alive ping sent"))
      .catch(() => {});
  }, 10 * 60 * 1000);
}

// Step 1: OCR — image se accurate text nikalo
async function ocrImage(buffer, mimeType, retries = 3) {
  const base64 = buffer.toString("base64");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OCR_MODEL,
          document: {
            type: "image_url",
            image_url: `data:${mimeType};base64,${base64}`,
          },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) {
          await delay(attempt * 15000);
          continue;
        }
        throw new Error(`OCR error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      const text = data.pages?.map(p => p.markdown || p.text || "").join("\n") || "";
      return text;
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("OCR timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// Step 2: OCR text se JSON extract karo
async function extractFromOCR(ocrText, language = "auto", retries = 3) {
  const prompt = PROMPTS[language] || PROMPTS.auto;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          messages: [
            {
              role: "user",
              content: `${prompt}\n\nOCR Text from business card:\n${ocrText}`,
            },
          ],
          max_tokens: 1200,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) {
          await delay(attempt * 15000);
          continue;
        }
        throw new Error(`Extract error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";

      try {
        return JSON.parse(raw);
      } catch {
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

// Main — OCR + Extract + Clean
async function extractFromImage(buffer, mimeType, language = "auto") {
  const ocrText = await ocrImage(buffer, mimeType);
  console.log("OCR Text:", ocrText.slice(0, 200));

  const parsed = await extractFromOCR(ocrText, language);

  // Phone number clean karo
  const cleanPhone = (val) => {
    if (!val || typeof val !== "string") return val;
    return val
      .replace(/[OoIlSB]/g, (c) => ({ O: "0", o: "0", I: "1", l: "1", S: "5", B: "8" }[c] || c))
      .replace(/[^0-9+\-() ]/g, "")
      .trim();
  };

  const cleanResult = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    return {
      ...obj,
      phone: cleanPhone(obj.phone),
      mobile: cleanPhone(obj.mobile),
      whatsapp: cleanPhone(obj.whatsapp),
    };
  };

  if (Array.isArray(parsed)) return parsed.map(cleanResult);
  return cleanResult(parsed);
}

// Single card
app.post("/api/extract", upload.single("card"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const language = req.body.language || "auto";
    const parsed = await extractFromImage(req.file.buffer, req.file.mimetype, language);

    if (Array.isArray(parsed)) {
      const results = parsed.map((data, i) => ({
        filename: `${req.file.originalname} — Card ${i + 1}`,
        status: "success",
        data,
      }));
      res.json({ success: true, multiple: true, results });
    } else {
      res.json({ success: true, multiple: false, data: parsed });
    }
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bulk
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
                status: "success",
                data,
              }));
            } else {
              results[idx] = [{
                filename: file.originalname,
                status: "success",
                data: parsed,
              }];
            }
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = [{
              filename: file.originalname,
              status: "error",
              error: err.message,
              data: {},
            }];
            console.log(`✗ ${file.originalname}`);
          }
        })
      );

      res.write(" ");

      if (i + batchSize < files.length) await delay(batchDelay);
    }

    const flatResults = results.flat();
    res.end(JSON.stringify({ success: true, results: flatResults }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: OCR_MODEL });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});