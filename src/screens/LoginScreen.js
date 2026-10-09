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
  // Mode selection: 'credentials' (User ID & Password) | 'code' (Access Code / Ground Access)
  const [activeTab, setActiveTab] = useState('credentials');

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'user' | 'pass' | 'code' | null

  // Network connection status: 'online' | 'weak' | 'offline'
  const [networkStatus, setNetworkStatus] = useState('online');

  // Inline Validation & Alert States
  const [userIdError, setUserIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');
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

  const switchTab = (tab) => {
    setActiveTab(tab);
    setUserIdError('');
    setPasswordError('');
    setCodeError('');
    setOfflineError('');
    setFocusedInput(null);
  };

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
          role: 'Authorized Operator',
        });
      }
    }, 600);
  };

  const handleAccessCodeLogin = () => {
    if (networkStatus === 'offline') {
      setOfflineError('Terminal is offline. Please enable mobile data or Wi-Fi to authenticate.');
      return;
    } else {
      setOfflineError('');
    }

    const trimmed = accessCode.trim();
    if (!trimmed) {
      setCodeError('Please enter your event access code');
      return;
    }

    if (trimmed.length < 3) {
      setCodeError('Access code must be at least 3 characters');
      return;
    }

    setCodeError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({
          user: `GROUND-${trimmed.toUpperCase()}`,
          hub: 'Event Ground Team - Dispatch Hub',
          role: 'Ground Operations',
          accessCode: trimmed.toUpperCase(),
        });
      }
    }, 600);
  };

  const handleFocusPassword = () => {
    setFocusedInput('pass');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Subtle Bottom Warehouse Scene Backdrop */}
      <Image
        source={require('../../assets/splash_ground_scene_clean.png')}
        style={styles.bottomWarehouseBg}
        resizeMode="cover"
        pointerEvents="none"
      />

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
            <Text style={styles.brandSubtitle}>EVENT LOGISTICS & STOCK MOVEMENT</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeading}>
              {activeTab === 'credentials' ? 'Login' : 'Ground Access'}
            </Text>
            <Text style={styles.cardSubheading}>
              {activeTab === 'credentials'
                ? 'Enter authorised user credentials to continue.'
                : 'Sign in quickly during busy event operations.'}
            </Text>

            {/* Segmented Mode Selector Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                onPress={() => switchTab('credentials')}
                style={[
                  styles.tabButton,
                  activeTab === 'credentials' && styles.tabButtonActive,
                ]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={activeTab === 'credentials' ? COLORS.white : '#8E7BB5'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'credentials' && styles.tabTextActive,
                  ]}
                >
                  User ID & Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => switchTab('code')}
                style={[
                  styles.tabButton,
                  activeTab === 'code' && styles.tabButtonActive,
                ]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="key-variant"
                  size={18}
                  color={activeTab === 'code' ? COLORS.white : '#8E7BB5'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'code' && styles.tabTextActive,
                  ]}
                >
                  Access Code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inline Offline Alert Banner */}
            {!!offlineError && (
              <View style={styles.alertBanner}>
                <MaterialCommunityIcons name="wifi-off" size={16} color={COLORS.error} />
                <Text style={styles.alertBannerText}>{offlineError}</Text>
              </View>
            )}

            {activeTab === 'credentials' ? (
              /* TAB 1: User ID & Password Mode */
              <>
                {/* User ID Field */}
                <View style={styles.fieldContainer}>
                  <View
                    style={[
                      styles.inputBoxStacked,
                      focusedInput === 'user' && styles.inputWrapperFocused,
                      !!userIdError && styles.inputWrapperError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={22}
                      color={userIdError ? COLORS.error : '#A855F7'}
                      style={styles.inputLeadingIcon}
                    />
                    <View style={styles.inputInnerCol}>
                      <Text style={styles.inputInnerLabel}>User ID</Text>
                      <TextInput
                        style={styles.inputInnerField}
                        placeholder="Enter your user ID"
                        placeholderTextColor="#6B599C"
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
                  </View>
                  {!!userIdError && (
                    <View style={styles.inlineErrorRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                      <Text style={styles.inlineErrorText}>{userIdError}</Text>
                    </View>
                  )}
                </View>

                {/* Password Field */}
                <View style={styles.fieldContainer}>
                  <View
                    style={[
                      styles.inputBoxStacked,
                      focusedInput === 'pass' && styles.inputWrapperFocused,
                      !!passwordError && styles.inputWrapperError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="lock"
                      size={22}
                      color={passwordError ? COLORS.error : '#A855F7'}
                      style={styles.inputLeadingIcon}
                    />
                    <View style={styles.inputInnerCol}>
                      <Text style={styles.inputInnerLabel}>Password</Text>
                      <TextInput
                        style={styles.inputInnerField}
                        placeholder="Enter your password"
                        placeholderTextColor="#6B599C"
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
                    </View>
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
                  style={styles.primaryBtnWrapper}
                >
                  <LinearGradient
                    colors={['#8419F7', '#6F12E0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.primaryBtnText}>LOGIN</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.btnArrow} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* TAB 2: Ground Access / Access Code Mode */
              <>
                {/* Access Code Section Header */}
                <View style={styles.accessHeaderSection}>
                  <Text style={styles.accessSectionTitle}>Access Code</Text>
                  <Text style={styles.accessSectionSubtitle}>
                    Enter the code assigned to your event team.
                  </Text>
                </View>

                {/* Access Code Field */}
                <View style={styles.fieldContainer}>
                  <View
                    style={[
                      styles.accessInputBox,
                      focusedInput === 'code' && styles.inputWrapperFocused,
                      !!codeError && styles.inputWrapperError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="key-variant"
                      size={22}
                      color={codeError ? COLORS.error : '#A855F7'}
                      style={styles.keyIcon}
                    />
                    <View style={styles.inputVerticalDivider} />
                    <TextInput
                      style={styles.accessInputField}
                      placeholder="Enter access code"
                      placeholderTextColor="#6B599C"
                      value={accessCode}
                      onChangeText={(val) => {
                        setAccessCode(val);
                        if (codeError) setCodeError('');
                      }}
                      autoCapitalize="characters"
                      onFocus={() => {
                        setFocusedInput('code');
                        if (codeError) setCodeError('');
                      }}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                  {!!codeError && (
                    <View style={styles.inlineErrorRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                      <Text style={styles.inlineErrorText}>{codeError}</Text>
                    </View>
                  )}
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={24} color="#A855F7" />
                  <Text style={styles.infoCardText}>
                    Use the code shared by your event manager for quick access to District Stock.
                  </Text>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  onPress={handleAccessCodeLogin}
                  activeOpacity={0.85}
                  disabled={isLoading}
                  style={styles.primaryBtnWrapper}
                >
                  <LinearGradient
                    colors={['#8419F7', '#6F12E0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.primaryBtnText}>CONTINUE</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.btnArrow} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* OR Divider */}
                <View style={styles.orDividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Use User ID & Password Instead Link */}
                <TouchableOpacity
                  onPress={() => switchTab('credentials')}
                  style={styles.switchModeRow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color="#A855F7" />
                  <Text style={styles.switchModeText}>Use User ID and Password instead</Text>
                </TouchableOpacity>
              </>
            )}
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
  bottomWarehouseBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 200,
    opacity: 0.22,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
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
  brandContainer: {
    alignItems: 'center',
    marginBottom: 22,
    marginTop: -8,
  },
  brandWordmark: {
    width: Math.min(width * 0.72, 250),
    height: 38,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D8B4FE',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: '#120B27',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  cardSubheading: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 19,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#170E33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#6F12E0',
    shadowColor: '#6F12E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8E7BB5',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  fieldContainer: {
    marginBottom: 14,
  },
  inputBoxStacked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#190E38',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    paddingHorizontal: 16,
    height: 64,
  },
  inputInnerCol: {
    flex: 1,
    justifyContent: 'center',
  },
  inputInnerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B599E8',
    marginBottom: 2,
  },
  inputInnerField: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  accessHeaderSection: {
    marginBottom: 12,
  },
  accessSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 3,
  },
  accessSectionSubtitle: {
    fontSize: 12.5,
    color: COLORS.textMuted,
  },
  accessInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#190E38',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    paddingHorizontal: 16,
    height: 56,
  },
  keyIcon: {
    marginRight: 4,
  },
  inputVerticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    marginHorizontal: 12,
  },
  accessInputField: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '600',
    padding: 0,
    letterSpacing: 0.8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 14, 58, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 18,
  },
  infoCardText: {
    fontSize: 12.5,
    color: '#C4B5FD',
    lineHeight: 18,
    flex: 1,
    marginLeft: 10,
    fontWeight: '400',
  },
  inputWrapperFocused: {
    borderColor: '#A855F7',
    backgroundColor: '#201348',
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  inputLeadingIcon: {
    marginRight: 14,
  },
  showButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  showButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D8B4FE',
    letterSpacing: 0.8,
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#D8B4FE',
  },
  primaryBtnWrapper: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  btnArrow: {
    marginLeft: 8,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  orText: {
    color: '#7C6B9E',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 12,
    letterSpacing: 0.5,
  },
  switchModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
