import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Model config — sirf yeh line change karo jab model expire ho ────────────
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

// ─── Multer — 50 cards support, 10MB per file ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WEBP, GIF allowed"));
  },
});

// ─── Gemini setup ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model ko fresh banate hain har request pe — rate limit handle hota hai
function getModel() {
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ─── Prompt ──────────────────────────────────────────────────────────────────
const PROMPT = `Extract all details from this visiting/business card and return ONLY a valid JSON object with these exact fields (use empty string "" if a field is not found on the card):
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
Return ONLY the JSON object. No explanation, no markdown, no code block, no extra text.`;

// ─── Helper: delay function (rate limit ke liye) ──────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Helper: Gemini se image extract karo (retry logic ke saath) ──────────────
async function extractFromImage(buffer, mimeType, retries = 3) {
  const imagePart = {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = getModel();
      const result = await model.generateContent([PROMPT, imagePart]);
      const raw = result.response.text().trim();

      try {
        return JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("AI response parse nahi hua");
      }
    } catch (err) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("quota");

      if (isRateLimit && attempt < retries) {
        // Rate limit pe 5 second wait karo phir retry
        console.log(`Rate limit hit — ${attempt}/${retries} attempt, 5s wait...`);
        await delay(5000 * attempt); // 5s, 10s, 15s
        continue;
      }

      throw err;
    }
  }
}

// ─── Single card extract ──────────────────────────────────────────────────────
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

// ─── Bulk cards extract — 50 cards support ───────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const results = [];
    const files = req.files;

    console.log(`Bulk extract: ${files.length} cards processing...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing card ${i + 1}/${files.length}: ${file.originalname}`);

      try {
        const data = await extractFromImage(file.buffer, file.mimetype);
        results.push({ filename: file.originalname, status: "success", data });
      } catch (err) {
        results.push({
          filename: file.originalname,
          status: "error",
          error: err.message,
          data: {},
        });
      }

      // Har 10 cards ke baad 4 second pause — rate limit avoid karne ke liye
      if ((i + 1) % 10 === 0 && i + 1 < files.length) {
        console.log(`Pausing 4s after ${i + 1} cards...`);
        await delay(4000);
      } else if (i + 1 < files.length) {
        // Har card ke beech 1 second pause
        await delay(1000);
      }
    }

    console.log(`Bulk extract done: ${results.length} cards processed`);
    res.json({ success: true, results });
  } catch (err) {
    console.error("Bulk extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server chal raha hai",
    model: MODEL_NAME,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL_NAME}`);
});