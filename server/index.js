import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_API_KEY ="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";
const MODEL = "meta-llama/llama-3.2-11b-vision-instruct:free"; // 100% free

// ─── Multer ───────────────────────────────────────────────────────────────────
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

// ─── Extract using OpenRouter ─────────────────────────────────────────────────
async function extractFromImage(buffer, mimeType) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://visiting-card-extractor.onrender.com",
      "X-Title": "Visiting Card Extractor",
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
    throw new Error(`OpenRouter error: ${response.status} — ${err}`);
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
}

// ─── Single card ──────────────────────────────────────────────────────────────
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

// ─── Bulk — parallel ──────────────────────────────────────────────────────────
const BATCH_SIZE = 5;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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
            console.log(`✗ ${file.originalname}: ${err.message}`);
          }
        })
      );

      if (i + BATCH_SIZE < files.length) await delay(300);
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT} | Model: ${MODEL}`);
});