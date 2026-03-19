import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = "mistral-small-latest"; // Latest Mistral vision model

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

const PROMPT = `Extract all details from this visiting/business card and return ONLY a valid JSON object with these exact fields (use empty string "" if not found):
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
  "linkedin": "",
  "twitter": "",
  "instagram": "",
  "whatsapp": ""
}
Return ONLY the JSON. No explanation, no markdown, no code block.`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function extractFromImage(buffer, mimeType, retries = 3) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) {
          console.log(`Rate limit — waiting 30s... attempt ${attempt}/${retries}`);
          await delay(30000);
          continue;
        }
        throw new Error(`Mistral error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";

      try {
        return JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
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
    const data = await extractFromImage(req.file.buffer, req.file.mimetype);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bulk — 5 parallel batches
const BATCH_SIZE = 2; // Mistral free = 2 req/min

app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const files = req.files;
    console.log(`Bulk: ${files.length} cards`);
    const results = new Array(files.length);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file, j) => {
          const idx = i + j;
          try {
            const data = await extractFromImage(file.buffer, file.mimetype);
            results[idx] = { filename: file.originalname, status: "success", data };
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = { filename: file.originalname, status: "error", error: err.message, data: {} };
            console.log(`✗ ${file.originalname}`);
          }
        })
      );
      if (i + BATCH_SIZE < files.length) await delay(31000); // 31s = safe for 2 req/min
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT} | Model: ${MODEL}`);
});