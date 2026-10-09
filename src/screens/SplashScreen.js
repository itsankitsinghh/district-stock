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

  // 3-Part Common Segmented Loading Animations
  const seg1Anim = useRef(new Animated.Value(0)).current;
  const seg2Anim = useRef(new Animated.Value(0)).current;
  const seg3Anim = useRef(new Animated.Value(0)).current;

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
      duration: 500,
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
          toValue: -6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pedestalFloat, {
          toValue: 6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // --- STEP 1 ANIMATION (0s to 2.4s) ---
    // Segment 1 fills from 0 to 1 over 2.3s
    Animated.timing(seg1Anim, {
      toValue: 1,
      duration: 2300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Transition to Step 2 at 2.4s
    const timerStep2 = setTimeout(() => {
      if (hasFinishedRef.current) return;

      Animated.timing(stepOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(2);
        Animated.timing(stepOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();

        // --- STEP 2 ANIMATION (2.4s to 4.8s) ---
        // Segment 2 fills from 0 to 1 over 2.3s
        Animated.timing(seg2Anim, {
          toValue: 1,
          duration: 2300,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();

        // Transition to Step 3 at 4.8s
        const timerStep3 = setTimeout(() => {
          if (hasFinishedRef.current) return;

          Animated.timing(stepOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            setCurrentStep(3);
            Animated.timing(stepOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }).start();

            // --- STEP 3 ANIMATION (4.8s to 7.0s) ---
            // Segment 3 fills from 0 to 1 over 2.1s
            Animated.timing(seg3Anim, {
              toValue: 1,
              duration: 2100,
              easing: Easing.linear,
              useNativeDriver: false,
            }).start(() => {
              setTimeout(finishFlow, 250);
            });
          });
        }, 2400);

        return () => clearTimeout(timerStep3);
      });
    }, 2400);

    return () => {
      clearTimeout(timerStep2);
    };
  }, []);

  // Calculate width for each of the 3 progress segments
  const segmentWidthTotal = (width - 48 - 16) / 3; // total available width split by 3 segments with 8px gaps

  const seg1Width = seg1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidthTotal],
  });

  const seg2Width = seg2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidthTotal],
  });

  const seg3Width = seg3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidthTotal],
  });

  // Dynamic status text for each step
  const getStatusText = () => {
    if (currentStep === 1) return 'Powering Seamless Events';
    if (currentStep === 2) return 'Preparing operational modules...';
    return 'Setting things up...';
  };

  return (
    <LinearGradient
      colors={['#070314', '#110626', '#060210']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ambient flowing waves background */}
      <View style={styles.ambientWaveBackground} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(123, 28, 240, 0.16)', 'rgba(88, 28, 135, 0.32)']}
          style={styles.bottomWaveGradient}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Top Bar with Skip Button */}
          <View style={styles.topControlBar}>
            <TouchableOpacity
              onPress={finishFlow}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
              <Ionicons name="chevron-forward" size={13} color="rgba(192, 132, 252, 0.75)" />
            </TouchableOpacity>
          </View>

          {/* High-Res Glowing Neon Wordmark Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/district_stock_neon_wordmark_hires.png')}
              style={styles.neonWordmark}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitleRow1}>EVENT LOGISTICS &</Text>
            <Text style={styles.brandSubtitleRow2}>STOCK MOVEMENT</Text>
          </View>

          {/* --- STEP 01: Entry Splash (High-Res 3D Event Logistics Artwork) --- */}
          {currentStep === 1 && (
            <Animated.View style={[styles.stepBody, { opacity: stepOpacity }]}>
              <Animated.View
                style={[
                  styles.heroGraphicContainer,
                  { transform: [{ translateY: heroFloat }] },
                ]}
              >
                <Image
                  source={require('../../assets/event_logistics_hero_hires.png')}
                  style={styles.heroArtwork}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>
          )}

          {/* --- STEP 02: Features (6 Key Capabilities Grid) --- */}
          {currentStep === 2 && (
            <Animated.View style={[styles.stepBody, { opacity: stepOpacity }]}>
              <View style={styles.featuresGrid}>
                {FEATURES.map((item) => (
                  <View key={item.id} style={styles.featureItem}>
                    <View style={styles.featureIconCircle}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={27}
                        color="#C084FC"
                      />
                    </View>
                    <Text style={styles.featureItemTitle}>{item.title}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* --- STEP 03: Loading (High-Res Holographic Cargo Pedestal) --- */}
          {currentStep === 3 && (
            <Animated.View style={[styles.stepBody, { opacity: stepOpacity }]}>
              <Animated.View
                style={[
                  styles.pedestalContainer,
                  { transform: [{ translateY: pedestalFloat }] },
                ]}
              >
                <Image
                  source={require('../../assets/neon_pedestal_box.png')}
                  style={styles.pedestalImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>
          )}

          {/* --- UNIFIED 3-PART COMMON LOADING ANIMATION FOOTER --- */}
          <View style={styles.commonFooter}>
            <View style={styles.segmentedLoadingContainer}>
              {/* Part 1 */}
              <View style={styles.segmentTrack}>
                <Animated.View style={[styles.segmentFill, { width: seg1Width }]}>
                  <LinearGradient
                    colors={['#8A2BE2', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.segmentGradient}
                  />
                </Animated.View>
              </View>

              {/* Part 2 */}
              <View style={styles.segmentTrack}>
                <Animated.View style={[styles.segmentFill, { width: seg2Width }]}>
                  <LinearGradient
                    colors={['#8A2BE2', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.segmentGradient}
                  />
                </Animated.View>
              </View>

              {/* Part 3 */}
              <View style={styles.segmentTrack}>
                <Animated.View style={[styles.segmentFill, { width: seg3Width }]}>
                  <LinearGradient
                    colors={['#8A2BE2', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.segmentGradient}
                  />
                </Animated.View>
              </View>
            </View>

            <Text style={styles.commonStatusText}>{getStatusText()}</Text>
          </View>
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
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 22,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ambientWaveBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.38,
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
    height: 22,
    paddingRight: 4,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.75)',
    marginRight: 2,
  },
  header: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  neonWordmark: {
    width: 148,
    height: 86,
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
  stepBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  heroGraphicContainer: {
    width: width * 0.94,
    height: height * 0.44,
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
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 26,
  },
  featureIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    marginBottom: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItemTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 15,
  },
  pedestalContainer: {
    width: width * 0.86,
    height: height * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalImage: {
    width: '100%',
    height: '100%',
  },
  commonFooter: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmentedLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  segmentTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 3.5,
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  segmentGradient: {
    flex: 1,
    borderRadius: 3,
  },
  commonStatusText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.8)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
