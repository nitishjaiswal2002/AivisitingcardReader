import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
const BATCH_SIZE = 10; // 10 parallel ek saath

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG, WEBP, GIF allowed"));
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

async function extractFromImage(buffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
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
}

// ─── Single ───────────────────────────────────────────────────────────────────
app.post("/api/extract", upload.single("card"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const data = await extractFromImage(req.file.buffer, req.file.mimetype);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bulk — pure parallel, no delay ──────────────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const files = req.files;
    console.log(`Processing ${files.length} cards in batches of ${BATCH_SIZE}...`);

    const results = new Array(files.length);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(`Batch ${Math.floor(i/BATCH_SIZE)+1}: cards ${i+1}-${i+batch.length}`);

      await Promise.all(
        batch.map(async (file, j) => {
          const idx = i + j;
          try {
            const data = await extractFromImage(file.buffer, file.mimetype);
            results[idx] = { filename: file.originalname, status: "success", data };
            console.log(`  ✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = { filename: file.originalname, status: "error", error: err.message, data: {} };
            console.log(`  ✗ ${file.originalname}: ${err.message}`);
          }
        })
      );
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL_NAME, batchSize: BATCH_SIZE });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT} | Model: ${MODEL_NAME}`);
});