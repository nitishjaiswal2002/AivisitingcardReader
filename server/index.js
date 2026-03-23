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
  english: `You are the world's best business card OCR and data extraction specialist.
Your job is to extract 100% accurate information from business card OCR text.

STRICT CHARACTER CORRECTION RULES — Apply these ALWAYS:
1. EMAIL addresses:
   - 'l' (lowercase L) and 'I' (uppercase i) and '1' (one) — use context to pick correct one
   - 'rn' together often looks like 'm' — e.g. "grnail" → "gmail", "yarnoo" → "yahoo"
   - '0' (zero) vs 'O' (letter) — emails use letters, not zeros in domain names
   - Common domains: gmail.com, yahoo.com, hotmail.com, outlook.com, rediffmail.com
   - Always fix obvious OCR errors in email domains using above knowledge
   - '@' symbol must be present — if missing, look for 'a' surrounded by words

2. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space
   - Remove any letters that crept in (e.g. 'O' → '0', 'l' → '1', 'I' → '1')
   - Indian numbers: 10 digits, may start with +91 or 0
   - If two numbers present, put in phone and mobile separately

3. NAMES:
   - Proper case — first letter capital (e.g. "RAHUL SHARMA" → "Rahul Sharma")
   - 'rn' → 'm' fix (e.g. "Arnit" might be "Amit")
   - Remove extra spaces

4. COMPANY names:
   - Keep original casing if mixed case
   - Fix obvious OCR errors using context

5. WEBSITE:
   - Usually starts with www. or http
   - Fix common errors: 'cornpany' → 'company', 'vvww' → 'www'

6. ADDRESS:
   - Extract complete address — building, street, area, city, state, pincode
   - Indian pincodes are 6 digits
   - Put city in city field, state in state field separately

7. GENERAL:
   - If a field has multiple values, comma separate them
   - If image has ONE card → return a single JSON object
   - If image has MULTIPLE cards → return a JSON array of objects, one per card
   - Return ONLY JSON. No explanation, no markdown, no code blocks.
   - Use "" if field not found

Return ONLY this JSON structure:
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

  hindi: `You are the world's best business card OCR and data extraction specialist for Hindi and English cards.
Your job is to extract 100% accurate information from business card OCR text.

HINDI SPECIFIC RULES:
- Card may be in Hindi (Devanagari), English, or mixed
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations to English (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner", "निदेशक" → "Director")
- Translate Hindi company types (e.g. "प्राइवेट लिमिटेड" → "Pvt Ltd")
- Translate Hindi city/state names to English (e.g. "मुंबई" → "Mumbai")

STRICT CHARACTER CORRECTION RULES — Apply these ALWAYS:
1. EMAIL addresses:
   - 'l' (lowercase L) and 'I' (uppercase i) and '1' (one) — use context to pick correct one
   - 'rn' together often looks like 'm' — e.g. "grnail" → "gmail", "yarnoo" → "yahoo"
   - '0' (zero) vs 'O' (letter) — emails use letters not zeros in domain names
   - Common domains: gmail.com, yahoo.com, hotmail.com, outlook.com, rediffmail.com
   - Always fix obvious OCR errors in email domains
   - '@' symbol must be present

2. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space
   - Remove any letters (e.g. 'O' → '0', 'l' → '1', 'I' → '1')
   - Indian numbers: 10 digits, may start with +91 or 0
   - If two numbers present, put in phone and mobile separately

3. NAMES:
   - Proper case after transliteration
   - Fix 'rn' → 'm' confusion

4. ADDRESS:
   - Extract complete address
   - Put city in city field, state in state field separately
   - Indian pincodes are 6 digits

5. GENERAL:
   - If a field has multiple values, comma separate them
   - If image has ONE card → return a single JSON object
   - If image has MULTIPLE cards → return a JSON array of objects, one per card
   - Return ONLY JSON. No explanation, no markdown, no code blocks.
   - Use "" if field not found

Return ONLY this JSON structure:
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

  auto: `You are the world's best business card OCR and data extraction specialist.
Your job is to extract 100% accurate information from business card OCR text.
Card may be in English, Hindi (Devanagari), or a mix of both.

HINDI HANDLING:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations to English (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner")
- Translate Hindi city/state to English (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

STRICT CHARACTER CORRECTION RULES — Apply these ALWAYS:
1. EMAIL addresses:
   - 'l' (lowercase L) and 'I' (uppercase i) and '1' (one) — use context to pick correct one
   - 'rn' together often looks like 'm' — e.g. "grnail" → "gmail", "yarnoo" → "yahoo"
   - '0' (zero) vs 'O' (letter) — emails use letters not zeros in domain names
   - Common Indian email domains: gmail.com, yahoo.com, yahoo.co.in, hotmail.com, outlook.com, rediffmail.com
   - Always fix obvious OCR errors in email domains using domain knowledge
   - '@' symbol must be present — if missing look for context clue

2. PHONE / MOBILE numbers:
   - Contains ONLY digits 0-9, +, -, (, ), space — remove any letters
   - 'O' → '0', 'l' → '1', 'I' → '1', 'S' → '5', 'B' → '8'
   - Indian mobile: exactly 10 digits, may have +91 prefix
   - Landline: may have STD code like (022), (011)
   - If two numbers found, put first in phone, second in mobile

3. NAMES:
   - Proper case — "JOHN DOE" → "John Doe"
   - Fix 'rn' → 'm' where obvious
   - Remove stray punctuation

4. COMPANY names:
   - Keep original formatting
   - Fix 'cornpany' → 'company', 'lirnited' → 'limited', 'Pvt' stays 'Pvt'

5. WEBSITE:
   - Fix 'vvww' → 'www', 'cornpany' → 'company'
   - Keep http:// or www. prefix

6. ADDRESS:
   - Extract COMPLETE address — door number, building, street, area, city, state, pincode
   - Split city into city field and state into state field
   - Country default "India" if not mentioned and address looks Indian
   - Indian pincodes are exactly 6 digits

7. SOCIAL MEDIA:
   - LinkedIn: extract profile URL or username
   - Twitter/X: extract handle with or without @
   - Instagram: extract handle
   - WhatsApp: extract number same as mobile format

8. GENERAL:
   - Multiple values → comma separated
   - If image has ONE card → return single JSON object
   - If image has MULTIPLE cards → return JSON array, one object per card
   - Return ONLY JSON. No explanation, no markdown, no code blocks.
   - Use "" if field not found

Return ONLY this JSON structure:
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