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
  const logoPulse = useRef(new Animated.Value(1)).current;
  const pinPulse = useRef(new Animated.Value(0)).current;
  const pinBob = useRef(new Animated.Value(0)).current;
  const textPulse = useRef(new Animated.Value(0.6)).current;

  // Track finished state to prevent multiple calls
  const hasFinishedRef = useRef(false);

  const finishFlow = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (onFinish) onFinish();
  };

  useEffect(() => {
    // 1. Screen fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    // 2. Subtle logo breathing neon pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.03,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0.98,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Location pins vertical float & ripple
    Animated.loop(
      Animated.sequence([
        Animated.timing(pinBob, {
          toValue: -5,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pinBob, {
          toValue: 5,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pinPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pinPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. "Setting things up..." text opacity breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(textPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(textPulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. High-tech smooth progress bar (loads smoothly over 2.8s)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: false,
    }).start(() => {
      setTimeout(finishFlow, 250);
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.64],
  });

  const pinScale = pinPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.8],
  });

  const pinOpacity = pinPulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.85, 0.4, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. Base Gradient Canvas */}
      <LinearGradient
        colors={['#060214', '#0A0322', '#060215']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Top Silky 3D Ribbon Artwork */}
      <Image
        source={require('../../assets/splash_top_ribbon_clean.png')}
        style={styles.topRibbonArtwork}
        resizeMode="cover"
      />

      {/* 3. Bottom 3D Ground Scene Artwork (Truck, Forklift, Stage, Floor Reflections) */}
      <View style={styles.groundSceneWrapper} pointerEvents="none">
        <Image
          source={require('../../assets/splash_ground_scene_clean.png')}
          style={styles.groundSceneArtwork}
          resizeMode="cover"
        />

        {/* Animated Holographic Waypoint Pins over Truck & Forklift */}
        <Animated.View
          style={[
            styles.waypointPin,
            styles.pinTruck,
            { transform: [{ translateY: pinBob }] },
          ]}
        >
          <Animated.View
            style={[
              styles.pinHalo,
              { transform: [{ scale: pinScale }], opacity: pinOpacity },
            ]}
          />
          <MaterialCommunityIcons name="map-marker" size={24} color="#C084FC" />
        </Animated.View>

        <Animated.View
          style={[
            styles.waypointPin,
            styles.pinForklift,
            { transform: [{ translateY: pinBob }] },
          ]}
        >
          <Animated.View
            style={[
              styles.pinHalo,
              { transform: [{ scale: pinScale }], opacity: pinOpacity },
            ]}
          />
          <MaterialCommunityIcons name="map-marker" size={20} color="#E879F9" />
        </Animated.View>
      </View>

      {/* 4. Foreground Content */}
      <Animated.View style={[styles.foregroundContainer, { opacity: fadeAnim }]}>
        {/* Top Control Bar: Skip button at top right */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
          <TouchableOpacity
            onPress={finishFlow}
            style={styles.skipButton}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 18, right: 18 }}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="chevron-forward" size={13} color="rgba(216, 180, 254, 0.9)" />
          </TouchableOpacity>
        </View>

        {/* Brand Header: Glowing Neon Wordmark & Subtitle */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ scale: logoPulse }] },
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
                    size={24}
                    color="#C084FC"
                  />
                </View>
                <Text style={styles.featureItemTitle}>{item.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spacer to allow 3D Ground Scene to shine in middle-lower screen */}
        <View style={styles.sceneSpacer} />

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
    backgroundColor: '#060214',
  },
  topRibbonArtwork: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: width,
    height: height * 0.26,
  },
  groundSceneWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: width,
    height: height * 0.44,
  },
  groundSceneArtwork: {
    width: '100%',
    height: '100%',
  },
  waypointPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTruck: {
    left: width * 0.28,
    top: '24%',
  },
  pinForklift: {
    left: width * 0.49,
    top: '36%',
  },
  pinHalo: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192, 132, 252, 0.45)',
  },
  foregroundContainer: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    zIndex: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(216, 180, 254, 0.9)',
    marginRight: 2,
    letterSpacing: 0.3,
  },
  header: {
    alignItems: 'center',
    marginTop: -4,
    paddingHorizontal: 20,
  },
  neonWordmark: {
    width: Math.min(width * 0.46, 185),
    height: Math.min(height * 0.11, 95),
    marginBottom: 4,
  },
  brandSubtitleRow1: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C084FC',
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  brandSubtitleRow2: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C084FC',
    letterSpacing: 2.4,
    textAlign: 'center',
    marginTop: 2,
  },
  featuresSection: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 8,
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
    marginBottom: 16,
  },
  featureIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(38, 12, 72, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    marginBottom: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  featureItemTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 15,
  },
  sceneSpacer: {
    flex: 1,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarTrack: {
    width: width * 0.64,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
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
    color: 'rgba(216, 180, 254, 0.82)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
