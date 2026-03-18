import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Model config ─────────────────────────────────────────────────────────────
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

// ─── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WEBP, GIF allowed"));
  },
});

// ─── Gemini ───────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel() {
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// ─── Prompt ───────────────────────────────────────────────────────────────────
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

// ─── Delay helper ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ─── Extract single image with retry ─────────────────────────────────────────
async function extractFromImage(buffer, mimeType, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = getModel();
      const result = await model.generateContent([
        PROMPT,
        { inlineData: { data: buffer.toString("base64"), mimeType } },
      ]);
      const raw = result.response.text().trim();
      try {
        return JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Parse failed");
      }
    } catch (err) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("quota");
      if (isRateLimit && attempt < retries) {
        console.log(`Rate limit — retry ${attempt}/${retries}, waiting ${4000 * attempt}ms`);
        await delay(4000 * attempt);
        continue;
      }
      throw err;
    }
  }
}

// ─── Parallel batch processor ─────────────────────────────────────────────────
// BATCH_SIZE = ek saath kitne parallel chalein (rate limit 30/min = max 5 parallel safe)
const BATCH_SIZE = 5;
const BATCH_DELAY = 2000; // 2s between batches

async function processBatch(files) {
  const results = new Array(files.length);

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches} — ${batch.length} cards parallel...`);

    // Saari cards batch mein parallel chalao
    const batchPromises = batch.map(async (file, j) => {
      const index = i + j;
      try {
        const data = await extractFromImage(file.buffer, file.mimetype);
        results[index] = { filename: file.originalname, status: "success", data };
        console.log(`  ✓ Card ${index + 1}: ${file.originalname}`);
      } catch (err) {
        results[index] = {
          filename: file.originalname,
          status: "error",
          error: err.message,
          data: {},
        };
        console.log(`  ✗ Card ${index + 1}: ${err.message}`);
      }
    });

    await Promise.all(batchPromises);

    // Next batch se pehle thoda wait karo (rate limit)
    if (i + BATCH_SIZE < files.length) {
      console.log(`Batch ${batchNum} done — waiting ${BATCH_DELAY}ms...`);
      await delay(BATCH_DELAY);
    }
  }

  return results;
}

// ─── Single card ──────────────────────────────────────────────────────────────
app.post("/api/extract", upload.single("card"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const details = await extractFromImage(req.file.buffer, req.file.mimetype);
    res.json({ success: true, data: details });
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Bulk cards — parallel processing ────────────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const total = req.files.length;
    console.log(`\nBulk: ${total} cards — batch size ${BATCH_SIZE}`);
    console.log(`Estimated time: ~${Math.ceil(total / BATCH_SIZE) * (BATCH_DELAY / 1000 + 3)}s`);

    const results = await processBatch(req.files);

    const success = results.filter((r) => r.status === "success").length;
    console.log(`Done: ${success}/${total} successful\n`);

    res.json({ success: true, results });
  } catch (err) {
    console.error("Bulk error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL_NAME, batchSize: BATCH_SIZE });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT} | Model: ${MODEL_NAME} | Batch: ${BATCH_SIZE}`);
});