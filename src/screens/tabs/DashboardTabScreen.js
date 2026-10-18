import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import masterService from '../../services/masterService';
import { authService } from '../../services/authService';
import TablePagination from '../../components/TablePagination';
import DistrictTopHeader from '../../components/DistrictTopHeader';
import {
  getUserAccessibleWarehouses,
  getUserAccessibleEvents,
} from '../../services/locationScopeHelper';

export default function DashboardTabScreen({ session, onLogout, onNavigateTab, onSelectWarehouse }) {
  const roleName = session?.role || 'Admin';

  // Normalize role
  const normalizedRole = roleName.toLowerCase().trim();
  const isAdmin = normalizedRole.includes('admin');
  const isOpsManager = normalizedRole.includes('operations') || normalizedRole.includes('operation');
  const isWarehouseGround =
    (normalizedRole.includes('warehouse') && (normalizedRole.includes('ground') || normalizedRole.includes('user'))) ||
    normalizedRole === 'warehouse user' ||
    normalizedRole === 'warehouse ground';
  const isEventGround =
    (normalizedRole.includes('event') && (normalizedRole.includes('ground') || normalizedRole.includes('user'))) ||
    normalizedRole === 'event user' ||
    normalizedRole === 'event ground';
  const isEventPlanner = normalizedRole.includes('planner');

  // Subtitle scope label matching SVG
  let scopeLabel = 'Global access';
  let roleBadgeText = 'ADMIN';
  let badgeStyle = styles.roleBadgeAdmin;
  let badgeTextStyle = styles.roleBadgeTextAdmin;

  if (isOpsManager) {
    scopeLabel = 'Assigned warehouse only';
    roleBadgeText = 'OPERATION MANAGER';
    badgeStyle = styles.roleBadgeOps;
    badgeTextStyle = styles.roleBadgeTextOps;
  } else if (isWarehouseGround) {
    scopeLabel = 'Assigned warehouse only';
    roleBadgeText = 'WAREHOUSE USER';
    badgeStyle = styles.roleBadgeGround;
    badgeTextStyle = styles.roleBadgeTextGround;
  } else if (isEventGround) {
    scopeLabel = 'Assigned event only';
    roleBadgeText = 'EVENT USER';
    badgeStyle = styles.roleBadgeGround;
    badgeTextStyle = styles.roleBadgeTextGround;
  } else if (isEventPlanner) {
    scopeLabel = 'Assigned events only';
    roleBadgeText = 'EVENT PLANNER';
    badgeStyle = styles.roleBadgePlanner;
    badgeTextStyle = styles.roleBadgeTextPlanner;
  }

  // Active product overview sub-tab (for other roles)
  const [productOverviewTab, setProductOverviewTab] = useState('inventory'); // 'inventory' | 'movement' | 'damage'

  // Admin Inventory Overview Tab: 'product_inventory' | 'inbound_outbound' | 'damaged_products'
  const [inventoryTab, setInventoryTab] = useState('product_inventory');
  const [invSearchQuery, setInvSearchQuery] = useState('');

  // Task filter for Ground / Planner
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'pending' | 'in_progress' | 'completed'

  // --- REAL-TIME LIVE USER STATE (SYNCS ON USER SETUP EDITS INSTANTLY) ---
  const [liveUser, setLiveUser] = useState(() => {
    const sid = session?.id || session?.userId || session?.email;
    return sid && authService.getUserById ? authService.getUserById(sid) : null;
  });

  useEffect(() => {
    if (!authService.subscribe) return;
    const unsubscribe = authService.subscribe((event) => {
      if (event?.type === 'SELECTED_WAREHOUSE_CHANGED') return;
      const sid = session?.id || session?.userId || session?.email;
      if (sid && authService.getUserById) {
        const u = authService.getUserById(sid);
        if (u) {
          setLiveUser(u);
        }
      }
    });
    return () => unsubscribe();
  }, [session]);

  const [, setMasterRevision] = useState(0);
  useEffect(() => {
    if (!masterService?.subscribe) return;
    const unsubscribe = masterService.subscribe(() => {
      setMasterRevision((r) => r + 1);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);


  const activeUser = liveUser || session;
  const rawAssigned = Array.isArray(activeUser?.assignedLocations)
    ? activeUser.assignedLocations
    : activeUser?.assignedLocations
    ? [activeUser.assignedLocations]
    : [];

  const masterWarehouses = (masterService.getWarehouses && masterService.getWarehouses()) || [];
  const masterEvents = (masterService.getEvents && masterService.getEvents()) || [];
  const masterWhNames = masterWarehouses.map((w) => w.name);
  const masterEvNames = masterEvents.map((e) => e.name);

  const isEventLoc = (loc) => {
    if (!loc) return false;
    const l = loc.toLowerCase().trim();
    return (
      masterEvNames.some((e) => e.toLowerCase() === l) ||
      l.includes('event') ||
      l.includes('arena') ||
      l.includes('summit') ||
      l.includes('fest') ||
      l.includes('expo')
    );
  };

  const isWarehouseLoc = (loc) => {
    if (!loc) return false;
    const l = loc.toLowerCase().trim();
    return (
      masterWhNames.some((w) => w.toLowerCase() === l) ||
      l.includes('warehouse') ||
      l.includes('wh') ||
      l.includes('hub') ||
      l.includes('depot') ||
      l.includes('storage') ||
      l.includes('terminal')
    );
  };

  const userAssignedWarehouses = getUserAccessibleWarehouses(activeUser);
  const userAssignedEvents = getUserAccessibleEvents(activeUser);

  const hasWarehouses = userAssignedWarehouses.length > 0;
  const hasEvents = userAssignedEvents.length > 0;

  // Initial active scope: warehouse | event | none
  const defaultScope =
    hasWarehouses && !hasEvents
      ? 'warehouse'
      : !hasWarehouses && hasEvents
      ? 'event'
      : isEventPlanner || isEventGround
      ? 'event'
      : 'warehouse';

  const [activeScope, setActiveScope] = useState(defaultScope);
  const [selectedWarehouse, setSelectedWarehouse] = useState(() => {
    return userAssignedWarehouses.length === 1 ? userAssignedWarehouses[0] : 'ALL';
  });
  const [selectedEvent, setSelectedEvent] = useState(() => {
    return userAssignedEvents.length === 1 ? userAssignedEvents[0] : 'ALL';
  });
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  const assignedWhKey = userAssignedWarehouses.join('|');
  const assignedEvKey = userAssignedEvents.join('|');

  useEffect(() => {
    if (hasWarehouses && !hasEvents) {
      setActiveScope('warehouse');
    } else if (!hasWarehouses && hasEvents) {
      setActiveScope('event');
    } else if (!hasWarehouses && !hasEvents) {
      setActiveScope('warehouse');
    }

    if (userAssignedWarehouses.length === 1) {
      setSelectedWarehouse(userAssignedWarehouses[0]);
    } else if (selectedWarehouse !== 'ALL' && !userAssignedWarehouses.includes(selectedWarehouse)) {
      setSelectedWarehouse('ALL');
    }

    if (userAssignedEvents.length === 1) {
      setSelectedEvent(userAssignedEvents[0]);
    } else if (selectedEvent !== 'ALL' && !userAssignedEvents.includes(selectedEvent)) {
      setSelectedEvent('ALL');
    }
  }, [hasWarehouses, hasEvents, assignedWhKey, assignedEvKey]);

  useEffect(() => {
    if (selectedWarehouse && selectedWarehouse !== 'ALL') {
      authService.setSelectedWarehouse(selectedWarehouse);
    } else if (selectedWarehouse === 'ALL' && userAssignedWarehouses.length > 0) {
      authService.setSelectedWarehouse(userAssignedWarehouses[0]);
    }
  }, [selectedWarehouse, assignedWhKey]);

  const currentAssignedList = activeScope === 'warehouse' ? userAssignedWarehouses : userAssignedEvents;
  const selectedLocation = activeScope === 'warehouse' ? selectedWarehouse : selectedEvent;

  const setSelectedLocation = (loc) => {
    if (activeScope === 'warehouse') {
      setSelectedWarehouse(loc);
      if (loc !== 'ALL') {
        authService.setSelectedWarehouse(loc);
      } else if (userAssignedWarehouses.length > 0) {
        authService.setSelectedWarehouse(userAssignedWarehouses[0]);
      }
    } else {
      setSelectedEvent(loc);
    }
  };

  const hasLocationsForScope = currentAssignedList.length > 0;
  const currentLocationLabel =
    selectedLocation === 'ALL'
      ? activeScope === 'warehouse'
        ? `All Warehouses (${currentAssignedList.length})`
        : `All Events (${currentAssignedList.length})`
      : selectedLocation;

  // --- CLEAN SLATE / ALL DATA NULL (USER WILL MANUALLY POPULATE LATER) ---
  const pendingReqCount = 0;
  const inProgressReqCount = 0;
  const completedReqCount = 0;
  const activeEventsCount = 0;
  const lowStockCount = 0;

  // Empty datasets (no auto-populated dummy inventory)
  const productInventoryList = [];
  const filteredProductInventory = [];
  const filteredInboundOutbound = [];
  const filteredDamagedProducts = [];

  // 10-Row Table Pagination
  const [invPage, setInvPage] = useState(1);
  const INV_PER_PAGE = 10;

  useEffect(() => {
    setInvPage(1);
  }, [invSearchQuery, inventoryTab]);

  const paginatedProductInventory = filteredProductInventory.slice(
    (invPage - 1) * INV_PER_PAGE,
    invPage * INV_PER_PAGE
  );
  const paginatedInboundOutbound = filteredInboundOutbound.slice(
    (invPage - 1) * INV_PER_PAGE,
    invPage * INV_PER_PAGE
  );
  const paginatedDamagedProducts = filteredDamagedProducts.slice(
    (invPage - 1) * INV_PER_PAGE,
    invPage * INV_PER_PAGE
  );

  return (
    <View style={styles.container}>
      {/* 1. DASHBOARD SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER) */}
      <View style={styles.whiteDashboardHeader}>
        <Text style={styles.headerDashboardTitle}>Dashboard</Text>

        {/* UNIFIED DYNAMIC SCOPE & LOCATION DROPDOWN BAR ON WHITE BACKGROUND */}
        {hasWarehouses && hasEvents ? (
          // BOTH ASSIGNED: Automatically split into 2 equal parts side-by-side
          <View style={styles.splitDropdownRow}>
            {/* Left Part: Warehouse Dropdown */}
            <TouchableOpacity
              style={[
                styles.splitDropdownBtn,
                activeScope === 'warehouse'
                  ? styles.splitDropdownBtnActiveWh
                  : styles.splitDropdownBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveScope('warehouse');
                setIsLocationPickerOpen(true);
              }}
            >
              <MaterialCommunityIcons
                name="office-building"
                size={14}
                color={activeScope === 'warehouse' ? '#8235F4' : '#706584'}
                style={{ marginRight: 6 }}
              />
              <View style={styles.splitDropdownTextWrap}>
                <Text
                  style={[
                    styles.splitDropdownPrefix,
                    activeScope === 'warehouse' && styles.splitDropdownPrefixActiveWh,
                  ]}
                  numberOfLines={1}
                >
                  Warehouse:
                </Text>
                <Text
                  style={[
                    styles.splitDropdownValue,
                    activeScope === 'warehouse' && styles.splitDropdownValueActiveWh,
                  ]}
                  numberOfLines={1}
                >
                  {selectedWarehouse === 'ALL'
                    ? userAssignedWarehouses.length > 1
                      ? `All (${userAssignedWarehouses.length})`
                      : userAssignedWarehouses[0] || 'All'
                    : selectedWarehouse}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={13}
                color={activeScope === 'warehouse' ? '#8235F4' : '#706584'}
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            {/* Right Part: Event Dropdown */}
            <TouchableOpacity
              style={[
                styles.splitDropdownBtn,
                activeScope === 'event'
                  ? styles.splitDropdownBtnActiveEv
                  : styles.splitDropdownBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveScope('event');
                setIsLocationPickerOpen(true);
              }}
            >
              <MaterialCommunityIcons
                name="calendar-star"
                size={14}
                color={activeScope === 'event' ? '#4F46E5' : '#706584'}
                style={{ marginRight: 6 }}
              />
              <View style={styles.splitDropdownTextWrap}>
                <Text
                  style={[
                    styles.splitDropdownPrefix,
                    activeScope === 'event' && styles.splitDropdownPrefixActiveEv,
                  ]}
                  numberOfLines={1}
                >
                  Event:
                </Text>
                <Text
                  style={[
                    styles.splitDropdownValue,
                    activeScope === 'event' && styles.splitDropdownValueActiveEv,
                  ]}
                  numberOfLines={1}
                >
                  {selectedEvent === 'ALL'
                    ? userAssignedEvents.length > 1
                      ? `All (${userAssignedEvents.length})`
                      : userAssignedEvents[0] || 'All'
                    : selectedEvent}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={13}
                color={activeScope === 'event' ? '#4F46E5' : '#706584'}
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>
          </View>
        ) : hasWarehouses && !hasEvents ? (
          // ONLY WAREHOUSES ASSIGNED: Full width single Warehouse dropdown (no split)
          <TouchableOpacity
            style={styles.singleFullDropdownBar}
            activeOpacity={0.8}
            onPress={() => {
              setActiveScope('warehouse');
              setIsLocationPickerOpen(true);
            }}
          >
            <MaterialCommunityIcons
              name="office-building"
              size={15}
              color="#8235F4"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.singleFullDropdownPrefix}>Warehouse:</Text>
            <Text style={styles.singleFullDropdownValue} numberOfLines={1}>
              {selectedWarehouse === 'ALL'
                ? userAssignedWarehouses.length > 1
                  ? `All Warehouses (${userAssignedWarehouses.length})`
                  : userAssignedWarehouses[0] || 'All Warehouses'
                : selectedWarehouse}
            </Text>
            {userAssignedWarehouses.length > 1 && (
              <View style={styles.singleFullCountBadge}>
                <Text style={styles.singleFullCountText}>
                  {userAssignedWarehouses.length} assigned
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={14} color="#8235F4" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ) : !hasWarehouses && hasEvents ? (
          // ONLY EVENTS ASSIGNED: Full width single Event dropdown (no split)
          <TouchableOpacity
            style={styles.singleFullDropdownBar}
            activeOpacity={0.8}
            onPress={() => {
              setActiveScope('event');
              setIsLocationPickerOpen(true);
            }}
          >
            <MaterialCommunityIcons
              name="calendar-star"
              size={15}
              color="#4F46E5"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.singleFullDropdownPrefix}>Event:</Text>
            <Text style={styles.singleFullDropdownValue} numberOfLines={1}>
              {selectedEvent === 'ALL'
                ? userAssignedEvents.length > 1
                  ? `All Events (${userAssignedEvents.length})`
                  : userAssignedEvents[0] || 'All Events'
                : selectedEvent}
            </Text>
            {userAssignedEvents.length > 1 && (
              <View style={styles.singleFullCountBadge}>
                <Text style={styles.singleFullCountText}>
                  {userAssignedEvents.length} assigned
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={14} color="#4F46E5" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ) : (
          // NEITHER ASSIGNED: Full width Warehouse dropdown, but Null
          <TouchableOpacity
            style={styles.unassignedFullDropdownBar}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'No Warehouse Assigned',
                'No warehouse or event has been assigned to your account. Please contact an Administrator.'
              );
            }}
          >
            <MaterialCommunityIcons
              name="office-building-outline"
              size={15}
              color="#DC2626"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.unassignedFullPrefix}>Warehouse:</Text>
            <Text style={styles.unassignedFullValue} numberOfLines={1}>
              None Assigned (Null)
            </Text>
            <View style={styles.unassignedBadge}>
              <Text style={styles.unassignedBadgeText}>Null</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#DC2626" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* LOCATION PICKER MODAL (DROPDOWN) */}
      <Modal
        visible={isLocationPickerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsLocationPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLocationPickerOpen(false)}
        >
          <View style={styles.locationDropdownModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  Select {activeScope === 'warehouse' ? 'Warehouse' : 'Event'}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Locations assigned to your account
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsLocationPickerOpen(false)}
              >
                <Ionicons name="close" size={18} color="#77718B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {/* Option 1: ALL (Rendered ONLY if user has more than 1 assigned location) */}
              {currentAssignedList.length > 1 && (
                <TouchableOpacity
                  style={[
                    styles.locationOptionRow,
                    selectedLocation === 'ALL' && styles.locationOptionRowActive,
                  ]}
                  onPress={() => {
                    setSelectedLocation('ALL');
                    setIsLocationPickerOpen(false);
                  }}
                >
                  <View style={styles.locationOptionLeft}>
                    <MaterialCommunityIcons
                      name="view-grid-outline"
                      size={16}
                      color={selectedLocation === 'ALL' ? '#8235F4' : '#77718B'}
                      style={{ marginRight: 8 }}
                    />
                    <View>
                      <Text
                        style={[
                          styles.locationOptionTitle,
                          selectedLocation === 'ALL' && styles.locationOptionTitleActive,
                        ]}
                      >
                        All {activeScope === 'warehouse' ? 'Warehouses' : 'Events'}
                      </Text>
                      <Text style={styles.locationOptionDesc}>
                        Aggregates all {currentAssignedList.length} assigned locations
                      </Text>
                    </View>
                  </View>
                  {selectedLocation === 'ALL' && (
                    <Ionicons name="checkmark-circle" size={18} color="#8235F4" />
                  )}
                </TouchableOpacity>
              )}

              {/* Options for each individual assigned location */}
              {currentAssignedList.map((loc) => {
                const isSelected = selectedLocation === loc;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.locationOptionRow,
                      isSelected && styles.locationOptionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedLocation(loc);
                      setIsLocationPickerOpen(false);
                    }}
                  >
                    <View style={styles.locationOptionLeft}>
                      <MaterialCommunityIcons
                        name={
                          activeScope === 'warehouse'
                            ? 'office-building-marker-outline'
                            : 'cube-outline'
                        }
                        size={16}
                        color={isSelected ? '#8235F4' : '#77718B'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.locationOptionTitle,
                          isSelected && styles.locationOptionTitleActive,
                        ]}
                      >
                        {loc}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#8235F4" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* 2. SCROLLABLE DASHBOARD CONTENT (ROLE-SPECIFIC)           */}
      {/* ========================================================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* --------------------------------------------------------- */}
        {/* CASE A: ADMIN & OPERATIONS MANAGER DASHBOARDS             */}
        {/* --------------------------------------------------------- */}
        {(isAdmin || isOpsManager) && (
          <View>
            {/* 1. Operations Overview (Live operational KPIs) */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionTitle}>Operations Overview</Text>
              <Text style={styles.cardSectionSub}>Live operational KPIs</Text>
            </View>

            {/* 2x2 Grid matching SVG exactly */}
            <View style={styles.kpiGrid}>
              {/* Card 1: PENDING REQUESTS */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiLabel}>PENDING REQUESTS</Text>
                  <MaterialCommunityIcons name="clipboard-clock-outline" size={16} color="#8235F4" />
                </View>
                <Text style={styles.kpiValue}>{pendingReqCount}</Text>
                <Text style={styles.kpiSub}>Awaiting review</Text>
              </View>

              {/* Card 2: ACTIVE EVENTS */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.8}
                onPress={() => onNavigateTab && onNavigateTab('master')}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiLabel}>ACTIVE EVENTS</Text>
                  <MaterialCommunityIcons name="calendar-check-outline" size={16} color="#0284C7" />
                </View>
                <Text style={styles.kpiValue}>{activeEventsCount}</Text>
                <Text style={styles.kpiSub}>In progress</Text>
              </TouchableOpacity>

              {/* Card 3: COMPLETED */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiLabel}>COMPLETED</Text>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#159A79" />
                </View>
                <Text style={styles.kpiValue}>{completedReqCount}</Text>
                <Text style={styles.kpiSub}>Fulfilled</Text>
              </View>

              {/* Card 4: LOW STOCK ALERTS */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.8}
                onPress={() => onNavigateTab && onNavigateTab('reports')}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiLabel}>LOW STOCK ALERTS</Text>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D9485F" />
                </View>
                <Text style={styles.kpiValue}>{lowStockCount}</Text>
                <Text style={styles.kpiSub}>Needs review</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Inventory Overview Section */}
            <View style={styles.inventoryOverviewSection}>
              {/* Header Row */}
              <View style={styles.inventorySectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inventorySectionMainTitle}>Inventory Overview</Text>
                </View>
                <View style={styles.liveInventoryBadge}>
                  <View style={styles.liveInventoryDot} />
                  <Text style={styles.liveInventoryText}>LIVE</Text>
                </View>
              </View>

              {/* 3 Interactive Tabs */}
              <View style={styles.invTabsNavBar}>
                <TouchableOpacity
                  style={[
                    styles.invNavTabBtn,
                    inventoryTab === 'product_inventory' && styles.invNavTabBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setInventoryTab('product_inventory');
                    setInvSearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.invNavTabText,
                      inventoryTab === 'product_inventory' && styles.invNavTabTextActive,
                    ]}
                  >
                    Product Inventory
                  </Text>
                  {inventoryTab === 'product_inventory' && <View style={styles.invNavIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.invNavTabBtn,
                    inventoryTab === 'inbound_outbound' && styles.invNavTabBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setInventoryTab('inbound_outbound');
                    setInvSearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.invNavTabText,
                      inventoryTab === 'inbound_outbound' && styles.invNavTabTextActive,
                    ]}
                  >
                    Inbound & Outbound
                  </Text>
                  {inventoryTab === 'inbound_outbound' && <View style={styles.invNavIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.invNavTabBtn,
                    inventoryTab === 'damaged_products' && styles.invNavTabBtnActiveDamage,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setInventoryTab('damaged_products');
                    setInvSearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.invNavTabText,
                      inventoryTab === 'damaged_products' && styles.invNavTabTextActiveDamage,
                    ]}
                  >
                    Damaged Products
                  </Text>
                  {inventoryTab === 'damaged_products' && (
                    <View style={[styles.invNavIndicator, { backgroundColor: '#D9485F' }]} />
                  )}
                </TouchableOpacity>
              </View>

              {/* TAB 1: PRODUCT INVENTORY TABLE */}
              {inventoryTab === 'product_inventory' && (
                <View style={styles.invTableCard}>
                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    directionalLockEnabled={true}
                    overScrollMode="never"
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableMainBox}>
                      {/* Header */}
                      <View style={styles.tableHeaderRow}>
                        <View style={[styles.tableHeaderCell, { width: 175 }]}>
                          <Text style={styles.tableHeaderText}>PRODUCT NAME</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 70, alignItems: 'center' }]}>
                          <Text style={styles.tableHeaderText}>UOM</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 105, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>AVAILABLE QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 105, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>RESERVED QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 100, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>DAMAGE QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 140, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>TOTAL AVAILABLE QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 115, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>VALUE</Text>
                        </View>
                      </View>

                      {/* Body */}
                      {filteredProductInventory.length === 0 ? (
                        <View style={styles.emptyTableState}>
                          <MaterialCommunityIcons name="cube-outline" size={32} color="#A79FBF" />
                          <Text style={styles.emptyTableText}>No product inventory records found</Text>
                          <Text style={styles.emptyTableSubText}>No inventory data available for this location</Text>
                        </View>
                      ) : (
                        paginatedProductInventory.map((item, index) => {
                          const isEven = index % 2 === 0;
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableDataRow,
                                isEven ? styles.tableDataRowEven : styles.tableDataRowOdd,
                              ]}
                            >
                              {/* Product Name */}
                              <View style={[styles.tableDataCell, { width: 175 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.name}</Text>
                                <View style={styles.cellSubBadgeRow}>
                                  <Text style={styles.cellSkuBadge}>{item.sku}</Text>
                                  {item.category ? (
                                    <Text style={styles.cellCatText}> · {item.category}</Text>
                                  ) : null}
                                </View>
                              </View>

                              {/* UoM */}
                              <View style={[styles.tableDataCell, { width: 70, alignItems: 'center' }]}>
                                <View style={styles.uomPill}>
                                  <Text style={styles.uomPillText}>{item.uom}</Text>
                                </View>
                              </View>

                              {/* Available Qty */}
                              <View style={[styles.tableDataCell, { width: 105, alignItems: 'flex-end' }]}>
                                <Text style={styles.cellNumberText}>{item.availableQty}</Text>
                                <Text style={styles.cellSubHint}>in warehouse</Text>
                              </View>

                              {/* Reserved Qty */}
                              <View style={[styles.tableDataCell, { width: 105, alignItems: 'flex-end' }]}>
                                <View style={styles.reservedQtyBadge}>
                                  <Text style={styles.reservedQtyText}>{item.reservedQty}</Text>
                                </View>
                                <Text style={styles.cellSubHint}>allocated</Text>
                              </View>

                              {/* Damage Qty */}
                              <View style={[styles.tableDataCell, { width: 100, alignItems: 'flex-end' }]}>
                                <View style={item.damageQty > 0 ? styles.damageQtyBadgeActive : styles.damageQtyBadgeZero}>
                                  <Text style={item.damageQty > 0 ? styles.damageQtyTextActive : styles.damageQtyTextZero}>
                                    {item.damageQty}
                                  </Text>
                                </View>
                                <Text style={styles.cellSubHint}>{item.damageQty > 0 ? 'damaged' : 'zero'}</Text>
                              </View>

                              {/* Total Available Qty */}
                              <View style={[styles.tableDataCell, { width: 140, alignItems: 'flex-end' }]}>
                                <View style={styles.totalAvailBadge}>
                                  <Text style={styles.totalAvailText}>{item.totalAvailableQty}</Text>
                                </View>
                                <Text style={styles.cellSubHint}>net usable</Text>
                              </View>

                              {/* Value */}
                              <View style={[styles.tableDataCell, { width: 115, alignItems: 'flex-end' }]}>
                                <Text style={styles.valueText}>{item.value}</Text>
                                <Text style={styles.cellSubHint}>inventory asset</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>

                  {/* 10-Row Table Pagination matching Movement table */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredProductInventory.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#6D43C0"
                  />
                </View>
              )}

              {/* TAB 2: INBOUND & OUTBOUND TABLE */}
              {inventoryTab === 'inbound_outbound' && (
                <View style={styles.invTableCard}>
                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    directionalLockEnabled={true}
                    overScrollMode="never"
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableMainBox}>
                      {/* Header */}
                      <View style={styles.tableHeaderRow}>
                        <View style={[styles.tableHeaderCell, { width: 145 }]}>
                          <Text style={styles.tableHeaderText}>DATE AND TIME</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 110, alignItems: 'center' }]}>
                          <Text style={styles.tableHeaderText}>TYPE</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 195 }]}>
                          <Text style={styles.tableHeaderText}>PRODUCT NAME</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 95, alignItems: 'flex-end' }]}>
                          <Text style={styles.tableHeaderText}>QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 145 }]}>
                          <Text style={styles.tableHeaderText}>DONE BY</Text>
                        </View>
                      </View>

                      {/* Body */}
                      {filteredInboundOutbound.length === 0 ? (
                        <View style={styles.emptyTableState}>
                          <MaterialCommunityIcons name="cube-outline" size={32} color="#A79FBF" />
                          <Text style={styles.emptyTableText}>No movement records found</Text>
                          <Text style={styles.emptyTableSubText}>No inbound/outbound logs for this location</Text>
                        </View>
                      ) : (
                        paginatedInboundOutbound.map((item, index) => {
                          const isEven = index % 2 === 0;
                          const isInbound = item.type.toLowerCase().includes('in');
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableDataRow,
                                isEven ? styles.tableDataRowEven : styles.tableDataRowOdd,
                              ]}
                            >
                              {/* Date and Time */}
                              <View style={[styles.tableDataCell, { width: 145 }]}>
                                <Text style={styles.cellMainText}>{item.dateTime}</Text>
                                <Text style={styles.cellSubHint}>timestamp</Text>
                              </View>

                              {/* Type */}
                              <View style={[styles.tableDataCell, { width: 110, alignItems: 'center' }]}>
                                <View style={isInbound ? styles.inboundBadge : styles.outboundBadge}>
                                  <Ionicons
                                    name={isInbound ? 'arrow-down-circle' : 'arrow-up-circle'}
                                    size={12}
                                    color={isInbound ? '#059669' : '#8235F4'}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text style={isInbound ? styles.inboundBadgeText : styles.outboundBadgeText}>
                                    {item.type}
                                  </Text>
                                </View>
                              </View>

                              {/* Product Name */}
                              <View style={[styles.tableDataCell, { width: 195 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.productName}</Text>
                                <Text style={styles.cellSubHint}>catalog item</Text>
                              </View>

                              {/* Qty */}
                              <View style={[styles.tableDataCell, { width: 95, alignItems: 'flex-end' }]}>
                                <Text
                                  style={[
                                    styles.cellNumberText,
                                    { color: isInbound ? '#059669' : '#8235F4' },
                                  ]}
                                >
                                  {item.qty}
                                </Text>
                                <Text style={styles.cellSubHint}>{isInbound ? 'received' : 'dispatched'}</Text>
                              </View>

                              {/* Done By */}
                              <View style={[styles.tableDataCell, { width: 145 }]}>
                                <View style={styles.doneByRow}>
                                  <View style={styles.userInitialCircle}>
                                    <Text style={styles.userInitialText}>
                                      {item.doneBy.charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                  <Text style={styles.doneByNameText} numberOfLines={1}>
                                    {item.doneBy}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>

                  {/* 10-Row Table Pagination matching Movement table */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredInboundOutbound.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#6D43C0"
                  />
                </View>
              )}

              {/* TAB 3: DAMAGED PRODUCTS TABLE */}
              {inventoryTab === 'damaged_products' && (
                <View style={styles.invTableCard}>
                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    directionalLockEnabled={true}
                    overScrollMode="never"
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableMainBox}>
                      {/* Header */}
                      <View style={styles.tableHeaderRow}>
                        <View style={[styles.tableHeaderCell, { width: 200 }]}>
                          <Text style={styles.tableHeaderText}>PRODUCT NAME</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 95, alignItems: 'center' }]}>
                          <Text style={styles.tableHeaderText}>QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 280 }]}>
                          <Text style={styles.tableHeaderText}>DAMAGED BY</Text>
                        </View>
                      </View>

                      {/* Body */}
                      {filteredDamagedProducts.length === 0 ? (
                        <View style={styles.emptyTableState}>
                          <MaterialCommunityIcons name="cube-outline" size={32} color="#A79FBF" />
                          <Text style={styles.emptyTableText}>No damaged product records found</Text>
                          <Text style={styles.emptyTableSubText}>No damage logs available for this location</Text>
                        </View>
                      ) : (
                        paginatedDamagedProducts.map((item, index) => {
                          const isEven = index % 2 === 0;
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableDataRow,
                                isEven ? styles.tableDataRowEven : styles.tableDataRowOdd,
                              ]}
                            >
                              {/* Product Name */}
                              <View style={[styles.tableDataCell, { width: 200 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.productName}</Text>
                                <Text style={[styles.cellSubHint, { color: '#D9485F' }]}>Under damage review</Text>
                              </View>

                              {/* Qty */}
                              <View style={[styles.tableDataCell, { width: 95, alignItems: 'center' }]}>
                                <View style={styles.damageBadgePill}>
                                  <Ionicons name="alert-circle" size={12} color="#DC2626" style={{ marginRight: 3 }} />
                                  <Text style={styles.damageBadgePillText}>{item.qty}</Text>
                                </View>
                              </View>

                              {/* Damaged By */}
                              <View style={[styles.tableDataCell, { width: 280 }]}>
                                <Text style={styles.damagedByText} numberOfLines={2}>
                                  {item.damagedBy}
                                </Text>
                                <Text style={styles.cellSubHint}>Reported by ground crew</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>

                  {/* 10-Row Table Pagination matching Movement table */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredDamagedProducts.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#6D43C0"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* CASE B: WAREHOUSE GROUND DASHBOARD                        */}
        {/* --------------------------------------------------------- */}
        {isWarehouseGround && (
          <View>
            {/* 1. My Tasks (Pending · In Progress · Completed) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>My Tasks</Text>
                  <Text style={styles.blockSubtitle}>Pending · In Progress · Completed</Text>
                </View>
                <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#159A79" />
              </View>

              <View style={styles.metricsPillRow}>
                <TouchableOpacity
                  style={[styles.taskChipBox, taskFilter === 'pending' && styles.taskChipActive]}
                  onPress={() => setTaskFilter(taskFilter === 'pending' ? 'all' : 'pending')}
                >
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>{pendingReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </TouchableOpacity>

                <View style={styles.metricDivider} />

                <TouchableOpacity
                  style={[styles.taskChipBox, taskFilter === 'in_progress' && styles.taskChipActive]}
                  onPress={() => setTaskFilter(taskFilter === 'in_progress' ? 'all' : 'in_progress')}
                >
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>{inProgressReqCount}</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </TouchableOpacity>

                <View style={styles.metricDivider} />

                <TouchableOpacity
                  style={[styles.taskChipBox, taskFilter === 'completed' && styles.taskChipActive]}
                  onPress={() => setTaskFilter(taskFilter === 'completed' ? 'all' : 'completed')}
                >
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>{completedReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Completed</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Inbound (Draft · Generated · Putaway · Completed · Cancelled) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>Inbound</Text>
                  <Text style={styles.blockSubtitle}>Draft · Generated · Putaway · Completed · Cancelled</Text>
                </View>
                <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#8235F4" />
              </View>

              <View style={styles.stagePipelineRow}>
                <View style={[styles.stageBadge, styles.stageBadgeActive]}>
                  <Text style={styles.stageBadgeTextActive}>Putaway (0 Active)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>Generated (0)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>Completed (0)</Text>
                </View>
              </View>
            </View>

            {/* 3. Outbound (Draft · Generated · In Progress · Completed · Cancelled) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>Outbound</Text>
                  <Text style={styles.blockSubtitle}>Draft · Generated · In Progress · Completed · Cancelled</Text>
                </View>
                <MaterialCommunityIcons name="truck-fast-outline" size={20} color="#8235F4" />
              </View>

              <View style={styles.stagePipelineRow}>
                <View style={[styles.stageBadge, styles.stageBadgeActive]}>
                  <Text style={styles.stageBadgeTextActive}>In Progress (0 Active)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>P-Completed (0)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>P-Cancelled (0)</Text>
                </View>
              </View>
              <Text style={styles.footnoteMini}>Outbound status labels: P-Completed · P-Cancelled</Text>
            </View>

            {/* 4. Low Stock Shortcut Card */}
            <TouchableOpacity
              style={styles.lowStockActionCard}
              activeOpacity={0.85}
              onPress={() => onNavigateTab && onNavigateTab('stock')}
            >
              <View style={styles.lowStockIconCircle}>
                <Ionicons name="warning-outline" size={18} color="#D9485F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lowStockCardTitle}>Low Stock</Text>
                <Text style={styles.lowStockCardSub}>Tap to open Stock filtered to low-stock items</Text>
              </View>
              <View style={styles.lowStockBadgeCount}>
                <Text style={styles.lowStockBadgeCountText}>{lowStockCount} Items</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Product Overview: [ Product Inventory ] [ Inbound & Outbound ] [ Damage Products ] */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>Product Overview</Text>
                  <Text style={styles.blockSubtitle}>Stock & handling categories</Text>
                </View>
              </View>

              <View style={styles.pillSelectorRow}>
                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'inventory' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('inventory')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'inventory' && styles.pillSelectTextActive]}>
                    Product Inventory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'movement' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('movement')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'movement' && styles.pillSelectTextActive]}>
                    Inbound & Outbound
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'damage' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('damage')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'damage' && styles.pillSelectTextActive]}>
                    Damage Products
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.emptyFootnote}>Warehouse items verified · live counts synchronized</Text>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* CASE C: EVENT GROUND DASHBOARD                            */}
        {/* --------------------------------------------------------- */}
        {isEventGround && (
          <View>
            {/* 1. My Event (Assigned event · date · location · status) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>My Event</Text>
                  <Text style={styles.blockSubtitle}>Assigned event · date · location · status</Text>
                </View>
                <MaterialCommunityIcons name="ticket-outline" size={20} color="#8235F4" />
              </View>

              <View style={styles.eventHeroBox}>
                <View style={styles.eventHeroTop}>
                  <Text style={styles.eventHeroTitle}>
                    {userAssignedEvents.length > 0
                      ? selectedEvent === 'ALL'
                        ? userAssignedEvents[0]
                        : selectedEvent
                      : 'No Assigned Event'}
                  </Text>
                  <View style={userAssignedEvents.length > 0 ? styles.eventLiveBadge : styles.eventUpcomingBadge}>
                    {userAssignedEvents.length > 0 ? <View style={styles.greenDot} /> : null}
                    <Text style={userAssignedEvents.length > 0 ? styles.eventLiveText : styles.eventUpcomingText}>
                      {userAssignedEvents.length > 0 ? 'Assigned' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventHeroMeta}>
                  {userAssignedEvents.length > 0
                    ? selectedLocation === 'ALL'
                      ? `${userAssignedEvents.length} events assigned`
                      : selectedLocation
                    : 'No event assigned to this user'}
                </Text>
                <Text style={styles.eventHeroLead}>
                  {session?.name ? `Ground Operator: ${session.name}` : 'Ground Account'}
                </Text>
              </View>
            </View>

            {/* 2. My Tasks (Pending · In Progress · Completed) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>My Tasks</Text>
                  <Text style={styles.blockSubtitle}>Pending · In Progress · Completed</Text>
                </View>
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#159A79" />
              </View>

              <View style={styles.metricsPillRow}>
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>{pendingReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>{inProgressReqCount}</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>{completedReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Completed</Text>
                </View>
              </View>
            </View>

            {/* 3. Product Overview */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>Product Overview</Text>
                  <Text style={styles.blockSubtitle}>[ Product Inventory ]   [ Inbound & Outbound ]</Text>
                </View>
              </View>

              <View style={styles.pillSelectorRow}>
                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'inventory' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('inventory')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'inventory' && styles.pillSelectTextActive]}>
                    Product Inventory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'movement' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('movement')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'movement' && styles.pillSelectTextActive]}>
                    Inbound & Outbound
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.emptyFootnote}>Event stock tracking active · scan barcodes in Movement tab</Text>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* CASE D: EVENT PLANNER DASHBOARD                           */}
        {/* --------------------------------------------------------- */}
        {isEventPlanner && (
          <View>
            {/* 1. My Event (Assigned events · date · location · status) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>My Event</Text>
                  <Text style={styles.blockSubtitle}>Assigned events · date · location · status</Text>
                </View>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#D28A22" />
              </View>

              <View style={styles.eventHeroBox}>
                <View style={styles.eventHeroTop}>
                  <Text style={styles.eventHeroTitle}>
                    {userAssignedEvents.length > 0
                      ? selectedEvent === 'ALL'
                        ? `${userAssignedEvents.length} Events Assigned`
                        : selectedEvent
                      : 'No active events'}
                  </Text>
                  <View style={styles.eventUpcomingBadge}>
                    <Text style={styles.eventUpcomingText}>{userAssignedEvents.length} Active</Text>
                  </View>
                </View>
                <Text style={styles.eventHeroMeta}>
                  {userAssignedEvents.length > 0
                    ? selectedLocation === 'ALL'
                      ? userAssignedEvents.join(', ')
                      : selectedLocation
                    : 'No events assigned to account'}
                </Text>
              </View>
            </View>

            {/* 2. My Tasks (Pending · In Progress · Completed) */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>My Tasks</Text>
                  <Text style={styles.blockSubtitle}>Pending · In Progress · Completed</Text>
                </View>
                <MaterialCommunityIcons name="format-list-checks" size={20} color="#8235F4" />
              </View>

              <View style={styles.metricsPillRow}>
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>{pendingReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>{inProgressReqCount}</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>{completedReqCount}</Text>
                  <Text style={styles.metricItemLabel}>Completed</Text>
                </View>
              </View>
            </View>

            {/* 3. Product Overview */}
            <View style={styles.sectionBlockCard}>
              <View style={styles.blockTitleRow}>
                <View>
                  <Text style={styles.blockTitle}>Product Overview</Text>
                  <Text style={styles.blockSubtitle}>[ Product Inventory ]   [ Inbound & Outbound ]</Text>
                </View>
              </View>

              <View style={styles.pillSelectorRow}>
                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'inventory' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('inventory')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'inventory' && styles.pillSelectTextActive]}>
                    Product Inventory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillSelectBtn, productOverviewTab === 'movement' && styles.pillSelectBtnActive]}
                  onPress={() => setProductOverviewTab('movement')}
                >
                  <Text style={[styles.pillSelectText, productOverviewTab === 'movement' && styles.pillSelectTextActive]}>
                    Inbound & Outbound
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.emptyFootnote}>Requisitioned items automatically populated upon dispatch</Text>
            </View>

            {/* 4. PRIMARY ACTION BUTTON matching SVG: + Raise Inventory Request */}
            <TouchableOpacity
              style={styles.raiseRequestBtn}
              activeOpacity={0.88}
              onPress={() => onNavigateTab && onNavigateTab('raise-requests')}
            >
              <LinearGradient
                colors={['#9148F7', '#7138E8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.raiseRequestGradient}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.raiseRequestText}>Raise Inventory Request</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },

  // --- Top Header on White Area ---
  whiteDashboardHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBox: {
    width: 31,
    height: 31,
    borderRadius: 7,
    backgroundColor: '#2B1A52',
    borderWidth: 1,
    borderColor: '#8E61E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandIconTextTop: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 8,
  },
  brandIconTextBot: {
    fontSize: 6,
    fontWeight: '800',
    color: '#DCCBFF',
    lineHeight: 8,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: '#2B1A52',
    borderWidth: 1,
    borderColor: '#8E61E8',
  },
  roleBadgeOps: {
    backgroundColor: '#073A50',
  },
  roleBadgeGround: {
    backgroundColor: '#1A2D27',
  },
  roleBadgePlanner: {
    backgroundColor: '#3B2712',
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  roleBadgeTextAdmin: {
    color: '#FFFFFF',
  },
  roleBadgeTextOps: {
    color: '#66D8FF',
  },
  roleBadgeTextGround: {
    color: '#20C997',
  },
  roleBadgeTextPlanner: {
    color: '#F59E0B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerDashboardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.3,
  },
  // --- Dynamic Unified Scope & Location Dropdown Bar (On White) ---
  splitDropdownRow: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  splitDropdownBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2DCF0',
  },
  splitDropdownBtnActiveWh: {
    backgroundColor: '#F3EEFF',
    borderColor: '#8235F4',
  },
  splitDropdownBtnActiveEv: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  splitDropdownBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2DCF0',
  },
  splitDropdownTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  splitDropdownPrefix: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#706584',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  splitDropdownPrefixActiveWh: {
    color: '#8235F4',
  },
  splitDropdownPrefixActiveEv: {
    color: '#4F46E5',
  },
  splitDropdownValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E1435',
    marginTop: -1,
  },
  splitDropdownValueActiveWh: {
    color: '#1E1435',
  },
  splitDropdownValueActiveEv: {
    color: '#1E1435',
  },

  // --- Single Full-Width Dropdown Bar (Only Warehouse or Only Event) ---
  singleFullDropdownBar: {
    marginTop: 10,
    width: '100%',
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  singleFullDropdownPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
    marginRight: 6,
  },
  singleFullDropdownValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E1435',
    flex: 1,
  },
  singleFullCountBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 4,
  },
  singleFullCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8235F4',
  },

  // --- Unassigned Full-Width Bar (Null) ---
  unassignedFullDropdownBar: {
    marginTop: 10,
    width: '100%',
    height: 44,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unassignedFullPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginRight: 6,
  },
  unassignedFullValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  unassignedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginRight: 4,
  },
  unassignedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationDropdownModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAFE',
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#21183B',
  },
  modalHeaderSubtitle: {
    fontSize: 10.5,
    color: '#777187',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  locationOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  locationOptionRowActive: {
    backgroundColor: '#F0EAFE',
  },
  locationOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#33294D',
  },
  locationOptionTitleActive: {
    color: '#6D43C0',
    fontWeight: '800',
  },
  locationOptionDesc: {
    fontSize: 9.5,
    color: '#777187',
    marginTop: 1,
  },

  // --- Scroll Body ---
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  cardHeaderRow: {
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#211637',
  },
  cardSectionSub: {
    fontSize: 11,
    color: '#77718B',
    marginTop: 1,
  },

  // --- 2x2 KPI Grid ---
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#7E7795',
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#211637',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 10,
    color: '#8A849C',
    marginTop: 2,
  },

  // --- Section Block Card ---
  sectionBlockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    padding: 14,
    marginBottom: 12,
  },
  alertBorderCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  blockTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#211637',
  },
  blockSubtitle: {
    fontSize: 10.5,
    color: '#77718B',
    marginTop: 1,
  },

  // Warehouse Metrics Pill Row
  metricsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8F7FC',
    borderRadius: 10,
    paddingVertical: 10,
  },
  taskChipBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskChipActive: {
    backgroundColor: '#EEE7FF',
  },
  metricItemCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricItemNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#211637',
  },
  metricItemLabel: {
    fontSize: 10,
    color: '#77718B',
    marginTop: 2,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E0F0',
  },
  distributionBar: {
    flexDirection: 'row',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
  },
  barSegment: {
    height: '100%',
  },

  // Fulfillment Row
  fulfillmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fulfillBox: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  fulfillNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#211637',
  },
  fulfillTag: {
    fontSize: 9.5,
    color: '#77718B',
    textAlign: 'center',
    marginTop: 2,
  },

  // Workload Tags
  workloadTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  workloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  workloadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#302849',
  },

  // Attention Alert Item
  attentionAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 6,
  },
  attentionAlertText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },

  // Sub-tabs Pill Selector: [ Product Inventory ] [ Inbound & Outbound ]
  pillSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F0EDF7',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  pillSelectBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  pillSelectBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pillSelectText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#706984',
  },
  pillSelectTextActive: {
    color: '#8235F4',
    fontWeight: '700',
  },

  productSampleList: {
    marginTop: 4,
  },
  productItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  productItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211637',
  },
  productItemSku: {
    fontSize: 10,
    color: '#7E7795',
  },
  productItemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8235F4',
  },
  emptyFootnote: {
    fontSize: 10,
    color: '#9C95B7',
    textAlign: 'center',
    marginTop: 8,
  },

  // --- Pipeline Stages (Warehouse Ground) ---
  stagePipelineRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stageBadge: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  stageBadgeActive: {
    backgroundColor: '#EEE7FF',
    borderWidth: 1,
    borderColor: '#C8B8FF',
  },
  stageBadgeText: {
    fontSize: 10,
    color: '#706984',
    fontWeight: '600',
  },
  stageBadgeTextActive: {
    fontSize: 10,
    color: '#8235F4',
    fontWeight: '700',
  },
  footnoteMini: {
    fontSize: 9.5,
    color: '#8A849C',
    marginTop: 8,
  },

  // --- Low Stock Action Card (Warehouse Ground) ---
  lowStockActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  lowStockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  lowStockCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  lowStockCardSub: {
    fontSize: 10,
    color: '#77718B',
    marginTop: 1,
  },
  lowStockBadgeCount: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockBadgeCountText: {
    color: '#B91C1C',
    fontSize: 10.5,
    fontWeight: '800',
  },

  // --- Event Hero Box (Event Ground & Planner) ---
  eventHeroBox: {
    backgroundColor: '#F8F7FC',
    borderRadius: 10,
    padding: 12,
  },
  eventHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#211637',
  },
  eventLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5FAF3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#159A79',
    marginRight: 5,
  },
  eventLiveText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#159A79',
  },
  eventUpcomingBadge: {
    backgroundColor: '#FFF0D9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  eventUpcomingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D28A22',
  },
  eventHeroMeta: {
    fontSize: 11,
    color: '#706984',
    marginTop: 2,
  },
  eventHeroLead: {
    fontSize: 10.5,
    color: '#8235F4',
    fontWeight: '600',
    marginTop: 4,
  },

  // --- Raise Request Gradient Button (Event Planner) ---
  raiseRequestBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  raiseRequestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  raiseRequestText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // --- Inventory Overview Section & Tables ---
  inventoryOverviewSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  inventorySectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inventorySectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.2,
  },
  inventorySectionMainSub: {
    fontSize: 11,
    color: '#7E7694',
    marginTop: 2,
  },
  liveInventoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: -5,
  },
  liveInventoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveInventoryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  invTabsNavBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    marginBottom: 12,
    gap: 4,
  },
  invNavTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
    position: 'relative',
  },
  invNavTabBtnActive: {
    backgroundColor: '#F3EEFF',
  },
  invNavTabBtnActiveDamage: {
    backgroundColor: '#FEE2E2',
  },
  invNavTabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6B6480',
  },
  invNavTabTextActive: {
    color: '#8235F4',
    fontWeight: '800',
  },
  invNavTabTextActiveDamage: {
    color: '#DC2626',
    fontWeight: '800',
  },
  invNavIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#8235F4',
  },
  invTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    overflow: 'hidden',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tableTopControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDF7',
    backgroundColor: '#FAF9FD',
  },
  tableSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDF0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  tableSearchInput: {
    flex: 1,
    fontSize: 11.5,
    color: '#211637',
    marginLeft: 6,
    paddingVertical: 0,
  },
  tableScrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tableScrollHintText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8235F4',
    marginLeft: 4,
  },
  tableScrollInner: {
    paddingHorizontal: 12,
  },
  tableContainer: {
    flexDirection: 'column',
  },
  tableMainBox: {
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F0ECFA',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
  },
  tableHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#372064',
  },
  emptyTableState: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#372064',
    marginTop: 8,
  },
  emptyTableSubText: {
    fontSize: 10.5,
    color: '#8B8498',
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
  },
  tableDataRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableDataRowOdd: {
    backgroundColor: '#FAF8FE',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#FAF8FE',
  },
  tableCell: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  tableDataCell: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  cellMainText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#211642',
  },
  cellSubBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cellSkuBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8235F4',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cellCatText: {
    fontSize: 9.5,
    color: '#706584',
  },
  cellNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#372064',
  },
  cellSubHint: {
    fontSize: 9.5,
    color: '#706584',
    marginTop: 1,
  },
  uomPill: {
    backgroundColor: '#F0EDF7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uomPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#655D7C',
  },
  reservedQtyBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reservedQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8235F4',
  },
  damageQtyBadgeActive: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  damageQtyBadgeZero: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  damageQtyTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  damageQtyTextZero: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  totalAvailBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  totalAvailText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  valueText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E1435',
  },
  tableFooterBar: {
    backgroundColor: '#FAF9FD',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EDF7',
  },
  tableFooterText: {
    fontSize: 10,
    color: '#8A83A2',
    fontWeight: '600',
  },
  inboundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inboundBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  outboundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  outboundBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  doneByRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInitialCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EDE7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  userInitialText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8235F4',
  },
  doneByNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2A1F45',
  },
  damageBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  damageBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  damagedByText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#372E4D',
  },
});
