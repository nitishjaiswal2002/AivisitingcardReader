# Visiting Card Extractor 📇

AI-powered visiting card reader using **Google Gemini (FREE)** — upload card image, extract details, download CSV.

## Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js + Express
- **AI**: Google Gemini 1.5 Flash (**FREE API**)

---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

## Step 1 — Free Gemini API Key kaise le

1. https://aistudio.google.com/app/apikey pe jao
2. Google account se login karo
3. "Create API Key" click karo
4. Key copy karo — **bilkul free hai**

---

## Step 2 — Server setup

```bash
cd server
npm install
cp .env.example .env
```

`.env` file kholo aur apni key daalo:
```
GEMINI_API_KEY=AIzaSy...your_key_here
PORT=5000
```

```bash
npm run dev
```

---

## Step 3 — Client setup

```bash
cd client
npm install
npm start
```

---

## Open karo
```
http://localhost:3000
```

---

## Project Structure

```
visiting-card-extractor/
├── server/
│   ├── index.js          ← Express + Gemini Vision API
│   ├── package.json
│   └── .env.example
└── client/
    ├── public/index.html
    └── src/
        ├── App.js
        ├── components/
        │   ├── Header.js
        │   ├── UploadSection.js
        │   └── ResultsTable.js
        └── ...CSS files
```

## Features
- ✅ FREE — Google Gemini API (no credit card needed)
- ✅ Single card upload
- ✅ Bulk upload (20 cards ek baar)
- ✅ Drag & drop
- ✅ Image preview
- ✅ 15 fields extract: Name, Email, Phone, Company, Address, LinkedIn, etc.
- ✅ CSV download
