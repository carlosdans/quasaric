// Player Screen for Quasaric
// Reproductor principal con controles multipista

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { usePlayer } from '../hooks/usePlayer';
import ProgressBar from '../components/ProgressBar';
import ChannelSlider from '../components/ChannelSlider';

// Channel name mapping
const CHANNEL_NAMES: Record<string, string> = {
  melody: 'Melodía',
  bass: 'Bajo',
  drums: 'Batería',
  vocals: 'Voz',
  other: 'Otro',
};

export default function PlayerScreen() {
  const {
    playbackState,
    currentTrack,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setTempo,
    setPitch,
    setLoop,
    toggleLoop,
    setChannelVolume,
    muteChannel,
    soloChannel,
  } = usePlayer();

  const [showChannels, setShowChannels] = React.useState(true);
  const [tempoValue, setTempoValue] = React.useState(playbackState.tempo);

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get channels from state
  const channels = Object.values(playbackState.channels).length > 0
    ? Object.values(playbackState.channels)
    : [
        { id: '1', name: 'melody' as const, volume: playbackState.volume, muted: false, solo: false, audioURI: '', trackId: playbackState.currentTrack?.id || 'current' },
        { id: '2', name: 'bass' as const, volume: 0.7, muted: false, solo: false, audioURI: '', trackId: playbackState.currentTrack?.id || 'current' },
        { id: '3', name: 'drums' as const, volume: 0.8, muted: false, solo: false, audioURI: '', trackId: playbackState.currentTrack?.id || 'current' },
        { id: '4', name: 'vocals' as const, volume: 0.9, muted: false, solo: false, audioURI: '', trackId: playbackState.currentTrack?.id || 'current' },
      ];

  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleTempoChange = (value: number) => {
    setTempo(value);
    setTempoValue(value);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark" backgroundColor="#F9FAFB" />

      {/* Header with track info */}
      <View style={styles.header}>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack?.title || 'No track selected'}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack?.artist || 'Artist'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => {}}
        >
          <Text style={styles.favoriteText}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar and time */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={playbackState.duration > 0
            ? playbackState.currentPosition / playbackState.duration
            : 0
          }
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(playbackState.currentPosition)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(playbackState.duration || 0)}
          </Text>
        </View>
      </View>

      {/* Transport controls */}
      <View style={styles.transportContainer}>
        <TouchableOpacity style={styles.transportButton}>
          <Text style={styles.iconText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          {playbackState.isPlaying ? (
            <Text style={styles.iconText}>⏸</Text>
          ) : (
            <Text style={styles.iconText}>▶</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.transportButton}>
          <Text style={styles.iconText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Tempo and Pitch controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Tempo</Text>
          <View style={styles.tempoValue}>
            <Text style={styles.valueText}>{playbackState.tempo.toFixed(1)}x</Text>
          </View>
        </View>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Pitch</Text>
          <View style={styles.tempoValue}>
            <Text style={styles.valueText}>
              {playbackState.pitch > 0 ? '+' : ''}{playbackState.pitch}
            </Text>
          </View>
        </View>
      </View>

      {/* Loop indicator */}
      {playbackState.loop.active && (
        <View style={styles.loopContainer}>
          <TouchableOpacity onPress={toggleLoop}>
            <Text style={styles.loopText}>
              Loop: {formatTime(playbackState.loop.start)} - {formatTime(playbackState.loop.end)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Channel controls */}
      <View style={styles.channelsContainer}>
        <View style={styles.channelsHeader}>
          <Text style={styles.channelsTitle}>Canales</Text>
          <TouchableOpacity onPress={() => setShowChannels(!showChannels)}>
            <Text style={styles.toggleText}>{showChannels ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {showChannels && (
          <ScrollView style={styles.scrollContainer}>
            {channels.map((channel) => (
              <ChannelSlider
                key={channel.id}
                channel={channel}
                onVolumeChange={(volume) => setChannelVolume(channel.id, volume)}
                onMuteToggle={(muted) => muteChannel(channel.id, muted)}
                onSoloToggle={(solo) => soloChannel(channel.id, solo)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.bottomButton}>
          <Text style={styles.bottomIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton}>
          <Text style={styles.bottomIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  trackArtist: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteText: {
    fontSize: 24,
    color: '#EF4444',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  transportContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  transportButton: {
    padding: 16,
  },
  playButton: {
    padding: 16,
    backgroundColor: '#1E40AF',
    borderRadius: 28,
    marginHorizontal: 32,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  controlGroup: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  tempoValue: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  loopContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  loopText: {
    fontSize: 12,
    color: '#6B7280',
  },
  channelsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  channelsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleText: {
    fontSize: 16,
    color: '#1E40AF',
  },
  scrollContainer: {
    maxHeight: 200,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
  bottomButton: {
    padding: 16,
    marginHorizontal: 24,
  },
  iconText: {
    fontSize: 20,
    color: '#1E40AF',
  },
});