import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess, onReplaySplash, onForgotPassword }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'user' | 'pass' | null

  // Network connection status: 'online' | 'weak' | 'offline'
  const [networkStatus, setNetworkStatus] = useState('online');

  // Inline Validation & Alert States
  const [userIdError, setUserIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [offlineError, setOfflineError] = useState('');

  const scrollViewRef = useRef(null);

  // Pulsing animation for the terminal status dot
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Real-time network detection & latency heartbeat
  useEffect(() => {
    let isMounted = true;

    const checkNetworkHealth = async () => {
      try {
        const netState = await Network.getNetworkStateAsync();
        if (!netState.isConnected || netState.isInternetReachable === false) {
          if (isMounted) setNetworkStatus('offline');
          return;
        }

        // Active latency ping to measure signal quality
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 2800);

        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutTimer);

        const latency = Date.now() - startTime;
        if (!isMounted) return;

        // If latency > 600ms, mark as weak connection
        if (latency > 600) {
          setNetworkStatus('weak');
        } else {
          setNetworkStatus('online');
        }
        setOfflineError('');
      } catch (err) {
        if (isMounted) {
          setNetworkStatus('offline');
        }
      }
    };

    // Run immediately on screen appearance
    checkNetworkHealth();

    // Check periodically every 3 seconds for fast response when turning off data
    const intervalId = setInterval(checkNetworkHealth, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleLogin = () => {
    let hasError = false;

    if (networkStatus === 'offline') {
      setOfflineError('Terminal is offline. Please enable mobile data or Wi-Fi to authenticate.');
      return;
    } else {
      setOfflineError('');
    }

    if (!userId.trim()) {
      setUserIdError('Please enter your User ID');
      hasError = true;
    } else {
      setUserIdError('');
    }

    if (!password.trim()) {
      setPasswordError('Please enter your Password');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (hasError) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({
          user: userId,
          hub: 'Central Warehouse - Terminal 01',
        });
      }
    }, 700);
  };

  const handleFocusPassword = () => {
    setFocusedInput('pass');
    // Smoothly scroll down so password field and login button are completely in view above keyboard
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.flexOne}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Brand Section */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../../assets/district_stock_single_line.png')}
              style={styles.brandWordmark}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>Event Logistics & Stock Movement</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeading}>Login</Text>
            <Text style={styles.cardSubheading}>
              Enter authorised user credentials to continue.
            </Text>

            {/* Inline Offline Alert Banner */}
            {!!offlineError && (
              <View style={styles.alertBanner}>
                <MaterialCommunityIcons name="wifi-off" size={16} color={COLORS.error} />
                <Text style={styles.alertBannerText}>{offlineError}</Text>
              </View>
            )}

            {/* User ID Field Container */}
            <View style={styles.fieldContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'user' && styles.inputWrapperFocused,
                  !!userIdError && styles.inputWrapperError,
                ]}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={22}
                  color={userIdError ? COLORS.error : (focusedInput === 'user' ? COLORS.primaryElectric : COLORS.textLilacSub)}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="User ID"
                  placeholderTextColor={COLORS.textDim}
                  value={userId}
                  onChangeText={(val) => {
                    setUserId(val);
                    if (userIdError) setUserIdError('');
                  }}
                  autoCapitalize="none"
                  onFocus={() => {
                    setFocusedInput('user');
                    if (userIdError) setUserIdError('');
                  }}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
              {!!userIdError && (
                <View style={styles.inlineErrorRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                  <Text style={styles.inlineErrorText}>{userIdError}</Text>
                </View>
              )}
            </View>

            {/* Password Field Container */}
            <View style={styles.fieldContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'pass' && styles.inputWrapperFocused,
                  !!passwordError && styles.inputWrapperError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={22}
                  color={passwordError ? COLORS.error : (focusedInput === 'pass' ? COLORS.primaryElectric : COLORS.textLilacSub)}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textDim}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (passwordError) setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  onFocus={() => {
                    handleFocusPassword();
                    if (passwordError) setPasswordError('');
                  }}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.showButton}
                >
                  <Text style={styles.showButtonText}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!!passwordError && (
                <View style={styles.inlineErrorRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                  <Text style={styles.inlineErrorText}>{passwordError}</Text>
                </View>
              )}
            </View>

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordRow}>
              <TouchableOpacity
                onPress={onForgotPassword}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
              style={styles.loginButtonWrapper}
            >
              <LinearGradient
                colors={['#8419F7', '#6F12E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer Terminal Connection Status */}
          <View style={styles.footerStatus}>
            <Animated.View
              style={[
                styles.statusDot,
                networkStatus === 'online' && styles.statusDotOnline,
                networkStatus === 'weak' && styles.statusDotWeak,
                networkStatus === 'offline' && styles.statusDotOffline,
                {
                  opacity: pulseAnim,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.85, 1.25],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                networkStatus === 'weak' && styles.statusTextWeak,
                networkStatus === 'offline' && styles.statusTextOffline,
              ]}
            >
              {networkStatus === 'online' && 'Terminal Online • 256-bit Encrypted Session'}
              {networkStatus === 'weak' && 'Terminal Weak Signal • High Latency'}
              {networkStatus === 'offline' && 'Terminal Offline • No Network Connection'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  alertBannerText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingLeft: 4,
  },
  inlineErrorText: {
    color: COLORS.error,
    fontSize: 11.5,
    fontWeight: '500',
    marginLeft: 4,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 26,
    marginTop: -10,
  },
  brandWordmark: {
    width: Math.min(width * 0.72, 250),
    height: 36,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.textLilac,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  cardSubheading: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: COLORS.borderInput,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#201642',
  },
  inputLeadingIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
  },
  showButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  showButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textLilac,
    letterSpacing: 0.8,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textLilac,
  },
  loginButtonWrapper: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  statusDot: {
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: COLORS.onlineGreen,
  },
  statusDotOnline: {
    backgroundColor: COLORS.onlineGreen,
    shadowColor: COLORS.onlineGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotWeak: {
    backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotOffline: {
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  statusTextWeak: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  statusTextOffline: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
