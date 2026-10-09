import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ForgotPasswordScreen({ onBackToLogin, onCodeSent }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendLink = () => {
    if (!email.trim()) {
      setEmailError('Please enter your registered email address');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address (e.g. name@company.com)');
      return;
    }

    setEmailError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 700);
  };

  const handleProceed = () => {
    if (onCodeSent) onCodeSent(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBackToLogin}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexOne}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Lock / Key Icon Badge */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBadge, isSuccess && styles.iconBadgeSuccess]}>
              <MaterialCommunityIcons
                name={isSuccess ? "check-decagram" : "lock-reset"}
                size={38}
                color={isSuccess ? COLORS.onlineGreen : COLORS.textLilac}
              />
            </View>
          </View>

          {isSuccess ? (
            /* In-Card Success State */
            <View style={styles.successBlock}>
              <Text style={styles.title}>Code Dispatched!</Text>
              <Text style={styles.subtitle}>
                A 6-digit recovery verification code has been dispatched to{' '}
                <Text style={styles.emailHighlight}>{email}</Text>.
              </Text>

              <TouchableOpacity
                onPress={handleProceed}
                activeOpacity={0.85}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#8419F7', '#6F12E0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Proceed to Reset Password</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSuccess(false)}
                style={styles.backToLoginWrapper}
                activeOpacity={0.7}
              >
                <Text style={styles.resendText}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Input Form State */
            <>
              {/* Heading Section */}
              <Text style={styles.title}>Forgot password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we will send you a reset link.
              </Text>

              {/* Email Input Field */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Email address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused,
                    !!emailError && styles.inputWrapperError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={22}
                    color={emailError ? COLORS.error : (isFocused ? COLORS.primaryElectric : COLORS.textLilacSub)}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="name@company.com"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (emailError) setEmailError('');
                    }}
                    onFocus={() => {
                      setIsFocused(true);
                      if (emailError) setEmailError('');
                    }}
                    onBlur={() => setIsFocused(false)}
                  />
                </View>
                {!!emailError && (
                  <View style={styles.inlineErrorRow}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                    <Text style={styles.inlineErrorText}>{emailError}</Text>
                  </View>
                )}
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity
                onPress={handleSendLink}
                activeOpacity={0.85}
                disabled={isLoading}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#8419F7', '#6F12E0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send reset link</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Back to Login Link */}
          <TouchableOpacity
            onPress={onBackToLogin}
            style={styles.backToLoginWrapper}
            activeOpacity={0.7}
          >
            <Text style={styles.backToLoginText}>Back to login</Text>
          </TouchableOpacity>
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderCard,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  iconContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 28, 240, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 26,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: COLORS.borderInput,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#201642',
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  inlineErrorText: {
    color: COLORS.error,
    fontSize: 11.5,
    fontWeight: '500',
    marginLeft: 4,
  },
  iconBadgeSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  successBlock: {
    width: '100%',
  },
  emailHighlight: {
    color: COLORS.textLilac,
    fontWeight: '700',
  },
  resendText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textLilac,
    textAlign: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
  },
  buttonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  backToLoginWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    paddingVertical: 10,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLilac,
  },
});
