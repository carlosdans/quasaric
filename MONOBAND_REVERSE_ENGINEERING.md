# MonoBand Reverse Engineering Report

## 1. APK ANALYSIS

**Files Located:**
- XAPK: `MonoBand_+AI+Stem+Splitter_30.0.0_APKPure.xapk` (339 MB)
- Main APK: `band.mono.monoband.apk` (288 MB)

**Model Extracted:**
- Path: `assets/models/HTDemucs6Stems.onnx` (122 MB)
- Three demo songs with 6 stems each in `assets/demo/`

## 2. ONNX MODEL SPECIFICATION

**Input Tensor:**
- Shape: `(1, 2, 343980)` - float32, stereo, 7.8s at 44.1kHz

**Output Tensor:**
- Shape: `(1, 6, 2, 343980)`
- 6 stems: drums, bass, other, vocals, guitar, piano

**Stem Order (Model Output):**
`[drums, bass, other, vocals, guitar, piano]`

## 3. TECHNICAL IMPLEMENTATION

**Audio Pipeline:**
1. File import via React Native Bridge
2. Audio decoded to PCM using native libraries
3. Sample rate: 44100 Hz
4. Segment extraction (343980 samples)
5. ONNX inference per segment
6. Overlap-add reconstruction (Hanning window)
7. Stem post-processing

**Native Libraries:**
- `libhermes.so` - Hermes JS engine
- `libonnxruntime.so` - ONNX Runtime native
- `libreactnativejni.so` - React Native bridge

## 4. CSP & SECURITY

**Current CSP:**
- script-src 'self'
- connect-src 'self' blob: https://huggingface.co https://huggingface.co/api

**WASM Status:**
- HTTP 200
- Content-Type: application/wasm

## 5. VERIFIED WORKING COMPONENTS

✅ ONNX Runtime Web bundled locally via Vite
✅ WASM resources served from quasaric.com
✅ Model accessible from HuggingFace with CORS
✅ CSP allows blob: and HuggingFace URLs
✅ Audio import MP3/WAV
✅ Player with volume/mute controls

## 6. REMAINING TO VERIFY

**Manual Tests Required:**
1. Load file >7.8 seconds in browser
2. Click "Separate" button
3. Verify 6 stems are generated
4. Check stem audio contains musical content

## 7. COMPARISON: MONOBAND vs QUASARIC

| Feature | MonoBand (Android) | Quasaric (Web) |
|---------|-------------------|----------------|
| Model | HTDemucs6Stems.onnx | HTDemucs6Stems.onnx (HF) |
| Runtime | ONNX Runtime native | ONNX Runtime Web |
| WASM | Included in APK | Bundle with Vite |
| Audio Decoding | Native | Web Audio API |
