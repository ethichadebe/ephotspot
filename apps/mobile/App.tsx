import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PackagesScreen from './src/screens/PackagesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { getToken, apiFetch } from './src/services/api';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check stored JWT to skip login
    getToken().then((token) => {
      setInitialRoute(token ? 'Home' : 'Login');
      setReady(true);
    });

    // Register FCM token
    messaging().getToken().then((fcmToken) => {
      if (fcmToken) {
        apiFetch('/notifications/register', {
          method: 'POST',
          body: JSON.stringify({ token: fcmToken }),
        }).catch(() => {});
      }
    });

    // Handle token refresh
    return messaging().onTokenRefresh((fcmToken) => {
      apiFetch('/notifications/register', {
        method: 'POST',
        body: JSON.stringify({ token: fcmToken }),
      }).catch(() => {});
    });
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Packages" component={PackagesScreen} options={{ headerShown: true, title: 'Buy Data' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'History' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
