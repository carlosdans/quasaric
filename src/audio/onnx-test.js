/**
 * ONNX Test Module
 * Loads ONNX Runtime and htdemucs model for in-browser audio separation
 * Optimized for memory and responsive UI
 */

import * as ort from 'onnxruntime-web';

let session = null;
let modelInfo = null;
let processedStems = null;
let isModelLoaded = false;
const SEGMENT_SAMPLES = 343980;
const SAMPLE_RATE = 44100;
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
let progressCallbacks = [];

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

        // Create session with conservative settings
        session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'disabled',
            enableMemPattern: false,
            numThreads: 1,
            scratchLimit: 1024 * 1024 * 50
        });

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
            modelSize: modelBuffer.byteLength
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
 * Separate audio in segments to avoid memory issues
 */
export async function separate(audioBuffer, options = {}) {
    if (!session) {
        const loadResult = await loadModel(options.onProgress);
        if (!loadResult.success) return loadResult;
    }

    const totalSamples = Math.floor(audioBuffer.duration * SAMPLE_RATE);
    const numSegments = Math.ceil(totalSamples / SEGMENT_SAMPLES);

    console.log(`Processing ${audioBuffer.duration.toFixed(2)}s audio in ${numSegments} segments`);

    // For now, process just the first segment (7.8s)
    // A full implementation would iterate all segments and overlap-add
    const startTime = performance.now();

    notifyProgress({ stage: 'preprocessing', progress: 60 });

    // Prepare input buffer (only for first segment)
    const left = audioBuffer.getChannelData(0) || new Float32Array(totalSamples);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : new Float32Array(totalSamples);

    const inputData = new Float32Array(2 * SEGMENT_SAMPLES);
    for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        const idx = i * 2;
        inputData[idx] = i < left.length ? left[i] : 0;
        inputData[idx + 1] = i < right.length ? right[i] : 0;
    }

    const inputTensor = new ort.Tensor('float32', inputData, [1, 2, SEGMENT_SAMPLES]);

    notifyProgress({ stage: 'inference', progress: 70 });

    // Run inference
    const results = await session.run({
        'mix': inputTensor
    });

    notifyProgress({ stage: 'postprocessing', progress: 90 });

    const processingTime = performance.now() - startTime;

    // Extract stems from output
    const stems = {};
    const outputTensor = results['stems'];

    if (outputTensor && outputTensor.data) {
        const dims = outputTensor.dims;
        const numStems = dims[1];
        const numChannels = dims[2];
        const numSamples = dims[3];
        const data = outputTensor.data;

        for (let stemIdx = 0; stemIdx < numStems; stemIdx++) {
            const stemName = STEM_NAMES[stemIdx];
            const channelData = [];

            for (let ch = 0; ch < numChannels; ch++) {
                const samples = new Float32Array(numSamples);
                for (let i = 0; i < numSamples; i++) {
                    const idx = ((0 * numStems + stemIdx) * numChannels + ch) * numSamples + i;
                    samples[i] = data[idx];
                }
                channelData.push(samples);
            }

            // Calculate statistics
            let sum = 0, sumSq = 0;
            let min = Infinity, max = -Infinity;
            for (let i = 0; i < samples.length; i++) {
                const v = channelData[0][i];
                sum += v;
                sumSq += v * v;
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
            const rms = Math.sqrt(sumSq / samples.length);
            const mean = sum / samples.length;

            stems[stemName] = {
                channels: channelData.length,
                length: numSamples,
                sampleRate: SAMPLE_RATE,
                duration: numSamples / SAMPLE_RATE,
                rms: rms,
                mean: mean,
                min: min,
                max: max,
                hasValidAudio: rms > 0.01 && isFinite(rms)
            };
        }
    }

    processedStems = stems;

    notifyProgress({ stage: 'complete', progress: 100 });

    return {
        success: true,
        stems,
        processingTime,
        duration: SEGMENT_SAMPLES / SAMPLE_RATE,
        sampleRate: SAMPLE_RATE,
        totalSegments: numSegments
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