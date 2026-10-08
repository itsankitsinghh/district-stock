import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const truckTranslate = useRef(new Animated.Value(14)).current;
  const packageFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(truckTranslate, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating package loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(packageFloat, {
          toValue: -6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(packageFloat, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress bar animation (loads smoothly over 2.6s)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2600,
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) {
        setTimeout(onFinish, 200);
      }
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.48],
  });

  return (
    <LinearGradient
      colors={['#0B0719', '#1C0D3D', '#080514']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header Brand Section */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlowRing}>
                <Image
                  source={require('../../assets/district_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.brandTitle}>DISTRICT STOCK</Text>
            <Text style={styles.headerSubtitle}>Event Logistics & Stock Movement</Text>
          </View>

          {/* Center Graphic: Neon Outline Cargo Truck & Package */}
          <Animated.View
            style={[
              styles.centerGraphicContainer,
              { transform: [{ translateY: truckTranslate }] },
            ]}
          >
            <View style={styles.truckIllustrationBox}>
              {/* Floating Cargo Package */}
              <Animated.View
                style={[
                  styles.floatingPackage,
                  { transform: [{ translateY: packageFloat }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={30}
                  color={COLORS.textLilac}
                />
              </Animated.View>

              {/* Outline Logistics Truck */}
              <View style={styles.truckWrapper}>
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={108}
                  color={COLORS.white}
                />
              </View>

              {/* Glowing Road Dotted Line */}
              <View style={styles.roadLineContainer}>
                <View style={styles.roadLine} />
              </View>
            </View>
          </Animated.View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.taglineMain}>Better events.</Text>
            <Text style={styles.taglineSub}>Smarter logistics.</Text>

            {/* Glowing Progress Bar */}
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
    paddingVertical: 36,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 36,
  },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  logoGlowRing: {
    padding: 3,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.45)',
    backgroundColor: 'rgba(35, 15, 75, 0.5)',
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLilac,
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: 'center',
  },
  centerGraphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  truckIllustrationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 180,
    position: 'relative',
  },
  floatingPackage: {
    position: 'absolute',
    top: 10,
    right: 44,
    backgroundColor: 'rgba(123, 28, 240, 0.25)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(192, 132, 252, 0.5)',
  },
  truckWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadLineContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  roadLine: {
    width: 175,
    height: 2.5,
    backgroundColor: 'rgba(192, 132, 252, 0.35)',
    borderRadius: 2,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  taglineMain: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 28,
  },
  progressBarTrack: {
    width: width * 0.48,
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
});
