import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'login' | 'dashboard'
  const [session, setSession] = useState(null);

  const handleSplashFinish = () => {
    setCurrentScreen('login');
  };

  const handleLoginSuccess = (userSession) => {
    setSession(userSession);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentScreen('login');
  };

  const handleReplaySplash = () => {
    setCurrentScreen('splash');
  };

  return (
    <View style={styles.root}>
      {currentScreen === 'splash' && (
        <SplashScreen onFinish={handleSplashFinish} />
      )}
      {currentScreen === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onReplaySplash={handleReplaySplash}
        />
      )}
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          session={session}
          onLogout={handleLogout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});
