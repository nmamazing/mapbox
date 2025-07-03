import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider /*, useAuth*/ } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { UserProvider } from './src/contexts/UserContext';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import LoginScreen from './src/screens/LoginScreen';
// import { ActivityIndicator, View } from 'react-native';

// --- AUTH GATING LOGIC (toggle for development) ---
/*
function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!user) {
    return <LoginScreen />;
  }
  return <Navigation />;
}
*/
// --- END AUTH GATING LOGIC ---

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthProvider>
          <SettingsProvider>
            <UserProvider>
            <MainTabNavigator />
            </UserProvider>
          </SettingsProvider>
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
