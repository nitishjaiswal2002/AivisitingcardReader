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
  auto: "mistral-small-latest",
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

  auto: `Extract all details from this visiting/business card (English, Hindi, or mixed).
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

const BATCH_CONFIG = {
  english: { batchSize: 5, batchDelay: 2000 },
  auto: { batchSize: 5, batchDelay: 2000 },
  hindi: { batchSize: 1, batchDelay: 35000 },
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

async function extractFromImage(buffer, mimeType, language = "auto", retries = 5) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const model = MODELS[language] || MODELS.auto;
  const prompt = PROMPTS[language] || PROMPTS.auto;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

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
          const waitTime = attempt * 15000;
          console.log(`Rate limit — waiting ${waitTime/1000}s... attempt ${attempt}/${retries}`);
          await delay(waitTime);
          continue;
        }
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait 1 minute and try again.");
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
        return parsed;
      } catch {
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (arrMatch) return JSON.parse(arrMatch[0]);
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error("Parse failed: " + raw.slice(0, 100));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) {
          console.log(`Timeout — retry ${attempt}/${retries}`);
          await delay(3000);
          continue;
        }
        throw new Error("Request timeout — please try again");
      }
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

// Bulk — fetch streaming ke saath
app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const language = req.body.language || "auto";
    const files = req.files;
    const { batchSize, batchDelay } = BATCH_CONFIG[language] || BATCH_CONFIG.auto;

    console.log(`Bulk: ${files.length} cards | Language: ${language} | Batch: ${batchSize}`);

    // Streaming headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    const results = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file) => {
          try {
            const parsed = await extractFromImage(file.buffer, file.mimetype, language);
            if (Array.isArray(parsed)) {
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

      // Keep connection alive
      res.write(" ");

      if (i + batchSize < files.length) await delay(batchDelay);
    }

    res.end(JSON.stringify({ success: true, results }));
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