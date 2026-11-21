#!/usr/bin/env node
/**
 * Generate test audio files for ONNX inference testing
 */

import fs from 'fs';
import { performance } from 'perf_hooks';

const SAMPLE_RATE = 44100;
const SEGMENT_DURATION = 7.8; // Model expects 7.8 second segments
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * SEGMENT_DURATION);

// Generate a more realistic synthetic audio that mimics a song structure
function generateTestAudio(duration = SEGMENT_DURATION) {
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;

        // Kick drum pattern (every ~0.5s for a beat)
        const kick = Math.sin(2 * Math.PI * 60 * t) *
            Math.exp(-Math.max(0, 0.1 - (t % 0.5)) * 50) * 0.4;

        // Snare (on the 2 and 4)
        const snare = Math.sin(2 * Math.PI * 200 * t) *
            Math.sin(2 * Math.PI * 4 * t) *
            Math.exp(-Math.max(0, 0.1 - (t % 0.5 - 0.25)) * 30) * 0.3;

        // Hi-hats (continuous high frequency)
        const hihat = (Math.random() - 0.5) * 0.1 * Math.sin(2 * Math.PI * 8000 * t);

        // Bass line (root notes following a progression)
        const bassFreq = 55; // A1
        const bass = (Math.sin(2 * Math.PI * bassFreq * t) +
                     Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.3) *
                     Math.sin(2 * Math.PI * 0.5 * t) * 0.4;

        // Vocals (sings a simple melody)
        const vocal = Math.sin(2 * Math.PI * 440 * t +
                       Math.sin(2 * Math.PI * 1.5 * t) * 0.5) * 0.25;

        // Guitar chords
        const chord1 = Math.sin(2 * Math.PI * 110 * t); // A
        const chord3 = Math.sin(2 * Math.PI * 146.83 * t); // C#
        const chord5 = Math.sin(2 * Math.PI * 196.00 * t); // E
        const guitar = (chord1 + chord3 + chord5) * 0.2 * Math.sin(2 * Math.PI * 0.25 * t);

        // Piano arpeggios
        const piano = (Math.sin(2 * Math.PI * 220 * t) +
                      Math.sin(2 * Math.PI * 329.63 * t) * 0.5 +
                      Math.sin(2 * Math.PI * 440 * t) * 0.3) * 0.15;

        // Mix everything
        const mix = kick + snare + hihat + bass + vocal + guitar + piano;

        // Normalize
        left[i] = mix * 0.8;
        right[i] = mix * 0.7 + Math.sin(2 * Math.PI * 220 * t) * 0.05;
    }

    return { left, right, numSamples };
}

// Write as 16-bit PCM WAV file
function writeWav(filename, left, right, sampleRate) {
    const length = left.length;
    const buffer = Buffer.alloc(44 + length * 2 * 2); // WAV header + 2 channels * 16-bit

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + length * 4, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt16LE(1, 16); // PCM
    buffer.writeUInt16LE(2, 20); // 2 channels
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 4, 28); // Byte rate
    buffer.writeUInt16LE(4, 32); // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
        // Clamp and convert to 16-bit
        const l = Math.max(-1, Math.min(1, left[i])) * 0x7FFF;
        const r = Math.max(-1, Math.min(1, right[i])) * 0x7FFF;

        buffer.writeInt16LE(l, offset);
        buffer.writeInt16LE(r, offset + 2);
        offset += 4;
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Written: ${filename} (${(buffer.length / (1024*1024)).toFixed(2)} MB)`);
}

console.log('Generating test audio file...');

const { left, right, numSamples } = generateTestAudio(SEGMENT_DURATION);
writeWav('tests/test_audio_7.8s.wav', left, right, SAMPLE_RATE);

console.log('Done!');
console.log(`Duration: ${SEGMENT_DURATION}s`);
console.log(`Sample Rate: ${SAMPLE_RATE}Hz`);
console.log(`Samples: ${numSamples}`);
console.log(`Channels: Stereo (2)`);