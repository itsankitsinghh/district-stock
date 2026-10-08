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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const truckTranslate = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Fade in content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(truckTranslate, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animation (loads in ~2.4 seconds, then finishes)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2400,
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) {
        setTimeout(onFinish, 300);
      }
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.45],
  });

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark, COLORS.primaryDeep]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/district_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>district</Text>
            <Text style={styles.appSubName}>stock</Text>
            <Text style={styles.headerSubtitle}>Event Inventory & Logistics</Text>
          </View>

          {/* Center Graphic: Logistics Truck with Parcel (Figma match) */}
          <Animated.View
            style={[
              styles.centerGraphicContainer,
              { transform: [{ translateY: truckTranslate }] },
            ]}
          >
            <View style={styles.truckIllustrationBox}>
              {/* Floating Package Above Truck */}
              <View style={styles.floatingPackage}>
                <MaterialCommunityIcons name="package-variant-closed" size={34} color={COLORS.white} />
              </View>

              {/* Truck Icon Graphic */}
              <View style={styles.truckWrapper}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={105} color={COLORS.white} />
              </View>

              {/* Speed / road lines */}
              <View style={styles.roadLine} />
            </View>
          </Animated.View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.taglineMain}>Better events.</Text>
            <Text style={styles.taglineSub}>Smarter logistics.</Text>

            {/* Progress Bar (Figma match) */}
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
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
    marginTop: 40,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
    textTransform: 'lowercase',
    lineHeight: 36,
  },
  appSubName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D8C6FF',
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginTop: -2,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  centerGraphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
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
    top: 6,
    right: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  truckWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadLine: {
    width: 170,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    marginTop: -8,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  taglineMain: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 28,
  },
  progressBarTrack: {
    width: width * 0.45,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
});
