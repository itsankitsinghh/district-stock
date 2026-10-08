import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const truckTranslate = useRef(new Animated.Value(20)).current;
  const packageFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(truckTranslate, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating package loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(packageFloat, {
          toValue: -8,
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

    // Progress bar animation (loads smoothly over 2.4s)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2400,
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) {
        setTimeout(onFinish, 200);
      }
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.5],
  });

  return (
    <LinearGradient
      colors={['#0B0719', '#1A0B3B', '#070412']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Authentic Brand Wordmark with exact "tedha medha" custom logo font */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/district_stock_exact_font.png')}
              style={styles.exactWordmarkImage}
              resizeMode="contain"
            />
            <Text style={styles.headerSubtitle}>Event Inventory & Logistics</Text>
          </View>

          {/* Center Hero: White Outline Cargo Truck & Floating Parcel */}
          <Animated.View
            style={[
              styles.centerGraphicContainer,
              { transform: [{ translateY: truckTranslate }] },
            ]}
          >
            <View style={styles.truckIllustrationBox}>
              {/* Floating Cargo Parcel */}
              <Animated.View
                style={[
                  styles.floatingPackage,
                  { transform: [{ translateY: packageFloat }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={32}
                  color={COLORS.textLilac}
                />
              </Animated.View>

              {/* Main Logistics Cargo Truck */}
              <View style={styles.truckWrapper}>
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={120}
                  color={COLORS.white}
                />
              </View>

              {/* Glowing Road Dotted Dash */}
              <View style={styles.roadLineContainer}>
                <View style={styles.roadLine} />
              </View>
            </View>
          </Animated.View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.taglineMain}>Better events.</Text>
            <Text style={styles.taglineSub}>Smarter logistics.</Text>

            {/* Glowing Smooth Progress Bar */}
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
    marginTop: 48,
  },
  exactWordmarkImage: {
    width: 250,
    height: 130,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLilac,
    letterSpacing: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  centerGraphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  truckIllustrationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 190,
    position: 'relative',
  },
  floatingPackage: {
    position: 'absolute',
    top: 6,
    right: 48,
    backgroundColor: 'rgba(122, 28, 233, 0.3)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.55)',
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
    width: 190,
    height: 3,
    backgroundColor: 'rgba(192, 132, 252, 0.4)',
    borderRadius: 2,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  taglineMain: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 30,
  },
  progressBarTrack: {
    width: width * 0.5,
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
