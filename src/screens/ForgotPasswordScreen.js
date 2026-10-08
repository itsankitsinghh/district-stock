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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ForgotPasswordScreen({ onBackToLogin, onCodeSent }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSendLink = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Reset Link Sent',
        `A verification code has been dispatched to ${email}.`,
        [
          {
            text: 'Proceed to Reset',
            onPress: () => {
              if (onCodeSent) onCodeSent(email);
            },
          },
        ]
      );
    }, 800);
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
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={38}
                color={COLORS.textLilac}
              />
            </View>
          </View>

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
              ]}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={22}
                color={isFocused ? COLORS.primaryElectric : COLORS.textLilacSub}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor={COLORS.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
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
