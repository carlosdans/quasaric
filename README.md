# Quasaric

**Play the song. Learn your part.**

Quasaric is a web project in its clean starting state. The goal is to help musicians learn a part from a song: work with separated audio stems, focus on an instrument, and explore piano learning through synchronized notes and chord names.

## Product direction

- Import audio locally, keeping private tracks on the user's device whenever technically possible.
- Explore instrument separation (vocals, drums, bass, guitar, piano and other).
- Focus on one stem with mute, solo and volume controls.
- Investigate piano-to-MIDI transcription and a falling-note practice view.
- Offer chord names using English notation (C, D, E, F, G, A, B).
- Add practice tools such as tempo control, loops and short sections.

## Current status

This repository has been reset to a minimal web-app foundation. The features above are product goals, **not implemented or validated functionality**. The first milestone is a technical proof of concept using real audio files and openly licensed tools.

## Principles

- Start with a browser-based application.
- Prefer local processing and privacy by design.
- Keep the project free to run: no paid APIs, hosted AI services or metered backend.
- Be explicit about browser, memory and hardware requirements.
- Do not claim transcription or separation quality until tested.

## Development

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
npm test
npm run build
```

The production build is generated in `dist/` and deployed through the existing Azure Static Web Apps GitHub Actions workflow. No API/backend is configured.
