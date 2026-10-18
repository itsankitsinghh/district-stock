import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RoleHeader from '../../components/RoleHeader';
import TablePagination from '../../components/TablePagination';
import masterService from '../../services/masterService';

const PAGE_SIZE = 10;

export default function RequestsTabScreen({ session, onLogout }) {
  const [requisitions, setRequisitions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('PENDING'); // 'ALL' | 'PENDING' | 'APPROVED' | 'FULFILLED'
  const [currentPage, setCurrentPage] = useState(1);
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

  const handleApprove = (reqId) => {
    Alert.alert(
      'Approve Requisition',
      `Approve ${reqId} for warehouse fulfillment & dispatch?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Dispatch',
          style: 'default',
          onPress: () => {
            if (masterService.updateRequisitionStatus) {
              masterService.updateRequisitionStatus(reqId, 'Approved');
            }
            loadRequisitions();
          },
        },
      ]
    );
  };

  const handleReject = (reqId) => {
    Alert.alert(
      'Reject Requisition',
      `Reject ${reqId}? Requisition will be marked as rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            if (masterService.updateRequisitionStatus) {
              masterService.updateRequisitionStatus(reqId, 'Rejected');
            }
            loadRequisitions();
          },
        },
      ]
    );
  };

  // Filtered dataset
  const filteredData = requisitions.filter((req) => {
    const s = (req.status || '').toLowerCase();
    if (activeFilter === 'PENDING' && !s.includes('review') && !s.includes('pending')) {
      return false;
    }
    if (activeFilter === 'APPROVED' && !s.includes('approved')) {
      return false;
    }
    if (activeFilter === 'FULFILLED' && !s.includes('fulfilled')) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      req.id?.toLowerCase().includes(q) ||
      req.eventName?.toLowerCase().includes(q) ||
      req.planner?.toLowerCase().includes(q) ||
      req.deliveryLocation?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pendingCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('review') || s.includes('pending');
  }).length;

  const approvedCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('approved');
  }).length;

  const fulfilledCount = requisitions.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s.includes('fulfilled');
  }).length;

  return (
    <View style={styles.container}>
      {/* 1. REQUESTS SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER) */}
      <View style={styles.whiteSubHeader}>
        <Text style={styles.subHeaderTitle}>Requests</Text>
        <Text style={styles.subHeaderSubtitle}>Review & approve event stock requisitions</Text>

        {/* Metric chips row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>AWAITING APPROVAL</Text>
            <Text style={styles.metricValue}>{pendingCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>APPROVED</Text>
            <Text style={styles.metricValue}>{approvedCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>FULFILLED</Text>
            <Text style={styles.metricValue}>{fulfilledCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#8F84B0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Req ID, Event or Planner..."
              placeholderTextColor="#8F84B0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8F84B0" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View style={styles.chipsRow}>
            {[
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'APPROVED', label: `Approved (${approvedCount})` },
              { key: 'FULFILLED', label: `Fulfilled (${fulfilledCount})` },
              { key: 'ALL', label: `All (${requisitions.length})` },
            ].map((chip) => {
              const active = activeFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(chip.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Requisitions List */}
        {paginatedData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={40} color="#8F84B0" />
            <Text style={styles.emptyTitle}>No Requisitions Found</Text>
            <Text style={styles.emptySub}>
              Incoming material demand tickets from Event Planners will appear here.
            </Text>
          </View>
        ) : (
          paginatedData.map((req) => {
            const isPending =
              (req.status || '').toLowerCase().includes('review') ||
              (req.status || '').toLowerCase().includes('pending');
            const isApproved = (req.status || '').toLowerCase().includes('approved');

            return (
              <View key={req.id} style={styles.reqCard}>
                {/* Top Row */}
                <View style={styles.reqCardTop}>
                  <View style={styles.reqIdPill}>
                    <Text style={styles.reqIdPillText}>{req.id}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isPending
                        ? styles.statusPillPending
                        : isApproved
                        ? styles.statusPillApproved
                        : styles.statusPillOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPending
                          ? styles.statusTextPending
                          : isApproved
                          ? styles.statusTextApproved
                          : styles.statusTextOther,
                      ]}
                    >
                      {req.status}
                    </Text>
                  </View>
                </View>

                {/* Event Name & Planner */}
                <Text style={styles.eventName}>{req.eventName}</Text>
                <Text style={styles.plannerMeta}>
                  Planner: <Text style={{ color: '#211642', fontWeight: '600' }}>{req.planner || 'Sneha Patil'}</Text> · {req.submittedAt}
                </Text>

                {/* Location & Delivery Date */}
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Required Date</Text>
                    <Text style={styles.metaVal}>{req.neededDate || req.requiredDate}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Delivery Location</Text>
                    <Text style={styles.metaVal} numberOfLines={1}>{req.deliveryLocation}</Text>
                  </View>
                </View>

                {/* Items Preview */}
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsLabel}>
                    Requested Items ({req.items?.length || 0}):
                  </Text>
                  {req.items?.slice(0, 3).map((item, iIdx) => (
                    <Text key={iIdx} style={styles.itemRowText} numberOfLines={1}>
                      • {item.name} — <Text style={{ fontWeight: '700' }}>{item.qty} {item.uom}</Text>
                    </Text>
                  ))}
                  {req.items && req.items.length > 3 && (
                    <Text style={styles.itemMoreText}>+{req.items.length - 3} more items...</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => {
                      setSelectedReq(req);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={15} color="#6D43C0" />
                    <Text style={styles.detailBtnText}>View Details</Text>
                  </TouchableOpacity>

                  {isPending && (
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(req.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(req.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* 10-Row Pagination */}
        {filteredData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={PAGE_SIZE}
            onPageChange={(p) => setCurrentPage(p)}
            primaryColor="#8235F4"
          />
        )}
      </ScrollView>

      {/* DETAIL MODAL */}
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
                  Requisition submitted by {selectedReq?.planner}
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
                <View style={styles.modalDetailBox}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Event Code:</Text>
                    <Text style={styles.modalDetailVal}>{selectedReq.eventCode || 'EV-001'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Required Date:</Text>
                    <Text style={styles.modalDetailVal}>{selectedReq.neededDate || selectedReq.requiredDate}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Delivery Location:</Text>
                    <Text style={styles.modalDetailVal}>{selectedReq.deliveryLocation}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>POC Name & No:</Text>
                    <Text style={styles.modalDetailVal}>
                      {selectedReq.pocName} ({selectedReq.pocNo})
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <Text style={[styles.modalDetailVal, { color: '#6D43C0', fontWeight: '700' }]}>
                      {selectedReq.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.productsTitle}>Full Items Breakdown</Text>
                <View style={styles.productsTable}>
                  {selectedReq.items?.map((item, idx) => (
                    <View key={idx} style={styles.productTableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prodName}>{item.name}</Text>
                        <Text style={styles.prodUom}>{item.uom}</Text>
                      </View>
                      <View style={styles.prodQtyBadge}>
                        <Text style={styles.prodQtyText}>{item.qty} Requested</Text>
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
    backgroundColor: '#F6F5FB',
  },
  whiteSubHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.3,
  },
  subHeaderSubtitle: {
    fontSize: 11,
    color: '#706984',
    marginTop: 2,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8E3F2',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#706984',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1435',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },

  // Filters
  filterSection: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#211642',
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ECE7F6',
  },
  filterChipActive: {
    backgroundColor: '#8235F4',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B3F6B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Request Cards
  reqCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reqCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqIdPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  reqIdPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillOther: {
    backgroundColor: '#E0F2FE',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextApproved: {
    color: '#15803D',
  },
  statusTextOther: {
    color: '#0369A1',
  },
  eventName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 2,
  },
  plannerMeta: {
    fontSize: 9.5,
    color: '#625A72',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#EBE7F3',
    borderRadius: 7,
    padding: 8,
    marginBottom: 8,
    gap: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8.5,
    color: '#8B8498',
  },
  metaVal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#211642',
    marginTop: 1,
  },
  itemsBox: {
    marginBottom: 10,
  },
  itemsLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#4B3F6B',
    marginBottom: 3,
  },
  itemRowText: {
    fontSize: 9.5,
    color: '#625A72',
    lineHeight: 14,
  },
  itemMoreText: {
    fontSize: 9,
    color: '#8B8498',
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3EEFF',
    paddingTop: 10,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  detailBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6D43C0',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#211642',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 10.5,
    color: '#625A72',
    textAlign: 'center',
    marginTop: 4,
  },

  // Detail Modal
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
    paddingBottom: 30,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  modalDetailBox: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalDetailLabel: {
    fontSize: 10.5,
    color: '#625A72',
    fontWeight: '500',
  },
  modalDetailVal: {
    fontSize: 10.5,
    color: '#211642',
    fontWeight: '600',
  },
  productsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 8,
  },
  productsTable: {
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
    backgroundColor: '#FFFFFF',
  },
  prodName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#211642',
  },
  prodUom: {
    fontSize: 9.5,
    color: '#8B8498',
    marginTop: 2,
  },
  prodQtyBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  prodQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D43C0',
  },
});
