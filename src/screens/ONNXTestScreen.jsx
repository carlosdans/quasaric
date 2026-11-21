import { useState, useCallback, useRef } from 'react';
import { MultiTrackPlayer } from '../audio/MultiTrackPlayer.js';
import { StemSeparatorEngine } from '../audio/StemSeparatorEngine.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB para ONNX (el modelo es grande)
const SEGMENT_DURATION = 7.8; // segundos del modelo

export function ONNXTestScreen() {
  const [language, setLanguage] = useState('en');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState('not_loaded');
  const [modelInfo, setModelInfo] = useState(null);
  const [isSeparating, setIsSeparating] = useState(false);
  const [separationResult, setSeparationResult] = useState(null);
  const [error, setError] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [player, setPlayer] = useState(null);
  const [stemBuffers, setStemBuffers] = useState({});
  const [testAudioGenerated, setTestAudioGenerated] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [memoryEstimate, setMemoryEstimate] = useState(null);

  const fileInputRef = useRef(null);
  const separatorRef = useRef(null);
  const playerRef = useRef(null);

  // Inicializar AudioContext y player
  const initPlayer = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(audioContextRef.current);
      }

      if (!playerRef.current) {
        playerRef.current = new MultiTrackPlayer();
        await playerRef.current.init();
        setPlayer(playerRef.current);
      }

      return true;
    } catch (e) {
      console.error('Error initializing player:', e);
      setError('Error initializing audio system: ' + e.message);
      return false;
    }
  }, []);

  const audioContextRef = useRef(null);

  // Cargar modelo ONNX
  const loadModel = useCallback(async () => {
    setIsModelLoading(true);
    setError(null);
    setModelStatus('loading');

    try {
      if (!separatorRef.current) {
        separatorRef.current = new StemSeparatorEngine();
      }

      const result = await separatorRef.current.loadModel({
        onProgress: (state) => {
          console.log('Model loading progress:', state);
          if (state.stage === 'ready') {
            setModelStatus('ready');
          }
        }
      });

      if (result.success) {
        setModelStatus('ready');
        setModelInfo(result);
        console.log('Model loaded:', result);
        return true;
      } else {
        setModelStatus('error');
        setError(result.error || 'Unknown error loading model');
        return false;
      }
    } catch (e) {
      console.error('Error loading model:', e);
      setModelStatus('error');
      setError('Error loading model: ' + e.message);
      return false;
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  // Cargar archivo de audio
  const handleFileChange = useCallback(async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validaciones
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Max ${MAX_FILE_SIZE / (1024*1024)}MB for ONNX processing.`);
      return;
    }

    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/wav'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Use MP3 or WAV.');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);

    // Cargar como AudioBuffer
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);

      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setIsLoaded(true);
      setAudioContext(audioContext);

      if (!audioContextRef.current) {
        audioContextRef.current = audioContext;
        setAudioContext(audioContext);
      }

      console.log('Audio loaded:', selectedFile.name, decoded.duration, 'seconds');
    } catch (e) {
      console.error('Error loading audio:', e);
      setError('Error loading audio: ' + e.message);
    }
  }, []);

  // Generar audio de prueba sintético
  const generateTestAudio = useCallback(async () => {
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      setAudioContext(audioContext);

      // Generar 15 segundos de audio de prueba
      const duration = 15;
      const sampleRate = 44100;
      const length = sampleRate * duration;

      // Crear un AudioBuffer con 2 canales (estéreo)
      const buffer = audioContext.createBuffer(2, length, sampleRate);

      // Generar onda mezclada (similar a una canción)
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Mezcla de frecuencias que simulan una canción
        const kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 3) * 0.3;
        const snare = Math.sin(2 * Math.PI * 200 * t) * Math.sin(2 * Math.PI * 4 * t) * 0.2;
        const bassline = Math.sin(2 * Math.PI * 55 * t + Math.sin(2 * Math.PI * 2 * t) * 0.5) * 0.4;
        const melody = Math.sin(2 * Math.PI * 440 * t + Math.sin(2 * Math.PI * 3 * t)) * 0.2;
        const chords = (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 146.83 * t)) * 0.15;

        left[i] = (kick + snare + bassline + melody + chords * 0.5);
        right[i] = left[i] * 0.9 + Math.sin(2 * Math.PI * 220 * t) * 0.05;
      }

      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setIsLoaded(true);
      setFileName('test_synthetic_15s.mp3');

      // Crear blob URL para mostrar
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setTestAudioGenerated(url);

      console.log('Synthetic test audio generated:', buffer.duration, 'seconds');
      return true;
    } catch (e) {
      console.error('Error generating test audio:', e);
      setError('Error generating test audio: ' + e.message);
      return false;
    }
  }, []);

  // Ejecutar separación ONNX
  const runSeparation = useCallback(async () => {
    if (!audioBuffer || !separatorRef.current) {
      setError('Audio not loaded or model not initialized');
      return;
    }

    setIsSeparating(true);
    setError(null);
    setSeparationResult(null);
    setProcessingTime(null);

    try {
      const startTime = performance.now();

      const result = await separatorRef.current.separateOnnx(audioBuffer, {
        useOnnx: true,
        preferOnnx: true
      });

      const endTime = performance.now();
      const processingTimeMs = endTime - startTime;
      setProcessingTime(processingTimeMs);

      if (result.success) {
        console.log('Separation successful:', result);
        setSeparationResult(result);
        setStemBuffers(result.stems);

        // Estimar memoria usada
        const estimatedMemory = 136 * 1024 * 1024 + (result.processedDuration * 2 * 4 * 1024); // modelo + audio
        setMemoryEstimate(estimatedMemory);

        console.log('Processing time:', processingTimeMs, 'ms');
        console.log('Estimated memory:', estimatedMemory / (1024*1024), 'MB');
      } else {
        setError(result.error || 'Separation failed');
      }
    } catch (e) {
      console.error('Error during separation:', e);
      setError('Error during separation: ' + e.message);

      // Información de error detallada
      if (e.message.includes('tensor') || e.message.includes('shape')) {
        setError('Tensor shape error. Check model input/output compatibility. ' + e.message);
      }
    } finally {
      setIsSeparating(false);
    }
  }, [audioBuffer]);

  // Verificar que las pistas son diferentes
  const validateStems = useCallback(() => {
    if (!separationResult || !stemBuffers) return { valid: false, error: 'No result' };

    const stemNames = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
    const differences = [];
    const similarities = [];

    // Verificar que cada stem tiene audio
    for (const name of stemNames) {
      if (!stemBuffers[name]) {
        differences.push(`Missing stem: ${name}`);
        continue;
      }

      const buffer = stemBuffers[name];
      if (!buffer || buffer.length === 0) {
        differences.push(`Empty stem: ${name}`);
        continue;
      }

      // Verificar duración
      if (Math.abs(buffer.duration - duration) > 0.1) {
        differences.push(`Duration mismatch for ${name}: ${buffer.duration}s`);
      }

      // Verificar que no son copias idénticas
      const data = buffer.getChannelData(0);
      let hasContent = false;
      for (let i = 0; i < Math.min(1000, data.length); i++) {
        if (Math.abs(data[i]) > 0.01) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) {
        differences.push(`Silent stem: ${name}`);
      }
    }

    // Verificar diferencias entre stems
    const stemArrays = {};
    for (const name of stemNames) {
      if (stemBuffers[name]) {
        const data = stemBuffers[name].getChannelData(0);
        stemArrays[name] = Array.from(data.slice(0, 1000));
      }
    }

    // Comparar stems entre sí
    for (let i = 0; i < stemNames.length; i++) {
      for (let j = i + 1; j < stemNames.length; j++) {
        const a = stemNames[i], b = stemNames[j];
        if (stemArrays[a] && stemArrays[b]) {
          let equal = true;
          for (let k = 0; k < stemArrays[a].length; k++) {
            if (Math.abs(stemArrays[a][k] - stemArrays[b][k]) > 0.001) {
              equal = false;
              break;
            }
          }
          if (equal) {
            similarities.push(`${a} vs ${b}: identical`);
          } else {
            similarities.push(`${a} vs ${b}: different`);
          }
        }
      }
    }

    return {
      valid: differences.length === 0,
      differences,
      similarities,
      stemCount: Object.keys(stemBuffers).filter(k => stemBuffers[k]).length
    };
  }, [separationResult, stemBuffers, duration]);

  // Reproduce un stem específico
  const playStem = useCallback(async (stemName) => {
    if (!playerRef.current || !stemBuffers[stemName]) return;

    // Detener reproducción actual
    playerRef.current.stop();

    // Crear un Blob del stem y añadir al player
    const buffer = stemBuffers[stemName];
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Crear array buffer desde los datos del audio
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // WAV header
    view.setUint32(0, 0x46464952, false); // "RIFF"
    view.setUint32(4, 36 + length * 2 - 8, true);
    view.setUint32(8, 0x45564157, false); // "WAVE"
    view.setUint32(12, 16, true);
    view.setUint16(14, 10, true);
    view.setUint16(16, 2, true); // 2 channels
    view.setUint32(17, sampleRate, true);
    view.setUint32(21, sampleRate * 4, true);
    view.setUint16(25, 8, true);
    view.setUint16(26, 32, true);
    view.setUint32(28, length * 2 - 8, true);

    // Interleaved audio data
    const audioData = new Float32Array(length * 2);
    for (let i = 0; i < length; i++) {
      audioData[i * 2] = buffer.getChannelData(0)[i];
      audioData[i * 2 + 1] = buffer.numberOfChannels > 1 ? buffer.getChannelData(1)[i] : buffer.getChannelData(0)[i];
    }

    // Crear Blob y reproducir
    const blob = new Blob([wavHeader, audioData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    await playerRef.current.addTrack(url, 99, stemName);
    playerRef.current.play();
  }, [stemBuffers, duration]);

  // Cargar modelo al montar
  useState(() => {
    loadModel();
  }, []);

  const stemNames = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
  const validation = validateStems();

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      background: '#0b1020',
      color: '#f4f5fb',
      minHeight: '100vh'
    }}>
      <h1>HTDemucs ONNX Test</h1>
      <p style={{ color: '#888' }}>Real separation test - no server upload</p>

      {/* Model Status */}
      <div style={{
        background: '#111',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: modelStatus === 'ready' ? '1px solid #4ade80' : '1px solid #666'
      }}>
        <h3>Model Status: {modelStatus}</h3>
        {modelInfo && (
          <div>
            <p><strong>Model:</strong> {modelInfo.model || 'htdemucs_6s_fp16weights.onnx'}</p>
            <p><strong>License:</strong> {modelInfo.license || 'MIT'}</p>
            <p><strong>Stems:</strong> {modelInfo.stemNames?.join(', ') || 'drums, bass, other, vocals, guitar, piano'}</p>
            <p><strong>Sample Rate:</strong> {modelInfo.sampleRate || 44100}Hz</p>
            <p><strong>Segment Duration:</strong> {SEGMENT_DURATION}s</p>
          </div>
        )}
        {!modelLoaded && (
          <button onClick={loadModel} disabled={isModelLoading}>
            {isModelLoading ? 'Loading...' : 'Load ONNX Model'}
          </button>
        )}
      </div>

      {/* Audio Input */}
      <div style={{
        background: '#111',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Audio Input</h3>
        <p>Duration: {duration > 0 ? `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}` : 'Not loaded'}</p>

        {!isLoaded ? (
          <>
            <input
              type="file"
              accept="audio/mp3,audio/wav,application/octetstream"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()}>
              Select MP3/WAV file
            </button>
            <button onClick={generateTestAudio} style={{ marginLeft: '12px' }}>
              Generate Test Audio (15s)
            </button>
          </>
        ) : (
          <div>
            <p>Loaded: {fileName}</p>
            <button onClick={() => {
              setFile(null);
              setAudioBuffer(null);
              setIsLoaded(false);
              setDuration(0);
            }}>Reset</button>
          </div>
        )}
      </div>

      {/* Separation Controls */}
      {isLoaded && modelStatus === 'ready' && (
        <div style={{
          background: '#111',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>ONNX Separation</h3>
          {isSeparating ? (
            <div>
              <p>Running separation... (this may take a few seconds)</p>
              <p>Processing 7.8s segments with ONNX Runtime WebAssembly...</p>
            </div>
          ) : (
            <button onClick={runSeparation} style={{ fontSize: '16px', padding: '12px 24px' }}>
              Separate with ONNX
            </button>
          )}

          {processingTime && (
            <div style={{ marginTop: '12px' }}>
              <p><strong>Processing Time:</strong> {processingTime.toFixed(2)} ms</p>
            </div>
          )}

          {memoryEstimate && (
            <div>
              <p><strong>Estimated Memory:</strong> {(memoryEstimate / (1024*1024)).toFixed(1)} MB</p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {separationResult && (
        <div style={{
          background: '#111',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #4ade80'
        }}>
          <h3>Separation Results</h3>
          <p><strong>Method:</strong> {separationResult.method}</p>
          <p><strong>Duration:</strong> {separationResult.processedDuration}s</p>
          <p><strong>Sample Rate:</strong> {separationResult.sampleRate}Hz</p>

          <div style={{ marginTop: '16px' }}>
            <h4>Stems Available:</h4>
            {stemNames.map((name, idx) => (
              <button
                key={name}
                onClick={() => playStem(name)}
                style={{
                  marginRight: '8px',
                  marginBottom: '8px',
                  padding: '8px 16px',
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {name} {stemBuffers[name] ? '✓' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validation.stemCount > 0 && (
        <div style={{
          background: '#111',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Validation Results</h3>
          <p><strong>Stems Found: {validation.stemCount}/6</strong></p>

          {!validation.valid && (
            <div style={{ color: '#ef4444' }}>
              <p><strong>Issues:</strong></p>
              <ul>
                {validation.differences.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <p><strong>Stem Comparisons:</strong></p>
            <pre style={{ fontSize: '12px', background: '#222', padding: '8px', borderRadius: '4px' }}>
{validation.similarities.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#331217',
          borderColor: '#ef4444',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#fecaca'
        }}>
          <h4>Error:</h4>
          <p>{error}</p>
          <details style={{ marginTop: '8px' }}>
            <summary>Show details</summary>
            <pre style={{ fontSize: '12px', background: '#222', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
{error.stack || error.toString()}
            </pre>
          </details>
        </div>
      )}

      {/* Console Log Output */}
      <div style={{
        background: '#111',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <details open>
          <summary>Console Log</summary>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '300px',
            overflow: 'auto',
            color: '#0ff'
          }}>
            <div id="console-log"></div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default ONNXTestScreen;