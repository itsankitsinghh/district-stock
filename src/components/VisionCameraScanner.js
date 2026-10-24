import React, { useRef, useState, useEffect, Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Robust Error Boundary to guarantee VisionCamera never crashes the app process.
 */
class CameraErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('VisionCamera ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
          <Text style={styles.errorTitle}>Camera Encountered an Issue</Text>
          <Text style={styles.errorDesc}>
            {this.state.error?.message || 'Please close and reopen the scanner.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryBtnText}>Retry Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Official React Native Vision Camera scanner component.
 * Displays real-time hardware-accelerated CameraX preview directly from the device's camera.
 */
function VisionCameraScannerInternal({
  onBarcodeScanned,
  isActive = true,
  isTorchOn = false,
  enableTorch,
  facing = 'back',
  style,
  onCameraReady,
  onMountError,
  renderNoPermission,
}) {
  const cameraRef = useRef(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  const [isCameraSettled, setIsCameraSettled] = useState(false);

  const torchActive = enableTorch !== undefined ? !!enableTorch : !!isTorchOn;
  const canTorch = !!device?.hasTorch && torchActive;

  // Auto-request camera permission if not determined
  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch((err) => {
        console.warn('Error requesting camera permission:', err);
      });
    }
  }, [hasPermission, requestPermission]);

  // Settle window/modal once on initial mount without flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCameraSettled(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Permission not granted fallback
  if (!hasPermission) {
    if (renderNoPermission) {
      return renderNoPermission({ requestPermission });
    }

    return (
      <View style={[styles.fallbackContainer, style || StyleSheet.absoluteFillObject]}>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={54} color="#EDE9FE" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            District Stock requires camera permissions to display the vision camera screen.
          </Text>
          <TouchableOpacity
            style={styles.grantPermissionBtn}
            activeOpacity={0.8}
            onPress={() => requestPermission()}
          >
            <Text style={styles.grantPermissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Device still initializing or not found
  if (!device) {
    return (
      <View style={[styles.loadingContainer, style || StyleSheet.absoluteFillObject]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Opening Vision Camera...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      {isCameraSettled ? (
        <Camera
          ref={cameraRef}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          device={device}
          isActive={isActive}
          implementationMode="compatible"
          resizeMode="cover"
          torchMode={canTorch ? 'on' : 'off'}
          onStarted={() => {
            console.log('VisionCamera preview started successfully!');
            if (onCameraReady) onCameraReady();
          }}
          onError={(err) => {
            console.warn('VisionCamera event:', err?.message || err);
            if (onMountError) onMountError(err);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#A78BFA" />
        </View>
      )}
    </View>
  );
}

export default function VisionCameraScanner(props) {
  return (
    <CameraErrorBoundary>
      <VisionCameraScannerInternal {...props} />
    </CameraErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#334155',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 14,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  grantPermissionBtn: {
    marginTop: 18,
    backgroundColor: '#6D43C0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  grantPermissionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#C4B5FD',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#17102F',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F87171',
    marginTop: 12,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 12,
    color: '#A9A1BD',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#6D43C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
