import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { Channel } from '../types';

interface ChannelSliderProps {
  channel: Channel;
  onVolumeChange: (channelId: string, volume: number) => void;
  onMuteToggle: (channelId: string, muted: boolean) => void;
  onSoloToggle: (channelId: string, solo: boolean) => void;
}

const CHANNEL_NAMES: Record<string, string> = {
  melody: 'Melodía',
  bass: 'Bajo',
  drums: 'Batería',
  vocals: 'Voz',
  other: 'Otro',
};

const CHANNEL_COLORS: Record<string, string> = {
  melody: '#3B82F6', // azul
  bass: '#10B981',   // verde
  drums: '#8B5CF6',  // púrpura
  vocals: '#F59E0B', // amarillo
  other: '#6B7280',  // gris
};

const ChannelSlider: React.FC<ChannelSliderProps> = ({
  channel,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempVolume, setTempVolume] = React.useState(channel.volume);
  const animatedValue = React.useRef(new Animated.Value(channel.volume)).current;

  const applyVolume = (volume: number) => {
    onVolumeChange(channel.id, volume);
    Animated.timing(animatedValue, {
      toValue: volume,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleVolumeSlide = (value: number) => {
    setTempVolume(value);
  };

  const handleRelease = () => {
    applyVolume(tempVolume);
    setIsEditing(false);
  };

  React.useEffect(() => {
    animatedValue.addListener(({ value }) => {
      setTempVolume(value);
    });
    return () => animatedValue.removeAllListeners();
  }, [animatedValue]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.channelName}>{CHANNEL_NAMES[channel.name]}</Text>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.soloButton, channel.solo && styles.soloActive]}
            onPress={() => onSoloToggle(channel.id, !channel.solo)}
          >
            <Text style={styles.soloText}>S</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.muteButton}
            onPress={() => onMuteToggle(channel.id, !channel.muted)}>
            <Text style={styles.muteText}>
              {channel.muted ? '🔇' : '🔊'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.volumeContainer}>
        <Text style={styles.volumeText}>
          {Math.round(channel.volume * 100)}%
        </Text>
        <View style={styles.sliderTrack}>
          <Animated.View
            style={[
              styles.sliderFill,
              {
                flex: channel.volume,
                backgroundColor: CHANNEL_COLORS[channel.name],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.sliderThumb}
            activeOpacity={1}
            onPressIn={() => setIsEditing(true)}>
            <View
              style={[
                styles.thumb,
                { backgroundColor: CHANNEL_COLORS[channel.name] },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soloButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  soloText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  muteButton: {
    padding: 4,
  },
  muteText: {
    fontSize: 16,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeText: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 40,
    textAlign: 'right',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    justifyContent: 'center',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    right: -16,
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default ChannelSlider;