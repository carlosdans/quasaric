// Settings Hook for Quasaric
// Gestión de preferencias del usuario

import React from 'react';
import { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'es',
  showWaveform: true,
  defaultVolume: 1,
  maxDownloads: 50,
  enableNotifications: true,
  metronome: {
    bpm: 120,
    enabled: false,
    sound: 'click',
    subdivisions: 4,
  },
};

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateMetronome: (key: keyof Settings['metronome'], value: Settings['metronome'][key]) => void;
  resetSettings: () => void;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateMetronome = (
    key: keyof Settings['metronome'],
    value: Settings['metronome'][key]
  ) => {
    setSettings(prev => ({
      ...prev,
      metronome: { ...prev.metronome, [key]: value },
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateMetronome, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};