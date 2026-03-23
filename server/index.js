import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// OCR model for all languages — dedicated OCR
const OCR_MODEL = "mistral-ocr-latest";
// Fallback vision model for JSON extraction
const VISION_MODEL = "mistral-small-latest";

const PROMPTS = {
  english: `You are an expert at extracting business card information.
Given the OCR text from a business card, extract all details and return ONLY a valid JSON object.

CRITICAL RULES:
- Extract EXACT phone numbers — do not change any digit
- Extract EXACT email addresses — copy character by character
- Extract full address including building, street, area, city, pincode
- If a field has multiple values put them comma separated
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- Return ONLY JSON. No explanation, no markdown, no code block.
- Use "" if a field is not found

Each object must have these exact fields:
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

  hindi: `You are an expert at extracting business card information from Hindi and English text.
Given the OCR text from a business card, extract all details and return ONLY a valid JSON object.

CRITICAL RULES:
- Card may be in Hindi (Devanagari) or English or mixed
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations/company to English (e.g. "प्रबंधक" → "Manager")
- Extract EXACT phone numbers — do not change any digit
- Extract EXACT email addresses — copy character by character
- Extract full address including building, street, area, city, pincode
- If a field has multiple values put them comma separated
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- Return ONLY JSON. No explanation, no markdown, no code block.
- Use "" if a field is not found

Each object must have these exact fields:
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

  auto: `You are an expert at extracting business card information.
Given the OCR text from a business card, extract all details and return ONLY a valid JSON object.
Card may be in English, Hindi (Devanagari), or a mix of both.

CRITICAL RULES:
- Extract EXACT phone numbers — do not change any digit
- Extract EXACT email addresses — copy character by character
- Extract full address including building, street, area, city, pincode
- If Hindi text found, transliterate names and translate designations to English
- If a field has multiple values put them comma separated
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- Return ONLY JSON. No explanation, no markdown, no code block.
- Use "" if a field is not found

Each object must have these exact fields:
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

// Step 1: OCR — image se text nikalo
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
      // OCR response mein pages array hota hai
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

// Step 2: Extract JSON from OCR text
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
          model: VISION_MODEL,
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

// Main function — OCR + Extract
async function extractFromImage(buffer, mimeType, language = "auto") {
  // Step 1: OCR se text nikalo
  const ocrText = await ocrImage(buffer, mimeType);
  console.log("OCR Text:", ocrText.slice(0, 200));

  // Step 2: Text se JSON nikalo
  const parsed = await extractFromOCR(ocrText, language);
  return parsed;
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