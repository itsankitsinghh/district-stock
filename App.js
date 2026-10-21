import React, { useState, useEffect } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import MainAppContainer from './src/screens/MainAppContainer';
import { authService } from './src/services/authService';
import masterService from './src/services/masterService';
import inboundService from './src/services/inboundService';
import movementService from './src/services/movementService';
import carrierService from './src/services/carrierService';
import { storageHelper } from './src/services/storageHelper';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [session, setSession] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await Promise.all([
          authService.init(),
          masterService.init(),
          inboundService.init(),
          movementService.init(),
          carrierService.init(),
        ]);
        // Trigger background cloud sync with Render backend and then refresh services
        storageHelper.syncWithCloud().then(async () => {
          try {
            await Promise.all([
              authService.init(true),
              masterService.init(true),
              inboundService.init(true),
              movementService.init(true),
              carrierService.init(true),
            ]);
            if (isMounted && authService.isSessionValid()) {
              const live = authService.getCurrentSession();
              if (live) setSession({ ...live });
            }
          } catch (_) {}
        }).catch(() => {});

        if (isMounted && authService.isSessionValid()) {
          const live = authService.getCurrentSession();
          if (live) {
            setSession({ ...live });
          }
        }
      } catch (err) {
        console.warn('Bootstrap error:', err);
      }
    }
    bootstrap();

    const unsubscribe = authService.subscribe((event) => {
      if (event?.session) {
        setSession({ ...event.session });
      } else {
        const live = authService.getCurrentSession();
        if (live && authService.isSessionValid()) {
          setSession({ ...live });
        } else if (!live) {
          setSession(null);
        }
      }
    });

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        storageHelper.syncWithCloud().then(async () => {
          try {
            await Promise.all([
              authService.init(true),
              masterService.init(true),
              inboundService.init(true),
              movementService.init(true),
              carrierService.init(true),
            ]);
          } catch (_) {}
        }).catch(() => {});
        try {
          if (authService.isSessionValid()) {
            const live = authService.getCurrentSession();
            if (live) {
              setSession({ ...live });
              setCurrentScreen((prev) => (prev === 'login' || prev === 'splash' ? 'dashboard' : prev));
            }
          } else {
            // Genuinely expired (> 8 hours) or already logged out
            const live = authService.getCurrentSession();
            if (live) {
              await authService.logout();
              setSession(null);
              setCurrentScreen('login');
            }
          }
        } catch (e) {
          console.warn('AppState resume check error:', e);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      sub.remove();
    };
  }, []);

  const handleSplashFinish = async () => {
    try {
      await authService.init();
      if (authService.isSessionValid()) {
        const live = authService.getCurrentSession();
        if (live) {
          setSession({ ...live });
          setCurrentScreen('dashboard');
          return;
        }
      }
    } catch (err) {
      console.warn('Error on splash finish:', err);
    }
    setCurrentScreen('login');
  };

  const handleLoginSuccess = (userSession) => {
    setSession(userSession);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    setSession(null);
    setCurrentScreen('login');
    try {
      await authService.logout();
    } catch (_) {}
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
        {currentScreen === 'dashboard' && session && (
          <MainAppContainer
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
