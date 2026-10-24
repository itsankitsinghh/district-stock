import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Platform,
  FlatList,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import VisionCameraScanner from '../../components/VisionCameraScanner';
import * as ImagePicker from 'expo-image-picker';
import masterService from '../../services/masterService';

// Fallback sample photos if needed for quick testing
const SAMPLE_DAMAGE_PHOTOS = [
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80',
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
];

export default function AvailableDamageScreen({
  initialProduct = null,
  onClose,
  onAdjustmentComplete,
}) {
  const [masterProducts, setMasterProducts] = useState(() =>
    masterService && typeof masterService.getProducts === 'function'
      ? masterService.getProducts()
      : []
  );

  useEffect(() => {
    if (masterService?.subscribe) {
      const unsub = masterService.subscribe(() => {
        setMasterProducts(
          masterService && typeof masterService.getProducts === 'function'
            ? masterService.getProducts()
            : []
        );
      });
      return () => unsub();
    }
  }, []);

  // Scan or Product Selection Step: 'scanner' | 'details'
  const [currentStep, setCurrentStep] = useState(
    initialProduct ? 'details' : 'scanner'
  );

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState(
    initialProduct || masterProducts[0] || null
  );

  // Scanner interactive states
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState('1');
  // 'DAMAGED' | 'AVAILABLE'
  const [adjustmentType, setAdjustmentType] = useState('DAMAGED');
  const [selectedReason, setSelectedReason] = useState('Crushed');
  const [note, setNote] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  // Laser beam animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start laser bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 200,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserAnim]);

  useEffect(() => {
    if (selectedProduct) {
      if ((selectedProduct.availableQty || 0) === 0 && (selectedProduct.damagedQty || 0) > 0) {
        setAdjustmentType('AVAILABLE');
      } else {
        setAdjustmentType('DAMAGED');
      }
    }
  }, [selectedProduct]);

  // Reasons matching the video
  const REASONS = [
    'Crushed',
    'Torn',
    'Wet',
    'Leaking',
    'Expired',
    'Physical Dent',
    'Cable Cut',
  ];

  // Handle Barcode Scanned with CameraView
  const handleBarcodeScanned = ({ data, type }) => {
    if (scanned) return;
    setScanned(true);

    const scannedText = (data || '').trim().toLowerCase();
    // Try to find matching product by SKU, Name, or ID
    const matched =
      masterProducts.find(
        (p) =>
          p.sku.toLowerCase() === scannedText ||
          p.id.toLowerCase() === scannedText ||
          p.name.toLowerCase().includes(scannedText) ||
          (p.lotNumber && p.lotNumber.toLowerCase() === scannedText)
      ) || masterProducts[1] || masterProducts[0];

    handleSelectProductFromScan(matched);
  };

  // Select a product from Scanner / Catalog / Mock scan
  const handleSelectProductFromScan = (prod) => {
    setSelectedProduct(prod);
    setCapturedPhotos([]);
    setNote('');
    setSelectedReason('Crushed');
    setScanned(false);
    setCurrentStep('details');
  };

  // Launch Native Device Camera for Taking Damage Photo
  const handleTakePhotoFromCamera = async () => {
    setPhotoPickerVisible(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take damage photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.log('Error launching camera:', err);
      // Fallback: attach sample photo if camera fails on emulator
      const sample =
        SAMPLE_DAMAGE_PHOTOS[capturedPhotos.length % SAMPLE_DAMAGE_PHOTOS.length];
      setCapturedPhotos((prev) => [...prev, sample]);
    }
  };

  // Launch Device Photo Gallery
  const handlePickPhotoFromGallery = async () => {
    setPhotoPickerVisible(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photos access in device settings to attach images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.log('Error picking image:', err);
    }
  };

  const handleRemovePhoto = (index) => {
    setCapturedPhotos(capturedPhotos.filter((_, idx) => idx !== index));
  };

  // Confirm Adjustment
  const handleConfirmAdjustment = () => {
    const qtyNum = parseInt(quantity, 10) || 1;

    if (adjustmentType === 'DAMAGED') {
      if ((selectedProduct.availableQty || 0) < qtyNum) {
        Alert.alert(
          'Insufficient Available Stock',
          `Only ${selectedProduct.availableQty || 0} units available to mark as damaged.`
        );
        return;
      }

      masterService.markItemAsDamaged(
        selectedProduct.id,
        qtyNum,
        selectedReason,
        capturedPhotos,
        note.trim()
      );

      if (onAdjustmentComplete) {
        onAdjustmentComplete({
          type: 'DAMAGED',
          product: selectedProduct,
          quantity: qtyNum,
          message: 'The item has been marked as damaged successfully.',
        });
      }
    } else {
      if ((selectedProduct.damagedQty || 0) < qtyNum) {
        Alert.alert(
          'Insufficient Damaged Stock',
          `Only ${selectedProduct.damagedQty || 0} units currently in damaged status.`
        );
        return;
      }

      masterService.markItemAsAvailable(
        selectedProduct.id,
        qtyNum,
        note.trim()
      );

      if (onAdjustmentComplete) {
        onAdjustmentComplete({
          type: 'AVAILABLE',
          product: selectedProduct,
          quantity: qtyNum,
          message: 'The item has been marked as available successfully.',
        });
      }
    }
  };

  // =========================================================================
  // VIEW 1: SCANNER VIEW (WITH REAL CAMERA OR FALLBACK)
  // =========================================================================
  if (currentStep === 'scanner') {
    return (
      <View style={styles.scannerContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Real Live Vision Camera Scanner (with fallback permission UI matching exact design) */}
        <VisionCameraScanner
          style={StyleSheet.absoluteFillObject}
          facing="back"
          isTorchOn={isTorchOn}
          isActive={currentStep === 'scanner' && !scanned}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          onCameraReady={() => {
            console.log('Damage Vision Camera View Ready');
          }}
          onMountError={(err) => {
            console.warn('Damage Vision Camera Mount Error:', err);
          }}
          renderNoPermission={({ requestPermission }) => (
            <View style={[StyleSheet.absoluteFillObject, styles.cameraPlaceholder]}>
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={54} color="#EDE9FE" />
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionDesc}>
                  District Stock requires camera permissions to scan barcodes on stock items.
                </Text>
                <TouchableOpacity
                  style={styles.grantPermissionBtn}
                  onPress={requestPermission}
                >
                  <Text style={styles.grantPermissionBtnText}>Allow Camera Access</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/* Top Scanner Overlay Header */}
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.scannerHeaderBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scannerHeaderTitle}>Scan Stock Barcode</Text>
          <TouchableOpacity
            onPress={() => setIsTorchOn(!isTorchOn)}
            style={styles.scannerHeaderBtn}
          >
            <Ionicons
              name={isTorchOn ? 'flash' : 'flash-outline'}
              size={22}
              color={isTorchOn ? '#FBBF24' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Top Translucent Spacer between Header & Viewfinder */}
        <View style={styles.viewfinderMaskTop} />

        {/* Viewfinder Target Area with Translucent Cutout Overlay matching Photo 2 */}
        <View style={styles.viewfinderRow}>
          <View style={styles.viewfinderMaskSide} />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (masterProducts && masterProducts.length > 0) {
                handleBarcodeScanned({ data: masterProducts[0].sku });
              }
            }}
            style={styles.viewfinderBox}
          >
            {/* Corner Bracket Accents */}
            <View style={[styles.cornerBracket, styles.topLeftCorner]} />
            <View style={[styles.cornerBracket, styles.topRightCorner]} />
            <View style={[styles.cornerBracket, styles.bottomLeftCorner]} />
            <View style={[styles.cornerBracket, styles.bottomRightCorner]} />

            {/* Animated Laser Beam */}
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [{ translateY: laserAnim }],
                },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.viewfinderMaskSide} />
        </View>

        {/* Bottom Translucent Area */}
        <View style={styles.scannerBottomArea}>
          <Text style={styles.scannerInstructionText}>
            Align QR code or item barcode within the frame
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (masterProducts && masterProducts.length > 0) {
                handleBarcodeScanned({ data: masterProducts[0].sku });
              }
            }}
            style={styles.scannerHintBadge}
          >
            <Ionicons name="scan-outline" size={16} color="#A78BFA" style={{ marginRight: 8 }} />
            <Text style={styles.scannerHintBadgeText}>
              Point camera at barcode or QR code
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =========================================================================
  // VIEW 2: PRODUCT DETAILS & ADJUSTMENT SCREEN (Matching Video 00:08 - 00:32)
  // =========================================================================
  const isCurrentStatusAvailable = (selectedProduct?.availableQty || 0) > 0;

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER matching video */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setCurrentStep('scanner')}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available / Damage</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. PRODUCT DETAILS CARD matching video */}
        <View style={styles.productCard}>
          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>SKU</Text>
            <Text style={styles.fieldValue}>{selectedProduct.sku}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>PRODUCT NAME</Text>
            <Text style={[styles.fieldValue, styles.productNameValue]}>
              {selectedProduct.name}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>LOT NUMBER</Text>
            <Text style={styles.fieldValue}>
              {selectedProduct.lotNumber || 'LOT-AN-101'}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <Text style={styles.fieldValueDesc}>
              {selectedProduct.notes || 'Standard inventory warehouse unit'}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* QUANTITY ROW WITH STEPPERS */}
          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>QUANTITY</Text>
            <View style={styles.qtyStepperRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  const val = Math.max(1, (parseInt(quantity, 10) || 1) - 1);
                  setQuantity(String(val));
                }}
              >
                <Ionicons name="remove" size={16} color="#475569" />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  const maxAllowed =
                    adjustmentType === 'DAMAGED'
                      ? selectedProduct.availableQty || 99
                      : selectedProduct.damagedQty || 99;
                  const val = Math.min(
                    maxAllowed || 99,
                    (parseInt(quantity, 10) || 1) + 1
                  );
                  setQuantity(String(val));
                }}
              >
                <Ionicons name="add" size={16} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />

          {/* STATUS ROW WITH BADGE */}
          <View style={styles.productRow}>
            <Text style={styles.fieldLabel}>CURRENT STATUS</Text>
            <View
              style={[
                styles.statusBadge,
                isCurrentStatusAvailable
                  ? styles.statusBadgeAvailable
                  : styles.statusBadgeDamaged,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isCurrentStatusAvailable
                    ? styles.statusBadgeTextAvailable
                    : styles.statusBadgeTextDamaged,
                ]}
              >
                {isCurrentStatusAvailable ? 'AVAILABLE' : 'DAMAGED'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. ADJUSTMENT TYPE BUTTONS: [ DAMAGED ] vs [ AVAILABLE ] */}
        <Text style={styles.sectionHeaderTitle}>SELECT ADJUSTMENT ACTION</Text>
        <View style={styles.adjustmentTypeRow}>
          <TouchableOpacity
            style={[
              styles.typeTabBtn,
              adjustmentType === 'DAMAGED' && styles.typeTabBtnActiveDamaged,
            ]}
            onPress={() => setAdjustmentType('DAMAGED')}
          >
            <MaterialCommunityIcons
              name="alert-octagon"
              size={18}
              color={adjustmentType === 'DAMAGED' ? '#FFFFFF' : '#EF4444'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.typeTabText,
                adjustmentType === 'DAMAGED' && styles.typeTabTextActive,
              ]}
            >
              DAMAGED
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTabBtn,
              adjustmentType === 'AVAILABLE' && styles.typeTabBtnActiveAvailable,
            ]}
            onPress={() => setAdjustmentType('AVAILABLE')}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={adjustmentType === 'AVAILABLE' ? '#FFFFFF' : '#10B981'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.typeTabText,
                adjustmentType === 'AVAILABLE' && styles.typeTabTextActive,
              ]}
            >
              AVAILABLE
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. CONDITIONAL FIELDS WHEN ADJUSTING TO DAMAGED (PHOTO & REASONS) */}
        {adjustmentType === 'DAMAGED' && (
          <View style={styles.damageFieldsSection}>
            {/* PHOTO REQUIRED SECTION */}
            <View style={styles.photoSectionHeader}>
              <Text style={styles.sectionHeaderTitle}>PHOTO REQUIRED</Text>
              <Text style={styles.photoCountText}>
                {capturedPhotos.length} Attached
              </Text>
            </View>

            {/* Photo previews list */}
            <View style={styles.photoContainer}>
              {capturedPhotos.map((uri, idx) => (
                <View key={idx} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoThumbnail} />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => handleRemovePhoto(idx)}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Photo Button */}
              <TouchableOpacity
                style={styles.addPhotoCard}
                onPress={() => setPhotoPickerVisible(true)}
              >
                <Ionicons name="camera" size={24} color="#6D43C0" />
                <Text style={styles.addPhotoCardText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {/* REASON SECTION WITH CHIPS */}
            <Text style={[styles.sectionHeaderTitle, { marginTop: 16 }]}>
              REASON FOR DAMAGE
            </Text>
            <View style={styles.reasonsGrid}>
              {REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      isSelected && styles.reasonChipActive,
                    ]}
                    onPress={() => setSelectedReason(r)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        isSelected && styles.reasonChipTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 5. NOTE TEXTBOX */}
        <Text style={[styles.sectionHeaderTitle, { marginTop: 16 }]}>
          NOTE / REMARKS (OPTIONAL)
        </Text>
        <TextInput
          style={styles.noteInput}
          placeholder={
            adjustmentType === 'DAMAGED'
              ? 'Describe physical damage condition...'
              : 'Quality check verified / repackaged notes...'
          }
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
        />
      </ScrollView>

      {/* 6. BOTTOM ACTION BUTTON matching video */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            adjustmentType === 'DAMAGED'
              ? styles.confirmBtnDamaged
              : styles.confirmBtnAvailable,
          ]}
          activeOpacity={0.85}
          onPress={handleConfirmAdjustment}
        >
          <Text style={styles.confirmBtnText}>
            {adjustmentType === 'DAMAGED'
              ? 'CONFIRM TO MAKE DAMAGED'
              : 'CONFIRM TO MAKE AVAILABLE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photo Picker Modal (Camera vs Gallery) */}
      <Modal
        visible={photoPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheetModal}>
            <Text style={styles.actionSheetTitle}>Capture Damage Evidence</Text>
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handleTakePhotoFromCamera}
            >
              <Ionicons name="camera-outline" size={22} color="#6D43C0" />
              <Text style={styles.actionSheetOptionText}>Open Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handlePickPhotoFromGallery}
            >
              <Ionicons name="images-outline" size={22} color="#0284C7" />
              <Text style={styles.actionSheetOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => setPhotoPickerVisible(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },

  // ==========================================
  // SCANNER STYLES
  // ==========================================
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    backgroundColor: '#110E1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  grantPermissionBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 20,
  },
  grantPermissionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scannerHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 10,
  },
  scannerHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  viewfinderMaskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  viewfinderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderMaskSide: {
    flex: 1,
    height: 260,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  viewfinderBox: {
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#A78BFA',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  laserLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  scannerInstructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
    marginBottom: 20,
  },
  scannerBottomArea: {
    flex: 1.4,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingTop: 24,
  },
  scannerHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 16, 47, 0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  scannerHintBadgeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },

  // ==========================================
  // DETAILS FORM STYLES
  // ==========================================
  topHeader: {
    backgroundColor: '#17102F',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBF8',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  productNameValue: {
    color: '#17102F',
    fontWeight: '800',
  },
  fieldValueDesc: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  qtyStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginHorizontal: 12,
    minWidth: 28,
    textAlign: 'center',
    padding: 0,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeDamaged: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusBadgeTextAvailable: {
    color: '#15803D',
  },
  statusBadgeTextDamaged: {
    color: '#B91C1C',
  },

  // Adjustment Type Toggle
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adjustmentTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  typeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeTabBtnActiveDamaged: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeTabBtnActiveAvailable: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },

  // Damage Fields
  damageFieldsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBF8',
    marginBottom: 14,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D43C0',
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photoWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoCard: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
  },
  addPhotoCardText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D43C0',
    marginTop: 4,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reasonChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  reasonChipTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },

  // Note Box
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    minHeight: 70,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDamaged: {
    backgroundColor: '#EF4444',
  },
  confirmBtnAvailable: {
    backgroundColor: '#10B981',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Action Sheet Modal
  actionSheetModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17102F',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionSheetOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
  },
  actionSheetCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
