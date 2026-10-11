import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';
import { masterService } from '../../services/masterService';
import TablePagination from '../../components/TablePagination';

// --- DEFAULT INVENTORY DATASETS (TABLES) ---
const DEFAULT_PRODUCT_INVENTORY = [
  {
    id: 'PRD-001',
    name: 'Item 22',
    sku: 'TEST',
    uom: 'Pcs',
    availableQty: 450,
    reservedQty: 50,
    damageQty: 12,
    totalAvailableQty: 388,
    value: '₹6,75,000',
    category: 'Electronics',
  },
  {
    id: 'PRD-002',
    name: 'Portable Speaker',
    sku: 'AUD-002',
    uom: 'Pcs',
    availableQty: 38,
    reservedQty: 10,
    damageQty: 2,
    totalAvailableQty: 26,
    value: '₹1,59,600',
    category: 'Sound & Audio',
  },
  {
    id: 'PRD-003',
    name: 'Event Banner',
    sku: 'BRD-008',
    uom: 'Pcs',
    availableQty: 120,
    reservedQty: 30,
    damageQty: 5,
    totalAvailableQty: 85,
    value: '₹1,02,000',
    category: 'Event Branding',
  },
  {
    id: 'PRD-004',
    name: 'Folding VIP Chair',
    sku: 'FUR-019',
    uom: 'Pcs',
    availableQty: 320,
    reservedQty: 80,
    damageQty: 8,
    totalAvailableQty: 232,
    value: '₹3,84,000',
    category: 'Furniture',
  },
  {
    id: 'PRD-005',
    name: 'LED Spotlight 200W',
    sku: 'LGT-004',
    uom: 'Pcs',
    availableQty: 64,
    reservedQty: 14,
    damageQty: 3,
    totalAvailableQty: 47,
    value: '₹1,98,400',
    category: 'Lighting & Truss',
  },
  {
    id: 'PRD-006',
    name: 'Wireless Mic Set',
    sku: 'AUD-010',
    uom: 'Set',
    availableQty: 25,
    reservedQty: 5,
    damageQty: 1,
    totalAvailableQty: 19,
    value: '₹1,37,500',
    category: 'Sound & Audio',
  },
  {
    id: 'PRD-007',
    name: 'Stage Barrier Heavy',
    sku: 'STG-003',
    uom: 'Mtr',
    availableQty: 85,
    reservedQty: 25,
    damageQty: 4,
    totalAvailableQty: 56,
    value: '₹2,12,500',
    category: 'Stage & Truss',
  },
  {
    id: 'PRD-008',
    name: 'Heavy Cable 50M',
    sku: 'CBL-001',
    uom: 'Pcs',
    availableQty: 110,
    reservedQty: 20,
    damageQty: 6,
    totalAvailableQty: 84,
    value: '₹1,65,000',
    category: 'Electronics',
  },
];

const DEFAULT_INBOUND_OUTBOUND = [
  {
    id: 'IO-001',
    dateTime: '10 Oct, 01:45 PM',
    type: 'Inbound',
    productName: 'Portable Speaker (AUD-002)',
    qty: '+20 Pcs',
    doneBy: 'Rahul Kumar',
  },
  {
    id: 'IO-002',
    dateTime: '10 Oct, 12:30 PM',
    type: 'Outbound',
    productName: 'Folding VIP Chair (FUR-019)',
    qty: '-50 Pcs',
    doneBy: 'Amit More',
  },
  {
    id: 'IO-003',
    dateTime: '10 Oct, 11:15 AM',
    type: 'Inbound',
    productName: 'LED Spotlight 200W (LGT-004)',
    qty: '+15 Pcs',
    doneBy: 'Sneha Patil',
  },
  {
    id: 'IO-004',
    dateTime: '09 Oct, 05:20 PM',
    type: 'Outbound',
    productName: 'Item 22 (TEST)',
    qty: '-40 Pcs',
    doneBy: 'Vikram Singh',
  },
  {
    id: 'IO-005',
    dateTime: '09 Oct, 03:40 PM',
    type: 'Inbound',
    productName: 'Event Banner (BRD-008)',
    qty: '+30 Pcs',
    doneBy: 'Pooja Sharma',
  },
  {
    id: 'IO-006',
    dateTime: '09 Oct, 01:10 PM',
    type: 'Outbound',
    productName: 'Wireless Mic Set (AUD-010)',
    qty: '-8 Sets',
    doneBy: 'Rahul Kumar',
  },
  {
    id: 'IO-007',
    dateTime: '08 Oct, 04:30 PM',
    type: 'Inbound',
    productName: 'Stage Barrier Heavy (STG-003)',
    qty: '+25 Mtr',
    doneBy: 'Amit More',
  },
  {
    id: 'IO-008',
    dateTime: '08 Oct, 10:00 AM',
    type: 'Outbound',
    productName: 'Heavy Cable 50M (CBL-001)',
    qty: '-15 Pcs',
    doneBy: 'Vikram Singh',
  },
];

const DEFAULT_DAMAGED_PRODUCTS = [
  {
    id: 'DMG-001',
    productName: 'Portable Speaker (AUD-002)',
    qty: '2 Pcs',
    damagedBy: 'Rahul Kumar · Transit dent on front grill',
  },
  {
    id: 'DMG-002',
    productName: 'Folding VIP Chair (FUR-019)',
    qty: '8 Pcs',
    damagedBy: 'Amit More · Leg hinge bent during load',
  },
  {
    id: 'DMG-003',
    productName: 'LED Spotlight 200W (LGT-004)',
    qty: '3 Pcs',
    damagedBy: 'Vikram Singh · Lens cracked during unloading',
  },
  {
    id: 'DMG-004',
    productName: 'Event Banner (BRD-008)',
    qty: '5 Pcs',
    damagedBy: 'Pooja Sharma · Vinyl tear in heavy wind',
  },
  {
    id: 'DMG-005',
    productName: 'Stage Barrier Heavy (STG-003)',
    qty: '4 Mtr',
    damagedBy: 'Ground Crew · Lock latch snapped',
  },
  {
    id: 'DMG-006',
    productName: 'Heavy Cable 50M (CBL-001)',
    qty: '6 Pcs',
    damagedBy: 'Sneha Patil · Connector insulation sliced',
  },
  {
    id: 'DMG-007',
    productName: 'Item 22 (TEST)',
    qty: '12 Pcs',
    damagedBy: 'Ravi Verma · Housing cracked during staging',
  },
];

export default function DashboardTabScreen({ session, onLogout, onNavigateTab }) {
  const roleName = session?.role || 'Admin';

  // Normalize role
  const normalizedRole = roleName.toLowerCase().trim();
  const isAdmin = normalizedRole.includes('admin');
  const isOpsManager = normalizedRole.includes('operations');
  const isWarehouseGround = normalizedRole.includes('warehouse') && normalizedRole.includes('ground');
  const isEventGround = normalizedRole.includes('event') && normalizedRole.includes('ground');
  const isEventPlanner = normalizedRole.includes('planner');

  // Subtitle scope label matching SVG
  let scopeLabel = 'Global access';
  let roleBadgeText = 'ADMIN';
  let badgeStyle = styles.roleBadgeAdmin;
  let badgeTextStyle = styles.roleBadgeTextAdmin;

  if (isOpsManager) {
    scopeLabel = 'Assigned warehouse only';
    roleBadgeText = 'OPERATIONS MANAGER';
    badgeStyle = styles.roleBadgeOps;
    badgeTextStyle = styles.roleBadgeTextOps;
  } else if (isWarehouseGround) {
    scopeLabel = 'Assigned warehouse only';
    roleBadgeText = 'WAREHOUSE GROUND';
    badgeStyle = styles.roleBadgeGround;
    badgeTextStyle = styles.roleBadgeTextGround;
  } else if (isEventGround) {
    scopeLabel = 'Assigned event only';
    roleBadgeText = 'EVENT GROUND';
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

  // Dynamic Product Inventory: merged with masterService products
  const masterProducts = (masterService && typeof masterService.getProducts === 'function')
    ? masterService.getProducts()
    : [];
  const productInventoryList = [...DEFAULT_PRODUCT_INVENTORY];
  masterProducts.forEach((mp) => {
    if (
      !productInventoryList.some(
        (p) =>
          p.name.toLowerCase() === mp.name.toLowerCase() ||
          p.sku.toUpperCase() === (mp.sku || '').toUpperCase()
      )
    ) {
      const avail = 50;
      const res = 5;
      const dmg = 0;
      const tot = avail - res - dmg;
      const val = (mp.unitPrice || 1200) * avail;
      productInventoryList.push({
        id: mp.id,
        name: mp.name,
        sku: mp.sku || 'SKU',
        uom: mp.uom?.includes('Pcs') ? 'Pcs' : mp.uom || 'Pcs',
        availableQty: avail,
        reservedQty: res,
        damageQty: dmg,
        totalAvailableQty: tot,
        value: `₹${val.toLocaleString('en-IN')}`,
        category: mp.category,
      });
    }
  });

  const filteredProductInventory = productInventoryList.filter((item) => {
    if (!invSearchQuery.trim()) return true;
    const q = invSearchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  const filteredInboundOutbound = DEFAULT_INBOUND_OUTBOUND.filter((item) => {
    if (!invSearchQuery.trim()) return true;
    const q = invSearchQuery.toLowerCase();
    return (
      item.productName.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.doneBy.toLowerCase().includes(q) ||
      item.dateTime.toLowerCase().includes(q)
    );
  });

  const filteredDamagedProducts = DEFAULT_DAMAGED_PRODUCTS.filter((item) => {
    if (!invSearchQuery.trim()) return true;
    const q = invSearchQuery.toLowerCase();
    return (
      item.productName.toLowerCase().includes(q) ||
      item.damagedBy.toLowerCase().includes(q) ||
      item.qty.toLowerCase().includes(q)
    );
  });

  // 10-Row Table Pagination
  const [invPage, setInvPage] = useState(1);
  const INV_PER_PAGE = 10;

  React.useEffect(() => {
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
      {/* ========================================================= */}
      {/* 1. TOP NAVY HEADER WITH ROLE BADGE & SCOPE                */}
      {/* ========================================================= */}
      <View style={styles.navyHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            {/* Square 3D brand logo box */}
            <View style={styles.brandIconBox}>
              <Text style={styles.brandIconTextTop}>DIST</Text>
              <Text style={styles.brandIconTextBot}>STOCK</Text>
            </View>

            <View style={styles.brandTextCol}>
              <Text style={styles.brandTitle}>DISTRICT STOCK</Text>
              <View style={[styles.roleBadge, badgeStyle]}>
                <Text style={[styles.roleBadgeText, badgeTextStyle]}>{roleBadgeText}</Text>
              </View>
            </View>
          </View>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={14} color="#D8B4FE" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerDashboardTitle}>Dashboard</Text>
        <View style={styles.scopeRow}>
          <View style={styles.scopeDot} />
          <Text style={styles.headerScopeSubtitle}>
            {scopeLabel}
            {session?.assignedLocations?.length
              ? ` · ${session.assignedLocations.join(' · ')}`
              : ''}
          </Text>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 2. SCROLLABLE DASHBOARD CONTENT (ROLE-SPECIFIC)           */}
      {/* ========================================================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
                <Text style={styles.kpiValue}>14</Text>
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
                <Text style={styles.kpiValue}>3</Text>
                <Text style={styles.kpiSub}>In progress</Text>
              </TouchableOpacity>

              {/* Card 3: COMPLETED */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiLabel}>COMPLETED</Text>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#159A79" />
                </View>
                <Text style={styles.kpiValue}>89</Text>
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
                <Text style={styles.kpiValue}>5</Text>
                <Text style={styles.kpiSub}>Needs review</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Inventory Overview Section */}
            <View style={styles.inventoryOverviewSection}>
              {/* Header Row */}
              <View style={styles.inventorySectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inventorySectionMainTitle}>Inventory Overview</Text>
                  <Text style={styles.inventorySectionMainSub}>
                    Live catalog, stock distribution, movement logs & damage audits
                  </Text>
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
                  <MaterialCommunityIcons
                    name="view-list"
                    size={16}
                    color={inventoryTab === 'product_inventory' ? '#8235F4' : '#64748B'}
                  />
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
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={16}
                    color={inventoryTab === 'inbound_outbound' ? '#8235F4' : '#64748B'}
                  />
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
                  <MaterialCommunityIcons
                    name="alert-octagon"
                    size={16}
                    color={inventoryTab === 'damaged_products' ? '#D9485F' : '#64748B'}
                  />
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
                  {/* Top Toolbar */}
                  <View style={styles.tableTopControls}>
                    <View style={styles.tableSearchBox}>
                      <Ionicons name="search" size={14} color="#7E7795" />
                      <TextInput
                        style={styles.tableSearchInput}
                        placeholder="Search product name, category, SKU..."
                        placeholderTextColor="#9C95B7"
                        value={invSearchQuery}
                        onChangeText={setInvSearchQuery}
                      />
                      {invSearchQuery ? (
                        <TouchableOpacity onPress={() => setInvSearchQuery('')}>
                          <Ionicons name="close-circle" size={15} color="#8A849C" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.tableScrollHint}>
                      <Ionicons name="swap-horizontal" size={13} color="#8235F4" />
                      <Text style={styles.tableScrollHintText}>Scroll ⇄</Text>
                    </View>
                  </View>

                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableContainer}>
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
                          <Text style={styles.emptyTableStateText}>No products match your search</Text>
                        </View>
                      ) : (
                        paginatedProductInventory.map((item, index) => {
                          const isEven = index % 2 === 0;
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableRow,
                                isEven ? styles.tableRowEven : styles.tableRowOdd,
                              ]}
                            >
                              {/* Product Name */}
                              <View style={[styles.tableCell, { width: 175 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.name}</Text>
                                <View style={styles.cellSubBadgeRow}>
                                  <Text style={styles.cellSkuBadge}>{item.sku}</Text>
                                  {item.category ? (
                                    <Text style={styles.cellCatText}> · {item.category}</Text>
                                  ) : null}
                                </View>
                              </View>

                              {/* UoM */}
                              <View style={[styles.tableCell, { width: 70, alignItems: 'center' }]}>
                                <View style={styles.uomPill}>
                                  <Text style={styles.uomPillText}>{item.uom}</Text>
                                </View>
                              </View>

                              {/* Available Qty */}
                              <View style={[styles.tableCell, { width: 105, alignItems: 'flex-end' }]}>
                                <Text style={styles.cellNumberText}>{item.availableQty}</Text>
                                <Text style={styles.cellSubHint}>in warehouse</Text>
                              </View>

                              {/* Reserved Qty */}
                              <View style={[styles.tableCell, { width: 105, alignItems: 'flex-end' }]}>
                                <View style={styles.reservedQtyBadge}>
                                  <Text style={styles.reservedQtyText}>{item.reservedQty}</Text>
                                </View>
                                <Text style={styles.cellSubHint}>allocated</Text>
                              </View>

                              {/* Damage Qty */}
                              <View style={[styles.tableCell, { width: 100, alignItems: 'flex-end' }]}>
                                <View style={item.damageQty > 0 ? styles.damageQtyBadgeActive : styles.damageQtyBadgeZero}>
                                  <Text style={item.damageQty > 0 ? styles.damageQtyTextActive : styles.damageQtyTextZero}>
                                    {item.damageQty}
                                  </Text>
                                </View>
                                <Text style={styles.cellSubHint}>{item.damageQty > 0 ? 'damaged' : 'zero'}</Text>
                              </View>

                              {/* Total Available Qty */}
                              <View style={[styles.tableCell, { width: 140, alignItems: 'flex-end' }]}>
                                <View style={styles.totalAvailBadge}>
                                  <Text style={styles.totalAvailText}>{item.totalAvailableQty}</Text>
                                </View>
                                <Text style={styles.cellSubHint}>net usable</Text>
                              </View>

                              {/* Value */}
                              <View style={[styles.tableCell, { width: 115, alignItems: 'flex-end' }]}>
                                <Text style={styles.valueText}>{item.value}</Text>
                                <Text style={styles.cellSubHint}>inventory asset</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>

                  {/* 10-Row Table Pagination matching user screenshot */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredProductInventory.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#38BDF8"
                  />
                </View>
              )}

              {/* TAB 2: INBOUND & OUTBOUND TABLE */}
              {inventoryTab === 'inbound_outbound' && (
                <View style={styles.invTableCard}>
                  {/* Top Toolbar */}
                  <View style={styles.tableTopControls}>
                    <View style={styles.tableSearchBox}>
                      <Ionicons name="search" size={14} color="#7E7795" />
                      <TextInput
                        style={styles.tableSearchInput}
                        placeholder="Search date, type, product, handler..."
                        placeholderTextColor="#9C95B7"
                        value={invSearchQuery}
                        onChangeText={setInvSearchQuery}
                      />
                      {invSearchQuery ? (
                        <TouchableOpacity onPress={() => setInvSearchQuery('')}>
                          <Ionicons name="close-circle" size={15} color="#8A849C" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.tableScrollHint}>
                      <Ionicons name="swap-horizontal" size={13} color="#8235F4" />
                      <Text style={styles.tableScrollHintText}>Scroll ⇄</Text>
                    </View>
                  </View>

                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableContainer}>
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
                          <Text style={styles.emptyTableStateText}>No movement logs match your search</Text>
                        </View>
                      ) : (
                        paginatedInboundOutbound.map((item, index) => {
                          const isEven = index % 2 === 0;
                          const isInbound = item.type.toLowerCase().includes('in');
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableRow,
                                isEven ? styles.tableRowEven : styles.tableRowOdd,
                              ]}
                            >
                              {/* Date and Time */}
                              <View style={[styles.tableCell, { width: 145 }]}>
                                <Text style={styles.cellMainText}>{item.dateTime}</Text>
                                <Text style={styles.cellSubHint}>timestamp</Text>
                              </View>

                              {/* Type */}
                              <View style={[styles.tableCell, { width: 110, alignItems: 'center' }]}>
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
                              <View style={[styles.tableCell, { width: 195 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.productName}</Text>
                                <Text style={styles.cellSubHint}>catalog item</Text>
                              </View>

                              {/* Qty */}
                              <View style={[styles.tableCell, { width: 95, alignItems: 'flex-end' }]}>
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
                              <View style={[styles.tableCell, { width: 145 }]}>
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

                  {/* 10-Row Table Pagination matching user screenshot */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredInboundOutbound.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#38BDF8"
                  />
                </View>
              )}

              {/* TAB 3: DAMAGED PRODUCTS TABLE */}
              {inventoryTab === 'damaged_products' && (
                <View style={styles.invTableCard}>
                  {/* Top Toolbar */}
                  <View style={styles.tableTopControls}>
                    <View style={styles.tableSearchBox}>
                      <Ionicons name="search" size={14} color="#7E7795" />
                      <TextInput
                        style={styles.tableSearchInput}
                        placeholder="Search damaged item, quantity, reporter..."
                        placeholderTextColor="#9C95B7"
                        value={invSearchQuery}
                        onChangeText={setInvSearchQuery}
                      />
                      {invSearchQuery ? (
                        <TouchableOpacity onPress={() => setInvSearchQuery('')}>
                          <Ionicons name="close-circle" size={15} color="#8A849C" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.tableScrollHint}>
                      <Ionicons name="swap-horizontal" size={13} color="#8235F4" />
                      <Text style={styles.tableScrollHintText}>Scroll ⇄</Text>
                    </View>
                  </View>

                  {/* Horizontal Scrollable Table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.tableScrollInner}
                  >
                    <View style={styles.tableContainer}>
                      {/* Header */}
                      <View style={[styles.tableHeaderRow, { backgroundColor: '#261219' }]}>
                        <View style={[styles.tableHeaderCell, { width: 200 }]}>
                          <Text style={[styles.tableHeaderText, { color: '#FECDD3' }]}>PRODUCT NAME</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 95, alignItems: 'center' }]}>
                          <Text style={[styles.tableHeaderText, { color: '#FECDD3' }]}>QTY</Text>
                        </View>
                        <View style={[styles.tableHeaderCell, { width: 280 }]}>
                          <Text style={[styles.tableHeaderText, { color: '#FECDD3' }]}>DAMAGED BY</Text>
                        </View>
                      </View>

                      {/* Body */}
                      {filteredDamagedProducts.length === 0 ? (
                        <View style={styles.emptyTableState}>
                          <Text style={styles.emptyTableStateText}>No damaged product records found</Text>
                        </View>
                      ) : (
                        paginatedDamagedProducts.map((item, index) => {
                          const isEven = index % 2 === 0;
                          return (
                            <View
                              key={item.id || String(index)}
                              style={[
                                styles.tableRow,
                                isEven ? styles.tableRowEven : styles.tableRowOdd,
                              ]}
                            >
                              {/* Product Name */}
                              <View style={[styles.tableCell, { width: 200 }]}>
                                <Text style={styles.cellMainText} numberOfLines={1}>{item.productName}</Text>
                                <Text style={[styles.cellSubHint, { color: '#D9485F' }]}>Under damage review</Text>
                              </View>

                              {/* Qty */}
                              <View style={[styles.tableCell, { width: 95, alignItems: 'center' }]}>
                                <View style={styles.damageBadgePill}>
                                  <Ionicons name="alert-circle" size={12} color="#DC2626" style={{ marginRight: 3 }} />
                                  <Text style={styles.damageBadgePillText}>{item.qty}</Text>
                                </View>
                              </View>

                              {/* Damaged By */}
                              <View style={[styles.tableCell, { width: 280 }]}>
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

                  {/* 10-Row Table Pagination matching user screenshot */}
                  <TablePagination
                    currentPage={invPage}
                    totalItems={filteredDamagedProducts.length}
                    itemsPerPage={INV_PER_PAGE}
                    onPageChange={setInvPage}
                    primaryColor="#38BDF8"
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
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>4</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </TouchableOpacity>

                <View style={styles.metricDivider} />

                <TouchableOpacity
                  style={[styles.taskChipBox, taskFilter === 'in_progress' && styles.taskChipActive]}
                  onPress={() => setTaskFilter(taskFilter === 'in_progress' ? 'all' : 'in_progress')}
                >
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>2</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </TouchableOpacity>

                <View style={styles.metricDivider} />

                <TouchableOpacity
                  style={[styles.taskChipBox, taskFilter === 'completed' && styles.taskChipActive]}
                  onPress={() => setTaskFilter(taskFilter === 'completed' ? 'all' : 'completed')}
                >
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>18</Text>
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
                  <Text style={styles.stageBadgeTextActive}>Putaway (2 Active)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>Generated (1)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>Completed (14)</Text>
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
                  <Text style={styles.stageBadgeTextActive}>In Progress (3 Active)</Text>
                </View>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>P-Completed (2)</Text>
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
                <Text style={styles.lowStockBadgeCountText}>5 Items</Text>
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
                  <Text style={styles.eventHeroTitle}>City Music Fest 2026</Text>
                  <View style={styles.eventLiveBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.eventLiveText}>Live On-Ground</Text>
                  </View>
                </View>
                <Text style={styles.eventHeroMeta}>Mumbai · Jio Garden · Oct 10–12</Text>
                <Text style={styles.eventHeroLead}>Lead Planner: Sneha Patil</Text>
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
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>3</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>2</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>12</Text>
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
                  <Text style={styles.eventHeroTitle}>City Music Fest & Brand Launch</Text>
                  <View style={styles.eventUpcomingBadge}>
                    <Text style={styles.eventUpcomingText}>2 Upcoming</Text>
                  </View>
                </View>
                <Text style={styles.eventHeroMeta}>Mumbai & Pune hubs · Staging active</Text>
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
                  <Text style={[styles.metricItemNum, { color: '#8235F4' }]}>5</Text>
                  <Text style={styles.metricItemLabel}>Pending</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#0284C7' }]}>3</Text>
                  <Text style={styles.metricItemLabel}>In Progress</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItemCol}>
                  <Text style={[styles.metricItemNum, { color: '#159A79' }]}>21</Text>
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

  // --- Top Navy Header ---
  navyHeader: {
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 14 : 14,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
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
    fontSize: 11.5,
    color: '#C9B9F0',
  },

  // --- Scroll Body ---
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 60,
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
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
    minWidth: '100%',
  },
  tableContainer: {
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1E1435',
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#E9DFFC',
    letterSpacing: 0.5,
  },
  emptyTableState: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableStateText: {
    fontSize: 12,
    color: '#8C85A3',
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECF8',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#FAF9FD',
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cellMainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1435',
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
    color: '#8C85A3',
  },
  cellNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1435',
  },
  cellSubHint: {
    fontSize: 9,
    color: '#9C95B7',
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
