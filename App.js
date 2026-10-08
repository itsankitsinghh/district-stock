import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [session, setSession] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');

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

  const handleGoToForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleCodeSent = (email) => {
    setRecoveryEmail(email);
    setCurrentScreen('reset-password');
  };

  const handleResetSuccess = () => {
    setCurrentScreen('login');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {currentScreen === 'splash' && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
        {currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onReplaySplash={handleReplaySplash}
            onForgotPassword={handleGoToForgotPassword}
          />
        )}
        {currentScreen === 'forgot-password' && (
          <ForgotPasswordScreen
            onBackToLogin={handleBackToLogin}
            onCodeSent={handleCodeSent}
          />
        )}
        {currentScreen === 'reset-password' && (
          <ResetPasswordScreen
            email={recoveryEmail}
            onBack={handleGoToForgotPassword}
            onResetSuccess={handleResetSuccess}
          />
        )}
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            session={session}
            onLogout={handleLogout}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0719',
  },
});
