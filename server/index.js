import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Multer — memory storage ────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WEBP, GIF allowed"));
  },
});

// ─── Gemini setup ───────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors());
app.use(express.json());

// ─── Prompt ─────────────────────────────────────────────────────────────────
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

// ─── Helper: call Gemini with image buffer ───────────────────────────────────
async function extractFromImage(buffer, mimeType) {
  const imagePart = {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };

  const result = await model.generateContent([PROMPT, imagePart]);
  const raw = result.response.text().trim();

  // Safe JSON parse
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI response parse nahi hua");
  }
}

// ─── Single card extract ─────────────────────────────────────────────────────
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

// ─── Bulk cards extract ──────────────────────────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Koi image upload nahi hui" });

    const results = [];

    for (const file of req.files) {
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
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Bulk extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server chal raha hai" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
