// Quasaric Type Definitions
// Aplicación de práctica musical multipista

export type TrackSource = 'local' | 'import' | 'splitter';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in milliseconds
  genre?: string;
  coverURL?: string;
  audioURI: string; // local file path or remote URL
  filePath: string; // local file path
  downloaded: boolean;
  source: TrackSource;
  channels?: Channel[];
  tempo: number;
  key: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  trackId: string;
  name: 'melody' | 'bass' | 'drums' | 'vocals' | 'other';
  audioURI: string;
  volume: number; // 0-1
  muted: boolean;
  solo: boolean;
}

export interface Loop {
  start: number; // ms
  end: number; // ms
  active: boolean;
}

export interface MetronomeSettings {
  bpm: number;
  enabled: boolean;
  sound: 'click' | 'bongo' | 'none';
  subdivisions: 1 | 2 | 4 | 8 | 16;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentPosition: number; // ms
  duration: number; // ms
  volume: number; // master volume 0-1
  tempo: number; // 0.5-2.0
  pitch: number; // semitones, -12 to +12
  loop: Loop;
  currentTrack?: Track;
  channels: Record<string, Channel>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  favorites: string[]; // track IDs
  playlists: Playlist[];
  downloadedCount: number;
  lastUsed: Date;
}

export interface Playlist {
  id: string;
  title: string;
  tracks: string[]; // track IDs
  createdAt: Date;
  isFavorite: boolean;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  showWaveform: boolean;
  defaultVolume: number;
  maxDownloads: number;
  enableNotifications: boolean;
  metronome: MetronomeSettings;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: string;
  trackNumber: number;
  duration: number;
  bpm?: number;
  key?: string;
  timeSignature?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number; // bytes
  freeSpace: number; // bytes
}

// Audio processor settings
export interface AudioProcessSettings {
  tempoShift: number; // 0.5 - 2.0
  pitchShift: number; // semitones -12 to +12
  crossfade: number; // ms
}