import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  {
    id: 'inventory',
    title: 'Track\nInventory',
    icon: 'package-variant-closed',
  },
  {
    id: 'movements',
    title: 'Manage\nMovements',
    icon: 'truck-fast-outline',
  },
  {
    id: 'requests',
    title: 'Fulfill\nRequests',
    icon: 'clipboard-check-outline',
  },
  {
    id: 'visibility',
    title: 'Real-time\nVisibility',
    icon: 'chart-timeline-variant',
  },
  {
    id: 'support',
    title: 'Multi-event\nSupport',
    icon: 'calendar-month-outline',
  },
  {
    id: 'operations',
    title: 'Smarter\nOperations',
    icon: 'cog-outline',
  },
];

export default function SplashScreen({ onFinish }) {
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const textPulse = useRef(new Animated.Value(0.55)).current;
  const ambientGlowPulse = useRef(new Animated.Value(0.4)).current;

  // Track finished state to prevent multiple triggers
  const hasFinishedRef = useRef(false);

  const finishFlow = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Smooth exit fade
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (onFinish) onFinish();
    });
  };

  useEffect(() => {
    // 1. Entrance fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // 2. Subtle logo breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.03,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.98,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Smooth floating hover animation for the 3D Hero Artwork
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: -6,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 6,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Ambient background glow breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambientGlowPulse, {
          toValue: 0.75,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ambientGlowPulse, {
          toValue: 0.35,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. "Setting things up..." text opacity breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(textPulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(textPulse, {
          toValue: 0.45,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 6. Smooth progress bar loading over 2.8s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setTimeout(finishFlow, 180);
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.64],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. Deep Midnight Cyberpunk Canvas */}
      <LinearGradient
        colors={['#060216', '#0E0426', '#050114']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Soft Ambient Radial Light Halo */}
      <Animated.View
        style={[
          styles.ambientTopGlow,
          { opacity: ambientGlowPulse },
        ]}
        pointerEvents="none"
      />

      {/* 3. Main Screen Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Top Control Row: Skip Button with glass capsule */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
          <TouchableOpacity
            onPress={finishFlow}
            style={styles.skipButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="chevron-forward" size={13} color="#C084FC" />
          </TouchableOpacity>
        </View>

        {/* Brand Header: 3D Neon Wordmark & Subtitle */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={require('../../assets/district_stock_neon_wordmark_hires.png')}
            style={styles.neonWordmark}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitleRow1}>EVENT LOGISTICS &</Text>
          <Text style={styles.brandSubtitleRow2}>STOCK MOVEMENT</Text>
        </Animated.View>

        {/* Middle: 6 Circular Feature Badges (2x3 Grid) */}
        <View style={styles.featuresSection}>
          <View style={styles.featuresGrid}>
            {FEATURES.map((item) => (
              <View key={item.id} style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color="#C084FC"
                  />
                </View>
                <Text style={styles.featureItemTitle}>{item.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Lower Section: 3D Event Logistics Hero Artwork (Stage, Trucks, Forklift, Grid) */}
        <Animated.View
          style={[
            styles.heroContainer,
            { transform: [{ translateY: heroFloat }] },
          ]}
        >
          <Image
            source={require('../../assets/event_logistics_hero_hires.png')}
            style={styles.heroArtwork}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Footer: Illuminated Progress Bar & Status Text */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#7C3AED', '#C084FC', '#F472B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
          <Animated.Text style={[styles.statusText, { opacity: textPulse }]}>
            Setting things up...
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060216',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -40,
    left: width * 0.15,
    width: width * 0.7,
    height: 180,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#E9D5FF',
    marginRight: 3,
    letterSpacing: 0.3,
  },
  header: {
    alignItems: 'center',
    marginTop: -2,
  },
  neonWordmark: {
    width: Math.min(width * 0.44, 168),
    height: Math.min(height * 0.1, 84),
    marginBottom: 4,
  },
  brandSubtitleRow1: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C084FC',
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  brandSubtitleRow2: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C084FC',
    letterSpacing: 2.4,
    textAlign: 'center',
    marginTop: 2,
  },
  featuresSection: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    width: '31%',
    alignItems: 'center',
    marginVertical: 6,
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(38, 14, 76, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(192, 132, 252, 0.32)',
    marginBottom: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItemTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 14,
  },
  heroContainer: {
    width: width,
    flex: 1,
    maxHeight: Math.min(height * 0.45, 380),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroArtwork: {
    width: '100%',
    height: '100%',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarTrack: {
    width: width * 0.64,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(216, 180, 254, 0.85)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
