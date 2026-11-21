// ONNX Test Client - Handles UI interactions
// This file is loaded as a module to ensure proper initialization

import { loadOnnxRuntime, loadModel, separate, isModelLoadedSync, STEM_NAMES } from './src/audio/onnx-test.js';

let audioBuffer = null;
let stems = {};
let audioContext = null;
let currentSource = null;

// DOM Elements
const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('status-text');
const btnLoadOnnx = document.getElementById('btn-load-onnx');
const btnLoadModel = document.getElementById('btn-load-model');
const btnSelectAlways = document.getElementById('btn-select-always');
const btnSelectFile = document.getElementById('btn-select-file');
const btnSeparate = document.getElementById('btn-separate');
const fileInput = document.getElementById('file-input');
const consoleLogEl = document.getElementById('console-log');
const progressBarEl = document.getElementById('progress-fill');
const resultsSection = document.getElementById('results-section');
const resultsEl = document.getElementById('results');
const stemsGridEl = document.getElementById('stems-grid');
const audioInfoEl = document.getElementById('audio-info');
const separationTimeEl = document.getElementById('separation-time');

function log(message) {
    console.log(message);
    const line = document.createElement('div');
    line.textContent = message;
    consoleLogEl.appendChild(line);
    consoleLogEl.scrollTop = consoleLogEl.scrollHeight;
}

function updateStatus(status, text) {
    statusEl.className = 'status ' + status;
    statusTextEl.textContent = text;
}

function updateProgress(width) {
    progressBarEl.style.width = width + '%';
}

// Play a single stem
function playStem(name, buffer) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Stop any currently playing stem
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();

    currentSource = source;

    // Update button state
    const btns = stemsGridEl.querySelectorAll('.stem-btn');
    btns.forEach(btn => btn.textContent = '⏸️');

    source.onended = () => {
        currentSource = null;
        btns.forEach(btn => btn.textContent = '▶️');
    };

    log('Playing stem: ' + name);
}

// Initialize AudioContext
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        log('AudioContext initialized');
    }
    return audioContext;
}

// Load ONNX Runtime
btnLoadOnnx.addEventListener('click', async () => {
    updateStatus('loading', 'Loading ONNX Runtime from local module...');
    btnLoadOnnx.disabled = true;

    try {
        const result = await loadOnnxRuntime();

        if (result.available) {
            updateStatus('ready', 'ONNX Runtime loaded successfully');
            btnLoadModel.disabled = false;
            log('ONNX Runtime ready');
        } else {
            throw new Error('ONNX Runtime not available');
        }

    } catch (e) {
        updateStatus('error', 'Failed to load ONNX Runtime: ' + e.message);
        log('Error loading ONNX Runtime: ' + e);
    }
});

// Load Model
btnLoadModel.addEventListener('click', async () => {
    if (!isModelLoadedSync()) {
        updateStatus('loading', 'Loading ONNX model...');
        btnLoadModel.disabled = true;
        btnLoadOnnx.disabled = true;
        updateProgress(10);

        try {
            const result = await loadModel((state) => {
                log('Loading state: ' + JSON.stringify(state));
                updateProgress(state.progress);
            });

            if (result.success) {
                updateStatus('ready', 'Model loaded successfully');
                updateProgress(100);
                document.getElementById('model-info').innerHTML = `
                    <div class="result-item">✓ Model: htdemucs_6s_fp16weights.onnx</div>
                    <div class="result-item">✓ Stems: ${result.modelInfo.stems.join(', ')}</div>
                    <div class="result-item">✓ Input Shape: ${JSON.stringify(result.modelInfo.inputShape)}</div>
                    <div class="result-item">✓ Output Shape: ${JSON.stringify(result.modelInfo.outputShape)}</div>
                `;
                btnSeparate.disabled = false;
            } else {
                throw new Error(result.error);
            }

        } catch (e) {
            updateStatus('error', 'Failed to load model: ' + e.message);
            log('Error loading model: ' + e);
        }
    }
});

// Load Always.mp3 from server
btnSelectAlways.addEventListener('click', async () => {
    initAudioContext();

    try {
        log('Loading Always.mp3 from server...');

        const response = await fetch('/Always.mp3');
        if (!response.ok) throw new Error('Always.mp3 not found on server');

        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        document.getElementById('audio-info').innerHTML = `
            <div class="result-item success">✓ Loaded Always.mp3</div>
            <div class="result-item">Duration: ${audioBuffer.duration.toFixed(2)}s</div>
            <div class="result-item">Channels: ${audioBuffer.numberOfChannels}</div>
            <div class="result-item">Sample Rate: ${audioBuffer.sampleRate}Hz</div>
        `;

        btnSelectFile.disabled = false;
        btnSeparate.disabled = false;

        log('Always.mp3 loaded: ' + audioBuffer.duration + 's');
    } catch (e) {
        log('Error loading Always.mp3: ' + e.message);
    }
});

// Select file
btnSelectFile.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
        audioInfoEl.innerHTML = '<div class="result-item error">File too large (max 100MB)</div>';
        return;
    }

    initAudioContext();

    log('Loading file: ' + file.name);

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        document.getElementById('audio-info').innerHTML = `
            <div class="result-item success">✓ Loaded: ${file.name}</div>
            <div class="result-item">Duration: ${audioBuffer.duration.toFixed(2)}s</div>
            <div class="result-item">Channels: ${audioBuffer.numberOfChannels}</div>
            <div class="result-item">Sample Rate: ${audioBuffer.sampleRate}Hz</div>
        `;

        btnSelectFile.disabled = true;
        btnSeparate.disabled = false;
        log('Loaded: ' + audioBuffer.duration + 's');
    } catch (e) {
        log('Error loading file: ' + e.message);
    }
});

// Run separation
let isSeparating = false;
btnSeparate.addEventListener('click', async () => {
    if (isSeparating) return; // Prevent double clicks

    if (!audioBuffer || !isModelLoadedSync()) {
        updateStatus('error', 'Load audio and model first');
        return;
    }

    isSeparating = true;
    btnSeparate.disabled = true;
    btnSeparate.textContent = 'Separating...';
    updateStatus('loading', 'Running ONNX separation...');
    updateProgress(10);

    try {
        const startTime = performance.now();

        let progress = 10;
        const progressInterval = setInterval(() => {
            progress += 5;
            updateProgress(Math.min(progress, 90));
        }, 100);

        log('Starting ONNX separation of ' + audioBuffer.duration + 's audio...');

        const result = await separate(audioBuffer);

        clearInterval(progressInterval);
        updateProgress(100);

        const processingTime = performance.now() - startTime;

        if (result.success) {
            log('Separation completed in ' + processingTime.toFixed(2) + 'ms');
            updateStatus('ready', 'Separation complete');

            // Store audio buffers
            stems = result.audioBuffers || {};

            document.getElementById('separation-time').innerHTML = `
                <div class="result-item success">✓ Processing Time: ${processingTime.toFixed(2)}ms</div>
                <div class="result-item">✓ Duration: ${result.duration.toFixed(2)}s (${result.totalSegments} segments)</div>
            `;

            // Render stems grid with playback controls
            const stemsGrid = document.getElementById('stems-grid');
            stemsGrid.innerHTML = '';

            for (const stemName of result.stemNames || STEM_NAMES) {
                const buffer = stems[stemName];
                if (buffer) {
                    const btnDiv = document.createElement('div');

                    const label = document.createElement('div');
                    label.textContent = stemName;
                    label.style.fontSize = '12px';
                    label.style.color = '#888';
                    label.style.marginBottom = '4px';
                    label.style.textAlign = 'center';
                    label.style.textTransform = 'capitalize';
                    btnDiv.appendChild(label);

                    const playBtn = document.createElement('button');
                    playBtn.textContent = '▶️';
                    playBtn.className = 'stem-btn';
                    playBtn.style.margin = '0 auto';
                    playBtn.onclick = () => playStem(stemName, buffer);
                    btnDiv.appendChild(playBtn);

                    stemsGrid.appendChild(btnDiv);
                }
            }

            resultsSection.style.display = 'block';
            btnSeparate.textContent = 'Separate Tracks';
            btnSeparate.disabled = false;
            isSeparating = false;

        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (e) {
        updateStatus('error', 'Separation failed: ' + e.message);
        log('Separation error: ' + e);
        btnSeparate.textContent = 'Separate Tracks';
        btnSeparate.disabled = false;
        isSeparating = false;
    }
});

// Check model file exists on load
document.addEventListener('DOMContentLoaded', () => {
    log('HTDemucs ONNX Test page loaded');
    log('Environment: ' + navigator.userAgent);

    fetch('models/htdemucs_6s_fp16weights.onnx', { method: 'HEAD' })
        .then(r => {
            log('Model file available: true');
            btnLoadModel.disabled = false;
        })
        .catch(e => {
            log('Model file check: ' + e.message);
        });
});