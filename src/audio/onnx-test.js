/**
 * ONNX Test Module
 * Loads ONNX Runtime and htdemucs model for in-browser audio separation
 * Optimized for memory and responsive UI
 */

import * as ort from 'onnxruntime-web';

let session = null;
let modelInfo = null;
let processedStems = null;
let audioContext = null;
let isModelLoaded = false;
const SEGMENT_SAMPLES = 343980;
const SAMPLE_RATE = 44100;
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
let progressCallbacks = [];

/**
 * Get or create AudioContext singleton
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Register a progress callback
 */
export function onProgress(callback) {
    progressCallbacks.push(callback);
    return () => {
        const idx = progressCallbacks.indexOf(callback);
        if (idx >= 0) progressCallbacks.splice(idx, 1);
    };
}

/**
 * Notify all progress callbacks
 */
function notifyProgress(data) {
    progressCallbacks.forEach(cb => {
        try { cb(data); } catch (e) {}
    });
}

/**
 * Load ONNX Runtime
 */
export async function loadOnnxRuntime() {
    try {
        const ort = await import('onnxruntime-web');
        if (ort.InferenceSession) {
            return { available: true };
        }
        throw new Error('onnxruntime-web not properly loaded');
    } catch (e) {
        return { available: false, error: e.message };
    }
}

/**
 * Load htdemucs ONNX model
 */
export async function loadModel(progressCallback = null) {
    if (isModelLoaded && session) {
        if (progressCallback) progressCallback({ stage: 'ready', progress: 100 });
        return { success: true, modelInfo, session };
    }

    try {
        notifyProgress({ stage: 'loading', progress: 10 });

        // Check if file exists first (HEAD request is fast)
        const headResponse = await fetch('models/htdemucs_6s_fp16weights.onnx', { method: 'HEAD' });
        if (!headResponse.ok) throw new Error('Model file not found');

        // Get content length for progress
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
        console.log(`Model size: ${contentLength} bytes`);

        notifyProgress({ stage: 'fetching', progress: 20 });

        // Fetch complete model
        const response = await fetch('models/htdemucs_6s_fp16weights.onnx');
        if (!response.ok) throw new Error('Failed to fetch model');

        const modelBuffer = await response.arrayBuffer();

        notifyProgress({ stage: 'creating_session', progress: 40 });

        // Enable WASM Proxy Worker - runs inference in background worker, never blocks main thread
        // This is the official ONNX Runtime solution for browser main thread responsiveness
        ort.env.wasm.proxy = true;
        console.log('[PROXY] WASM Proxy Worker enabled - inference will run in background worker');

        // Try to create session with WASM execution provider
        // WASM is preferred for performance, but may fail with std::bad_alloc on some browsers
        // (especially Edge) due to memory limits with large models (130MB+)
        // Fallback to CPU if WASM fails
        let wasmFailed = false;
        try {
            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'basic',
                enableMemPattern: false,
                numThreads: 1,
                scratchLimit: 1024 * 1024 * 100,
                memoryLimit: 1024 * 1024 * 500
            });
            console.log('[ONNX] Session created with WASM execution provider');
        } catch (wasmError) {
            console.warn('[ONNX] WASM session failed:', wasmError.message);
            console.warn('[ONNX] Falling back to CPU execution provider');
            wasmFailed = true;

            // Fallback to CPU execution provider
            // CPU doesn't have WASM memory limits and works in all browsers
            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['cpu'],
                graphOptimizationLevel: 'basic',
                enableMemPattern: false,
                numThreads: 1
            });
            console.log('[ONNX] Session created with CPU execution provider');
        }

        // Verify session is valid
        if (!session.inputNames || !session.outputNames) {
            throw new Error('Session missing input/output names');
        }

        modelInfo = {
            inputName: 'mix',
            outputName: 'stems',
            inputShape: [1, 2, SEGMENT_SAMPLES],
            outputShape: [1, 6, 2, SEGMENT_SAMPLES],
            stems: STEM_NAMES,
            sampleRate: SAMPLE_RATE,
            segmentDuration: 7.8,
            modelSize: modelBuffer.byteLength,
            executionProvider: session ? (session.options ? 'wasm' : 'cpu') : 'unknown',
            // Track if WASM failed due to memory issues
            wasmMemoryFallback: wasmFailed || false
        };

        isModelLoaded = true;

        notifyProgress({ stage: 'ready', progress: 100 });
        if (progressCallback) progressCallback({ stage: 'ready', progress: 100 });

        console.log('Model loaded:', modelInfo);

        return { success: true, modelInfo, session };

    } catch (e) {
        console.error('Model load error:', e);
        return { success: false, error: e.message, stack: e.stack };
    }
}

/**
 * Separate audio in segments with overlap-add for full duration
 */
export async function separate(audioBuffer, options = {}) {
    if (!session) {
        const loadResult = await loadModel(options.onProgress);
        if (!loadResult.success) return loadResult;
    }

    const SR = SAMPLE_RATE;
    // Use 2-second segments for better browser responsiveness
    // Original model trained for 7.8s, but 2s is safer for main-thread WASM
    const SEGMENT_SAMPLES = 88200;  // 2 seconds at 44.1kHz
    const OVERLAP_RATIO = 0.1;
    const OVERLAP_SAMPLES = Math.floor(SEGMENT_SAMPLES * OVERLAP_RATIO);
    const STEP_SIZE = SEGMENT_SAMPLES - OVERLAP_SAMPLES;

    // Get actual audio length from AudioBuffer
    const totalSamples = Math.ceil(audioBuffer.length || Math.floor(audioBuffer.duration * SR));
    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

    console.log(`Processing ${audioBuffer.duration.toFixed(2)}s audio in ${totalSegments} segments`);
    console.log(`Total samples: ${totalSamples}`);

    const startTime = performance.now();
    const ctx = getAudioContext();

    notifyProgress({ stage: 'preprocessing', progress: 60 });

    // Get input audio
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

    // Prepare output buffers with overlap-add accumulation
    const stemOutputs = {};
    STEM_NAMES.forEach(name => {
        stemOutputs[name] = new Float32Array(totalSamples * 2);  // stereo
    });

    let segmentsProcessed = 0;
    let sampleIdx = 0;

    notifyProgress({ stage: 'inference', progress: 70 });

    // Process each segment
    while (sampleIdx < totalSamples) {
        const leftSegment = new Float32Array(SEGMENT_SAMPLES);
        const rightSegment = new Float32Array(SEGMENT_SAMPLES);

        // Fill segment with audio data (pad with zeros if needed)
        for (let i = 0; i < SEGMENT_SAMPLES; i++) {
            const srcIdx = sampleIdx + i;
            leftSegment[i] = srcIdx < left.length ? left[srcIdx] : 0;
            rightSegment[i] = right && srcIdx < right.length ? right[srcIdx] : (srcIdx < left.length ? left[srcIdx] : 0);
        }

        // Create input tensor
        const inputData = new Float32Array(2 * SEGMENT_SAMPLES);
        for (let i = 0; i < SEGMENT_SAMPLES; i++) {
            inputData[i * 2] = leftSegment[i];
            inputData[i * 2 + 1] = rightSegment[i];
        }

        const inputTensor = new ort.Tensor('float32', inputData, [1, 2, SEGMENT_SAMPLES]);

        // Run inference
        const results = await session.run({
            'mix': inputTensor
        });

        const outputTensor = results['stems'];
        if (!outputTensor || !outputTensor.data) {
            throw new Error('Output tensor not found');
        }

        const outputData = outputTensor.data;
        const numSamples = outputTensor.dims[3];

        // Apply overlap-add to accumulate outputs with cooperative yielding
        // Process in chunks to avoid blocking the main thread
        const CHUNK_SIZE = 5000;  // Process 5000 samples at a time
        for (let stemIdx = 0; stemIdx < STEM_NAMES.length; stemIdx++) {
            const stemName = STEM_NAMES[stemIdx];
            let chunkCount = 0;

            for (let i = 0; i < numSamples; i++) {
                const srcPos = sampleIdx + i;
                if (srcPos < totalSamples) {
                    // Extract both channels for this stem
                    const idxLeft = (stemIdx * 2 + 0) * numSamples + i; // [batch=0, stem, channel=0, sample]
                    const idxRight = (stemIdx * 2 + 1) * numSamples + i; // [batch=0, stem, channel=1, sample]

                    const leftVal = outputData[idxLeft];
                    const rightVal = outputData[idxRight];

                    // Apply Hanning window for overlap-add
                    const windowPos = i - (sampleIdx % STEP_SIZE);
                    const windowFactor = sampleIdx === 0 || sampleIdx + i >= totalSamples
                        ? 1.0
                        : (windowPos < OVERLAP_SAMPLES)
                            ? 0.5 * (1 - Math.cos(Math.PI * windowPos / OVERLAP_SAMPLES))
                            : 1.0;

                    const targetPos = srcPos * 2;
                    stemOutputs[stemName][targetPos] = (stemOutputs[stemName][targetPos] || 0) + leftVal * windowFactor;
                    stemOutputs[stemName][targetPos + 1] = (stemOutputs[stemName][targetPos + 1] || 0) + rightVal * windowFactor;
                }

                // Yield cooperatively every CHUNK_SIZE samples
                chunkCount++;
                if (chunkCount >= CHUNK_SIZE) {
                    chunkCount = 0;
                    // Yield to event loop
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }

        segmentsProcessed++;

        // Notify progress
        if (options.onProgress) {
            options.onProgress({
                stage: 'processing',
                segment: segmentsProcessed,
                total: totalSegments,
                progress: 65 + (segmentsProcessed / totalSegments) * 25
            });
        }

        sampleIdx += STEP_SIZE;

        // Cooperative yield: give browser a chance to update UI
        if (segmentsProcessed % 3 === 0 || sampleIdx >= totalSamples) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    const processingTime = performance.now() - startTime;

    // Normalize and create AudioBuffers with cooperative yielding
    notifyProgress({ stage: 'postprocessing', progress: 95 });

    const stemBuffers = {};
    const stemStats = {};

    for (let stemIdx = 0; stemIdx < STEM_NAMES.length; stemIdx++) {
        const stemName = STEM_NAMES[stemIdx];
        let maxVal = 0;
        const data = stemOutputs[stemName];

        // Find max for normalization
        for (let i = 0; i < data.length; i++) {
            maxVal = Math.max(maxVal, Math.abs(data[i]));
        }

        // Yield periodically during max calculation
        if (stemIdx % 2 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Create AudioBuffer
        const buffer = ctx.createBuffer(2, totalSamples, SR);

        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        const norm = maxVal > 1 ? 1 / maxVal : 1;

        let sum = 0, sumSq = 0;
        let min = Infinity, max = -Infinity;
        const CHUNK_SIZE = 50000;  // 50k samples per yield chunk
        let chunkCount = 0;

        for (let i = 0; i < totalSamples; i++) {
            const l = data[i * 2] * norm;
            const r = data[i * 2 + 1] * norm;
            left[i] = l;
            right[i] = r;

            sum += l;
            sumSq += l * l;
            min = Math.min(min, l);
            max = Math.max(max, l);

            chunkCount++;
            if (chunkCount >= CHUNK_SIZE) {
                chunkCount = 0;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const rms = Math.sqrt(sumSq / totalSamples);
        const mean = sum / totalSamples;

        stemBuffers[stemName] = buffer;
        stemStats[stemName] = {
            channels: 2,
            length: totalSamples,
            sampleRate: SR,
            duration: totalSamples / SR,
            rms: rms,
            mean: mean,
            min: min,
            max: max,
            hasValidAudio: rms > 0.01 && isFinite(rms)
        };

        // Clean up temporary output buffer to save memory
        stemOutputs[stemName].fill(0);
    }

    processedStems = stemStats;

    notifyProgress({ stage: 'complete', progress: 100 });

    return {
        success: true,
        stems: stemStats,
        audioBuffers: stemBuffers,
        processingTime,
        duration: totalSamples / SR,
        sampleRate: SR,
        totalSegments: segmentsProcessed,
        stemNames: STEM_NAMES
    };
}

/**
 * Get model info
 */
export function getModelInfo() {
    return modelInfo;
}

/**
 * Check if model is loaded
 */
export function isModelLoadedSync() {
    return isModelLoaded;
}

/**
 * Get processed stems
 */
export function getProcessedStems() {
    return processedStems;
}

/**
 * Release session and free memory
 */
export async function release() {
    if (session) {
        try {
            session.release();
        } catch (e) {
            console.warn('Error releasing session:', e);
        }
        session = null;
    }
    isModelLoaded = false;
    modelInfo = null;
    processedStems = null;
    progressCallbacks = [];
}

export { STEM_NAMES, SEGMENT_SAMPLES, SAMPLE_RATE };