// Search Screen for Quasaric
// Búsqueda de canciones

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { usePlayer } from '../hooks/usePlayer';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  hasLocal: boolean;
}

// Mock search results
const SEARCH_RESULTS: SearchResult[] = [
  { id: '1', title: 'Song Title', artist: 'Artist Name', duration: '3:45', hasLocal: true },
  { id: '2', title: 'Another Song', artist: 'Different Artist', duration: '4:20', hasLocal: false },
  { id: '3', title: 'Popular Track', artist: 'Well-Known Artist', duration: '3:12', hasLocal: true },
];

export default function SearchScreen() {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const { setCurrentTrack } = usePlayer();

  React.useEffect(() => {
    // Filter results based on query
    if (query.length > 0) {
      const filtered = SEARCH_RESULTS.filter(
        item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.artist.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelectItem = (item: SearchResult) => {
    // In a real app, this would load the track
    // For now, just log
    console.log('Selected:', item);
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectItem(item)}
    >
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultArtist}>{item.artist}</Text>
        <Text style={styles.resultDuration}>{item.duration}</Text>
      </View>
      {item.hasLocal && <Text style={styles.localIndicator}>✓</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark" backgroundColor="#F9FAFB" />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar canciones, artistas..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {query.length > 0 ? (
        <>
          <Text style={styles.resultsCount}>
            {results.length} resultados para "{query}"
          </Text>
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Busca canciones</Text>
          <Text style={styles.emptyDescription}>
            Escribe el nombre de una canción o artista para encontrarla
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
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
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  resultArtist: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  resultDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  localIndicator: {
    fontSize: 16,
    marginLeft: 8,
    alignSelf: 'center',
    color: '#10B981',
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