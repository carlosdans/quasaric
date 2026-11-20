// Player hook for Quasaric
// Gestión del estado del reproductor usando React hooks

import React from 'react';
import { Track, Channel, PlaybackState, Loop, Settings, User } from '../types';

// Default values
const DEFAULT_TRACK: Track = {
  id: '',
  title: 'No track',
  artist: 'Unknown',
  duration: 0,
  downloaded: false,
  source: 'local',
  tempo: 1,
  key: 'C',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Default Settings
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

// Default channel definitions
const DEFAULT_CHANNELS: Channel[] = [
  { id: '1', name: 'melody', trackId: '', audioURI: '', volume: 0.8, muted: false, solo: false },
  { id: '2', name: 'bass', trackId: '', audioURI: '', volume: 0.7, muted: false, solo: false },
  { id: '3', name: 'drums', trackId: '', audioURI: '', volume: 0.9, muted: false, solo: false },
  { id: '4', name: 'vocals', trackId: '', audioURI: '', volume: 0.9, muted: false, solo: false },
];

const channelsToRecord: Record<string, Channel> = {};
DEFAULT_CHANNELS.forEach(ch => channelsToRecord[ch.id] = ch);

const DEFAULT_STATE: PlaybackState = {
  isPlaying: false,
  currentPosition: 0,
  duration: 0,
  volume: 1,
  tempo: 1,
  pitch: 0,
  loop: { start: 0, end: 0, active: false },
  channels: channelsToRecord,
};

const DEFAULT_METRONOME: PlaybackState['metronome'] = {
  bpm: 120,
  enabled: false,
  sound: 'click',
  subdivisions: 4,
};

// Context types
interface PlayerContextValue {
  playbackState: PlaybackState;
  currentTrack: Track | null;
  settings: Settings;
  user: User | null;
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentTrack: (track: Track | null) => void;
  setSettings: (settings: Settings) => void;
  setUser: (user: User | null) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setTempo: (tempo: number) => Promise<void>;
  setPitch: (pitch: number) => Promise<void>;
  setLoop: (start: number, end: number) => Promise<void>;
  toggleLoop: () => Promise<void>;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  toggleFavorite: (trackId: string) => void;
  setChannelVolume: (channelId: string, volume: number) => void;
  muteChannel: (channelId: string, muted: boolean) => void;
  soloChannel: (channelId: string, solo: boolean) => void;
}

// Player Context
const PlayerContext = React.createContext<PlayerContextValue | null>(null);

// Provider component
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playbackState, setPlaybackState] = React.useState<PlaybackState>(DEFAULT_STATE);
  const [currentTrack, setCurrentTrackState] = React.useState<Track | null>(null);
  const [settings, setSettingsState] = React.useState<Settings>(DEFAULT_SETTINGS);
  const [user, setUserState] = React.useState<User | null>(null);

  // Actions (placeholder for audio service integration)
  const play = async () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: true }));
  };

  const pause = async () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  };

  const stop = async () => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      currentPosition: 0,
    }));
  };

  const seek = async (position: number) => {
    setPlaybackState(prev => ({ ...prev, currentPosition: position }));
  };

  const setVolume = async (volume: number) => {
    setPlaybackState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  };

  const setTempo = async (tempo: number) => {
    setPlaybackState(prev => ({ ...prev, tempo: Math.max(0.5, Math.min(2, tempo)) }));
  };

  const setPitch = async (pitch: number) => {
    setPlaybackState(prev => ({ ...prev, pitch: Math.max(-12, Math.min(12, pitch)) }));
  };

  const setLoop = async (start: number, end: number) => {
    setPlaybackState(prev => ({
      ...prev,
      loop: { start, end, active: true },
    }));
  };

  const toggleLoop = async () => {
    setPlaybackState(prev => ({
      ...prev,
      loop: { ...prev.loop, active: !prev.loop.active },
    }));
  };

  const setCurrentTrack = (track: Track | null) => {
    setCurrentTrackState(track);
  };

  const setSettings = (newSettings: Settings) => {
    setSettingsState(newSettings);
  };

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };

  // Track management (would use file system in real implementation)
  const addTrack = (track: Track) => {
    // Would add to local storage/AsyncStorage
    console.log('Adding track:', track.id);
  };

  const removeTrack = (trackId: string) => {
    // Would remove from local storage
    console.log('Removing track:', trackId);
  };

  const toggleFavorite = (trackId: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const favorites = prev.favorites.includes(trackId)
        ? prev.favorites.filter(id => id !== trackId)
        : [...prev.favorites, trackId];
      return { ...prev, favorites };
    });
  };

  // Channel controls for multi-track
  const setChannelVolume = (channelId: string, volume: number) => {
    const channel = playbackState.channels[channelId];
    if (channel) {
      channel.volume = Math.max(0, Math.min(1, volume));
    }
    setPlaybackState(prev => ({
      ...prev,
      channels: { ...prev.channels },
    }));
  };

  const muteChannel = (channelId: string, muted: boolean) => {
    const channel = playbackState.channels[channelId];
    if (channel) {
      channel.muted = muted;
    }
    setPlaybackState(prev => ({
      ...prev,
      channels: { ...prev.channels },
    }));
  };

  const soloChannel = (channelId: string, solo: boolean) => {
    if (solo) {
      // When soloing, mute all other channels
      setPlaybackState(prev => {
        const updatedChannels = { ...prev.channels };
        Object.keys(updatedChannels).forEach(key => {
          if (key !== channelId) {
            updatedChannels[key].muted = true;
          }
        });
        return {
          ...prev,
          channels: updatedChannels,
        };
      });
    } else {
      // When unsoloing, unmute all channels
      setPlaybackState(prev => {
        const updatedChannels = { ...prev.channels };
        Object.keys(updatedChannels).forEach(key => {
          updatedChannels[key].muted = false;
        });
        return {
          ...prev,
          channels: updatedChannels,
        };
      });
    }
  };

  const value: PlayerContextValue = {
    playbackState,
    currentTrack,
    settings,
    user,
    setPlaybackState,
    setCurrentTrack,
    setSettings,
    setUser,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setTempo,
    setPitch,
    setLoop,
    toggleLoop,
    addTrack,
    removeTrack,
    toggleFavorite,
    setChannelVolume,
    muteChannel,
    soloChannel,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

// Hook to use player context
export const usePlayer = () => {
  const context = React.useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

// Export context for direct use if needed
export { PlayerContext };