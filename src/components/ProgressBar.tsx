import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  showsHandle?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  backgroundColor = '#E5E7EB',
  progressColor = '#1E40AF',
  showsHandle = false,
}) => {
  const animatedProgress = new Animated.Value(progress);

  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <Animated.View
        style={[
          styles.progress,
          {
            width,
            backgroundColor: progressColor,
            height,
          },
        ]}
      />
      {showsHandle && (
        <View
          style={[
            styles.handle,
            {
              left: width,
              backgroundColor: progressColor,
              height: height + 8,
              width: 12,
              transform: [{ translateX: -6 }],
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 4,
  },
  handle: {
    position: 'absolute',
    borderRadius: 6,
    top: -4,
  },
});

export default ProgressBar;