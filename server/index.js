import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const MODELS = {
  english: "mistral-small-latest",
  hindi: "pixtral-12b-2409",
  auto: "pixtral-12b-2409",
};

const PROMPTS = {
  english: `Extract all details from this visiting/business card (English).
IMPORTANT:
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- Return ONLY JSON. No explanation, no markdown, no code block.
- Each object must have these exact fields (use "" if not found):
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

  hindi: `Extract all details from this visiting/business card in Hindi (Devanagari script).
IMPORTANT:
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations/company to English (e.g. "प्रबंधक" → "Manager")
- Keep phone numbers, emails, websites as-is
- Use "" if a field is not found
- Return ONLY JSON. No explanation, no markdown, no code block.
- Each object must have these exact fields:
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

  auto: `Extract all details from this visiting/business card (may be English, Hindi, or mixed).
IMPORTANT:
- If image has ONE card → return a single JSON object
- If image has MULTIPLE cards → return a JSON array of objects, one per card
- If Hindi/Devanagari text found, transliterate names and translate designations to English
- Keep phone numbers, emails, websites as-is
- Use "" if a field is not found
- Return ONLY JSON. No explanation, no markdown, no code block.
- Each object must have these exact fields:
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

async function extractFromImage(buffer, mimeType, language = "auto", retries = 3) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const model = MODELS[language] || MODELS.auto;
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
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 800,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) {
          console.log(`Rate limit — waiting 30s... attempt ${attempt}/${retries}`);
          await delay(30000);
          continue;
        }
        if ((response.status === 502 || response.status === 503) && attempt < retries) {
          console.log(`Server error ${response.status} — retry ${attempt}/${retries}`);
          await delay(5000 * attempt);
          continue;
        }
        throw new Error(`Mistral error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";

      try {
        const parsed = JSON.parse(raw);
        return parsed; // array ya single object dono as-is
      } catch {
        // pehle array try karo
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (arrMatch) return JSON.parse(arrMatch[0]);
        // phir single object try karo
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error("Parse failed: " + raw.slice(0, 100));
      }
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
}

// Single card
app.post("/api/extract", upload.single("card"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const language = req.body.language || "auto";
    const parsed = await extractFromImage(req.file.buffer, req.file.mimetype, language);

    if (Array.isArray(parsed)) {
      // ek image mein multiple cards detected
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
const BATCH_SIZE = 2;

app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const language = req.body.language || "auto";
    const files = req.files;
    console.log(`Bulk: ${files.length} cards | Language: ${language}`);
    const results = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file) => {
          try {
            const parsed = await extractFromImage(file.buffer, file.mimetype, language);

            if (Array.isArray(parsed)) {
              // ek image mein multiple cards
              parsed.forEach((data, j) => {
                results.push({
                  filename: `${file.originalname} — Card ${j + 1}`,
                  status: "success",
                  data,
                });
              });
            } else {
              results.push({ filename: file.originalname, status: "success", data: parsed });
            }
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results.push({ filename: file.originalname, status: "error", error: err.message, data: {} });
            console.log(`✗ ${file.originalname}`);
          }
        })
      );
      if (i + BATCH_SIZE < files.length) await delay(31000);
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", models: MODELS });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});