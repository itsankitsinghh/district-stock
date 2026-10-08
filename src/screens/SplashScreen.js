import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emblemFloat = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // 1. Screen fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // 2. Emblem floating hover animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(emblemFloat, {
          toValue: -7,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(emblemFloat, {
          toValue: 7,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Radar Energy Rings loop
    const createRingLoop = (anim, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createRingLoop(ring1, 0).start();
    createRingLoop(ring2, 1200).start();

    // 4. Live telemetry beacon pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Smooth progress bar (auto transitions to login over 2.7s)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) {
        setTimeout(onFinish, 200);
      }
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.52],
  });

  // Radar Ring 1 interpolations
  const ring1Scale = ring1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 2.1],
  });
  const ring1Opacity = ring1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.75, 0.6, 0.15, 0],
  });

  // Radar Ring 2 interpolations
  const ring2Scale = ring2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 2.1],
  });
  const ring2Opacity = ring2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.75, 0.6, 0.15, 0],
  });

  return (
    <LinearGradient
      colors={['#070412', '#14082B', '#090417']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Top subtle spacing */}
          <View style={styles.topSpacer} />

          {/* Center Hero: 3D District Emblem + Radar Rings + Telemetry Pill */}
          <View style={styles.centerHeroContainer}>
            <View style={styles.emblemStage}>
              {/* Expanding Concentric Neon Radar Waves */}
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [{ scale: ring1Scale }],
                    opacity: ring1Opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [{ scale: ring2Scale }],
                    opacity: ring2Opacity,
                  },
                ]}
              />

              {/* Radiant Ambient Core Glow */}
              <View style={styles.ambientCoreGlow} />

              {/* 3D District Emblem Badge with Hover */}
              <Animated.View
                style={[
                  styles.emblemWrapper,
                  { transform: [{ translateY: emblemFloat }] },
                ]}
              >
                <Image
                  source={require('../../assets/district_logo.png')}
                  style={styles.emblemImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            {/* Live Telemetry Pill Badge */}
            <View style={styles.telemetryPill}>
              <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
              <Text style={styles.telemetryText}>DISTRICT LOGISTICS OS</Text>
            </View>
          </View>

          {/* Footer Section: Punchy Customer-Impression Taglines + Smooth Bar */}
          <View style={styles.footer}>
            <Text style={styles.taglineMain}>Every asset tracked.</Text>
            <Text style={styles.taglineSub}>Every event seamless.</Text>

            {/* Glowing Smooth Progress Bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={['#7928CA', '#B829F5', '#00DFD8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                />
              </Animated.View>
            </View>

            <Text style={styles.loadingStatusText}>Connecting secure logistics hub...</Text>
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
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 24,
    alignItems: 'center',
  },
  topSpacer: {
    height: 10,
  },
  centerHeroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emblemStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  ambientCoreGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(138, 43, 226, 0.28)',
  },
  emblemWrapper: {
    width: 122,
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
    elevation: 20,
  },
  emblemImage: {
    width: 122,
    height: 122,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(26, 11, 59, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.35)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E9D5FF',
    letterSpacing: 1.2,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  taglineMain: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 25,
    fontWeight: '900',
    color: '#C084FC',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  progressBarTrack: {
    width: width * 0.52,
    height: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 6,
  },
  loadingStatusText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(192, 132, 252, 0.7)',
    letterSpacing: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
});
