# 🤖 Ino Voice Maker# Ino Voice Maker



A browser-based robot sound-effect designer built with React, Vite, and the Web Audio API. Shape volume and pitch envelopes on interactive graphs, pick a waveform, dial in detune, and instantly preview or export your creation.A browser-based robot SFX designer built with React, Vite, and the Web Audio API.



**[▶ Live Demo](https://ino-voice-maker.vercel.app)**## Features



---- **Oscillator-based synthesis** - Square, Sawtooth, Triangle, and Sine waveforms for clean robotic sounds

- **Interactive envelope editors** - Drag-and-drop SVG graphs for volume and pitch over time

## ✨ Features- **6 built-in presets** - Happy Chirp, Error Buzz, Success Ding, Robot Boop, Laser Zap, Coin Pickup

- **Beginner-friendly UI** - Sliders, descriptions, and a How It Works section

| Category | Details |- **Randomize** - Shake up parameters for unexpected results

|---|---|

| **Oscillator Synthesis** | Square, Sawtooth, Triangle, and Sine waveforms for authentic robotic sounds |## Getting Started

| **Interactive Envelope Editors** | Drag-and-drop SVG graphs for Volume and Pitch over time — add, move, or delete control points |

| **Dual-Oscillator Detune** | Chorus / detuning effect (±1200 cents) via a second oscillator for thick, layered tones |`ash

| **6 Built-in Presets** | 😊 Happy Chirp · ❌ Error Buzz · ✅ Success Ding · 🤖 Robot Boop · 🔫 Laser Zap · 🪙 Coin Pickup |npm install

| **Randomizer** | One-click randomization of all parameters for unexpected results |npm run dev

| **Export** | Download as **WAV** (lossless), **MP3** (compressed via lamejs), or **JSON** (reloadable project file) |`

| **Import** | Load a previously saved JSON project to pick up where you left off |

| **Beginner-Friendly UI** | Descriptive labels, tooltips with crosshair readout, and a "How It Works" guide built into the page |Open http://localhost:5173 in your browser.



---## Tech Stack



## 🚀 Getting Started- React 19 + Vite 8

- Tailwind CSS v4

### Prerequisites- Web Audio API (OscillatorNode, GainNode)

- [Node.js](https://nodejs.org/) 18 or newer

### Install & Run

```bash
git clone https://github.com/monjar/Ino-Voice-Maker.git
cd Ino-Voice-Maker
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 🗂️ Project Structure

```
src/
├── audio/
│   ├── AudioEngine.js      # Singleton Web Audio engine (play, stop, renderOffline)
│   └── presets.js           # 6 built-in sound presets
├── components/
│   ├── RobotSfxDesigner.jsx # Main page — wires everything together
│   ├── GraphEditor.jsx      # SVG drag-and-drop envelope editor
│   ├── ControlPanel.jsx     # Sliders for duration, gain, waveform, detune
│   ├── PresetPanel.jsx      # Preset selector grid
│   └── ExportPanel.jsx      # Export WAV/MP3/JSON + Import JSON
├── utils/
│   ├── dsp.js               # Helpers — clamp, lerp, formatHz, sampleCurve
│   └── exporters.js         # WAV encoder, MP3 encoder (lamejs), JSON export
├── App.jsx                  # Root component
├── main.jsx                 # React entry point
└── index.css                # Tailwind CSS v4 entry
```

---

## 🛠️ Tech Stack

- **React 19** — UI components
- **Vite 8** — Dev server & bundler
- **Tailwind CSS v4** — Utility-first styling
- **Web Audio API** — OscillatorNode, GainNode, OfflineAudioContext
- **lamejs** — Client-side MP3 encoding

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## 🌐 Deployment

The site is deployed on **Vercel** and updates automatically.

Production URL → **https://ino-voice-maker.vercel.app**

---

## 📄 License

MIT
