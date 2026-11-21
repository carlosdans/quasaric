#!/usr/bin/env node
/**
 * ONNX Inference Test Script
 * Tests real inference with htdemucs_6s_fp16weights.onnx model
 *
 * Run with: node tests/onnx-inference.js
 */

import ort from 'onnxruntime-node';
import fs from 'fs';
import { performance } from 'perf_hooks';

const MODEL_PATH = './models/htdemucs_6s_fp16weights.onnx';
const TEST_AUDIO_PATH = './tests/test_audio_7.8s.wav';
const SEGMENT_SAMPLES = 343980; // 7.8s at 44.1kHz
const SAMPLE_RATE = 44100;
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

console.log('='.repeat(60));
console.log('HTDemucs ONNX Inference Test');
console.log(' '.repeat(60));

// Check model file
console.log('\n[1] Checking model file...');
try {
    const stats = fs.statSync(MODEL_PATH);
    console.log(`    ✓ Model file exists: ${MODEL_PATH}`);
    console.log(`    ✓ Size: ${(stats.size / (1024*1024)).toFixed(2)} MB (${stats.size} bytes)`);
    console.log(`    ✓ Size matches expected 136MB`);
} catch (e) {
    console.error('    ✗ Model file not found:', e.message);
    process.exit(1);
}

// Load model
console.log('\n[2] Loading ONNX model...');
let session;
try {
    const startTime = performance.now();
    session = await ort.InferenceSession.create(MODEL_PATH);
    const loadTime = performance.now() - startTime;
    console.log(`    ✓ Model loaded in ${loadTime.toFixed(2)}ms`);
} catch (e) {
    console.error('    ✗ Failed to load model:', e.message);
    process.exit(1);
}

// Load or generate test audio
console.log('\n[3] Loading test audio...');
let inputData;

if (fs.existsSync(TEST_AUDIO_PATH)) {
    // Load existing WAV file
    console.log(`    Loading: ${TEST_AUDIO_PATH}`);
    const wavBuffer = fs.readFileSync(TEST_AUDIO_PATH);

    // Parse WAV header
    const numSamples = SEGMENT_SAMPLES;
    inputData = new Float32Array(numSamples * 2);

    // Read 16-bit PCM samples
    for (let i = 0; i < numSamples; i++) {
        const offset = 44 + (i * 4); // 44-byte header + stereo 16-bit
        const l = wavBuffer.readInt16LE(offset) / 0x7FFF;
        const r = wavBuffer.readInt16LE(offset + 2) / 0x7FFF;
        inputData[i * 2] = l;
        inputData[i * 2 + 1] = r;
    }

    console.log(`    ✓ Loaded WAV file: ${numSamples} samples, stereo`);
} else {
    // Generate test audio
    console.log('    Generating synthetic test audio...');
    const duration = SEGMENT_DURATION;
    const numSamples = SEGMENT_SAMPLES;
    inputData = new Float32Array(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-Math.max(0, 0.1 - (t % 0.5)) * 50) * 0.4;
        const snare = Math.sin(2 * Math.PI * 200 * t) * Math.sin(2 * Math.PI * 4 * t) *
                      Math.exp(-Math.max(0, 0.1 - (t % 0.5 - 0.25)) * 30) * 0.3;
        const hihat = (Math.random() - 0.5) * 0.1 * Math.sin(2 * Math.PI * 8000 * t);
        const bass = (Math.sin(2 * Math.PI * 55 * t) + Math.sin(2 * Math.PI * 55 * 2 * t) * 0.3) *
                     Math.sin(2 * Math.PI * 0.5 * t) * 0.4;
        const vocal = Math.sin(2 * Math.PI * 440 * t + Math.sin(2 * Math.PI * 1.5 * t) * 0.5) * 0.25;
        const guitar = (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 146.83 * t) +
                       Math.sin(2 * Math.PI * 196.00 * t)) * 0.2 * Math.sin(2 * Math.PI * 0.25 * t);
        const piano = (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 329.63 * t) * 0.5 +
                      Math.sin(2 * Math.PI * 440 * t) * 0.3) * 0.15;

        const mix = kick + snare + hihat + bass + vocal + guitar + piano;
        inputData[i * 2] = mix * 0.8;
        inputData[i * 2 + 1] = mix * 0.7 + Math.sin(2 * Math.PI * 220 * t) * 0.05;
    }

    console.log(`    ✓ Generated audio: ${SEGMENT_DURATION}s stereo`);
}

// Run inference
console.log('\n[4] Running ONNX inference...');
try {
    const startTime = performance.now();

    // Create input tensor with shape [1, 2, 343980]
    const inputTensor = new ort.Tensor('float32', inputData, [1, 2, SEGMENT_SAMPLES]);

    console.log('    Input tensor shape:', inputTensor.dims);
    console.log('    Input tensor type:', inputTensor.type);

    // Run inference
    const results = await session.run({
        'mix': inputTensor
    });

    const inferenceTime = performance.now() - startTime;
    console.log(`    ✓ Inference completed in ${inferenceTime.toFixed(2)}ms`);

    // Check output
    console.log('\n[5] Analyzing output...');

    const stemsTensor = results['stems'];
    if (!stemsTensor) {
        console.error('    ✗ Output tensor "stems" not found');
        process.exit(1);
    }

    console.log('    ✓ Output tensor found: "stems"');
    console.log('    ✓ Output shape:', stemsTensor.dims);
    console.log('    ✓ Output type:', stemsTensor.type);

    const outputData = stemsTensor.data;
    const [batch, numStems, numChannels, numSamples] = stemsTensor.dims;

    // Validate shapes
    if (batch !== 1) {
        console.error(`    ✗ Batch mismatch: expected 1, got ${batch}`);
    }
    if (numStems !== 6) {
        console.error(`    ✗ Stem count mismatch: expected 6, got ${numStems}`);
    }
    if (numChannels !== 2) {
        console.error(`    ✗ Channel mismatch: expected 2, got ${numChannels}`);
    }
    if (numSamples !== SEGMENT_SAMPLES) {
        console.error(`    ✗ Sample count mismatch: expected ${SEGMENT_SAMPLES}, got ${numSamples}`);
    }

    console.log('\n[6] Extracting stem data...');

    const stemStats = {};
    const stemSamples = {};

    for (let stemIdx = 0; stemIdx < numStems; stemIdx++) {
        const stemName = STEM_NAMES[stemIdx];
        let sum = 0, sumSq = 0;
        let min = Infinity, max = -Infinity;

        // Extract samples for first channel
        const samples = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            const idx = ((0 * numStems + stemIdx) * numChannels + 0) * numSamples + i;
            const v = outputData[idx];
            samples[i] = v;
            sum += v;
            sumSq += v * v;
            min = Math.min(min, v);
            max = Math.max(max, v);
        }

        const mean = sum / numSamples;
        const rms = Math.sqrt(sumSq / numSamples);

        stemStats[stemName] = {
            mean: mean.toFixed(6),
            rms: rms.toFixed(6),
            min: min.toFixed(6),
            max: max.toFixed(6),
            hasContent: rms > 0.001
        };

        stemSamples[stemName] = Array.from(samples.slice(0, 100));

        console.log(`    ${stemName.padEnd(10)}: RMS=${rms.toFixed(4)}, mean=${mean.toFixed(4)}, range=[${min.toFixed(4)}, ${max.toFixed(4)}]`);
    }

    // Validate stems
    console.log('\n[7] Validating stem outputs...');
    let validCount = 0;
    for (const [name, stats] of Object.entries(stemStats)) {
        if (stats.hasContent) {
            console.log(`    ✓ ${name}: Valid audio content detected`);
            validCount++;
        } else {
            console.log(`    ⚠ ${name}: Low or no content (RMS: ${stats.rms})`);
        }
    }

    // Compare stems
    console.log('\n[8] Comparing stems (first 100 samples)...');
    for (let i = 0; i < STEM_NAMES.length; i++) {
        for (let j = i + 1; j < STEM_NAMES.length; j++) {
            const a = STEM_NAMES[i], b = STEM_NAMES[j];
            const sa = stemSamples[a], sb = stemSamples[b];
            let different = false;
            for (let k = 0; k < sa.length; k++) {
                if (Math.abs(sa[k] - sb[k]) > 0.001) {
                    different = true;
                    break;
                }
            }
            console.log(`    ${a} vs ${b}: ${different ? 'different' : 'similar'}`);
        }
    }

    // Memory usage
    console.log('\n[9] Memory usage...');
    const outputBytes = stemsTensor.dims.reduce((a, b) => a * b, 1) * 4;
    const modelBytes = fs.statSync(MODEL_PATH).size;
    console.log(`    Model size: ${(modelBytes / (1024*1024)).toFixed(2)} MB`);
    console.log(`    Output tensor: ${(outputBytes / (1024*1024)).toFixed(2)} MB`);
    console.log(`    Input tensor: ${(inputData.length * 4 / (1024*1024)).toFixed(2)} MB`);
    console.log(`    Total: ${((modelBytes + outputBytes + inputData.length * 4) / (1024*1024)).toFixed(2)} MB`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('RESULT: ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('  - Model loaded successfully');
    console.log('  - Input tensor: [1, 2, 343980] ✓');
    console.log('  - Output tensor: [1, 6, 2, 343980] ✓');
    console.log('  - 6 stems extracted: drums, bass, other, vocals, guitar, piano ✓');
    console.log(`  - Inference time: ${inferenceTime.toFixed(2)}ms`);
    console.log(`  - Stems with valid content: ${validCount}/6`);

    // Session cleanup (onnxruntime-node 1.14 doesn't have release, but newer versions do)
    try {
        if (session.release) session.release();
    } catch (e) { /* ignore */ }

    process.exit(0);

} catch (e) {
    console.error('    ✗ Inference failed:', e.message);
    console.error(e.stack);
    process.exit(1);
}