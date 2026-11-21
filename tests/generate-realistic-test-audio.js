#!/usr/bin/env node
/**
 * Generate realistic test audio that simulates a full musical arrangement
 * This audio will be used to validate HTDemucs ONNX separation
 *
 * Features:
 * - Realistic kick/snare pattern
 * - Full bass line following chord progression
 * - Vocal melody
 * - Guitar chords and riff
 * - Piano arpeggios
 * - All parts synchronized
 */

import fs from 'fs';

const SAMPLE_RATE = 44100;
const BPM = 100;
const BEAT_DURATION = 60 / BPM; // seconds per beat

// Generate a 16-second musical arrangement with all instruments
function generateRealisticTrack(duration = 16) {
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);

    // Chord progression: Am - F - C - G (4 chords, 4 bars each)
    const chordFreqs = [
        [110, 138.59, 184.97],    // Am (A2 + C3 + E3)
        [174.61, 220, 293.66],    // F (F3 + A3 + C4)
        [261.63, 329.63, 440.00], // C (C4 + E4 + G4)
        [196.00, 246.94, 329.63]  // G (G4 + B4 + D5)
    ];

    // Bass notes following the chord progression
    const bassNotes = [110, 174.61, 261.63, 196.00]; // A2, F3, C4, G4

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const beat = (t / BEAT_DURATION) % 16; // 16 beats per cycle
        const bar = Math.floor(beat / 4); // 4 beats per bar
        const measurePos = beat % 4; // Position within bar

        const leftChannel = 0;
        const rightChannel = 0;

        // === KICK DRUM ===
        // Pattern: Kick on beats 1 and 3
        const kick = Math.sin(2 * Math.PI * 60 * t) *
            Math.exp(-Math.max(0, 0.05 - (t % BEAT_DURATION)) * 30) *
            (measurePos < 0.5 || (measurePos > 1.5 && measurePos < 2.5)) ? 0.5 : 0;

        // === SNARE DRUM ===
        // Pattern: Snare on beats 2 and 4
        const snare = Math.sin(2 * Math.PI * 200 * t) *
            Math.sin(2 * Math.PI * 4 * t) *
            Math.exp(-Math.max(0, 0.05 - Math.abs((t % BEAT_DURATION) - BEAT_DURATION/2)) * 30) *
            ((measurePos > 1.5 && measurePos < 2.5) || (measurePos < 0.5 && bar !== 0)) ? 0.4 : 0;

        // === HI-HATS ===
        // Continuous hi-hats with variations
        const hihat = 0.15 * (Math.random() - 0.3) *
            (measurePos < 0.5 ? 1 : Math.sin(2 * Math.PI * 8000 * t) * 0.5);

        // === BASS ===
        // Follow chord progression with walking bass
        const bassFreq = bassNotes[bar % 4];
        const bass = (Math.sin(2 * Math.PI * bassFreq * t) * 0.4 +
                     Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.2) *
                     Math.sin(2 * Math.PI * 0.25 * t) * 0.6;

        // === VOCALS ===
        // Simple vocal melody (C major scale)
        const vocalNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        const vocalFreq = vocalNotes[Math.floor(t * 2) % vocalNotes.length];
        const vocal = Math.sin(2 * Math.PI * vocalFreq * t +
                       Math.sin(2 * Math.PI * 1.5 * t) * 0.5) * 0.3;

        // === GUITAR ===
        // Power chord progression (simplified)
        const guitar = (Math.sin(2 * Math.PI * chordFreqs[bar % 4][0] * t) +
                       Math.sin(2 * Math.PI * 110 * t) * 0.5) *
                       (measurePos < 0.5 ? 1 : 0.3) * 0.35;

        // === PIANO ===
        // Arpeggiated pattern
        const piano = chordFreqs[bar % 4].reduce((sum, freq) => {
            return sum + Math.sin(2 * Math.PI * freq * t + Math.sin(2 * Math.PI * 0.25 * t) * 0.5);
        }, 0) * 0.2;

        // === MIX ===
        const mix = kick + snare + hihat + bass + vocal + guitar + piano;

        // Apply soft limiting
        const limited = Math.max(-0.8, Math.min(0.8, mix));

        // Stereo spread
        left[i] = limited * 1.0;
        right[i] = limited * 0.7 + Math.sin(2 * Math.PI * 220 * t) * 0.05;
    }

    return { left, right, numSamples: numSamples };
}

// Write as 16-bit PCM WAV file
function writeWav(filename, left, right, sampleRate, numSamples) {
    const length = numSamples;
    const buffer = Buffer.alloc(44 + length * 2 * 2); // WAV header + 2 channels * 16-bit

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + length * 4 - 8, 4);
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
        const l = Math.max(-1, Math.min(1, left[i])) * 0x7FFF;
        const r = Math.max(-1, Math.min(1, right[i])) * 0x7FFF;

        buffer.writeInt16LE(l, offset);
        buffer.writeInt16LE(r, offset + 2);
        offset += 4;
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Written: ${filename}`);
    console.log(`Size: ${(buffer.length / (1024*1024)).toFixed(2)} MB`);
    console.log(`Duration: ${(length / sampleRate).toFixed(2)} seconds`);
}

console.log('Generating realistic test audio (16 seconds)...');
console.log('=' .repeat(50));

const { left, right, numSamples } = generateRealisticTrack(16);
writeWav('tests/test_realistic_16s.wav', left, right, SAMPLE_RATE, numSamples);

console.log('='.repeat(50));
console.log('Generated a 16-second musical arrangement with:');
console.log('- Kick drum and snare patterns');
console.log('- Realistic bass line following chord progression');
console.log('- Vocal melody');
console.log('- Guitar power chords');
console.log('- Piano arpeggios');
console.log('- All synchronized at 100 BPM');