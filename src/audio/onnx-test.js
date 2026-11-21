/**
 * ONNX Test Module
 * Loads ONNX Runtime and htdemucs model for in-browser audio separation
 */

import * as ort from 'onnxruntime-web';

let session = null;
let modelInfo = null;

/**
 * Load ONNX Runtime
 */
export async function loadOnnxRuntime() {
    if (!ort || !ort.InferenceSession) {
        throw new Error('onnxruntime-web not properly loaded');
    }

    return {
        available: true,
        session: null // Will be created when model loads
    };
}

/**
 * Load htdemucs ONNX model
 * Uses conservative WASM options to avoid memory allocation failures
 */
export async function loadModel(progressCallback = null) {
    if (session) {
        return { success: true, session };
    }

    try {
        if (progressCallback) {
            progressCallback({ stage: 'loading', progress: 10 });
        }

        // Try to fetch model as ArrayBuffer to avoid WASM memory issues
        const modelStartTime = performance.now();

        let modelBuffer;
        try {
            const response = await fetch('models/htdemucs_6s_fp16weights.onnx');
            if (!response.ok) throw new Error('Model file not found');
            modelBuffer = await response.arrayBuffer();
        } catch (e) {
            throw new Error('Failed to fetch model: ' + e.message);
        }

        const loadEndTime = performance.now();
        const loadDuration = loadEndTime - modelStartTime;
        console.log(`Model fetched in ${loadDuration.toFixed(2)}ms, size: ${modelBuffer.byteLength} bytes`);

        if (progressCallback) {
            progressCallback({ stage: 'loading', progress: 30 });
        }

        // Create session with conservative settings to avoid std::bad_alloc
        const createStartTime = performance.now();

        session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'disabled',
            enableMemPattern: false,
            numThreads: 1,
            // Reduce memory usage
            scratchLimit: 1024 * 1024 * 50, // 50MB scratch buffer
        });

        const createEndTime = performance.now();
        const createDuration = createEndTime - createStartTime;
        console.log(`Session created in ${createDuration.toFixed(2)}ms`);

        if (progressCallback) {
            progressCallback({ stage: 'ready', progress: 100 });
        }

        // Get actual tensor info from session using correct API
        // for onnxruntime-web 1.31.1
        const inputMetadata = session.inputMetadata || {};
        const outputMetadata = session.outputMetadata || {};

        console.log('Input metadata:', Object.keys(inputMetadata));
        console.log('Output metadata:', Object.keys(outputMetadata));

        // Try to get actual shapes from metadata
        const inputInfo = session.inputNames ? session.inputNames : Object.keys(inputMetadata);
        const outputInfo = session.outputNames ? session.outputNames : Object.keys(outputMetadata);

        const inputs = inputInfo.map(name => {
            const meta = inputMetadata[name] || {};
            return {
                name,
                dims: meta.dims || meta.shape || 'unknown',
                type: meta.type || 'unknown'
            };
        });

        const outputs = outputInfo.map(name => {
            const meta = outputMetadata[name] || {};
            return {
                name,
                dims: meta.dims || meta.shape || 'unknown',
                type: meta.type || 'unknown'
            };
        });

        console.log('Inputs:', inputs);
        console.log('Outputs:', outputs);

        modelInfo = {
            url: 'models/htdemucs_6s_fp16weights.onnx',
            inputName: 'mix',
            outputName: 'stems',
            inputShape: [1, 2, 343980],
            outputShape: [1, 6, 2, 343980],
            stems: ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'],
            sampleRate: 44100,
            segmentDuration: 7.8,
            loadDuration: loadDuration,
            createDuration: createDuration
        };

        return {
            success: true,
            session,
            modelInfo,
            inputs,
            outputs
        };

    } catch (e) {
        console.error('Model loading error:', e);
        return {
            success: false,
            error: e.message,
            stack: e.stack
        };
    }
}

/**
 * Run separation on audio buffer
 */
export async function separate(audioBuffer, options = {}) {
    if (!session) {
        const loadResult = await loadModel(options.onProgress);
        if (!loadResult.success) {
            return loadResult;
        }
    }

    const SEGMENT_SAMPLES = 343980;
    const SAMPLE_RATE = 44100;

    // Pre-process
    const left = audioBuffer.getChannelData(0) || new Float32Array(audioBuffer.length);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    // Create input tensor
    const inputData = new Float32Array(2 * SEGMENT_SAMPLES);
    for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        const idx = i * 2;
        inputData[idx] = i < left.length ? left[i] : 0;
        inputData[idx + 1] = i < right.length ? right[i] : 0;
    }

    const inputTensor = new ort.Tensor('float32', inputData, [1, 2, SEGMENT_SAMPLES]);

    // Run inference - use actual output names from model
    const outputNames = session.outputNames || ['stems'];
    const feeds = { 'mix': inputTensor };

    // Run inference
    const results = await session.run(feeds);

    return {
        success: true,
        results,
        inputTensor
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
export function isModelLoaded() {
    return session !== null;
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
    modelInfo = null;
}

export { ort };