# Lisa: Multilingual Real-Time Voice Assistant

Lisa is a professional, witty, real-time voice assistant inspired by Tony Stark's EDITH, developed by Humate AI. This full-stack project features both a secure React frontend and a powerful Python server that together enable seamless interactive conversations over LiveKit, real-time transcription, advanced AI reasoning, text-to-speech, and real productivity tools (Gmail, Google Calendar, and weather).

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started (Full Stack)](#getting-started-full-stack)
- [Frontend Setup (React, Next.js)](#frontend-setup-react-nextjs)
- [Backend Setup (Python, LiveKit, AI)](#backend-setup-python-livekit-ai)
- [Usage](#usage)
- [Example Queries for Lisa](#example-queries-for-lisa)
- [Customization & Extensions](#customization--extensions)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Credits](#credits)

## Features

- **Real-time, HTTPS Audio/Video via LiveKit.**
- **Multilingual Persona**: Lisa answers in Hindi (with English words)—professional, witty, attentive.
- **Voice Processing**: Deepgram STT, Silero VAD, ElevenLabs TTS.
- **AI Skills**:
  - Weather (powered by OpenWeather API)
  - Current Date & Time
  - Google Calendar: Read and schedule events
  - Gmail: Read, search, draft, and label emails
- **Context-Sensitive**: Keeps separate context for emails/calendars per conversation; marks emails as read/discussed only when needed.
- **Spam/Security**: Google reCAPTCHA on login (frontend).
- **Animated, Responsive UI**: Built with TailwindCSS, Framer Motion, React 18.
- **Secure Local and Production Deployment**: Next.js custom server with HTTPS.

## Tech Stack

### Frontend

- React 18 + Next.js 14
- LiveKit JS SDK (& components)
- TailwindCSS
- Framer Motion
- Google reCAPTCHA

### Backend

- Python 3.9+
- LiveKit Python agent SDK
- Deepgram, Silero, Azure OpenAI, ElevenLabs Plugins
- Google Calendar/Gmail Python API clients
- .env and OAuth2 credentials for secret management

## Architecture Overview

```
+----------------+       WebRTC/HTTPS      +-------------------------+      AI APIs & 3rd Party      +--------------------------+
|  React Client  | <--------------------> |   LiveKit   (Cloud/Self) | <--------------------------> |     Python Voice Agent    |
|  (Next.js App) |                        |  (Room, SFU, DataChan)   |                             | (LLM, Weather, Gmail etc) |
+----------------+     (secure socket)     +-------------------------+         (Python)             +--------------------------+
```

- The frontend connects via HTTPS and LiveKit to send/receive audio and data.
- When a user speaks or asks something, the backend agent listens over the LiveKit room, transcribes, runs AI/logic, and responds with synthesized speech.
- Messages and context are exchanged over the LiveKit Data Channel.

## Getting Started (Full Stack)

### Prerequisites

- Node.js 18+ and npm/yarn (for frontend)
- Python 3.9+ (for backend)
- LiveKit cloud or self-hosted instance
- Google Cloud project with Calendar & Gmail APIs enabled
- API keys for OpenWeather, Azure OpenAI, ElevenLabs
- SSL certificate for HTTPS

## Frontend Setup (React, Next.js)

### Clone and Install

```bash
git clone https://github.com/your-username/voice-assistant2.git
cd voice-assistant2
npm install
```

### Configure HTTPS

Edit `server.js` with your certificate paths:

```js
key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem'),
```

### Run

- Development: `npm run dev` (serves HTTP on port 3000)
- Production (HTTPS):
  ```bash
  npm run build
  npm start
  ```
- App runs on port 443

## Backend Setup (Python, LiveKit, AI)

### Clone and Install

```bash
git clone https://github.com/your-username/voice-assistant2-server.git
cd voice-assistant2-server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Setup

Create a `.env` file:

```
AZURE_OPENAI_DEPLOYMENT=your-azure-deployment
OPENWEATHER_API_KEY=your-openweather-key
ELEVEN_VOICE_ID=your-elevenlabs-voice-id
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Ensure Google OAuth2 `token.json` and `credentials.json` for Calendar & Gmail are present (see Google API Python Quickstart).

### Run

```bash
python main.py
```

Lisa will connect to the configured LiveKit room, process users as they join, and respond over voice.

## Usage

1. Visit your Next.js frontend URL (e.g., https://localhost)
2. Join a LiveKit room and interact (voice or type)
3. Lisa responds with synthesized voice (and may send context/summaries to frontend if enabled)
4. Try any of the example queries below

## Example Queries for Lisa

- "आज का मौसम क्या है?" or "Check weather in Mumbai"
- "What’s my schedule tomorrow?"
- "Schedule a meeting called 'Project Demo' from 3 PM to 4 PM tomorrow."
- "Check my emails"
- "Read email number 2"
- "Search for emails about invoices"
- "Write an email to harsh@example.com, subject Meeting, say see you at 2 PM"

## Customization & Extensions

- **Frontend**: Add more LiveKit UI components, re-style with Tailwind, or extend with additional forms/content.
- **Backend**: Add new AI functions in `tools.py` using `@llm.ai_callable`, connect more APIs, or tweak Lisa’s persona/context in `main.py`.

## Troubleshooting

- Missing API keys or `.env` entries? Lisa will let you know with a clear error.
- Google API issues? Regenerate or refresh your `token.json` and check API scopes.
- Audio permissions? Ensure mic/camera allowed and device selected in browser.
- SSL issues? Ensure your certificate files, permissions, and domain match.

## License

MIT

## Credits

- LiveKit
- Deepgram
- Silero VAD
- Azure OpenAI
- ElevenLabs
- Google API Python Client
- Tony Stark and EDITH for the inspiration!

---

**Lisa**: Enjoy attentive, swift, and real Hindi-English AI voice interaction—powered by the latest open technologies.
