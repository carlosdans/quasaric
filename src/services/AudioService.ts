// Audio Service for Quasaric
// Reproductor de audio con soporte multipista
// Usa Expo AV para compatibilidad multiplataforma

import { Audio } from 'expo-av';
import { Track, Channel, PlaybackState } from '../types';

// Singleton Audio Service
class AudioService {
  private static instance: AudioService;
  private masterSound: Audio.Sound | null = null;
  private channelSounds: Map<string, Audio.Sound> = new Map();
  private masterVolume: number = 1;
  private currentTempo: number = 1;
  private currentPitch: number = 0;

  private constructor() {
    this.initializeAudio();
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private async initialize_audio() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  // Track Management
  async loadTrack(track: Track): Promise<boolean> {
    try {
      await this.unloadAll();

      // Set current track
      this.currentTempo = 1;
      this.currentPitch = 0;

      // Load main track
      this.masterSound = new Audio.Sound();

      const { sound, status } = await this.masterSound.loadAsync(
        { uri: track.audioURI },
        {
          shouldPlay: false,
          volume: this.masterVolume,
          rate: this.currentTempo,
        }
      );

      if (status.isLoaded) {
        this.masterSound.setOnPlaybackStatusUpdate(this.handlePlaybackStatus);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading track:', error);
      return false;
    }
  }

  async loadChannels(channels: Channel[]): Promise<boolean> {
    try {
      // Unload existing channels
      await this.unloadChannels();

      // Load each channel
      for (const channel of channels) {
        const sound = new Audio.Sound();

        await sound.loadAsync(
          { uri: channel.audioURI },
          {
            shouldPlay: false,
            volume: channel.volume,
            rate: this.currentTempo,
          }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          this.handleChannelStatus(channel.id, status.isLoaded, status);
        });

        this.channelSounds.set(channel.id, sound);
      }

      return true;
    } catch (error) {
      console.error('Error loading channels:', error);
      return false;
    }
  }

  // Playback Controls
  async play(): Promise<void> {
    try {
      // Play master track
      if (this.masterSound) {
        await this.masterSound.playAsync();
      }

      // Play all channel sounds (except muted)
      for (const [id, sound] of this.channelSounds) {
        // In a real implementation, we'd check channel mute state
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing:', error);
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.masterSound) {
        await this.masterSound.pauseAsync();
      }

      for (const sound of this.channelSounds.values()) {
        await sound.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.masterSound) {
        await this.masterSound.stopAsync();
      }

      for (const sound of this.channelSounds.values()) {
        await sound.stopAsync();
      }
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }

  async seek(position: number): Promise<void> {
    try {
      if (this.masterSound) {
        await this.masterSound.setPositionAsync(position);
      }

      // Seek all channels
      for (const sound of this.channelSounds.values()) {
        await sound.setPositionAsync(position);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  // Volume Controls
  async setMasterVolume(volume: number): Promise<void> {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    if (this.masterSound) {
      await this.masterSound.setVolumeAsync(this.masterVolume);
    }
  }

  async setChannelVolume(channelId: string, volume: number): Promise<void> {
    const sound = this.channelSounds.get(channelId);
    if (sound) {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    }
  }

  async muteChannel(channelId: string, muted: boolean): Promise<void> {
    const sound = this.channelSounds.get(channelId);
    if (sound) {
      if (muted) {
        await sound.pauseAsync();
      } else {
        if (this.masterSound) {
          const status = await this.masterSound.getStatusAsync();
          if (status.isPlaying) {
            await sound.playAsync();
          }
        }
      }
    }
  }

  // Playback Rate (Tempo)
  async setTempo(tempo: number): Promise<void> {
    this.currentTempo = Math.max(0.5, Math.min(2, tempo));

    if (this.masterSound) {
      await this.masterSound.setRateAsync(this.currentTempo, true, false);
    }

    for (const sound of this.channelSounds.values()) {
      await sound.setRateAsync(this.currentTempo, true, false);
    }
  }

  // Pitch (requires native audio processing - placeholder)
  async setPitch(pitch: number): Promise<void> {
    this.currentPitch = pitch;
    // Expo AV doesn't support pitch shifting natively
    // Would require native audio processing (Superpowered, etc.)
  }

  // Sync Status
  async getCurrentStatus(): Promise<{
    position: number;
    duration: number;
    isPlaying: boolean;
  }> {
    if (!this.masterSound) {
      return { position: 0, duration: 0, isPlaying: false };
    }

    const status = await this.masterSound.getStatusAsync();
    if (status.isLoaded) {
      return {
        position: status.positionMillis,
        duration: status.durationMillis || 0,
        isPlaying: status.isPlaying,
      };
    }
    return { position: 0, duration: 0, isPlaying: false };
  }

  // Event Handlers
  private handlePlaybackStatus = (status: Audio.PLAYBACK_STATUS) => {
    // Dispatch events to listeners
  };

  private handleChannelStatus = (channelId: string, isLoaded: boolean, status: Audio.PLAYBACK_STATUS) => {
    // Handle channel-specific playback events
  };

  // Cleanup
  async unloadTrack(): Promise<void> {
    await this.unloadAll();
  }

  async unloadAll(): Promise<void> {
    try {
      if (this.masterSound) {
        await this.masterSound.unloadAsync();
        this.masterSound = null;
      }

      for (const sound of this.channelSounds.values()) {
        await sound.unloadAsync();
      }
      this.channelSounds.clear();
    } catch (error) {
      console.error('Error unloading:', error);
    }
  }

  async unloadChannels(): Promise<void> {
    for (const sound of this.channelSounds.values()) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
    this.channelSounds.clear();
  }

  // Get loaded sounds for state management
  getMasterSound(): Audio.Sound | null {
    return this.masterSound;
  }

  getChannelSounds(): Map<string, Audio.Sound> {
    return this.channelSounds;
  }

  isPlaying(): boolean {
    return this.masterSound !== null && this.currentTempo > 0;
  }
}

export default AudioService.getInstance();