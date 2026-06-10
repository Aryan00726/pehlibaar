# 🪷 Pehli Baar — पहली बार

> **AI-powered document reader for first-generation college students in India.**

Pehli Baar helps students who are the first in their families to attend college understand complex admission letters, scholarship forms, fee receipts, and hostel notices — explained in simple Hindi + English by an AI "bade bhai/behen."

### 🔗 [Live Demo →](https://project1-jet-six.vercel.app)

---

## ✨ Features

- 📄 **Document Scanner** — Upload a photo, gallery image, or PDF of any college document
- 🤖 **AI Simplification** — Extracts key info and explains it in simple Hindi + English
- 💰 **Smart Data Cards** — Automatically pulls out fees, deadlines, and important numbers
- ✅ **Next Steps Checklist** — Numbered actions the student must take
- 💬 **Follow-up Chat** — Ask questions about the document in your own language
- 🔊 **Text-to-Speech** — Listen to the explanation in Hindi AI voice
- 📚 **Glossary** — Common college terms explained simply (Scholarship, Eligibility, Bonafide, etc.)
- 🌐 **Multi-language** — Supports Hindi, Marathi, Tamil, Bengali, Telugu, Kannada, Malayalam, Gujarati, Punjabi, English

---

## 📸 Screenshots

| Login | Dashboard | Document Detail |
|-------|-----------|-----------------|
| OTP-based login with phone number | Upload documents via camera, gallery, or PDF | AI-simplified explanation with key data cards |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express, TypeScript |
| **AI/ML** | Azure OpenAI (GPT-4o), Azure Document Intelligence |
| **Auth** | Custom JWT (HS256), Phone OTP via Twilio |
| **Storage** | Azure Blob Storage, Redis (sessions) |
| **TTS** | Azure Cognitive Services Speech |
| **Deployment** | Vercel (Serverless Functions + CDN) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20.0.0
- npm

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Aryan00726/pehlibaar.git
cd pehlibaar

# 2. Install backend dependencies
cd pehli-baar-backend
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (or use SIMULATION_MODE=true for demo)

# 4. Start the backend
npm run dev
# → Backend runs at http://localhost:3001

# 5. Open the frontend
# Open index.html in your browser, or serve it:
npx serve . -l 3000
# → Frontend runs at http://localhost:3000
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SIMULATION_MODE` | Set to `true` to run without Azure/Redis | For demo |
| `NODE_ENV` | `development` or `production` | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for OTP SMS | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number | For SMS |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | For AI |
| `OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | For AI |
| `OPENAI_KEY` | Azure OpenAI API key | For AI |
| `DOC_INTEL_ENDPOINT` | Azure Document Intelligence endpoint | For OCR |
| `DOC_INTEL_KEY` | Azure Document Intelligence key | For OCR |
| `REDIS_URL` | Redis connection URL | For sessions |

---

## 📁 Project Structure

```
pehlibaar/
├── index.html                    # Main frontend (single page app)
├── app.js                        # Frontend logic, routing, API calls
├── styles.css                    # All styles
├── public/                       # Vercel static assets (copy of frontend)
├── vercel.json                   # Vercel deployment config
├── package.json                  # Root package config
│
└── pehli-baar-backend/
    ├── api/
    │   └── index.ts              # Vercel serverless entry point
    ├── src/
    │   ├── index.ts              # Express server entry point
    │   ├── constants.ts          # App-wide constants
    │   ├── config/
    │   │   └── azure.ts          # Azure SDK client initialization
    │   ├── middleware/
    │   │   ├── auth.middleware.ts # JWT + API key authentication
    │   │   ├── errorHandler.middleware.ts
    │   │   ├── rateLimit.middleware.ts
    │   │   └── upload.middleware.ts
    │   ├── routes/
    │   │   ├── auth.route.ts     # Login (OTP + Google OAuth)
    │   │   ├── decode.route.ts   # Document upload & simplification
    │   │   ├── chat.route.ts     # Follow-up Q&A
    │   │   └── speak.route.ts    # Text-to-speech
    │   ├── services/
    │   │   ├── chat.service.ts
    │   │   ├── documentIntel.service.ts
    │   │   ├── session.service.ts
    │   │   ├── simplify.service.ts
    │   │   └── tts.service.ts
    │   ├── types/
    │   │   └── index.ts          # Shared TypeScript interfaces
    │   └── utils/
    │       ├── imagePreprocess.ts
    │       ├── languageMap.ts
    │       ├── sanitise.ts
    │       └── token.ts          # JWT sign/verify
    ├── package.json
    └── tsconfig.json
```

---

## 🌍 Deployment

The app is deployed on **Vercel** with:
- Static frontend served from Vercel's global CDN
- Backend API running as serverless functions

### Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aryan00726/pehlibaar)

Or manually:

```bash
npx vercel login
npx vercel --yes --prod
```

---

## 🎯 Why Pehli Baar?

"Pehli Baar" (पहली बार) means "First Time" in Hindi. Millions of first-generation college students in India receive complex documents they've never seen before — admission letters, scholarship forms, fee structures — written in English with jargon their families can't decode.

**Pehli Baar acts like a knowledgeable older sibling** who reads the document, pulls out what matters, and explains it simply in the student's own language.

---

## 📄 License

This project is private and unlicensed.

---

<p align="center">
  Made with ❤️ for first-generation college students in India
</p>
