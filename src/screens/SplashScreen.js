import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const centralFloat = useRef(new Animated.Value(0)).current;
  const satelliteFloat = useRef(new Animated.Value(0)).current;
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

    // 2. Central Cargo Hub floating hover animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(centralFloat, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(centralFloat, {
          toValue: 6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Counter-phase floating for satellite pods
    Animated.loop(
      Animated.sequence([
        Animated.timing(satelliteFloat, {
          toValue: 5,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(satelliteFloat, {
          toValue: -5,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Expanding Radar Waves loop
    const createRingLoop = (anim, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2600,
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
    createRingLoop(ring2, 1300).start();

    // 5. Live telemetry beacon pulsing
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

    // 6. Smooth progress bar (transitions over 2.7s)
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
    outputRange: [0.85, 2.2],
  });
  const ring1Opacity = ring1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.7, 0.55, 0.12, 0],
  });

  // Radar Ring 2 interpolations
  const ring2Scale = ring2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 2.2],
  });
  const ring2Opacity = ring2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.7, 0.55, 0.12, 0],
  });

  return (
    <LinearGradient
      colors={['#070412', '#14082B', '#090417']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Atmospheric Stage Spotlight Beams */}
      <View style={styles.spotlightContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(138, 43, 226, 0.22)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.spotlightLeft}
        />
        <LinearGradient
          colors={['rgba(56, 189, 248, 0.18)', 'transparent']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.spotlightRight}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.topSpacer} />

          {/* Center Hero: Unified Event & Logistics Command Hub */}
          <View style={styles.centerHeroContainer}>
            <View style={styles.hubStage}>
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

              {/* Connecting Cyber Route Line */}
              <View style={styles.routeConnectorLine}>
                <View style={styles.routeDottedLine} />
              </View>

              {/* Left Satellite: Live Event Stage Pod */}
              <Animated.View
                style={[
                  styles.satellitePodLeft,
                  { transform: [{ translateY: satelliteFloat }] },
                ]}
              >
                <LinearGradient
                  colors={['rgba(192, 132, 252, 0.35)', 'rgba(88, 28, 135, 0.75)']}
                  style={styles.satelliteGlass}
                >
                  <MaterialCommunityIcons
                    name="stadium-variant"
                    size={28}
                    color="#E9D5FF"
                  />
                </LinearGradient>
                <View style={styles.podTag}>
                  <Text style={styles.podTagText}>EVENT</Text>
                </View>
              </Animated.View>

              {/* Center Main: 3D Smart Cargo Logistics Hub */}
              <Animated.View
                style={[
                  styles.mainCargoHub,
                  { transform: [{ translateY: centralFloat }] },
                ]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#4C1D95', '#1E1035']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cargoHubGradient}
                >
                  {/* Glowing 3D Package Crate */}
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={52}
                    color="#FFFFFF"
                  />
                  {/* Pulse tracking ring */}
                  <View style={styles.innerPulseRing} />
                </LinearGradient>
              </Animated.View>

              {/* Right Satellite: Fleet Logistics Pod */}
              <Animated.View
                style={[
                  styles.satellitePodRight,
                  { transform: [{ translateY: satelliteFloat }] },
                ]}
              >
                <LinearGradient
                  colors={['rgba(56, 189, 248, 0.35)', 'rgba(14, 116, 144, 0.75)']}
                  style={styles.satelliteGlass}
                >
                  <MaterialCommunityIcons
                    name="truck-fast"
                    size={28}
                    color="#BAE6FD"
                  />
                </LinearGradient>
                <View style={styles.podTagBlue}>
                  <Text style={styles.podTagTextBlue}>FLEET</Text>
                </View>
              </Animated.View>
            </View>

            {/* Live Operational Telemetry Pill */}
            <View style={styles.telemetryPill}>
              <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
              <Text style={styles.telemetryText}>EVENT INVENTORY & LIVE DISPATCH</Text>
            </View>
          </View>

          {/* Footer Section: Punchy Customer Taglines + Smooth Progress */}
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
  spotlightContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightLeft: {
    position: 'absolute',
    left: -40,
    bottom: 0,
    width: width * 0.7,
    height: '75%',
    transform: [{ rotate: '18deg' }],
  },
  spotlightRight: {
    position: 'absolute',
    right: -40,
    bottom: 0,
    width: width * 0.7,
    height: '75%',
    transform: [{ rotate: '-18deg' }],
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
  hubStage: {
    width: 280,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  ambientCoreGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(138, 43, 226, 0.28)',
  },
  routeConnectorLine: {
    position: 'absolute',
    width: 220,
    height: 2,
    justifyContent: 'center',
  },
  routeDottedLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: 'rgba(192, 132, 252, 0.35)',
    borderRadius: 1,
  },
  mainCargoHub: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 20,
    zIndex: 10,
  },
  cargoHubGradient: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(233, 213, 255, 0.45)',
  },
  innerPulseRing: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  satellitePodLeft: {
    position: 'absolute',
    left: 8,
    alignItems: 'center',
    zIndex: 5,
  },
  satellitePodRight: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    zIndex: 5,
  },
  satelliteGlass: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(192, 132, 252, 0.5)',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  podTag: {
    marginTop: 6,
    backgroundColor: 'rgba(123, 28, 240, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  podTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E9D5FF',
    letterSpacing: 0.8,
  },
  podTagBlue: {
    marginTop: 6,
    backgroundColor: 'rgba(14, 116, 144, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  podTagTextBlue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.8,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
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
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E9D5FF',
    letterSpacing: 1.1,
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
