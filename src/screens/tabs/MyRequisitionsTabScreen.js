import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TablePagination from '../../components/TablePagination';
import masterService from '../../services/masterService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 10;

export default function MyRequisitionsTabScreen({ session, onLogout, onNavigateTab }) {
  const [requisitions, setRequisitions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'IN_REVIEW' | 'PARTIALLY_FULFILLED' | 'FULFILLED'
  const [sortOrder, setSortOrder] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'EVENT'
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = () => {
    if (masterService.getRequisitions) {
      setRequisitions(masterService.getRequisitions());
    }
  };

  // Status label for dropdown display
  const getStatusDropdownLabel = () => {
    switch (statusFilter) {
      case 'IN_REVIEW':
        return 'In Review';
      case 'PARTIALLY_FULFILLED':
        return 'Partially Fulfilled';
      case 'FULFILLED':
        return 'Fulfilled';
      default:
        return 'All statuses';
    }
  };

  // Filter & Search Logic
  const filteredData = requisitions
    .filter((req) => {
      // Status Filter
      if (statusFilter === 'IN_REVIEW') {
        const s = (req.status || '').toLowerCase();
        if (!s.includes('review') && !s.includes('pending')) return false;
      } else if (statusFilter === 'PARTIALLY_FULFILLED') {
        const s = (req.status || '').toLowerCase();
        if (!s.includes('partial')) return false;
      } else if (statusFilter === 'FULFILLED') {
        const s = (req.status || '').toLowerCase();
        if (!s.includes('fulfilled') || s.includes('partial')) return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        req.id?.toLowerCase().includes(q) ||
        req.eventName?.toLowerCase().includes(q) ||
        req.eventCode?.toLowerCase().includes(q) ||
        req.deliveryLocation?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'OLDEST') {
        return (a.id || '').localeCompare(b.id || '');
      }
      if (sortOrder === 'EVENT') {
        return (a.eventName || '').localeCompare(b.eventName || '');
      }
      // Default: NEWEST
      return (b.id || '').localeCompare(a.id || '');
    });

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortOrder]);

  // Paginated slice (max 10 rows/cards per page)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Counts for the 3 KPI cards (SVG y=245)
  const pendingCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('review') || s.includes('pending');
  }).length;

  const inProgressCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('partial') || s.includes('progress');
  }).length;

  const fulfilledCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('fulfilled') && !s.includes('partial');
  }).length;

  const handleOpenDetail = (req) => {
    setSelectedReq(req);
    setDetailModalVisible(true);
  };

  // Helper to determine status text and color matching SVG
  const getStatusMeta = (statusStr) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('fulfilled') && !s.includes('partial')) {
      return { text: 'Fulfilled', color: '#23865B' };
    }
    if (s.includes('partial')) {
      return { text: 'Partially Fulfilled', color: '#9A6500' };
    }
    return { text: 'In Review', color: '#9A6500' };
  };

  // Helper to get progress ratio (0 to 1)
  const getProgressRatio = (req) => {
    if (typeof req.progress === 'number') {
      return Math.min(1, Math.max(0, req.progress));
    }
    const s = (req.status || '').toLowerCase();
    if (s.includes('fulfilled') && !s.includes('partial')) return 1.0;
    if (s.includes('partial')) return 0.55;
    return 0.24;
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER (SVG width: 390, height: 76, fill: #17102F) */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>My Requisitions</Text>
          <Text style={styles.headerSubtitle}>Track your event stock requests</Text>
        </View>

        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={14} color="#D8B4FE" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. SECTION HEADER (SVG x: 18, y: 103, 122) */}
        <View style={styles.pageMetaHeader}>
          <View style={styles.pageMetaTopRow}>
            <View>
              <Text style={styles.pageTitle}>Your requests</Text>
              <Text style={styles.pageSubtitle}>
                View request status and fulfillment progress.
              </Text>
            </View>

            {onNavigateTab && (
              <TouchableOpacity
                style={styles.raiseNewBtn}
                onPress={() => onNavigateTab('raise-requests')}
                activeOpacity={0.8}
              >
                <Text style={styles.raiseNewBtnText}>+ New Request</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. SEARCH BAR CARD (SVG rect x="14" y="139" width="362" height="44" rx="10") */}
        <View style={styles.searchCard}>
          <Text style={styles.searchIconText}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by request no. or event"
            placeholderTextColor="#8B8498"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#8B8498" />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. FILTER BAR (SVG rect x="14" y="192" width="362" height="40" rx="10") */}
        <View style={styles.filterBarCard}>
          <TouchableOpacity
            style={styles.filterDropdownBtn}
            activeOpacity={0.7}
            onPress={() => setStatusModalVisible(true)}
          >
            <Text style={styles.filterDropdownText}>
              {getStatusDropdownLabel()}  ⌄
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterRightBtn}
            activeOpacity={0.7}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={styles.filterRightText}>Filter  ⌄</Text>
          </TouchableOpacity>
        </View>

        {/* 5. 3 KPI METRIC CARDS ROW (SVG rect x="14", x="137", x="260" y="245" width="116" height="54") */}
        <View style={styles.kpiRow}>
          {/* Card 1: Pending */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              statusFilter === 'IN_REVIEW' && styles.kpiCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')
            }
          >
            <Text style={styles.kpiLabel}>Pending</Text>
            <Text style={styles.kpiValue}>{pendingCount}</Text>
          </TouchableOpacity>

          {/* Card 2: In Progress */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              statusFilter === 'PARTIALLY_FULFILLED' && styles.kpiCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setStatusFilter(
                statusFilter === 'PARTIALLY_FULFILLED' ? 'ALL' : 'PARTIALLY_FULFILLED'
              )
            }
          >
            <Text style={styles.kpiLabel}>In Progress</Text>
            <Text style={styles.kpiValue}>{inProgressCount}</Text>
          </TouchableOpacity>

          {/* Card 3: Fulfilled */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              statusFilter === 'FULFILLED' && styles.kpiCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setStatusFilter(statusFilter === 'FULFILLED' ? 'ALL' : 'FULFILLED')
            }
          >
            <Text style={styles.kpiLabel}>Fulfilled</Text>
            <Text style={styles.kpiValue}>{fulfilledCount}</Text>
          </TouchableOpacity>
        </View>

        {/* 6. REQUISITION CARDS LIST (SVG y=312, 455, 598...) */}
        {paginatedData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={36} color="#8F84B0" />
            <Text style={styles.emptyTitle}>No requisitions match your filter</Text>
            <Text style={styles.emptySub}>
              Clear search or choose "All statuses" to view all requests.
            </Text>
            {onNavigateTab && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => onNavigateTab('raise-requests')}
              >
                <Text style={styles.emptyActionBtnText}>Raise a New Request</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          paginatedData.map((req) => {
            const statusMeta = getStatusMeta(req.status);
            const progressRatio = getProgressRatio(req);
            const requestedStr = req.requestedDate || '10 Oct';
            const neededStr = req.neededDate || req.requiredDate || '15 Oct';

            return (
              <View key={req.id} style={styles.reqCard}>
                {/* Header Row: Req ID & Status */}
                <View style={styles.reqCardTopRow}>
                  <Text style={styles.reqIdText}>{req.id}</Text>
                  <Text style={[styles.reqStatusText, { color: statusMeta.color }]}>
                    {statusMeta.text}
                  </Text>
                </View>

                {/* Event Name */}
                <Text style={styles.reqEventName} numberOfLines={1}>
                  {req.eventName}
                </Text>

                {/* Dates Info */}
                <Text style={styles.reqDatesInfo}>
                  Requested {requestedStr} · Needed {neededStr}
                </Text>

                {/* Progress Bar (SVG height: 7, rx: 4, background: #EEE9F5, fill: #8B6BD1) */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(progressRatio * 100)}%` },
                    ]}
                  />
                </View>

                {/* Progress Subtitle & View Details Button */}
                <View style={styles.reqCardBottomRow}>
                  <Text style={styles.reqProgressSubText}>
                    Product quantities and fulfillment progress
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleOpenDetail(req)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.viewDetailsText}>View details  ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 7. FOOTER NOTE (SVG rect x="14" y="752" width="362" height="26" fill="#F0ECFA") */}
        <View style={styles.footerNoteBox}>
          <Text style={styles.footerNoteText}>
            Sample layout only · live requests load from app
          </Text>
        </View>

        {/* 8. TABLE PAGINATION (User Request: 10 rows/items max per page) */}
        {filteredData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={PAGE_SIZE}
            onPageChange={(p) => setCurrentPage(p)}
            primaryColor="#6D43C0"
          />
        )}
      </ScrollView>

      {/* STATUS FILTER MODAL */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Filter by Status</Text>

            {[
              { key: 'ALL', label: 'All statuses' },
              { key: 'IN_REVIEW', label: 'In Review' },
              { key: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
              { key: 'FULFILLED', label: 'Fulfilled' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.dropdownOptionRow,
                  statusFilter === opt.key && styles.dropdownOptionRowActive,
                ]}
                onPress={() => {
                  setStatusFilter(opt.key);
                  setStatusModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    statusFilter === opt.key && styles.dropdownOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {statusFilter === opt.key && (
                  <Ionicons name="checkmark" size={17} color="#6D43C0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SORT / EXTRA FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Sort Requests</Text>

            {[
              { key: 'NEWEST', label: 'Newest First' },
              { key: 'OLDEST', label: 'Oldest First' },
              { key: 'EVENT', label: 'Event Name (A–Z)' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.dropdownOptionRow,
                  sortOrder === opt.key && styles.dropdownOptionRowActive,
                ]}
                onPress={() => {
                  setSortOrder(opt.key);
                  setFilterModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    sortOrder === opt.key && styles.dropdownOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {sortOrder === opt.key && (
                  <Ionicons name="checkmark" size={17} color="#6D43C0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* REQUISITION DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedReq?.id} — {selectedReq?.eventName}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedReq?.submittedAt
                    ? `Submitted on ${selectedReq.submittedAt}`
                    : `Requested ${selectedReq?.requestedDate || '10 Oct'}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#372064" />
              </TouchableOpacity>
            </View>

            {selectedReq && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Meta details */}
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Event Code:</Text>
                    <Text style={styles.detailVal}>{selectedReq.eventCode || 'EV-001'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Needed Date:</Text>
                    <Text style={styles.detailVal}>{selectedReq.neededDate || selectedReq.requiredDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Delivery Location:</Text>
                    <Text style={styles.detailVal}>{selectedReq.deliveryLocation || 'Event Venue'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>POC Contact:</Text>
                    <Text style={styles.detailVal}>
                      {selectedReq.pocName || 'Sneha Patil'} ({selectedReq.pocNo || '9820198201'})
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Status:</Text>
                    <Text
                      style={[
                        styles.detailVal,
                        { color: getStatusMeta(selectedReq.status).color, fontWeight: '700' },
                      ]}
                    >
                      {selectedReq.status}
                    </Text>
                  </View>
                </View>

                {/* Products breakdown */}
                <Text style={styles.sectionHeaderTitle}>Product Quantities & Fulfillment</Text>
                <View style={styles.productsList}>
                  {selectedReq.items?.map((prod, pIdx) => (
                    <View key={pIdx} style={styles.productRowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prodRowName}>{prod.name}</Text>
                        <Text style={styles.prodRowUom}>{prod.uom}</Text>
                      </View>
                      <View style={styles.prodRowQtyBadge}>
                        <Text style={styles.prodRowQtyText}>
                          Qty: {prod.qty}
                          {typeof prod.fulfilledQty === 'number'
                            ? ` (${prod.fulfilledQty} sent)`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
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

  // --- Header (SVG width: 390, height: 76, fill: #17102F) ---
  header: {
    height: 76,
    backgroundColor: '#17102F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#251A46',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
    fontWeight: '400',
    color: '#D8D0EA',
    marginTop: 3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2A1F45',
    gap: 4,
  },
  logoutBtnText: {
    fontSize: 11,
    color: '#D8B4FE',
    fontWeight: '600',
  },

  // --- Scroll Content & Top Meta ---
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 36,
  },
  pageMetaHeader: {
    marginBottom: 12,
  },
  pageMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#211642',
  },
  pageSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: '#625A72',
    marginTop: 2,
  },
  raiseNewBtn: {
    backgroundColor: '#6D43C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  raiseNewBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- Search Bar Card (SVG x: 14, y: 139, width: 362, height: 44, rx: 10) ---
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchIconText: {
    fontSize: 16,
    color: '#8B8498',
    marginTop: -2,
  },
  searchInput: {
    flex: 1,
    fontSize: 10.5,
    color: '#211642',
    paddingVertical: 4,
  },

  // --- Filter Bar (SVG x: 14, y: 192, width: 362, height: 40, rx: 10) ---
  filterBarCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterDropdownBtn: {
    paddingVertical: 6,
  },
  filterDropdownText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#372064',
  },
  filterRightBtn: {
    paddingVertical: 6,
  },
  filterRightText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // --- 3 KPI Metric Cards (SVG y: 245, width: 116, height: 54, rx: 10) ---
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    height: 54,
    justifyContent: 'center',
  },
  kpiCardActive: {
    borderColor: '#6D43C0',
    backgroundColor: '#FAF7FF',
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: '400',
    color: '#625A72',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#372064',
    marginTop: 2,
  },

  // --- Requisition Cards (SVG y: 312, 455, 598, height: 132, rx: 10) ---
  reqCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  reqCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  reqIdText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  reqStatusText: {
    fontSize: 8.5,
    fontWeight: '600',
  },
  reqEventName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211642',
    marginTop: 4,
  },
  reqDatesInfo: {
    fontSize: 8.5,
    fontWeight: '400',
    color: '#625A72',
    marginTop: 3,
  },

  // Progress Bar (SVG height: 7, rx: 4, fill: #8B6BD1, track: #EEE9F5)
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EEE9F5',
    marginVertical: 9,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8B6BD1',
  },

  // Bottom Row
  reqCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  reqProgressSubText: {
    fontSize: 8,
    fontWeight: '400',
    color: '#625A72',
    flex: 1,
    marginRight: 8,
  },
  viewDetailsText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // --- Footer Note (SVG rect x="14" y="752" width="362" height="26", fill: #F0ECFA) ---
  footerNoteBox: {
    backgroundColor: '#F0ECFA',
    borderRadius: 6,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  footerNoteText: {
    fontSize: 8.5,
    fontWeight: '400',
    color: '#625A72',
  },

  // --- Empty State ---
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#211642',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 10,
    color: '#625A72',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  emptyActionBtn: {
    backgroundColor: '#6D43C0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- Dropdown Selection Modals ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dropdownModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 6,
  },
  dropdownModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 10,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEFF',
  },
  dropdownOptionRowActive: {
    backgroundColor: '#FAF7FF',
  },
  dropdownOptionText: {
    fontSize: 11.5,
    color: '#372064',
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: '#6D43C0',
    fontWeight: '700',
  },

  // --- Requisition Detail Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#211642',
  },
  modalSubtitle: {
    fontSize: 10,
    color: '#625A72',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBox: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 10.5,
    color: '#625A72',
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 10.5,
    color: '#211642',
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 8,
  },
  productsList: {
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
    backgroundColor: '#FFFFFF',
  },
  prodRowName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#211642',
  },
  prodRowUom: {
    fontSize: 9.5,
    color: '#8B8498',
    marginTop: 2,
  },
  prodRowQtyBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  prodRowQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D43C0',
  },
});
