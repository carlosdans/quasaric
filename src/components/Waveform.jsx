import React, { useState, useEffect, useRef } from 'react';
import { getTranslations } from '../i18n.js';

export function Waveform({
  audioBuffer,
  position = 0,
  duration: durationProp = 0,
  onSeek,
  height = 80,
  colors = {
    background: '#1e293b',
    waveform: '#3b82f6',
    cursor: '#ef4444',
    played: '#22c55e'
  }
}) {
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [localDuration, setLocalDuration] = useState(0);

  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);

  // Generate waveform data from audio buffer
  useEffect(() => {
    if (!audioBuffer) return;

    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;

    // Get channel data (use left channel for mono representation)
    const channelData = audioBuffer.getChannelData(0);

    // Down-sample to manageable size for waveform
    const targetWidth = 2048; // Canvas width
    const step = Math.ceil(length / targetWidth);
    const waveform = new Float32Array(targetWidth);

    for (let i = 0; i < targetWidth; i++) {
      let sum = 0;
      const start = i * step;
      const end = Math.min(start + step, length);

      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }

      waveform[i] = sum / (end - start);
    }

    setWaveformData(waveform);
    setLocalDuration(length / sampleRate);
  }, [audioBuffer]);

  // Use external duration if provided, otherwise use local
  const duration = durationProp > 0 ? durationProp : localDuration;

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, canvasHeight);

    if (!waveformData) return;

    // Draw waveform
    ctx.fillStyle = colors.waveform;
    ctx.beginPath();

    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width;
      const y = canvasHeight - (waveformData[i] * canvasHeight);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw played portion (partial fill) - SYNCHRONIZED with position prop
    if (position > 0 && duration > 0) {
      const playedX = (position / duration) * width;

      ctx.fillStyle = colors.played;
      ctx.fillRect(0, 0, playedX, canvasHeight);

      // Redraw waveform over played portion
      ctx.strokeStyle = colors.waveform;
      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const y = canvasHeight - (waveformData[i] * canvasHeight);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw time markers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 5; i++) {
      const time = (i / 5) * duration;
      const x = (i / 5) * width;
      ctx.beginPath();
      ctx.moveTo(x, canvasHeight - 4);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      ctx.fillText(time.toFixed(1), x, canvasHeight - 8);
    }

  }, [waveformData, position, duration, colors]);

  // Handle click to seek
  const handleClick = (e) => {
    if (!onSeek || !duration) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const canvasWidth = canvas.width;
    const newTime = (x / canvasWidth) * duration;
    onSeek(newTime);
  };

  return (
    <div className="waveform-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        onClick={handleClick}
        style={{
          width: '100%',
          height: height,
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      />
      <div className="time-display">
        <span className="time">{formatTime(position)}</span>
        <span className="divider"> / </span>
        <span className="time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}