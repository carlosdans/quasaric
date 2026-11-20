// Quasaric - Aplicación de práctica musical multipista
// Punto de entrada de la aplicación

import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { PlayerProvider } from './hooks/usePlayer';
import { SettingsProvider } from './hooks/useSettings';
import PlayerScreen from './screens/PlayerScreen';
import LibraryScreen from './screens/LibraryScreen';
import SearchScreen from './screens/SearchScreen';

const Tab = createBottomTabNavigator();

// Icon components using emoji
const PlayerIcon = () => <Text style={{ fontSize: 22 }}>🎵</Text>;
const LibraryIcon = () => <Text style={{ fontSize: 22 }}>📚</Text>;
const SearchIcon = () => <Text style={{ fontSize: 22 }}>🔍</Text>;

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Initialize app
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SettingsProvider>
      <PlayerProvider>
        <NavigationContainer theme={DefaultTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#1E40AF',
              tabBarInactiveTintColor: '#6B7280',
              tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                paddingBottom: 8,
                height: 64,
              },
            }}>
            <Tab.Screen
              name="Reproductor"
              component={PlayerScreen}
              options={{
                tabBarLabel: 'Reproductor',
                tabBarIcon: PlayerIcon,
              }}
            />
            <Tab.Screen
              name="Library"
              component={LibraryScreen}
              options={{
                tabBarLabel: 'Biblioteca',
                tabBarIcon: LibraryIcon,
              }}
            />
            <Tab.Screen
              name="Search"
              component={SearchScreen}
              options={{
                tabBarLabel: 'Buscar',
                tabBarIcon: SearchIcon,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </PlayerProvider>
    </SettingsProvider>
  );
}