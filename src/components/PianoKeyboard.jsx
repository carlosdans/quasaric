/**
 * PianoKeyboard - Piano virtual interactivo
 * Permite tocar con ratón, teclado y MIDI
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTranslations } from '../i18n.js';

// Piano keys configuration
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];

// MIDI note numbers for a 5-octave keyboard (C2 to C7)
const KEY_MIDI_NOTES = [];
let midiNote = 36; // C2
for (let octave = 2; octave < 8; octave++) {
  for (let i = 0; i < 7; i++) {
    KEY_MIDI_NOTES.push({
      note: WHITE_KEYS[i],
      octave: octave,
      midi: midiNote++,
      isWhite: true
    });
    // Add black keys (except after E and B)
    if (i < 6 && i !== 4) {
      KEY_MIDI_NOTES.push({
        note: BLACK_KEYS[i < 4 ? i : i + 1],
        octave: octave,
        midi: midiNote++,
        isWhite: false
      });
    }
  }
}

export function PianoKeyboard({
  onNoteOn = () => {},
  onNoteOff = () => {},
  width = 760,
  height = 120,
  octaves = 5,
  visible = true,
  volume = 1.0
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [audioContext, setAudioContext] = useState(null);
  const [gainNodes, setGainNodes] = useState({});
  const [sources, setSources] = useState({});
  const keyboardRef = useRef(null);
  const keyRefs = useRef([]);
  const midiAccessRef = useRef(null);

  // Initialize AudioContext
  useEffect(() => {
    let ctx = audioContext;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      } catch (e) {
        console.warn('Web Audio API not available');
      }
    }
    return () => {
      if (sources) {
        Object.values(sources).forEach(source => {
          try { source.stop(); } catch (e) {}
        });
      }
      if (ctx) {
        try { ctx.close(); } catch (e) {}
      }
    };
  }, []);

  // Create piano sound
  const createPianoSound = useCallback((midiNote, velocity = 0.8) => {
    if (!audioContext) return null;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Piano-like sound using triangle wave with envelope
    oscillator.type = 'triangle';
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    oscillator.frequency.value = frequency;

    // Low pass filter for warmth
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 2;
    filter.Q.value = 2;

    // Envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.8, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { oscillator, gainNode };
  }, [audioContext]);

  // Note On handler
  const handleNoteOn = useCallback((midi, velocity = 0.8) => {
    if (!audioContext || activeNotes.has(midi)) return;

    const sound = createPianoSound(midi, velocity);
    if (!sound) return;

    const newSources = { ...sources };
    const newGainNodes = { ...gainNodes };
    newSources[midi] = sound.oscillator;
    newGainNodes[midi] = sound.gainNode;

    setSources(newSources);
    setGainNodes(newGainNodes);
    setActiveNotes(prev => new Set([...prev, midi]));

    sound.oscillator.start();
    sound.gainNode.gain.setValueAtTime(velocity, audioContext.currentTime);

    onNoteOn(midi);
  }, [audioContext, activeNotes, sources, gainNodes, onNoteOn]);

  // Note Off handler
  const handleNoteOff = useCallback((midi) => {
    if (!activeNotes.has(midi)) return;

    const gainNode = gainNodes[midi];
    if (gainNode && audioContext) {
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    }

    const source = sources[midi];
    if (source) {
      try { source.stop(); } catch (e) {}
    }

    const newSources = { ...sources };
    const newGainNodes = { ...gainNodes };
    delete newSources[midi];
    delete newGainNodes[midi];

    setSources(newSources);
    setGainNodes(newGainNodes);
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(midi);
      return newSet;
    });

    onNoteOff(midi);
  }, [activeNotes, sources, gainNodes, onNoteOff]);

  // Handle mouse/keyboard note interaction
  const handleKeyDown = useCallback((e) => {
    if (!visible || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    // Space bar for middle C (MIDI 60)
    if (e.code === 'Space') {
      e.preventDefault();
      handleNoteOn(60, 0.8);
      setTimeout(() => handleNoteOff(60), 500);
      return;
    }

    // Number row keys mapped to notes
    const keyMap = {
      'Digit1': 48, 'Digit2': 50, 'Digit3': 52, 'Digit4': 53, 'Digit5': 55, 'Digit6': 57, 'Digit7': 59,
      'Digit8': 60, 'Digit9': 62, 'Digit0': 64,
      'Minus': 65, 'Equal': 67, 'BracketLeft': 69, 'BracketRight': 71,
      'KeyQ': 72, 'KeyW': 74, 'KeyE': 76, 'KeyR': 77, 'KeyT': 79, 'KeyY': 81, 'KeyU': 83,
      'KeyI': 84, 'KeyO': 86, 'KeyP': 88
    };

    if (keyMap[e.code]) {
      e.preventDefault();
      handleNoteOn(keyMap[e.code], 0.8);
      return;
    }
  }, [visible, handleNoteOn, handleNoteOff]);

  // Note Off on mouse release
  const handleKeyUp = useCallback((e) => {
    const keyMap = {
      'Digit1': 48, 'Digit2': 50, 'Digit3': 52, 'Digit4': 53, 'Digit5': 55, 'Digit6': 57, 'Digit7': 59,
      'Digit8': 60, 'Digit9': 62, 'Digit0': 64,
      'Minus': 65, 'Equal': 67, 'BracketLeft': 69, 'BracketRight': 71,
      'KeyQ': 72, 'KeyW': 74, 'KeyE': 76, 'KeyR': 77, 'KeyT': 79, 'KeyY': 81, 'KeyU': 83,
      'KeyI': 84, 'KeyO': 86, 'KeyP': 88
    };

    if (keyMap[e.code]) {
      handleNoteOff(keyMap[e.code]);
    }
  }, [handleNoteOff]);

  // Setup keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Setup MIDI access
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess()
        .then(access => {
          midiAccessRef.current = access;
          access.inputs.forEach(input => {
            input.onmidimessage = handleMIDIMessage;
          });
          access.onstatechange = (e) => {
            if (e.port.type === 'input') {
              if (e.port.state === 'connected') {
                e.port.onmidimessage = handleMIDIMessage;
              }
            }
          };
        })
        .catch(err => console.warn('MIDI access not available:', err));
    }
  }, []);

  const handleMIDIMessage = useCallback((event) => {
    const [status, note, velocity] = event.data;
    const command = status & 0xf0;

    if (command === 0x90 && velocity > 0) {
      handleNoteOn(note, velocity / 127);
    } else if ((command === 0x80 || (command === 0x90 && velocity === 0))) {
      handleNoteOff(note);
    }
  }, [handleNoteOn, handleNoteOff]);

  // Mouse interaction with keys
  const handleMouseDown = (e, midi) => {
    const velocity = 0.8;
    handleNoteOn(midi, velocity);
    e.target.dataset.active = 'true';
  };

  const handleMouseUp = (e, midi) => {
    const target = e.currentTarget;
    target.dataset.active = 'false';
    handleNoteOff(midi);
  };

  // Get key position
  const getPositionForMidi = (midi) => {
    const keyIndex = KEY_MIDI_NOTES.findIndex(k => k.midi === midi);
    if (keyIndex === -1) return { x: 0, isBlack: false };

    const whiteKeyWidth = width / 52;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyOffset = whiteKeyWidth * 0.6;

    // Check if this is a white key
    const key = KEY_MIDI_NOTES[keyIndex];
    if (key.isWhite) {
      return {
        x: keyIndex * whiteKeyWidth / 7,
        width: whiteKeyWidth,
        isBlack: false
      };
    }

    // Black key
    const whiteKeyIndex = Math.floor(keyIndex / 1);
    let blackX = 0;

    // Find the preceding white key
    for (let i = keyIndex - 1; i >= 0; i--) {
      if (KEY_MIDI_NOTES[i].isWhite) {
        const whitePos = (i % 7) * (whiteKeyWidth / 7);
        blackX = whitePos + whiteKeyWidth - blackKeyOffset / 2;
        break;
    }
    }

    return {
      x: blackX,
      width: blackKeyWidth,
      isBlack: true
    };
  };

  if (!visible) return null;

  return (
    <div className="piano-keyboard" style={{ width, height }}>
      <div
        ref={keyboardRef}
        className="keyboard"
        style={{ display: 'flex', height: '100%', width: '100%' }}
      >
        {KEY_MIDI_NOTES.slice(0, 52).map((key, index) => {
          const isActive = activeNotes.has(key.midi);
          const keyStyle = {
            ...getStyleForKey(key, width, isActive),
            transform: isActive ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.1s'
          };

          return (
            <div
              key={`${key.note}${key.octave}`}
              className={`piano-key ${key.isWhite ? 'white' : 'black'} ${isActive ? 'active' : ''}`}
              style={keyStyle}
              onMouseDown={(e) => handleMouseDown(e, key.midi)}
              onMouseUp={(e) => handleMouseUp(e, key.midi)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleMouseDown(e, key.midi);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMouseUp(e, key.midi);
              }}
            >
              {!key.isWhite && (
                <span className="key-label">{key.note}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* MIDI indicator */}
      {midiAccessRef.current && (
        <div className="midi-indicator" style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 12,
          color: '#059669',
          background: 'rgba(5, 150, 105, 0.2)',
          padding: '2px 8px',
          borderRadius: 4
        }}>
          🎹 MIDI
        </div>
      )}
    </div>
  );
}

function getStyleForKey(key, width, isActive) {
  const whiteKeyWidth = width / 52;
  const blackKeyWidth = whiteKeyWidth * 0.6;

  if (key.isWhite) {
    return {
      width: whiteKeyWidth,
      height: '100%',
      background: isActive ? '#c8f169' : '#f4f5f5',
      border: '1px solid #e2e8f0',
      boxSizing: 'border-box',
      position: 'relative',
      cursor: 'pointer',
      userSelect: 'none',
      touchAction: 'none',
      zIndex: 1
    };
  }

  // Black key positioning
  const whiteKeyIndex = KEY_MIDI_NOTES.slice(0, KEY_MIDI_NOTES.indexOf(key) + 1).filter(k => k.isWhite).length;
  const blackX = (whiteKeyIndex - 1) * whiteKeyWidth - blackKeyWidth / 2;

  return {
    width: blackKeyWidth,
    height: '65%',
    background: isActive ? '#c8f169' : '#1e293b',
    border: '1px solid #334155',
    position: 'absolute',
    left: blackX,
    top: 0,
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: 2
  };
}

export default PianoKeyboard;