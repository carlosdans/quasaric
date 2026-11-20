// Library Screen for Quasaric
// Gestión de biblioteca local y archivos importados

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { usePlayer } from '../hooks/usePlayer';

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  local: boolean;
  audioURI: string;
}

export default function LibraryScreen() {
  const { currentTrack } = usePlayer();
  const [tracks, setTracks] = React.useState<TrackItem[]>([]);

  React.useEffect(() => {
    // Mock tracks - en producción, cargar desde AsyncStorage
    const mockTracks: TrackItem[] = [
      {
        id: '1',
        title: 'Canción de Prueba',
        artist: 'Artista Local',
        duration: '3:45',
        local: true,
        audioURI: 'file:///android_audio/test.mp3',
      },
      {
        id: '2',
        title: 'Instrumental Clásico',
        artist: 'Ordenador',
        duration: '4:20',
        local: true,
        audioURI: 'file:///android_audio/test2.mp3',
      },
      {
        id: '3',
        title: 'Banda Rock Local',
        artist: 'Grupo Local',
        duration: '3:12',
        local: true,
        audioURI: 'file:///android_audio/test3.mp3',
      },
    ];
    setTracks(mockTracks);
  }, []);

  const handleImport = () => {
    // Placeholder - will implement file picker later
    alert('Importar archivo - función pendiente\n\nEn producción, aquí se abriría el selector de archivos');
  };

  const handlePlayTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track && currentTrack) {
      // In real app, would load the track
    }
  };

  const renderTrack = ({ item }: { item: TrackItem }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handlePlayTrack(item.id)}
    >
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{item.title}</Text>
        <Text style={styles.trackArtist}>{item.artist}</Text>
        <Text style={styles.trackDuration}>{item.duration}</Text>
      </View>
      <Text style={styles.localIndicator}>{item.local ? '📱' : '☁️'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark" backgroundColor="#F9FAFB" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biblioteca</Text>
        <TouchableOpacity style={styles.importButton} onPress={handleImport}>
          <Text style={styles.importText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Canciones locales</Text>
      <FlatList
        data={tracks}
        renderItem={renderTrack}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  importButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  localIndicator: {
    fontSize: 20,
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});