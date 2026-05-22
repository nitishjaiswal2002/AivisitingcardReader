import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { saveCard, getAllCards } from "./Controller/cardController.js";
// Top pe add karo
import { User } from "./Models/User.js"; // ✅
import crypto from "crypto";



dotenv.config();

const CF_BASE    = process.env.CF_BASE_URL || "https://sandbox.cashfree.com";
const CF_VERSION = "2023-08-01";
const CF_APP_ID  = process.env.CASHFREE_APP_ID;
const CF_SECRET  = process.env.CASHFREE_SECRET_KEY;

const PLANS = {
  pack_10:  {Label: "Starter",  amount:8, scans:10},
  pack_25:  { label: "Popular",   amount: 20,   scans: 25  },
  pack_50:   { label: "Pro",       amount: 40,  scans: 50 },
  unlimited: { label: "Unlimited", amount: 200,  scans: 999999 },
};






if (!process.env.MONGO_URI) throw new Error("❌ MONGO_URI missing in .env");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

const app = express();
const PORT = process.env.PORT || 5000;

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const OCR_MODEL       = "mistral-ocr-latest";
const EXTRACT_MODEL   = "mistral-medium-latest";

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const CARD_DETECTION_RULES = `
CARD DETECTION RULES — VERY IMPORTANT:
- ONE card: Same person/company with multiple contact details → return SINGLE JSON object
- MULTIPLE cards: Clearly different people/companies with different names → return JSON ARRAY

MERGING RULES:
1. MULTIPLE ADDRESSES on same card → combine: "Office: 123 ABC Road | Factory: 456 XYZ Nagar"
2. MULTIPLE EMAILS on same card → comma separated: "info@co.com, sales@co.com"
3. MULTIPLE PHONES → first in phone field, second in mobile field
4. Same name/company + multiple addresses = ONE card (merge address)
5. Different names/companies = MULTIPLE cards (return array)
6. Do NOT split one card into multiple objects
7. Do NOT merge different people into one object
`;

const PROMPTS = {
  english: `You are the world's best business card data extraction specialist.
Given OCR text from a business card image, extract information into JSON.
${CARD_DETECTION_RULES}
CRITICAL RULES:
1. Roman numerals (III, IV, VI) — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only (grnail→gmail, yarnoo→yahoo, rediffrnail→rediffmail)
3. Do NOT change email username (before @)
4. PHONE: ONLY digits 0-9, +, -, (), space — remove any letters
5. NAMES: Proper case, keep exact spelling
6. ADDRESS: Extract complete address — building, street, area, city, pincode
7. City → city field, State → state field separately
8. Country → "India" if address looks Indian
9. Return ONLY JSON — no markdown, no explanation
10. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
11. Sirf woh fields return karo jo actually card pe hain
12. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  hindi: `You are the world's best business card data extraction specialist for Hindi and English cards.
Given OCR text from a business card image, extract information into JSON.
${CARD_DETECTION_RULES}
HINDI RULES:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner", "निदेशक" → "Director")
- Translate Hindi company types (e.g. "प्राइवेट लिमिटेड" → "Pvt Ltd")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES:
1. Roman numerals — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only, do NOT change username
3. PHONE: ONLY digits 0-9, +, -, (), space
4. NAMES: Proper case after transliteration
5. Return ONLY JSON — no markdown, no explanation

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,

  auto: `You are the world's best business card data extraction specialist.
Given OCR text from a business card image, extract information into JSON.
Card may be in English, Hindi (Devanagari), or mixed.
${CARD_DETECTION_RULES}
HINDI HANDLING:
- Transliterate Hindi names to English (e.g. "राहुल शर्मा" → "Rahul Sharma")
- Translate Hindi designations (e.g. "प्रबंधक" → "Manager", "मालिक" → "Owner")
- Translate Hindi city/state (e.g. "मुंबई" → "Mumbai", "दिल्ली" → "Delhi")

CRITICAL RULES:
1. Roman numerals (III, IV, VI, IX) — keep EXACTLY as written, never convert
2. EMAIL: fix domain OCR errors only (grnail→gmail, yarnoo→yahoo, rediffrnail→rediffmail)
3. Do NOT change email username (before @)
4. PHONE: ONLY digits 0-9, +, -, (), space
5. NAMES: Proper case, exact spelling — never autocorrect
6. COMPANY: Keep original spelling, Roman numerals as-is
7. ADDRESS: Complete address. City → city field. State → state field. 6-digit Indian pincodes.
8. Country → "India" if address looks Indian and country not mentioned
9. SOCIAL: LinkedIn URL/username, Twitter/Instagram handle, WhatsApp number
10. Return ONLY JSON — no markdown, no explanation
11. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
12. Sirf woh fields return karo jo actually card pe hain
13. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`,
};

const FRONTBACK_PROMPT = `You are the world's best business card data extraction specialist.
You are given OCR text from BOTH SIDES of a single business card.
Combine into ONE complete JSON object.
${CARD_DETECTION_RULES}
FRONT+BACK MERGING RULES:
1. ADDRESS: Merge both sides into one complete address
2. PHONE/MOBILE: Different numbers → phone and mobile separately
3. EMAIL: Same → keep one. Different → comma separated
4. NAME/COMPANY/DESIGNATION: Prefer front side values
5. PRODUCTS/SERVICES: Back side product list → products field
6. SOCIAL MEDIA: Back side usually has social links

CRITICAL RULES:
1. Roman numerals — keep EXACTLY as written
2. EMAIL: fix domain OCR errors only, do NOT change username
3. PHONE: ONLY digits 0-9, +, -, (), space
4. Return ONLY ONE JSON object — no array
5. Return ONLY JSON — no markdown, no explanation
6. BLANK FIELDS: Agar koi field card pe nahi hai → us field ko JSON mein BILKUL MAT LIKHO
7. Sirf woh fields return karo jo actually card pe hain
8. Empty string "" mat dalna — field hi hata do

Return ONLY this JSON:
{
  "name": "", "designation": "", "company": "", "email": "", "phone": "", "mobile": "",
  "website": "", "address": "", "city": "", "state": "", "country": "",
  "products": "", "linkedin": "", "twitter": "", "instagram": "", "whatsapp": ""
}`;

const BATCH_CONFIG = {
  english: { batchSize: 5, batchDelay: 2000 },
  auto:    { batchSize: 5, batchDelay: 2000 },
  hindi:   { batchSize: 3, batchDelay: 5000 },
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

// SCAN quota middleware
const checkScanQuota = async (req, res, next)=>{
  try{
    const email = req.body.email || req.query.email;
    if(!email) return res.status(401).json({
      error: "Login required", code: "AUTH_REQUIRED",
      message : "Pehle apna email enter karo",
    });
    const user = await User.findOne({email});
    if(!user) return res.status(404).json({
      error:"User not found", code:"USER_NOT_FOUND",
      message:"Email register nahi hai",
    });

    let scanCount=1;
    if(req.files){
      if(Array.isArray(req.files)) scanCount = req.files.length;
      else if (req.files.cards)    scanCount=req.files.cards.length;
    }

    const status=user.canScan(scanCount);
    if(!status.allowed){
      if(status.reason === "excited")
        return res.status(402).json({
      error:"Premium expired", showPaywall:true,
     message:"Aapka unlimited plan expire ho gya.",
      });
      return res.status(402).json({
        error :"Scan limit reached", showPaywall:true,
        message: status.reason === "exhausted"
        ? "Aapka 5 free scans complete ho gaye. Premium lo!"
        : "Aapke scans khatam ho gaye",
      })
    } 
    req.scanUser=user;
    req.scanCount=scanCount;
    next();
  }
  catch(err) {res.status(500).json({error:err.message});}
};

const deductAfterScan = async (req) => {
  if(!req.scanUser) return;
  req.scanUser.deductScan(req.scanCount || 1);
  await req.scanUser.save();
};


// Delay in Uploading PIC
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

// ── OCR ───────────────────────────────────────────────────────────────────────
async function ocrImage(buffer, mimeType, retries = 3) {
  const base64 = buffer.toString("base64");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OCR_MODEL,
          document: { type: "image_url", image_url: `data:${mimeType};base64,${base64}` },
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`OCR error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      return data.pages?.map(p => p.markdown || p.text || "").join("\n") || "";
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("OCR timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Extract from OCR ──────────────────────────────────────────────────────────
async function extractFromOCR(ocrText, language = "auto", retries = 3) {
  const prompt = PROMPTS[language] || PROMPTS.auto;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          messages: [{ role: "user", content: `${prompt}\n\nOCR Text:\n${ocrText}` }],
          max_tokens: 1500,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`Extract error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      try { return JSON.parse(raw); } catch {
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

// ── Extract Front+Back ────────────────────────────────────────────────────────
async function extractFromFrontBack(frontOCR, backOCR, retries = 3) {
  const combinedText = `=== FRONT SIDE ===\n${frontOCR}\n\n=== BACK SIDE ===\n${backOCR}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          messages: [{ role: "user", content: `${FRONTBACK_PROMPT}\n\n${combinedText}` }],
          max_tokens: 1500,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429 && attempt < retries) { await delay(attempt * 15000); continue; }
        throw new Error(`FrontBack error: ${response.status} — ${err}`);
      }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      try { return JSON.parse(raw); } catch {
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error("FrontBack parse failed: " + raw.slice(0, 100));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        if (attempt < retries) { await delay(3000); continue; }
        throw new Error("FrontBack timeout");
      }
      if (attempt === retries) throw err;
    }
  }
}

// ── Clean helpers ─────────────────────────────────────────────────────────────
// ── Clean helpers ─────────────────────────────────────────────────────────────
const cleanEmail = (val) => {
  if (!val || typeof val !== "string") return val;
  const emails = val.split(",").map(e => e.trim()).filter(Boolean);
  const cleaned = emails.map(email => {
    if (!email.includes("@")) return email;
    const atIndex = email.lastIndexOf("@");
    const username = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1).toLowerCase();
    const domainFixes = {
      "grnail.com": "gmail.com", "gmial.com": "gmail.com", "gmai.com": "gmail.com",
      "yarnoo.com": "yahoo.com", "yahooo.com": "yahoo.com", "yah00.com": "yahoo.com",
      "hotrnail.com": "hotmail.com", "hotmai.com": "hotmail.com",
      "rediffrnail.com": "rediffmail.com", "redifmail.com": "rediffmail.com",
      "icloud.corn": "icloud.com", "gmail.corn": "gmail.com",
      "yahoo.corn": "yahoo.com", "hotmail.corn": "hotmail.com",
    };
    return `${username}@${domainFixes[domain] || domain}`;
  });
  const unique = [...new Set(cleaned)];
  return unique.join(", ");
};

const cleanPhone = (val) => {
  if (!val || typeof val !== "string") return val;
  return val
    .replace(/[OoIlSB]/g, (c) => ({ O:"0", o:"0", I:"1", l:"1", S:"5", B:"8" }[c] || c))
    .replace(/[^0-9+\-() ]/g, "")
    .trim();
};

const cleanAddress = (val) => {
  if (!val || typeof val !== "string") return val;
  const parts = val.split("|").map(p => p.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(" | ");
};

// ── Blank fields remover ──────────────────────────────────────────────────────
const BLANK_VALUES = new Set([
  "", "N/A", "n/a", "NA", "na", "-", "--", "none", "None", 
  "NONE", "null", "NULL", "undefined", "not available", 
  "Not Available", "N.A.", "n.a."
]);

const removeBlankFields = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      value !== null &&
      value !== undefined &&
      !BLANK_VALUES.has(String(value).trim())
    ) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// ── Clean result ──────────────────────────────────────────────────────────────
const cleanResult = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const result = {
    ...obj,
    email:    cleanEmail(obj.email),
    phone:    cleanPhone(obj.phone),
    mobile:   cleanPhone(obj.mobile),
    whatsapp: cleanPhone(obj.whatsapp),
    address:  cleanAddress(obj.address),
  };
  return removeBlankFields(result);
};

async function extractFromImage(buffer, mimeType, language = "auto") {
  const ocrText = await ocrImage(buffer, mimeType);
  console.log("OCR:", ocrText.slice(0, 200));
  const parsed = await extractFromOCR(ocrText, language);
  if (Array.isArray(parsed)) return parsed.map(cleanResult);
  return cleanResult(parsed);
}

async function extractFromImages(frontBuf, frontMime, backBuf, backMime) {
  const [frontOCR, backOCR] = await Promise.all([
    ocrImage(frontBuf, frontMime),
    ocrImage(backBuf, backMime),
  ]);
  return cleanResult(await extractFromFrontBack(frontOCR, backOCR));
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

//register or Login
app.post("/api/auth/register-or-login", async (req, res) => {
  try {
    const { phone, name, firebaseUid } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    let user = await User.findOne({ phone });
    if (!user) {
      if (!name) return res.status(400).json({ error: "Name required" });
      user = await User.create({ phone, name, firebaseUid });
    }

    const s = user.canScan();
    res.json({
      success: true,
      user: {
        id: user._id, name: user.name, phone: user.phone,
        plan: user.plan, isPremium: user.isPremium,
        freeScansUsed: user.freeScansUsed,
        freeScansLeft: Math.max(0, 5 - user.freeScansUsed),
        scansRemaining: user.scansRemaining,
        premiumExpiry: user.premiumExpiry,
        canScan: s.allowed, scanReason: s.reason,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// api for user Status
app.get("/api/user/status", async (req,res) =>{
try{
const {email} =req.query;
if(!email) return res.status(400).json({error:"Email Required"});
const user = await User.findOne({email});
if(!user) return res.status(404).json({error:"User not Found"}); 
const s=user.canScan();
res.json({
  sucess:true,
  user:{
    id:user._id,name:user.name,email:user.email,
    plan:user.plan,isPremium:user.isPremium,
    freeScansUsed:user.freeScansUsed,
    freeScansLeft:Math.max(0, 5 - user.freeScansUsed),
    scansRemaining:user.scansRemaining,
    premiumExpiry:user.premiumExpiry,
    canScan:s.allowed, scanReason:s.reason,
  },
});
}
catch(err) {res.status(500).json({err:err.message});}
});


// Payment routes
app.post("/api/payment/create-order", async (req,res) =>{
  try{
    const {email,plan}=req.body;
    if(!PLANS[plan]) return res.status(400).json({error:"Invalid plan"});
    const user = await User.findOne({email});
    if(!user) return res.status(404).json({error: "User not found"});

    const planInfo = PLANS[plan];
    const orderId = `order_${user._id}_${Date.now()}`;

    const response = await fetch(`${CF_BASE}/pg/orders` ,{
    method: "POST",
    headers:{
      "Content-Type": "application/json",
      "x-api-version": CF_VERSION,
      "x-client-id" : CF_APP_ID,
      "x-client-secret" : CF_SECRET,
    },

    body :JSON.stringify({
     order_id: orderId,
     order_amount: planInfo.amount,
     order_currency: "INR",
     customer_details: {
      customer_id: user._id.toString(),
      customer_name : user.name,
      customer_email:user.email,
      customer_phone: req.body.phone || "9999999999",
     },
     order_meta:{
      return_url:`${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/status?order_id={order_id}`,
      notify_url:`${process.env.BACKEND_URL || "http://localhost:5000"}/api/payment/webhook`,
     },
      order_note:`Card Scanner - ${planInfo.label}`,
    }),
    });

    const data = await response.json();
    if(!response.ok) throw new Error(data.message || "Order create failed");
    user.payments.push({orderId,plan,amount:planInfo.amount, scans:planInfo.scans,status:"pending", cfOrderId: data.order_id });
    await user.save();

    res.json({
      success:true,orderId,
      paymentSessionId:data.payment_session_id,
      amount:planInfo.amount, planInfo,
      userName:user.name,userEmail:user.email,
    });
  }
  catch(err) {res.status(500).json({error:err.message});}
});

// Payment Verify
app.post("/api/payment/verify", async (req,res)=>{
try{
  const {orderId,email,plan} = req.body;
  const response = await fetch(`${CF_BASE}/pg/orders/${orderId}`,{
    method: "GET",
    headers: {"x-api-version":CF_VERSION,"x-client-id":CF_APP_ID,"x-client-secret":CF_SECRET},
  });
  const orderData = await response.json();
  if(!response.ok) throw new Error(orderData.message || "Order fetch failed");
  if(orderData.order_status !== "PAID")
    return res.status(400).json({error:"Payment not completed", status:orderData.order_status});
   
  const user = await User.findOne({email});
  if(!user) return res.status(404).json({error:"User not found"});
  const planInfo = PLANS[plan];
  const payment = user.payments.find(p => p.orderId === orderId);
  if(payment) {payment.status = "success"; payment.paidAt = new Date(); }
  user.isPremium = true; user.plan=plan; user.premiumActivatedAt = new Date();
  if(plan === "unlimited"){
 const expiry = new Date(); expiry.setDate(expiry.getDate()+30);
 user.premiumExpiry=expiry; user.scansRemaining = 999999;
  }
  else 
  {
 user.scansRemaining = (user.scansRemaining || 0) + planInfo.scans;
 user.premiumExpiry=null;
  }
  await user.save();
  res.json({sucess: true, message: `Payment successfull! ${planInfo.label} activated.`,
    user:{name:user.name,
       email:user.email,
       plan:user.plan,
       isPremium:user.isPremium,
       scansRemaining:user.scansRemaining,
      premiumExpiry:user.premiumExpiry,
       freeScansLeft:0
    }
  });
}
catch(err){
  res.status(500).json({error:err.message});
}
});


//payment webhook
app.post("/api/payment/webhook", async (req,res) => {
  // webhook route mein user/payment fetch hi nahi kiya
// Yeh add karo:
try{
const orderId = req.body.data?.order?.order_id;
const user = await User.findOne({ "payments.orderId": orderId });
if (!user) return res.status(404).json({ error: "User not found" });
const payment = user.payments.find(p => p.orderId === orderId);
if (!payment) return res.status(404).json({ error: "Payment not found" });
const signature = req.headers["x-webhook-signature"];
const timestamp=req.headers["x-webhook-timestamp"];
const expected = crypto.createHmac("sha256",CF_SECRET).update(timestamp + JSON.stringify(req.body)).digest("base64");
if(expected !== signature) return res.status(400).json({error: "Invalid signature"});
if(req.body.type !== "PAYMENT_SUCCESS_WEBHOOK") return res.json({received:true});
const planInfo = PLANS[payment.plan];
payment.status = "success"; payment.paidAt = new Date();
user.isPremium = true; user.plan = payment.plan; user.premiumActivatedAt = new Date();
if(payment.plan === "unlimited"){
  const expiry = new Date(); expiry.setDate(expiry.getDate()+30);
  user.premiumExpiry = expiry; user.scansRemaining = 99999;
}
else {
  user.scansRemaining = (user.scansRemaining || 0) + planInfo.scans;
}
await user.save();
console.log(`✅ Webhook: ${user.email} — ${payment.plan}`);
res.json({received:true});
}
catch(err)
{res.status(500).json({error:err.message});}
})


// ── POST /api/extract ─────────────────────────────────────────────────────────
app.post("/api/extract", upload.single("card"),checkScanQuota, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Koi image upload nahi hui" });
    const language = req.body.language || "auto";
    const parsed = await extractFromImage(req.file.buffer, req.file.mimetype, language);
    await deductAfterScan(req);
    if (Array.isArray(parsed)) {
      const saved = await Promise.all(parsed.map(data => saveCard(data).catch(() => null)));
      res.json({
        success: true, multiple: true,
        results: parsed.map((data, i) => ({
          filename: `${req.file.originalname} — Card ${i + 1}`,
          status: "success",
          savedId: saved[i]?._id,
          data,
        })),
      });
    } else {
      const saved = await saveCard(parsed).catch(e => { console.error(e.message); return null; });
      res.json({ success: true, multiple: false, savedId: saved?._id, data: parsed });
    }
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/extract-frontback ───────────────────────────────────────────────
app.post("/api/extract-frontback",
  upload.fields([{ name: "front", maxCount: 1 }, { name: "back", maxCount: 1 }]),checkScanQuota,
  async (req, res) => {
    try {
      const frontFile = req.files?.front?.[0];
      const backFile  = req.files?.back?.[0];
      if (!frontFile) return res.status(400).json({ error: "Front image nahi hui" });
      if (!backFile)  return res.status(400).json({ error: "Back image nahi hui" });

      const data  = await extractFromImages(frontFile.buffer, frontFile.mimetype, backFile.buffer, backFile.mimetype);
      await deductAfterScan(req);
      const saved = await saveCard(data).catch(e => { console.error(e.message); return null; });

      res.json({ success: true, savedId: saved?._id, data });
    } catch (err) {
      console.error("FrontBack error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/extract-bulk ────────────────────────────────────────────────────
app.post("/api/extract-bulk", upload.array("cards", 50),checkScanQuota, async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: "Koi image nahi hui" });

    const language = req.body.language || "auto";
    const { batchSize, batchDelay } = BATCH_CONFIG[language] || BATCH_CONFIG.auto;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    const results = new Array(req.files.length);

    for (let i = 0; i < req.files.length; i += batchSize) {
      await Promise.all(
        req.files.slice(i, i + batchSize).map(async (file, j) => {
          const idx = i + j;
          try {
            const parsed = await extractFromImage(file.buffer, file.mimetype, language);
            const dataArr = Array.isArray(parsed) ? parsed : [parsed];
            await Promise.all(dataArr.map(d => saveCard(d).catch(() => null)));
            results[idx] = dataArr.map((data, k) => ({
              filename: Array.isArray(parsed)
                ? `${file.originalname} — Card ${k + 1}`
                : file.originalname,
              status: "success",
              data,
            }));
            console.log(`✓ ${file.originalname}`);
          } catch (err) {
            results[idx] = [{ filename: file.originalname, status: "error", error: err.message, data: {} }];
            console.log(`✗ ${file.originalname}`);
          }
        })
      );
      res.write(" ");
      if (i + batchSize < req.files.length) await delay(batchDelay);
    }
    await deductAfterScan(req);
    res.end(JSON.stringify({ success: true, results: results.flat() }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/cards ────────────────────────────────────────────────────────────
app.get("/api/cards", getAllCards);

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));