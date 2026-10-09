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
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess, onReplaySplash, onForgotPassword }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'user' | 'pass' | null

  const scrollViewRef = useRef(null);

  // Pulsing animation for the "Terminal Online" status dot
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

  const handleLogin = () => {
    if (!userId.trim()) {
      Alert.alert('Required', 'Please enter your User ID.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Required', 'Please enter your Password.');
      return;
    }

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

      {/* Subtle top bar for splash replay */}
      <View style={styles.topControlRow}>
        {onReplaySplash && (
          <TouchableOpacity
            onPress={onReplaySplash}
            style={styles.replayButton}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={13} color={COLORS.textLilac} />
            <Text style={styles.replayText}>Replay Splash</Text>
          </TouchableOpacity>
        )}
      </View>

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
              source={require('../../assets/district_stock_neon_wordmark.png')}
              style={styles.neonWordmark}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitleRow1}>EVENT LOGISTICS &</Text>
            <Text style={styles.brandSubtitleRow2}>STOCK MOVEMENT</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeading}>Login</Text>
            <Text style={styles.cardSubheading}>
              Enter authorised user credentials to continue.
            </Text>

            {/* User ID Field */}
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'user' && styles.inputWrapperFocused,
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={22}
                color={focusedInput === 'user' ? COLORS.primaryElectric : COLORS.textLilacSub}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="User ID"
                placeholderTextColor={COLORS.textDim}
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="none"
                onFocus={() => setFocusedInput('user')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Password Field */}
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'pass' && styles.inputWrapperFocused,
              ]}
            >
              <MaterialCommunityIcons
                name="lock"
                size={22}
                color={focusedInput === 'pass' ? COLORS.primaryElectric : COLORS.textLilacSub}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={handleFocusPassword}
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

          {/* Footer Security Status */}
          <View style={styles.footerStatus}>
            <Animated.View
              style={[
                styles.statusDot,
                {
                  opacity: pulseAnim,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.85, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.statusText}>
              Terminal Online • 256-bit Encrypted Session
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
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 28, 240, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(123, 28, 240, 0.3)',
  },
  replayText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textLilac,
    marginLeft: 5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  neonWordmark: {
    width: 146,
    height: 84,
    marginBottom: 4,
  },
  brandSubtitleRow1: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(192, 132, 252, 0.85)',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  brandSubtitleRow2: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(192, 132, 252, 0.85)',
    letterSpacing: 2.2,
    textAlign: 'center',
    marginTop: 2,
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.onlineGreen,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
