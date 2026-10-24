import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import AvailableDamageScreen from './AvailableDamageScreen';

export default function StockTabScreen({ session, onLogout }) {
  const getLogsSafe = () =>
    masterService && typeof masterService.getStockActionLogs === 'function'
      ? masterService.getStockActionLogs()
      : [];

  const [actionLogs, setActionLogs] = useState(getLogsSafe());
  const [isAvailableDamageOpen, setIsAvailableDamageOpen] = useState(false);
  const [selectedInitialProduct, setSelectedInitialProduct] = useState(null);

  // Toast Notification state matching video
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  const refreshData = () => {
    setActionLogs(getLogsSafe());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4500);
  };

  const handleOpenAvailableDamage = (product = null) => {
    setSelectedInitialProduct(product);
    setIsAvailableDamageOpen(true);
  };

  const handleAdjustmentComplete = (result) => {
    setIsAvailableDamageOpen(false);
    setSelectedInitialProduct(null);
    refreshData();
    if (result && result.message) {
      showToast(result.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-Screen Scanner Modal covering top header and bottom tabs */}
      <Modal
        visible={isAvailableDamageOpen}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => setIsAvailableDamageOpen(false)}
      >
        <AvailableDamageScreen
          initialProduct={selectedInitialProduct}
          onClose={() => setIsAvailableDamageOpen(false)}
          onAdjustmentComplete={handleAdjustmentComplete}
        />
      </Modal>
      {/* 1. STOCK HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greetingText}>Stock</Text>
          </View>
        </View>
      </View>

      {/* Floating Success Toast Banner matching video */}
      {toastVisible && (
        <View style={styles.toastBanner}>
          <View style={styles.toastIconWrapper}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            style={styles.toastCloseBtn}
            onPress={() => setToastVisible(false)}
          >
            <Ionicons name="close" size={16} color="#047857" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Available / Damage Action Card matching video */}
        <View style={styles.actionCardsContainer}>
          <View style={styles.actionCard}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: '#F3EEFF' }]}>
                <MaterialCommunityIcons
                  name="swap-horizontal-bold"
                  size={26}
                  color="#8235F4"
                />
              </View>
              <View style={styles.actionCardInfo}>
                <Text style={styles.actionCardTitle}>Available / Damage</Text>
                <Text style={styles.actionCardDesc}>
                  Scan to mark items as damaged or return to available
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.scanBtn}
              activeOpacity={0.8}
              onPress={() => handleOpenAvailableDamage()}
            >
              <Ionicons name="barcode-outline" size={17} color="#FFFFFF" />
              <Text style={styles.scanBtnText}>Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Adjustments Activity Log */}
        {actionLogs && actionLogs.length > 0 && (
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Stock Action Logs</Text>
              <Text style={styles.logsCountText}>{actionLogs.length} events</Text>
            </View>
            {actionLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View
                    style={[
                      styles.logTypeBadge,
                      log.type === 'DAMAGED'
                        ? styles.logTypeBadgeDamaged
                        : styles.logTypeBadgeAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.logTypeBadgeText,
                        log.type === 'DAMAGED'
                          ? styles.logTypeBadgeTextDamaged
                          : styles.logTypeBadgeTextAvailable,
                      ]}
                    >
                      {log.type === 'DAMAGED' ? 'MARKED DAMAGED' : 'MARKED AVAILABLE'}
                    </Text>
                  </View>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                </View>
                <Text style={styles.logProductLine}>
                  <Text style={{ fontWeight: '700', color: '#1E293B' }}>
                    {log.productName}
                  </Text>{' '}
                  ({log.sku}) —{' '}
                  <Text style={{ fontWeight: '700', color: '#6D43C0' }}>
                    {log.quantity} Pcs
                  </Text>
                </Text>
                {log.reason ? (
                  <Text style={styles.logReason}>Reason: {log.reason}</Text>
                ) : null}
                {log.note ? (
                  <Text style={styles.logNote}>Note: "{log.note}"</Text>
                ) : null}
                {log.photos && log.photos.length > 0 && (
                  <View style={styles.logPhotoPill}>
                    <Ionicons name="camera-outline" size={13} color="#6D43C0" />
                    <Text style={styles.logPhotoPillText}>
                      {log.photos.length} Photo attached
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.3,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  scopeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20C997',
    marginRight: 6,
  },
  headerScopeSubtitle: {
    fontSize: 11,
    color: '#706984',
    fontWeight: '500',
  },
  warehouseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8235F4',
    marginLeft: 5,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
  },
  stockActionHeading: {
    marginTop: 12,
  },
  stockActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.2,
  },
  stockActionSubtitle: {
    fontSize: 11,
    color: '#706984',
    marginTop: 2,
  },

  // Toast Banner
  toastBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIconWrapper: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    lineHeight: 18,
  },
  toastCloseBtn: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Action Card
  actionCardsContainer: {
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBF8',
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionCardInfo: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  scanBtn: {
    backgroundColor: '#8235F4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  refreshPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8235F4',
    marginLeft: 4,
  },

  // Search & Filters
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#8235F4',
    borderColor: '#8235F4',
  },
  filterChipActiveDamaged: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextDamaged: {
    color: '#FFFFFF',
  },

  // Product Cards
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEBF8',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productSkuLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  productSkuValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  productLotSep: {
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  productLotLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  productLotValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  stockCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  countBadgeAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeTextAvailable: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 5,
  },
  countBadgeDamaged: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countBadgeDamagedAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  countBadgeTextDamaged: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 5,
  },
  countBadgeTextDamagedAlert: {
    color: '#991B1B',
    fontWeight: '700',
  },
  countBadgeTotal: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  countBadgeTextTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  productCardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  adjustActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3EEFF',
    borderRadius: 8,
  },
  adjustActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8235F4',
    marginLeft: 5,
  },

  // Empty state
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Activity Logs
  activitySection: {
    marginTop: 16,
  },
  logsCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logTypeBadgeDamaged: {
    backgroundColor: '#FEE2E2',
  },
  logTypeBadgeAvailable: {
    backgroundColor: '#D1FAE5',
  },
  logTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logTypeBadgeTextDamaged: {
    color: '#991B1B',
  },
  logTypeBadgeTextAvailable: {
    color: '#065F46',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logProductLine: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  logReason: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  logNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  logPhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  logPhotoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D43C0',
    marginLeft: 4,
  },
});
