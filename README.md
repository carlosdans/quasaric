# Quasaric

A practice studio for musicians. Split any song into stems (vocals, drums, bass, other) using Meta's **Demucs v4** model, then practice along: mute or solo parts, loop a section, slow it down or change the key, see the chords and notes, and play your own instrument over the tracks. Learn guitar and bass parts from **tab** that follows the song as engraved notation, with a trainer that listens to you play and a speed trainer that only speeds up when you're getting it right. Everything runs **on your own device**: nothing is uploaded.

This is a web-based version forked from Steminize, adapted for quasaric.com.

> **Note:** This is a fork of [Steminize](https://github.com/Gerschwin/steminize) by Neil (Gerschwin). All credit for the original functionality goes to the Steminize project.

## Features

- **Stem separation** with HT Demucs models (fast, best, and 6-stem variants with guitar/piano)
- **Practice tools:** mute/solo, loop sections, change tempo and key, transpose pitch
- **Chords and notes:** chord detection, notes view for learning by ear, guitar/bass tab
- **Practice trainers:** speed trainer, tab trainer, accuracy scoring
- **Library:** save separated songs, export/import, setlists for rehearsals
- **All on-device:** no uploads, no tracking, no analytics
- **Zero cost:** completely free and open source

## Running it on your computer (development)

You need [Node.js 22 or newer](https://nodejs.org).

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Production build

```bash
npm run build
```

The output goes to `dist/`.

## Deployment for quasaric.com

This project is configured to deploy as a static web app. The build output can be deployed to any static hosting service (GitHub Pages, Azure Static Web Apps, Netlify, Vercel, etc.).

The `dist/` directory contains:
- `index.html` - Main application page
- `sw.js` - Service worker for offline support
- `assets/` - JavaScript bundles and ONNX model files

## About the original Steminize project

Steminize is also available as a desktop app (Tauri) with additional features:
- Native audio with lower latency
- YouTube audio import via yt-dlp
- Native folder picker
- Automatic updates

See the [Steminize GitHub repository](https://github.com/Gerschwin/steminize) for the full documentation.

## License

MIT License - see [LICENSE](LICENSE) for details.

This project includes:
- Steminize (original): MIT License
- Demucs: MIT License
- ONNX Runtime Web: MIT License
- Basic Pitch: Apache-2.0 License
- And other third-party dependencies (see LICENSE file)

## Attribution

This project is a derivative work of Steminize.
Original project: https://github.com/Gerschwin/steminize
Original author: Neil (Gerschwin)
Version based on: 0.9.4