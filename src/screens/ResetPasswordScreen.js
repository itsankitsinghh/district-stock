import React, { useState, useRef } from 'react';
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

export default function ResetPasswordScreen({ email, onBack, onResetSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'new' | 'confirm' | null
  const [isLoading, setIsLoading] = useState(false);

  // Inline Validation States
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const scrollViewRef = useRef(null);

  const handleResetPassword = () => {
    let hasError = false;

    if (!newPassword.trim()) {
      setNewPasswordError('Please enter a new password');
      hasError = true;
    } else if (newPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters long');
      hasError = true;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your new password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasError) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 700);
  };

  const handleFocusConfirm = () => {
    setFocusedInput('confirm');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const isLengthValid = newPassword.length >= 8;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexOne}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Shield Badge */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBadge, isSuccess && styles.iconBadgeSuccess]}>
              <MaterialCommunityIcons
                name={isSuccess ? "check-decagram" : "shield-key-outline"}
                size={38}
                color={isSuccess ? COLORS.onlineGreen : COLORS.textLilac}
              />
            </View>
          </View>

          {isSuccess ? (
            /* In-Card Success State */
            <View style={styles.successBlock}>
              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.subtitle}>
                Your account password has been securely reset. You can now login using your new credentials.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (onResetSuccess) onResetSuccess();
                }}
                activeOpacity={0.85}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#8419F7', '#6F12E0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Login Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* Reset Password Form */
            <>
              {/* Heading */}
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Create a new password for your account.
              </Text>

              {/* New Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>New password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'new' && styles.inputWrapperFocused,
                    !!newPasswordError && styles.inputWrapperError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={22}
                    color={newPasswordError ? COLORS.error : (focusedInput === 'new' ? COLORS.primaryElectric : COLORS.textLilacSub)}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor={COLORS.textDim}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (newPasswordError) setNewPasswordError('');
                    }}
                    onFocus={() => {
                      setFocusedInput('new');
                      if (newPasswordError) setNewPasswordError('');
                    }}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.showButton}
                  >
                    <Text style={styles.showButtonText}>
                      {showNewPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Inline Error Message */}
                {!!newPasswordError && (
                  <View style={styles.inlineErrorRow}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                    <Text style={styles.inlineErrorText}>{newPasswordError}</Text>
                  </View>
                )}

                {/* Helper status */}
                {!newPasswordError && newPassword.length > 0 && (
                  <View style={styles.helperRow}>
                    <Ionicons
                      name={isLengthValid ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={isLengthValid ? COLORS.onlineGreen : COLORS.error}
                    />
                    <Text
                      style={[
                        styles.helperText,
                        { color: isLengthValid ? COLORS.onlineGreen : COLORS.textMuted },
                      ]}
                    >
                      {isLengthValid ? '8+ characters satisfied' : 'Minimum 8 characters needed'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Confirm password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'confirm' && styles.inputWrapperFocused,
                    !!confirmPasswordError && styles.inputWrapperError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-check-outline"
                    size={22}
                    color={confirmPasswordError ? COLORS.error : (focusedInput === 'confirm' ? COLORS.primaryElectric : COLORS.textLilacSub)}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat the password"
                    placeholderTextColor={COLORS.textDim}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    onFocus={() => {
                      handleFocusConfirm();
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.showButton}
                  >
                    <Text style={styles.showButtonText}>
                      {showConfirmPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Inline Error Message */}
                {!!confirmPasswordError && (
                  <View style={styles.inlineErrorRow}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                    <Text style={styles.inlineErrorText}>{confirmPasswordError}</Text>
                  </View>
                )}

                {/* Match helper */}
                {!confirmPasswordError && confirmPassword.length > 0 && (
                  <View style={styles.helperRow}>
                    <Ionicons
                      name={isMatch ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={isMatch ? COLORS.onlineGreen : COLORS.error}
                    />
                    <Text
                      style={[
                        styles.helperText,
                        { color: isMatch ? COLORS.onlineGreen : COLORS.error },
                      ]}
                    >
                      {isMatch ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
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
                    <Text style={styles.buttonText}>Reset password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
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
    paddingTop: 16,
    paddingBottom: 36,
  },
  iconContainer: {
    alignItems: 'flex-start',
    marginBottom: 18,
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
    marginBottom: 28,
  },
  inputSection: {
    marginBottom: 20,
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
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  buttonWrapper: {
    marginTop: 12,
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
});
