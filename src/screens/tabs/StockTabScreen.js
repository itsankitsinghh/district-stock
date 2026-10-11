import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import AvailableDamageScreen from './AvailableDamageScreen';
import TablePagination from '../../components/TablePagination';

export default function StockTabScreen({ session, onLogout }) {
  const getProductsSafe = () =>
    masterService && typeof masterService.getProducts === 'function'
      ? masterService.getProducts()
      : [];
  const getLogsSafe = () =>
    masterService && typeof masterService.getStockActionLogs === 'function'
      ? masterService.getStockActionLogs()
      : [];

  const [products, setProducts] = useState(getProductsSafe());
  const [actionLogs, setActionLogs] = useState(getLogsSafe());
  const [isAvailableDamageOpen, setIsAvailableDamageOpen] = useState(false);
  const [selectedInitialProduct, setSelectedInitialProduct] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DAMAGED' | 'LOW'

  // Toast Notification state matching video
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  // 10-Row Pagination State
  const [inventoryPage, setInventoryPage] = useState(1);
  const INVENTORY_PER_PAGE = 10;

  // Selected warehouse
  const [warehouse, setWarehouse] = useState('Sagar Complex Warehouse');

  const refreshData = () => {
    setProducts(getProductsSafe());
    setActionLogs(getLogsSafe());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Reset pagination on search or filter change
  useEffect(() => {
    setInventoryPage(1);
  }, [searchQuery, filterType]);

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

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.lotNumber && p.lotNumber.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterType === 'DAMAGED') return (p.damagedQty || 0) > 0;
    if (filterType === 'LOW') return (p.availableQty || 0) <= (p.lowStockAlert || 5);
    return true;
  });

  const paginatedProducts = filteredProducts.slice(
    (inventoryPage - 1) * INVENTORY_PER_PAGE,
    inventoryPage * INVENTORY_PER_PAGE
  );

  const totalAvailable = products.reduce((acc, p) => acc + (p.availableQty || 0), 0);
  const totalDamaged = products.reduce((acc, p) => acc + (p.damagedQty || 0), 0);

  // If Available / Damage screen is opened, render it directly
  if (isAvailableDamageOpen) {
    return (
      <AvailableDamageScreen
        initialProduct={selectedInitialProduct}
        onClose={() => setIsAvailableDamageOpen(false)}
        onAdjustmentComplete={handleAdjustmentComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1435" />

      {/* Top Header Card */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greetingText}>
              Hello, {session?.user?.name || session?.role || 'Demo1'}
            </Text>
            <View style={styles.warehousePill}>
              <Ionicons name="business-outline" size={13} color="#D1C4E9" />
              <Text style={styles.warehouseText}>{warehouse}</Text>
            </View>
          </View>
          {onLogout && (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EDE9FE" />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Heading matching video */}
        <View style={styles.stockActionHeading}>
          <Text style={styles.stockActionTitle}>Stock Action</Text>
          <Text style={styles.stockActionSubtitle}>View actions on stock</Text>
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

        {/* Inventory Summary Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total SKUs</Text>
            <Text style={styles.metricValue}>{products.length}</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#10B981', borderLeftWidth: 3 }]}>
            <Text style={styles.metricLabel}>Available</Text>
            <Text style={[styles.metricValue, { color: '#059669' }]}>
              {totalAvailable} <Text style={styles.metricUnit}>Pcs</Text>
            </Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#EF4444', borderLeftWidth: 3 }]}>
            <Text style={styles.metricLabel}>Damaged</Text>
            <Text style={[styles.metricValue, { color: '#DC2626' }]}>
              {totalDamaged} <Text style={styles.metricUnit}>Pcs</Text>
            </Text>
          </View>
        </View>

        {/* Live Inventory List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Warehouse Inventory</Text>
          <TouchableOpacity onPress={refreshData} style={styles.refreshPill}>
            <Ionicons name="refresh" size={14} color="#8235F4" />
            <Text style={styles.refreshPillText}>Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by SKU, Product Name, Lot..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
            onPress={() => setFilterType('ALL')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Items ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'DAMAGED' && styles.filterChipActiveDamaged,
            ]}
            onPress={() => setFilterType('DAMAGED')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'DAMAGED' && styles.filterChipTextDamaged,
              ]}
            >
              Damaged ({products.filter((p) => (p.damagedQty || 0) > 0).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'LOW' && styles.filterChipActive,
            ]}
            onPress={() => setFilterType('LOW')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'LOW' && styles.filterChipTextActive,
              ]}
            >
              Low Stock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Cards */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Matching Inventory</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or filter.</Text>
          </View>
        ) : (
          <View>
            {paginatedProducts.map((item) => (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.productCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.productMetaRow}>
                      <Text style={styles.productSkuLabel}>SKU: </Text>
                      <Text style={styles.productSkuValue}>{item.sku}</Text>
                      <Text style={styles.productLotSep}> • </Text>
                      <Text style={styles.productLotLabel}>Lot: </Text>
                      <Text style={styles.productLotValue}>{item.lotNumber || 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category || 'Goods'}</Text>
                  </View>
                </View>

                <View style={styles.stockCountsRow}>
                  <View style={styles.countBadgeAvailable}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.countBadgeTextAvailable}>
                      Available: {item.availableQty || 0}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.countBadgeDamaged,
                      (item.damagedQty || 0) > 0 && styles.countBadgeDamagedAlert,
                    ]}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={(item.damagedQty || 0) > 0 ? '#DC2626' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.countBadgeTextDamaged,
                        (item.damagedQty || 0) > 0 && styles.countBadgeTextDamagedAlert,
                      ]}
                    >
                      Damaged: {item.damagedQty || 0}
                    </Text>
                  </View>
                  <View style={styles.countBadgeTotal}>
                    <Text style={styles.countBadgeTextTotal}>
                      Total: {(item.availableQty || 0) + (item.damagedQty || 0)}
                    </Text>
                  </View>
                </View>

                <View style={styles.productCardActions}>
                  <TouchableOpacity
                    style={styles.adjustActionBtn}
                    onPress={() => handleOpenAvailableDamage(item)}
                  >
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={16}
                      color="#8235F4"
                    />
                    <Text style={styles.adjustActionBtnText}>Adjust Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* 10-Row Table Pagination matching user screenshot */}
            <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              <TablePagination
                currentPage={inventoryPage}
                totalItems={filteredProducts.length}
                itemsPerPage={INVENTORY_PER_PAGE}
                onPageChange={setInventoryPage}
                primaryColor="#38BDF8"
              />
            </View>
          </View>
        )}

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
    backgroundColor: '#1E1435',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  warehousePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  warehouseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EDE9FE',
    marginLeft: 5,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
  },
  stockActionHeading: {
    marginTop: 18,
  },
  stockActionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  stockActionSubtitle: {
    fontSize: 13,
    color: '#C4B5FD',
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
