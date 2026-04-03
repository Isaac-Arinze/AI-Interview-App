# 🎙️ TTS Studio — Nigerian Voice AI

A text-to-speech studio supporting Yoruba, Igbo, Hausa, Pidgin & Nigerian English via YarnGPT, plus OpenAI TTS and free browser voices.

## Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version recommended)

### 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Start the server
```
node server.js
```

### 4. Open the app
Open your browser and go to:
```
http://localhost:3000
```

## Usage

| Engine | What you need |
|--------|--------------|
| Browser | Nothing — works instantly, free |
| YarnGPT 🇳🇬 | API key from yarngpt.ai (fund with min ₦500) |
| OpenAI TTS | API key from platform.openai.com |

## Why a server?
Browsers block direct API calls to external services (CORS policy).
The local server acts as a proxy — your API key never leaves your machine.

## Nigerian voices (YarnGPT)
Idera, Emma, Zainab, Osagie, Wura, Jude, Chinenye, Tayo,
Regina, Femi, Adaora, Umar, Mary, Nonso, Remi, Adam
