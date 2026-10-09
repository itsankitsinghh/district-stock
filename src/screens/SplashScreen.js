import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

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
  const [currentStep, setCurrentStep] = useState(1); // 1 = Entry Splash, 2 = Features, 3 = Loading

  // Fade & transition animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const pedestalFloat = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Track finished state to prevent multiple triggers
  const hasFinishedRef = useRef(false);

  const finishFlow = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (onFinish) onFinish();
  };

  useEffect(() => {
    // 1. Initial screen fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // 2. Step 1 3D Hero hover loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Step 3 Pedestal box hover loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pedestalFloat, {
          toValue: -5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pedestalFloat, {
          toValue: 5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Orchestrate 3-step automatic sequence:
    // Step 1: 0s -> 2.4s
    const timer1 = setTimeout(() => {
      goToStep(2);
    }, 2400);

    // Step 2: 2.4s -> 4.8s
    const timer2 = setTimeout(() => {
      goToStep(3);
    }, 4800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const goToStep = (targetStep) => {
    if (hasFinishedRef.current) return;

    Animated.timing(stepOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(targetStep);

      // If entering Step 3 (Loading)
      if (targetStep === 3) {
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          setTimeout(finishFlow, 200);
        });
      }

      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.54],
  });

  return (
    <LinearGradient
      colors={['#080415', '#120826', '#090417']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ambient background curves */}
      <View style={styles.ambientWaveBackground} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(123, 28, 240, 0.18)', 'rgba(76, 29, 149, 0.34)']}
          style={styles.bottomWaveGradient}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Top Bar with Skip Button for Step 2 */}
          <View style={styles.topControlBar}>
            {currentStep === 2 ? (
              <TouchableOpacity
                onPress={finishFlow}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(192, 132, 252, 0.75)" />
              </TouchableOpacity>
            ) : (
              <View style={styles.skipPlaceholder} />
            )}
          </View>

          {/* Unified Brand Header (Exact Neon 2-Line Wordmark) */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/district_stock_neon_wordmark.png')}
              style={styles.neonWordmark}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitleRow1}>EVENT LOGISTICS &</Text>
            <Text style={styles.brandSubtitleRow2}>STOCK MOVEMENT</Text>
          </View>

          {/* STEP 01: Entry Splash - Immersive 3D Visual */}
          {currentStep === 1 && (
            <Animated.View style={[styles.stepContainer, { opacity: stepOpacity }]}>
              <Animated.View
                style={[
                  styles.heroGraphicBox,
                  { transform: [{ translateY: heroFloat }] },
                ]}
              >
                <Image
                  source={require('../../assets/event_logistics_hero_hires.png')}
                  style={styles.heroArtwork}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* 4 Dots Pagination: Dot 1 active */}
              <View style={styles.paginationFooter}>
                <View style={styles.dotsRow}>
                  <View style={styles.activeDot} />
                  <View style={styles.inactiveDot} />
                  <View style={styles.inactiveDot} />
                  <View style={styles.inactiveDot} />
                </View>
              </View>
            </Animated.View>
          )}

          {/* STEP 02: Features - 6 Capabilities Grid */}
          {currentStep === 2 && (
            <Animated.View style={[styles.stepContainer, { opacity: stepOpacity }]}>
              <View style={styles.featuresGrid}>
                {FEATURES.map((item) => (
                  <View key={item.id} style={styles.featureItem}>
                    <View style={styles.featureIconCircle}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={25}
                        color="#C084FC"
                      />
                    </View>
                    <Text style={styles.featureItemTitle}>{item.title}</Text>
                  </View>
                ))}
              </View>

              {/* 4 Dots Pagination: Dot 2 active */}
              <View style={styles.paginationFooter}>
                <View style={styles.dotsRow}>
                  <View style={styles.inactiveDot} />
                  <View style={styles.activeDot} />
                  <View style={styles.inactiveDot} />
                  <View style={styles.inactiveDot} />
                </View>
              </View>
            </Animated.View>
          )}

          {/* STEP 03: Loading - Holographic Pedestal & Progress */}
          {currentStep === 3 && (
            <Animated.View style={[styles.stepContainer, { opacity: stepOpacity }]}>
              <Animated.View
                style={[
                  styles.pedestalImageBox,
                  { transform: [{ translateY: pedestalFloat }] },
                ]}
              >
                <Image
                  source={require('../../assets/neon_pedestal_box.png')}
                  style={styles.pedestalImage}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Smooth Progress Bar & Setting things up... */}
              <View style={styles.loadingFooter}>
                <View style={styles.progressBarTrack}>
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                    <LinearGradient
                      colors={['#8A2BE2', '#C084FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressGradient}
                    />
                  </Animated.View>
                </View>
                <Text style={styles.settingText}>Setting things up...</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ambientWaveBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.36,
  },
  bottomWaveGradient: {
    flex: 1,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    transform: [{ scaleX: 1.5 }],
  },
  topControlBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: 24,
    paddingRight: 6,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.75)',
    marginRight: 2,
  },
  skipPlaceholder: {
    height: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 8,
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
  stepContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  heroGraphicBox: {
    width: width * 0.9,
    height: height * 0.38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtwork: {
    width: '100%',
    height: '100%',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    marginTop: 18,
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.22)',
    marginBottom: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItemTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 14.5,
  },
  pedestalImageBox: {
    width: width * 0.72,
    height: height * 0.36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  pedestalImage: {
    width: '100%',
    height: '100%',
  },
  paginationFooter: {
    alignItems: 'center',
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  inactiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 5,
  },
  loadingFooter: {
    alignItems: 'center',
    marginBottom: 22,
    width: '100%',
  },
  progressBarTrack: {
    width: width * 0.54,
    height: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 6,
  },
  settingText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.75)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
