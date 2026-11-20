import { useState, useEffect } from 'react';
import { getTranslations } from '../i18n.js';

export function TempoControl({
  tempo = 120,
  onTempoChange,
  onLoopChange,
  loopStart = 0,
  loopEnd = 0,
  duration = 0,
  showLoopControls = false
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [localTempo, setLocalTempo] = useState(tempo);
  const [loopSettings, setLoopSettings] = useState({
    start: loopStart,
    end: loopEnd,
    active: false
  });

  useEffect(() => {
    setLocalTempo(tempo);
  }, [tempo]);

  const handleTempoChange = (newTempo) => {
    setLocalTempo(newTempo);
    onTempoChange?.(newTempo);
  };

  const handleLoopToggle = () => {
    const newActive = !loopSettings.active;
    const settings = { ...loopSettings, active: newActive };

    if (newActive) {
      // Establecer loop a la mitad del track
      settings.end = duration > 0 ? duration / 2 : 10;
      settings.start = 0;
    } else {
      settings.start = loopStart;
      settings.end = loopEnd;
    }

    setLoopSettings(settings);
    onLoopChange?.(settings.start, settings.end);
  };

  const handleLoopChange = (type, value) => {
    const newSettings = {
      ...loopSettings,
      [type]: value
    };
    setLoopSettings(newSettings);
    onLoopChange?.(newSettings.start, newSettings.end);
  };

  // Botones de loop precortado
  const loopButtons = [
    { label: '1/4', seconds: 4 },
    { label: '1/2', seconds: 8 },
    { label: '1', seconds: 16 },
    { label: '2', seconds: 32 }
  ];

  return (
    <div className="tempo-control">
      <div className="tempo-section">
        <h3 className="tempo-title">{t.tempo || 'Tempo'}</h3>
        <div className="tempo-display">
          <span className="tempo-value">{Math.round(localTempo)}</span>
          <span className="tempo-unit">BPM</span>
        </div>
        <input
          type="range"
          min="40"
          max="200"
          step="1"
          value={localTempo}
          onChange={(e) => handleTempoChange(parseFloat(e.target.value))}
          className="tempo-slider"
          aria-label={t.tempo || 'Tempo'}
        />
        <div className="tempo-buttons">
          <button
            className="tempo-btn"
            onClick={() => handleTempoChange(localTempo - 10)}
            aria-label="-10 BPM"
          >
            {t.tempoMinus || '-10'}
          </button>
          <button
            className="tempo-btn"
            onClick={() => handleTempoChange(localTempo + 10)}
            aria-label="+10 BPM"
          >
            {t.tempoPlus || '+10'}
          </button>
        </div>
      </div>

      {/* Loop Controls */}
      {showLoopControls && (
        <div className="loop-section">
          <h3 className="loop-title">{t.loop === 'Loop' ? 'Loop' : 'Bucle'}</h3>

          <div className="loop-toggle">
            <button
              className={`loop-btn ${loopSettings.active ? 'active' : ''}`}
              onClick={handleLoopToggle}
              title={loopSettings.active ? 'Detener loop' : 'Iniciar loop'}
            >
              {loopSettings.active ? '🔁' : '⏺'}
            </button>
          </div>

          {loopSettings.active && (
            <div className="loop-position-controls">
              <div className="loop-position">
                <span>{t.start || 'Start'}:</span>
                <input
                  type="number"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={loopSettings.start.toFixed(1)}
                  onChange={(e) => handleLoopChange('start', parseFloat(e.target.value))}
                  className="loop-input"
                />
                <span>s</span>
              </div>

              <div className="loop-position">
                <span>{t.end || 'End'}:</span>
                <input
                  type="number"
                  min={loopSettings.start}
                  max={duration}
                  step="0.1"
                  value={loopSettings.end.toFixed(1)}
                  onChange={(e) => handleLoopChange('end', parseFloat(e.target.value))}
                  className="loop-input"
                />
                <span>s</span>
              </div>

              {/* Botones de jump rápido */}
              <div className="loop-jump-buttons">
                {loopButtons.map(btn => (
                  <button
                    key={btn.label}
                    className="loop-jump-btn"
                    onClick={() => handleLoopChange('start', 0)}
                    title={`${t.jump || 'Jump'} to ${btn.label}s`}
                  >
                    {btn.label}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TempoControl;