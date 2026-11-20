import { useState, useEffect } from 'react';

const CHANNEL_NAMES = {
  0: 'Melodía',
  1: 'Bajo',
  2: 'Batería',
  3: 'Voz'
};

export function ChannelSlider({
  trackIndex,
  track,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle
}) {
  const [volume, setVolume] = useState(track?.volume ?? 1);

  useEffect(() => {
    setVolume(track?.volume ?? 1);
  }, [track?.volume]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    onVolumeChange?.(trackIndex, newVolume);
  };

  const handleMuteToggle = () => {
    const newMuted = !track?.muted;
    onMuteToggle?.(trackIndex, newMuted);
  };

  const handleSoloToggle = () => {
    const newSolo = !track?.soloed;
    onSoloToggle?.(trackIndex, newSolo);
  };

  return (
    <div className="channel-slider">
      <div className="channel-header">
        <span className="channel-name">{track?.name ?? CHANNEL_NAMES[trackIndex]}</span>
        <div className="channel-controls">
          <button
            className={`solo-btn ${track?.soloed ? 'active' : ''}`}
            onClick={handleSoloToggle}
            title={track?.soloed ? 'Quitar solo' : 'Solo (aislar)'}
          >
            {track?.soloed ? '🔊' : '🔇'}
          </button>
          <button
            className={`mute-btn ${track?.muted ? 'active' : ''}`}
            onClick={handleMuteToggle}
            title={track?.muted ? 'Desmutear' : 'Mute'}
          >
            {track?.muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="volume-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          aria-label="Volumen"
        />
        <span className="volume-value">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}

export default ChannelSlider;