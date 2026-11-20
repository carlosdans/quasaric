# Quasaric

**Play the song. Learn your part.**

Quasaric is a web-based music learning application that helps musicians focus on specific instruments, explore audio stems, and practice with synchronized visuals.

## Features Implemented

### ✓ Audio Import & Playback
- Import MP3 and WAV files directly from browser (local processing)
- Multi-track player with Web Audio API
- Precise loop A-B with AudioContext scheduling

### ✓ Instrument Separation
- **DSP Mode**: Immediate separation using frequency filters (works without download)
- **ONNX Mode**: High-quality AI separation using Demucs ONNX models (optional download)
- 6 stems: vocals, drums, bass, guitar, piano, other

### ✓ Practice Tools
- Volume, mute, and solo controls per instrument
- Tempo control with BPM slider
- Loop A-B section practice
- Falling-note visualization (Synthesia-style)
- Chords display synced to position

### ✓ Piano Learning
- Chord progression visualization
- MIDI note patterns from real music
- Arpeggio practice mode

### ✓ Bilingual Support
- English and Spanish interfaces
- Automatic language detection
- Persistent language preference

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  React 19 + Vite (Bundler: 80KB gzipped)                │
│  Web Audio API (Multi-track player)                      │
│  ONNX Runtime Web (CDN, on-demand)                       │
│  IndexedDB (Model cache)                                 │
└─────────────────────────────────────────────────────────┘
```

### Audio Processing Flow
1. User imports audio file
2. File decoded to AudioBuffer (browser only)
3. DSP separation applies frequency filters
4. ONNX separation available for higher quality (model ~136MB)
5. Result: Independent instrument tracks

## Privacy by Design

- **All processing is local** - no audio files leave the device
- **No servers** - zero backend infrastructure
- **Open source models** - Demucs ONNX (MIT license)
- **No telemetry** - fully anonymous usage

## Development

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev      # Development server at http://localhost:5173
npm run build    # Production build in dist/
npm test         # Run test suite
npm run preview  # Preview production build
```

## Language Support

| Feature | English | Spanish |
|---------|---------|---------|
| Import | Import song file | Importar archivo de canción |
| Play/Pause | ▶/⏸ | ▶/⏸ |
| Loop | Loop | Bucle |
| Volume | Volume | Volumen |
| Mute/Solo | Mute/Solo | Mutear/Solo |
| Tempo | Tempo | Tempo |

## Project Structure

```
src/
├── App.jsx                 # Main application layout
├── main.jsx               # Entry point
├── i18n.js                # Translation dictionaries
├── data/
│   └── pianoPatterns.js   # Chord progressions & MIDI data
├── audio/
│   ├── MultiTrackPlayer.js # Core audio engine
│   ├── StemSeparatorEngine.js # Audio separation
│   └── useAudio.js        # Audio state management
├── components/
│   ├── ChannelSlider.jsx  # Volume/mute/solo controls
│   ├── ProgressBar.jsx  # Seek bar
│   ├── ChordDisplay.jsx # Chords visualization
│   ├── NoteView.jsx     # Falling notes practice
│   └── TempoControl.jsx # Tempo and loop controls
└── screens/
    └── PlayerScreen.jsx  # Main player interface
```

## Browser Requirements

- Web Audio API support (Chrome, Firefox, Edge, Safari 15+)
- WebAssembly support (for ONNX mode)
- localStorage for model caching
- RAM: 4GB minimum (8GB recommended for ONNX)

## Deployment

The production build is automatically deployed through:
- Azure Static Web Apps
- GitHub Actions workflow
- No API/backend configuration required

## License

This project uses only:
- React (MIT)
- ONNX Runtime Web (MIT)
- Demucs ONNX models (MIT)
- Open source chord/MIDI data

No paid APIs, commercial licenses, or proprietary software.