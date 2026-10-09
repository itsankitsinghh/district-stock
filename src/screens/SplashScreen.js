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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [currentStep, setCurrentStep] = useState(1); // 1 = 3D Hero Stage, 2 = Features Grid Stage

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stage1Opacity = useRef(new Animated.Value(1)).current;
  const stage2Opacity = useRef(new Animated.Value(0)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial screen fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // 2. Subtle 3D Hero hover
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: -5,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 5,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Stage 1 -> Stage 2 transition after 2.4 seconds
    const stageTransitionTimer = setTimeout(() => {
      Animated.timing(stage1Opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(2);
        Animated.timing(stage2Opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();

        // Start progress bar animation in Stage 2
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 250);
        });
      });
    }, 2400);

    return () => clearTimeout(stageTransitionTimer);
  }, []);

  // Quick skip on tap
  const handleSkip = () => {
    if (onFinish) onFinish();
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
          colors={['transparent', 'rgba(123, 28, 240, 0.18)', 'rgba(76, 29, 149, 0.32)']}
          style={styles.bottomWaveGradient}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleSkip}
          style={styles.touchableContainer}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header: Consistent 3D Logo + District Stock Typography */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/district_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandTitle}>DISTRICT STOCK</Text>
              <Text style={styles.brandSubtitle}>Event Logistics & Stock Movement</Text>
            </View>

            {/* STAGE 1: 3D Event Logistics Artwork Scene */}
            {currentStep === 1 && (
              <Animated.View style={[styles.stageBody, { opacity: stage1Opacity }]}>
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

                {/* Footer 1: Pagination Dots + Powering Seamless Events */}
                <View style={styles.stage1Footer}>
                  <View style={styles.paginationRow}>
                    <View style={styles.activePillDot} />
                    <View style={styles.inactiveDot} />
                    <View style={styles.inactiveDot} />
                  </View>
                  <Text style={styles.stage1Tagline}>Powering Seamless Events</Text>
                </View>
              </Animated.View>
            )}

            {/* STAGE 2: 6 Circular Feature Modules + Setting things up... */}
            {currentStep === 2 && (
              <Animated.View style={[styles.stageBody, { opacity: stage2Opacity }]}>
                {/* 2x3 Grid of Features */}
                <View style={styles.featuresGrid}>
                  {FEATURES.map((item) => (
                    <View key={item.id} style={styles.featureItem}>
                      <View style={styles.featureIconCircle}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={26}
                          color="#C084FC"
                        />
                      </View>
                      <Text style={styles.featureItemTitle}>{item.title}</Text>
                    </View>
                  ))}
                </View>

                {/* Footer 2: Progress Bar + Setting things up... */}
                <View style={styles.stage2Footer}>
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
                  <Text style={styles.stage2SettingText}>Setting things up...</Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </TouchableOpacity>
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
  touchableContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ambientWaveBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.35,
  },
  bottomWaveGradient: {
    flex: 1,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    transform: [{ scaleX: 1.5 }],
  },
  header: {
    alignItems: 'center',
    marginTop: 18,
  },
  logoWrapper: {
    marginBottom: 12,
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  logoImage: {
    width: 82,
    height: 82,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLilac,
    letterSpacing: 0.4,
    marginTop: 5,
    textAlign: 'center',
  },
  stageBody: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
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
  stage1Footer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  activePillDot: {
    width: 22,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginRight: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveDot: {
    width: 6,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginRight: 6,
  },
  stage1Tagline: {
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(233, 213, 255, 0.8)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 20,
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 26,
  },
  featureIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
    marginBottom: 9,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  stage2Footer: {
    alignItems: 'center',
    marginBottom: 20,
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
  stage2SettingText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.75)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
