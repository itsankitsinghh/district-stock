import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function LoginScreen({ onLoginSuccess, onReplaySplash }) {
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'empId'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedHub, setSelectedHub] = useState('Central Warehouse - Hub 1');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const hubs = [
    'Central Warehouse - Hub 1',
    'Zomato Live Arena - F&B North',
    'Concert Main Stage - Bar 2',
    'Merchandise Pavilion',
  ];

  const handleContinue = () => {
    if (loginMethod === 'phone' && !phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter your registered mobile number.');
      return;
    }
    if (loginMethod === 'empId' && !employeeId.trim()) {
      Alert.alert('Required', 'Please enter your District Employee ID.');
      return;
    }

    if (!isOtpSent) {
      setIsOtpSent(true);
      Alert.alert('OTP Sent', 'A 4-digit verification code has been sent to your registered contact.');
    } else {
      if (otp.length < 4) {
        Alert.alert('Invalid OTP', 'Please enter the 4-digit verification code.');
        return;
      }
      if (onLoginSuccess) {
        onLoginSuccess({
          user: loginMethod === 'phone' ? phoneNumber : employeeId,
          hub: selectedHub,
        });
      }
    }
  };

  const handleQuickDemoFill = () => {
    setLoginMethod('phone');
    setPhoneNumber('9876543210');
    setIsOtpSent(true);
    setOtp('1234');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Brand Banner Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.topNavRow}>
          {onReplaySplash && (
            <TouchableOpacity onPress={onReplaySplash} style={styles.replayButton}>
              <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.replayText}>Splash View</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroContent}>
          <Image
            source={require('../../assets/district_logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>district stock</Text>
            <Text style={styles.heroSubtitle}>Ground Operations & Inventory Portal</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeGreeting}>Welcome Crew 👋</Text>
            <Text style={styles.welcomeDesc}>
              Log in to scan inventory, track live venue stock, and manage logistics transfers.
            </Text>

            {/* Login Mode Toggle Tabs */}
            <View style={styles.toggleTrack}>
              <TouchableOpacity
                onPress={() => {
                  setLoginMethod('phone');
                  setIsOtpSent(false);
                }}
                style={[
                  styles.toggleTab,
                  loginMethod === 'phone' && styles.toggleTabActive,
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={16}
                  color={loginMethod === 'phone' ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.toggleTabText,
                    loginMethod === 'phone' && styles.toggleTabTextActive,
                  ]}
                >
                  Mobile Number
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setLoginMethod('empId');
                  setIsOtpSent(false);
                }}
                style={[
                  styles.toggleTab,
                  loginMethod === 'empId' && styles.toggleTabActive,
                ]}
              >
                <Ionicons
                  name="badge-account-outline"
                  size={16}
                  color={loginMethod === 'empId' ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.toggleTabText,
                    loginMethod === 'empId' && styles.toggleTabTextActive,
                  ]}
                >
                  Staff ID
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            {loginMethod === 'phone' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registered Mobile</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>District Employee Code</Text>
                <View style={styles.textInputRow}>
                  <Ionicons name="card-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. DST-2024-89"
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="characters"
                    value={employeeId}
                    onChangeText={setEmployeeId}
                  />
                </View>
              </View>
            )}

            {/* OTP Field if sent */}
            {isOtpSent && (
              <View style={styles.inputGroup}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.inputLabel}>Enter 4-Digit Verification OTP</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Demo OTP', 'Use 1234 for demo testing.')}>
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.textInputRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.accentGreen} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>
              </View>
            )}

            {/* Event / Assigned Station Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assign Station / Location Hub</Text>
              <View style={styles.hubChipsContainer}>
                {hubs.map((hub) => {
                  const isSelected = selectedHub === hub;
                  return (
                    <TouchableOpacity
                      key={hub}
                      onPress={() => setSelectedHub(hub)}
                      style={[styles.hubChip, isSelected && styles.hubChipSelected]}
                    >
                      <Ionicons
                        name="location"
                        size={12}
                        color={isSelected ? COLORS.white : COLORS.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.hubChipText,
                          isSelected && styles.hubChipTextSelected,
                        ]}
                      >
                        {hub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.88}
              style={styles.primaryButtonWrapper}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {isOtpSent ? 'Verify & Access Hub' : 'Send Verification OTP'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick Demo Pre-fill for Testing */}
            <TouchableOpacity
              onPress={handleQuickDemoFill}
              style={styles.quickFillButton}
            >
              <Ionicons name="flash" size={14} color={COLORS.accentOrange} />
              <Text style={styles.quickFillText}>Quick Demo Credentials</Text>
            </TouchableOpacity>
          </View>

          {/* Security Footer */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.textMuted} />
            <Text style={styles.footerNoteText}>
              Authorized personnel only · District by Zomato Logistics
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
    backgroundColor: COLORS.backgroundLight,
  },
  heroBanner: {
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 26,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  replayText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    padding: 22,
    shadowColor: '#5F17E3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 20,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#F0EFF8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  toggleTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F8',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  hubChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFD3FF',
  },
  hubChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  hubChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  hubChipTextSelected: {
    color: COLORS.white,
  },
  primaryButtonWrapper: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.2,
    marginRight: 8,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quickFillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C2410C',
    marginLeft: 6,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerNoteText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
});
