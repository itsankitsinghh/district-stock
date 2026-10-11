import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { masterService } from '../../services/masterService';
import { COLORS } from '../../theme/colors';

// Tracking type choices
const TRACKING_TYPES = ['Countable', 'Serial Track', 'Consumable'];
const UOM_LIST = ['Pieces (Pcs)', 'Boxes (Box)', 'Meters (Mtr)', 'Sets (Set)', 'Units'];
const RETURNABILITY_LIST = ['Returnable', 'Consumable'];

export default function MasterTabScreen({ session, onLogout }) {
  const userRole = session?.role || 'Admin';
  const isOpsManager = userRole === 'Operations Manager';

  // Connected Navigation State
  // Level 1: 'product' | 'warehouse' | 'event'
  const [level1Tab, setLevel1Tab] = useState('product');
  // Level 2 (under Product): 'productList' | 'settings'
  const [level2Tab, setLevel2Tab] = useState('productList');
  // Level 3 (under Settings): 'category' | 'productType'
  const [level3Tab, setLevel3Tab] = useState('category');

  // Master Data States
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [trackingFilter, setTrackingFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Action Menus
  const [activeModal, setActiveModal] = useState(null); // 'productModal' | 'warehouseModal' | 'eventModal' | 'categoryModal' | 'productTypeModal' | 'actionSheet' | null
  const [editingItem, setEditingItem] = useState(null);
  const [actionTarget, setActionTarget] = useState(null); // { type: 'product'|'warehouse'|'event'|'category'|'productType', data: item }

  // Form States - Product
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pTrackingType, setPTrackingType] = useState('Countable');
  const [pCategory, setPCategory] = useState('Electronics');
  const [pUom, setPUom] = useState('Pieces (Pcs)');
  const [pLowStock, setPLowStock] = useState('10');
  const [pUnitPrice, setPUnitPrice] = useState('0.00');
  const [pReturnability, setPReturnability] = useState('Returnable');
  const [pNotes, setPNotes] = useState('');
  const [pStatus, setPStatus] = useState(true);
  const [formError, setFormError] = useState('');

  // Form States - Warehouse
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whCity, setWhCity] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whStatus, setWhStatus] = useState(true);

  // Form States - Event
  const [evCode, setEvCode] = useState('');
  const [evName, setEvName] = useState('');
  const [evVenue, setEvVenue] = useState('');
  const [evDates, setEvDates] = useState('');
  const [evPlanner, setEvPlanner] = useState('Sneha Patil');
  const [evStatus, setEvStatus] = useState('Upcoming');

  // Form States - Category / Product Type
  const [catNameInput, setCatNameInput] = useState('');
  const [ptNameInput, setPtNameInput] = useState('');
  const [ptDescInput, setPtDescInput] = useState('');

  // Refresh Master Data
  const loadMasterData = () => {
    setProducts(masterService.getProducts());
    setWarehouses(
      isOpsManager
        ? masterService.getWarehouses(session?.assignedLocations || ['Warehouse A'])
        : masterService.getWarehouses()
    );
    setEvents(masterService.getEvents());
    setCategories(masterService.getCategories());
    setProductTypes(masterService.getProductTypes());
  };

  useEffect(() => {
    loadMasterData();
  }, [userRole]);

  // Open Add Product Form
  const handleOpenAddProduct = () => {
    setEditingItem(null);
    setPName('');
    setPSku('');
    setPTrackingType('Countable');
    setPCategory(categories[0]?.name || 'Electronics');
    setPUom('Pieces (Pcs)');
    setPLowStock('10');
    setPUnitPrice('0.00');
    setPReturnability('Returnable');
    setPNotes('');
    setPStatus(true);
    setFormError('');
    setActiveModal('productModal');
  };

  // Open Edit Product Form
  const handleOpenEditProduct = (item) => {
    setEditingItem(item);
    setPName(item.name);
    setPSku(item.sku);
    setPTrackingType(item.trackingType);
    setPCategory(item.category);
    setPUom(item.uom);
    setPLowStock(String(item.lowStockAlert || 10));
    setPUnitPrice(String(item.unitPrice || 0));
    setPReturnability(item.returnability);
    setPNotes(item.notes || '');
    setPStatus(item.status === 'active');
    setFormError('');
    setActiveModal('productModal');
  };

  // Save Product
  const handleSaveProduct = () => {
    if (!pName.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!pSku.trim()) {
      setFormError('Product Code / SKU is required.');
      return;
    }

    setFormError('');

    if (editingItem) {
      const res = masterService.updateProduct(editingItem.id, {
        name: pName.trim(),
        sku: pSku.trim(),
        trackingType: pTrackingType,
        category: pCategory,
        uom: pUom,
        lowStockAlert: Number(pLowStock) || 10,
        unitPrice: Number(pUnitPrice) || 0,
        returnability: pReturnability,
        notes: pNotes,
        status: pStatus ? 'active' : 'inactive',
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', 'Product updated successfully.');
      } else {
        setFormError(res.message);
      }
    } else {
      const res = masterService.addProduct({
        name: pName.trim(),
        sku: pSku.trim(),
        trackingType: pTrackingType,
        category: pCategory,
        uom: pUom,
        lowStockAlert: Number(pLowStock) || 10,
        unitPrice: Number(pUnitPrice) || 0,
        returnability: pReturnability,
        notes: pNotes,
        status: pStatus ? 'active' : 'inactive',
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', `Product "${res.product.name}" created.`);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Open Add Warehouse
  const handleOpenAddWarehouse = () => {
    setEditingItem(null);
    const nextNum = String(warehouses.length + 1).padStart(3, '0');
    setWhCode(`WH-${nextNum}`);
    setWhName('');
    setWhCity('');
    setWhAddress('');
    setWhStatus(true);
    setFormError('');
    setActiveModal('warehouseModal');
  };

  // Save Warehouse
  const handleSaveWarehouse = () => {
    if (!whName.trim() || !whCode.trim() || !whCity.trim()) {
      setFormError('Warehouse Name, Code, and City are required.');
      return;
    }
    setFormError('');

    if (editingItem) {
      const res = masterService.updateWarehouse(editingItem.id, {
        name: whName.trim(),
        code: whCode.trim(),
        city: whCity.trim(),
        address: whAddress.trim(),
        status: whStatus ? 'active' : 'inactive',
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', 'Warehouse updated successfully.');
      } else {
        setFormError(res.message);
      }
    } else {
      const res = masterService.addWarehouse({
        code: whCode.trim(),
        name: whName.trim(),
        city: whCity.trim(),
        address: whAddress.trim(),
        status: whStatus ? 'active' : 'inactive',
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', `Warehouse "${res.warehouse.name}" registered.`);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Open Add Event
  const handleOpenAddEvent = () => {
    setEditingItem(null);
    const nextNum = String(events.length + 1).padStart(3, '0');
    setEvCode(`EV-${nextNum}`);
    setEvName('');
    setEvVenue('');
    setEvDates('');
    setEvPlanner('Sneha Patil');
    setEvStatus('Upcoming');
    setFormError('');
    setActiveModal('eventModal');
  };

  // Save Event
  const handleSaveEvent = () => {
    if (!evName.trim() || !evCode.trim() || !evVenue.trim()) {
      setFormError('Event Name, Code, and Venue are required.');
      return;
    }
    setFormError('');

    if (editingItem) {
      const res = masterService.updateEvent(editingItem.id, {
        name: evName.trim(),
        code: evCode.trim(),
        venue: evVenue.trim(),
        dates: evDates.trim(),
        planner: evPlanner.trim(),
        status: evStatus,
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', 'Event details updated successfully.');
      } else {
        setFormError(res.message);
      }
    } else {
      const res = masterService.addEvent({
        code: evCode.trim(),
        name: evName.trim(),
        venue: evVenue.trim(),
        dates: evDates.trim(),
        planner: evPlanner.trim(),
        status: evStatus,
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', `Event "${res.event.name}" scheduled.`);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Save Category
  const handleSaveCategory = () => {
    if (!catNameInput.trim()) return;
    const res = masterService.addCategory(catNameInput.trim());
    if (res.success) {
      loadMasterData();
      setCatNameInput('');
      setActiveModal(null);
      Alert.alert('Success', `Category "${res.category.name}" added.`);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  // Save Product Type
  const handleSaveProductType = () => {
    if (!ptNameInput.trim()) return;
    const res = masterService.addProductType(ptNameInput.trim(), ptDescInput.trim());
    if (res.success) {
      loadMasterData();
      setPtNameInput('');
      setPtDescInput('');
      setActiveModal(null);
      Alert.alert('Success', `Product type "${res.productType.name}" added.`);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  // Open Three-Dot Action Sheet
  const handleOpenAction = (type, item) => {
    setActionTarget({ type, data: item });
    setActiveModal('actionSheet');
  };

  // Toggle Status from Action Sheet
  const handleToggleStatusAction = () => {
    if (!actionTarget) return;
    const { type, data } = actionTarget;
    if (type === 'product') {
      masterService.toggleProductStatus(data.id);
    } else if (type === 'warehouse') {
      masterService.toggleWarehouseStatus(data.id);
    } else if (type === 'event') {
      masterService.toggleEventStatus(data.id);
    } else if (type === 'category') {
      masterService.toggleCategoryStatus(data.id);
    } else if (type === 'productType') {
      masterService.toggleProductTypeStatus(data.id);
    }
    loadMasterData();
    setActiveModal(null);
    Alert.alert('Status Updated', 'Record status updated successfully.');
  };

  // Delete Action
  const handleDeleteAction = () => {
    if (!actionTarget) return;
    const { type, data } = actionTarget;
    Alert.alert(
      'Confirm Deactivation / Archive',
      `Are you sure you want to delete "${data.name || data.code}"? Deactivating is recommended over hard deletion.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive Record',
          style: 'destructive',
          onPress: () => {
            if (type === 'product') masterService.deleteProduct(data.id);
            else if (type === 'warehouse') masterService.deleteWarehouse(data.id);
            else if (type === 'event') masterService.deleteEvent(data.id);
            else if (type === 'category') masterService.deleteCategory(data.id);
            loadMasterData();
            setActiveModal(null);
            Alert.alert('Archived', 'Record removed from system catalog.');
          },
        },
      ]
    );
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    if (trackingFilter !== 'All' && p.trackingType !== trackingFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase()) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Filtered Warehouses
  const filteredWarehouses = warehouses.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      w.city.toLowerCase().includes(q)
    );
  });

  // Filtered Events
  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q)
    );
  });

  // Filtered Categories
  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // Filtered Product Types
  const filteredProductTypes = productTypes.filter((pt) => {
    if (!searchQuery.trim()) return true;
    return pt.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* 1. TOP NAVY GRADIENT HEADER                               */}
      {/* ========================================================= */}
      <View style={styles.navyHeader}>
        {/* Top Branding & Role Badge */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandContainer}>
            <View style={styles.brandIconBox}>
              <Text style={styles.brandIconTextTop}>DIST</Text>
              <Text style={styles.brandIconTextBot}>STOCK</Text>
            </View>
            <View style={styles.brandTextCol}>
              <Text style={styles.brandTitle}>DISTRICT STOCK</Text>
              <View
                style={[
                  styles.roleBadge,
                  isOpsManager ? styles.roleBadgeOps : styles.roleBadgeAdmin,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isOpsManager ? styles.roleBadgeTextOps : styles.roleBadgeTextAdmin,
                  ]}
                >
                  {isOpsManager ? 'OPERATION MANAGER' : 'ADMIN'}
                </Text>
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

        <Text style={styles.headerTitle}>Master Data</Text>

        {/* ========================================================= */}
        {/* 2. CONNECTED HIERARCHICAL TAB NAVIGATION                  */}
        {/* ========================================================= */}
        {/* LEVEL 1 TABS (Product · Warehouse · Event) */}
        <View style={styles.level1TabsRow}>
          {/* Tab 1: Product */}
          <TouchableOpacity
            style={[styles.l1Tab, level1Tab === 'product' && styles.l1TabActive]}
            onPress={() => setLevel1Tab('product')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="cube-outline"
              size={14}
              color={level1Tab === 'product' ? '#FFFFFF' : '#8B84A5'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.l1TabText, level1Tab === 'product' && styles.l1TabTextActive]}>
              Product
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Warehouse */}
          <TouchableOpacity
            style={[styles.l1Tab, level1Tab === 'warehouse' && styles.l1TabActive]}
            onPress={() => setLevel1Tab('warehouse')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="home-city-outline"
              size={14}
              color={level1Tab === 'warehouse' ? '#FFFFFF' : '#8B84A5'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.l1TabText, level1Tab === 'warehouse' && styles.l1TabTextActive]}>
              Warehouse
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Event */}
          <TouchableOpacity
            style={[styles.l1Tab, level1Tab === 'event' && styles.l1TabActive]}
            onPress={() => setLevel1Tab('event')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="calendar-star-outline"
              size={14}
              color={level1Tab === 'event' ? '#FFFFFF' : '#8B84A5'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.l1TabText, level1Tab === 'event' && styles.l1TabTextActive]}>
              Event
            </Text>
          </TouchableOpacity>
        </View>

        {/* LEVEL 2 CONNECTED TABS (Under Product) */}
        {level1Tab === 'product' && (
          <View style={styles.connectedSubTabsContainer}>
            {/* Decorative Purple Connector Line */}
            <View style={styles.connectorLineBranch}>
              <View style={styles.connectorVerticalStem} />
              <View style={styles.connectorHorizontalCross} />
            </View>

            <View style={styles.level2TabsRow}>
              <TouchableOpacity
                style={[styles.l2Tab, level2Tab === 'productList' && styles.l2TabActive]}
                onPress={() => setLevel2Tab('productList')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={13}
                  color={level2Tab === 'productList' ? '#FFFFFF' : '#736C8D'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.l2TabText, level2Tab === 'productList' && styles.l2TabTextActive]}>
                  Product List
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.l2Tab, level2Tab === 'settings' && styles.l2TabActive]}
                onPress={() => setLevel2Tab('settings')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="settings-outline"
                  size={13}
                  color={level2Tab === 'settings' ? '#FFFFFF' : '#736C8D'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.l2TabText, level2Tab === 'settings' && styles.l2TabTextActive]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LEVEL 3 CONNECTED TABS (Under Settings) */}
        {level1Tab === 'product' && level2Tab === 'settings' && (
          <View style={styles.connectedSubTabsContainer}>
            <View style={styles.connectorLineBranch}>
              <View style={[styles.connectorVerticalStem, { height: 16 }]} />
              <View style={styles.connectorHorizontalCross} />
            </View>

            <View style={styles.level3TabsRow}>
              <TouchableOpacity
                style={[styles.l3Tab, level3Tab === 'category' && styles.l3TabActive]}
                onPress={() => setLevel3Tab('category')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="shape-outline"
                  size={12}
                  color={level3Tab === 'category' ? '#FFFFFF' : '#736C8D'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.l3TabText, level3Tab === 'category' && styles.l3TabTextActive]}>
                  Category
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.l3Tab, level3Tab === 'productType' && styles.l3TabActive]}
                onPress={() => setLevel3Tab('productType')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="tag-multiple-outline"
                  size={12}
                  color={level3Tab === 'productType' ? '#FFFFFF' : '#736C8D'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.l3TabText, level3Tab === 'productType' && styles.l3TabTextActive]}>
                  Product Type
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ========================================================= */}
      {/* 3. MAIN CONTENT BODY AREA                                 */}
      {/* ========================================================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >
        {/* VIEW 01: PRODUCT LIST */}
        {level1Tab === 'product' && level2Tab === 'productList' && (
          <View>
            {/* Section Header with + Add Button */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Products</Text>
                <Text style={styles.sectionSubtitle}>{filteredProducts.length} registered items</Text>
              </View>
              <TouchableOpacity
                style={styles.addBtnGradient}
                onPress={handleOpenAddProduct}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#9148F7', '#7138E8']}
                  style={styles.addBtnInner}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#8F8A9F" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search product name or SKU"
                placeholderTextColor="#8F8A9F"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#8F8A9F" />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              {/* Category Filter */}
              <TouchableOpacity
                style={[styles.filterChip, categoryFilter !== 'All' && styles.filterChipActive]}
                onPress={() => {
                  const opts = ['All', ...categories.map((c) => c.name)];
                  const nextIdx = (opts.indexOf(categoryFilter) + 1) % opts.length;
                  setCategoryFilter(opts[nextIdx]);
                }}
              >
                <Text style={[styles.filterChipText, categoryFilter !== 'All' && styles.filterChipTextActive]}>
                  {categoryFilter === 'All' ? 'Category ▾' : `Cat: ${categoryFilter} ▾`}
                </Text>
              </TouchableOpacity>

              {/* Tracking Filter */}
              <TouchableOpacity
                style={[styles.filterChip, trackingFilter !== 'All' && styles.filterChipActive]}
                onPress={() => {
                  const opts = ['All', ...TRACKING_TYPES];
                  const nextIdx = (opts.indexOf(trackingFilter) + 1) % opts.length;
                  setTrackingFilter(opts[nextIdx]);
                }}
              >
                <Text style={[styles.filterChipText, trackingFilter !== 'All' && styles.filterChipTextActive]}>
                  {trackingFilter === 'All' ? 'Tracking ▾' : `Type: ${trackingFilter} ▾`}
                </Text>
              </TouchableOpacity>

              {/* Status Filter */}
              <TouchableOpacity
                style={[styles.filterChip, statusFilter !== 'All' && styles.filterChipActive]}
                onPress={() => {
                  const opts = ['All', 'Active', 'Inactive'];
                  const nextIdx = (opts.indexOf(statusFilter) + 1) % opts.length;
                  setStatusFilter(opts[nextIdx]);
                }}
              >
                <Text style={[styles.filterChipText, statusFilter !== 'All' && styles.filterChipTextActive]}>
                  {statusFilter === 'All' ? 'Status ▾' : `Status: ${statusFilter} ▾`}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Product Table / Cards */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2 }]}>PRODUCT</Text>
                <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>TRACKING</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.thCell, { width: 30, textAlign: 'right' }]}></Text>
              </View>

              {filteredProducts.map((p, idx) => {
                const isActive = p.status === 'active';
                return (
                  <View key={p.id} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                    {/* Product & SKU */}
                    <View style={{ flex: 2 }}>
                      <Text style={styles.productNameText}>{p.name}</Text>
                      <Text style={styles.productSkuText}>SKU: {p.sku}</Text>
                      <Text style={styles.productCatText}>{p.category} · {p.uom}</Text>
                    </View>

                    {/* Tracking Pill */}
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.trackingPill}>
                        <Text style={styles.trackingPillText}>{p.trackingType}</Text>
                      </View>
                    </View>

                    {/* Status Pill */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.statusPill, !isActive && styles.statusPillInactive]}>
                        <Text style={[styles.statusPillText, !isActive && styles.statusPillTextInactive]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Action ⋮ */}
                    <TouchableOpacity
                      style={styles.threeDotBtn}
                      onPress={() => handleOpenAction('product', p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={17} color="#7E7795" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {filteredProducts.length === 0 && (
                <View style={styles.emptyTableState}>
                  <Text style={styles.emptyStateText}>No products found matching filters.</Text>
                </View>
              )}
            </View>

            {/* Note Footnote */}
            <View style={styles.footnoteCard}>
              <Ionicons name="information-circle-outline" size={15} color="#8235F4" style={{ marginRight: 6 }} />
              <Text style={styles.footnoteText}>
                Catalog items sync directly with Stock inventory and dispatch requisitions.
              </Text>
            </View>
          </View>
        )}

        {/* VIEW 03: WAREHOUSE SETUP */}
        {level1Tab === 'warehouse' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Warehouses</Text>
                <Text style={styles.sectionSubtitle}>
                  {isOpsManager ? 'Authorized regional hubs' : 'Global storage hubs & terminals'}
                </Text>
              </View>
              {!isOpsManager && (
                <TouchableOpacity
                  style={styles.addBtnGradient}
                  onPress={handleOpenAddWarehouse}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.addBtnInner}>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#8F8A9F" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search warehouse name or code"
                placeholderTextColor="#8F8A9F"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2.2 }]}>WAREHOUSE</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>CITY</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.thCell, { width: 30 }]}></Text>
              </View>

              {filteredWarehouses.map((w, idx) => {
                const isActive = w.status === 'active';
                return (
                  <View key={w.id} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.productNameText}>{w.name}</Text>
                      <Text style={styles.productSkuText}>{w.code}</Text>
                      {w.address ? <Text style={styles.productCatText}>{w.address}</Text> : null}
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.warehouseCityText}>{w.city}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.statusPill, !isActive && styles.statusPillInactive]}>
                        <Text style={[styles.statusPillText, !isActive && styles.statusPillTextInactive]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.threeDotBtn}
                      onPress={() => handleOpenAction('warehouse', w)}
                    >
                      <Ionicons name="ellipsis-vertical" size={17} color="#7E7795" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Permission Note */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Warehouse access</Text>
              <Text style={styles.infoBoxLine}>• Admin: all warehouse records</Text>
              <Text style={styles.infoBoxLine}>• Operations Manager: authorized location only</Text>
            </View>
          </View>
        )}

        {/* VIEW 04: EVENT SETUP */}
        {level1Tab === 'event' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Events</Text>
                <Text style={styles.sectionSubtitle}>Festival & concert dispatch schedules</Text>
              </View>
              <TouchableOpacity
                style={styles.addBtnGradient}
                onPress={handleOpenAddEvent}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.addBtnInner}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#8F8A9F" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search event name or code"
                placeholderTextColor="#8F8A9F"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 1 }]}>CODE</Text>
                <Text style={[styles.thCell, { flex: 2.2 }]}>EVENT NAME</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.thCell, { width: 30 }]}></Text>
              </View>

              {filteredEvents.map((ev, idx) => {
                const isUpcoming = ev.status === 'Upcoming';
                return (
                  <View key={ev.id} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventCodeBadge}>{ev.code}</Text>
                    </View>
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.productNameText}>{ev.name}</Text>
                      <Text style={styles.productCatText}>{ev.venue}</Text>
                      <Text style={styles.eventDatesText}>{ev.dates}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.statusPill, isUpcoming && styles.statusPillUpcoming]}>
                        <Text style={[styles.statusPillText, isUpcoming && styles.statusPillTextUpcoming]}>
                          {ev.status}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.threeDotBtn}
                      onPress={() => handleOpenAction('event', ev)}
                    >
                      <Ionicons name="ellipsis-vertical" size={17} color="#7E7795" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Event setup includes</Text>
              <Text style={styles.infoBoxLine}>• Event code, name, date and venue</Text>
              <Text style={styles.infoBoxLine}>• Planner and Event Ground assignments</Text>
              <Text style={styles.infoBoxLine}>• Status and operational notes</Text>
              <Text style={styles.infoBoxLine}>• Event stock tracked in Requests / Movements</Text>
            </View>
          </View>
        )}

        {/* VIEW 05: MASTER SETTINGS (Category & Product Type) */}
        {level1Tab === 'product' && level2Tab === 'settings' && (
          <View>
            {level3Tab === 'category' ? (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <Text style={styles.sectionSubtitle}>Catalog taxonomy groups</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtnGradient}
                    onPress={() => {
                      setCatNameInput('');
                      setActiveModal('categoryModal');
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.addBtnInner}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={16} color="#8F8A9F" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search category"
                    placeholderTextColor="#8F8A9F"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.thCell, { flex: 2 }]}>CATEGORY NAME</Text>
                    <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { width: 30 }]}></Text>
                  </View>

                  {filteredCategories.map((c, idx) => {
                    const isActive = c.status === 'active';
                    return (
                      <View key={c.id} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.productNameText}>{c.name}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <View style={[styles.statusPill, !isActive && styles.statusPillInactive]}>
                            <Text style={[styles.statusPillText, !isActive && styles.statusPillTextInactive]}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.threeDotBtn}
                          onPress={() => handleOpenAction('category', c)}
                        >
                          <Ionicons name="ellipsis-vertical" size={17} color="#7E7795" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Product Types</Text>
                    <Text style={styles.sectionSubtitle}>Tracking methodologies</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtnGradient}
                    onPress={() => {
                      setPtNameInput('');
                      setPtDescInput('');
                      setActiveModal('productTypeModal');
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.addBtnInner}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={16} color="#8F8A9F" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search records"
                    placeholderTextColor="#8F8A9F"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.thCell, { flex: 2 }]}>PRODUCT TYPE</Text>
                    <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { width: 30 }]}></Text>
                  </View>

                  {filteredProductTypes.map((pt, idx) => {
                    const isActive = pt.status === 'active';
                    return (
                      <View key={pt.id} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.productNameText}>{pt.name}</Text>
                          <Text style={styles.productCatText}>{pt.description}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <View style={[styles.statusPill, !isActive && styles.statusPillInactive]}>
                            <Text style={[styles.statusPillText, !isActive && styles.statusPillTextInactive]}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.threeDotBtn}
                          onPress={() => handleOpenAction('productType', pt)}
                        >
                          <Ionicons name="ellipsis-vertical" size={17} color="#7E7795" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Settings Guidelines Card matching SVG Screen 05 */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Settings guidelines</Text>
              <Text style={styles.infoBoxLine}>• Categories and product types drive product registration dropdowns.</Text>
              <Text style={styles.infoBoxLine}>• Deactivate values rather than deleting.</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================================= */}
      {/* 4. MODALS & FORMS                                         */}
      {/* ========================================================= */}

      {/* MODAL: ADD / EDIT PRODUCT (Screen 02 in SVG) */}
      <Modal visible={activeModal === 'productModal'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeaderNavy}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalHeaderBreadcrumb}>Master Data / Product</Text>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Edit Product Registration' : 'New Product Registration'}
              </Text>
              <Text style={styles.modalHeaderSub}>Enter core details to create a product</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            {/* Product Name */}
            <Text style={styles.inputLabel}>Product Name *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter product name"
                placeholderTextColor="#9AA3B4"
                value={pName}
                onChangeText={setPName}
              />
            </View>

            {/* SKU */}
            <Text style={styles.inputLabel}>Product Code / SKU *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DST-PRD-101"
                placeholderTextColor="#9AA3B4"
                autoCapitalize="characters"
                value={pSku}
                onChangeText={setPSku}
              />
            </View>

            {/* Tracking Type */}
            <Text style={styles.inputLabel}>Tracking Type *</Text>
            <View style={styles.choiceChipsRow}>
              {TRACKING_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.choiceChip, pTrackingType === t && styles.choiceChipActive]}
                  onPress={() => setPTrackingType(t)}
                >
                  <Text style={[styles.choiceChipText, pTrackingType === t && styles.choiceChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.inputLabel}>Category *</Text>
            <View style={styles.choiceChipsRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.choiceChip, pCategory === c.name && styles.choiceChipActive]}
                  onPress={() => setPCategory(c.name)}
                >
                  <Text style={[styles.choiceChipText, pCategory === c.name && styles.choiceChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Unit of Measure */}
            <Text style={styles.inputLabel}>Unit of Measure (UoM) *</Text>
            <View style={styles.choiceChipsRow}>
              {UOM_LIST.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.choiceChip, pUom === u && styles.choiceChipActive]}
                  onPress={() => setPUom(u)}
                >
                  <Text style={[styles.choiceChipText, pUom === u && styles.choiceChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Low Stock Alert & Price Row */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Low Stock Alert (opt)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#9AA3B4"
                    value={pLowStock}
                    onChangeText={setPLowStock}
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Unit Price (₹) (opt)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#9AA3B4"
                    value={pUnitPrice}
                    onChangeText={setPUnitPrice}
                  />
                </View>
              </View>
            </View>

            {/* Returnability */}
            <Text style={styles.inputLabel}>Returnability *</Text>
            <View style={styles.choiceChipsRow}>
              {RETURNABILITY_LIST.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.choiceChip, pReturnability === r && styles.choiceChipActive]}
                  onPress={() => setPReturnability(r)}
                >
                  <Text style={[styles.choiceChipText, pReturnability === r && styles.choiceChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>Product Notes (optional)</Text>
            <View style={[styles.inputBox, { height: 70, alignItems: 'flex-start', paddingTop: 8 }]}>
              <TextInput
                style={[styles.textInput, { height: 54, textAlignVertical: 'top' }]}
                placeholder="Add helpful product details..."
                placeholderTextColor="#9AA3B4"
                multiline
                value={pNotes}
                onChangeText={setPNotes}
              />
            </View>

            {/* Status Switch */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchTitle}>Status</Text>
                <Text style={styles.switchSub}>{pStatus ? 'Active in catalog' : 'Inactive / Archived'}</Text>
              </View>
              <Switch
                value={pStatus}
                onValueChange={setPStatus}
                trackColor={{ false: '#E2E8F0', true: '#7138E8' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProduct}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Save Product</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.validationNote}>
              Validation: required fields, unique SKU, valid values.
            </Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: ADD / EDIT WAREHOUSE */}
      <Modal visible={activeModal === 'warehouseModal'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeaderNavy}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalHeaderBreadcrumb}>Master Data / Warehouse</Text>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Edit Warehouse' : 'New Warehouse Setup'}
              </Text>
              <Text style={styles.modalHeaderSub}>Regional hub registration</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Warehouse Code *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. WH-005" placeholderTextColor="#9AA3B4" value={whCode} onChangeText={setWhCode} />
            </View>

            <Text style={styles.inputLabel}>Warehouse Name *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. South Regional Hub" placeholderTextColor="#9AA3B4" value={whName} onChangeText={setWhName} />
            </View>

            <Text style={styles.inputLabel}>City *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. Bangalore" placeholderTextColor="#9AA3B4" value={whCity} onChangeText={setWhCity} />
            </View>

            <Text style={styles.inputLabel}>Address / Terminal Location</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. Electronic City Phase 1" placeholderTextColor="#9AA3B4" value={whAddress} onChangeText={setWhAddress} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Status: {whStatus ? 'Active' : 'Inactive'}</Text>
              <Switch value={whStatus} onValueChange={setWhStatus} trackColor={{ false: '#E2E8F0', true: '#7138E8' }} thumbColor="#FFFFFF" />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveWarehouse}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Save Warehouse</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: ADD / EDIT EVENT */}
      <Modal visible={activeModal === 'eventModal'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeaderNavy}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalHeaderBreadcrumb}>Master Data / Event</Text>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Edit Event Setup' : 'New Event Registration'}
              </Text>
              <Text style={styles.modalHeaderSub}>Event logistics schedule & scope</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Event Code *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. EV-004" placeholderTextColor="#9AA3B4" value={evCode} onChangeText={setEvCode} />
            </View>

            <Text style={styles.inputLabel}>Event Name *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. Summer Music Carnival" placeholderTextColor="#9AA3B4" value={evName} onChangeText={setEvName} />
            </View>

            <Text style={styles.inputLabel}>Venue & City *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. Delhi · JLN Arena" placeholderTextColor="#9AA3B4" value={evVenue} onChangeText={setEvVenue} />
            </View>

            <Text style={styles.inputLabel}>Dates / Schedule *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="e.g. 5–7 Nov" placeholderTextColor="#9AA3B4" value={evDates} onChangeText={setEvDates} />
            </View>

            <Text style={styles.inputLabel}>Assigned Lead Planner</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.textInput} placeholder="Planner Name" placeholderTextColor="#9AA3B4" value={evPlanner} onChangeText={setEvPlanner} />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEvent}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Save Event</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: ADD CATEGORY */}
      <Modal visible={activeModal === 'categoryModal'} animationType="fade" transparent={true}>
        <View style={styles.actionsBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>New Category</Text>
            <Text style={styles.dialogSub}>Enter category name for item categorization</Text>
            <View style={[styles.inputBox, { marginTop: 12 }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Category name"
                placeholderTextColor="#9AA3B4"
                value={catNameInput}
                onChangeText={setCatNameInput}
              />
            </View>
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCategory}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD PRODUCT TYPE */}
      <Modal visible={activeModal === 'productTypeModal'} animationType="fade" transparent={true}>
        <View style={styles.actionsBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>New Product Type</Text>
            <Text style={styles.dialogSub}>Add tracking product classification</Text>
            <View style={[styles.inputBox, { marginTop: 12 }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Type name (e.g. Asset Track)"
                placeholderTextColor="#9AA3B4"
                value={ptNameInput}
                onChangeText={setPtNameInput}
              />
            </View>
            <View style={[styles.inputBox, { marginTop: 8 }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Description"
                placeholderTextColor="#9AA3B4"
                value={ptDescInput}
                onChangeText={setPtDescInput}
              />
            </View>
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProductType}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* THREE-DOT ACTIONS SHEET (Screen 05 in User Setup style) */}
      <Modal visible={activeModal === 'actionSheet'} animationType="fade" transparent={true}>
        <View style={styles.actionsBackdrop}>
          <View style={styles.actionSheetCard}>
            {actionTarget && (
              <>
                <View style={styles.actionHeaderRow}>
                  <View>
                    <Text style={styles.actionSheetTitle}>
                      {actionTarget.data.name || actionTarget.data.code}
                    </Text>
                    <Text style={styles.actionSheetSub}>
                      {actionTarget.type.toUpperCase()} · Status: {actionTarget.data.status}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveModal(null)}>
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Edit Option */}
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setActiveModal(null);
                    if (actionTarget.type === 'product') handleOpenEditProduct(actionTarget.data);
                    else if (actionTarget.type === 'warehouse') {
                      setEditingItem(actionTarget.data);
                      setWhCode(actionTarget.data.code);
                      setWhName(actionTarget.data.name);
                      setWhCity(actionTarget.data.city);
                      setWhAddress(actionTarget.data.address || '');
                      setWhStatus(actionTarget.data.status === 'active');
                      setActiveModal('warehouseModal');
                    } else if (actionTarget.type === 'event') {
                      setEditingItem(actionTarget.data);
                      setEvCode(actionTarget.data.code);
                      setEvName(actionTarget.data.name);
                      setEvVenue(actionTarget.data.venue);
                      setEvDates(actionTarget.data.dates);
                      setEvPlanner(actionTarget.data.planner || 'Sneha Patil');
                      setEvStatus(actionTarget.data.status);
                      setActiveModal('eventModal');
                    }
                  }}
                >
                  <View style={[styles.sheetIconCircle, { backgroundColor: '#F0E8FF' }]}>
                    <MaterialCommunityIcons name="pencil-outline" size={17} color="#8244EF" />
                  </View>
                  <View>
                    <Text style={styles.sheetItemTitle}>Edit Details</Text>
                    <Text style={styles.sheetItemSub}>Modify attributes and configuration</Text>
                  </View>
                </TouchableOpacity>

                {/* Toggle Status */}
                <TouchableOpacity style={styles.sheetItem} onPress={handleToggleStatusAction}>
                  <View
                    style={[
                      styles.sheetIconCircle,
                      {
                        backgroundColor:
                          actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                            ? '#FFE8EC'
                            : '#E5FAF3',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                          ? 'pause-circle-outline'
                          : 'checkmark-circle-outline'
                      }
                      size={18}
                      color={
                        actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                          ? '#D9485F'
                          : '#159A79'
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.sheetItemTitle}>
                      {actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                        ? 'Deactivate Record'
                        : 'Activate Record'}
                    </Text>
                    <Text style={styles.sheetItemSub}>Toggle active visibility in application</Text>
                  </View>
                </TouchableOpacity>

                {/* Archive / Delete */}
                <TouchableOpacity style={styles.sheetItem} onPress={handleDeleteAction}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: '#FFE8EC' }]}>
                    <MaterialCommunityIcons name="trash-can-outline" size={17} color="#D9485F" />
                  </View>
                  <View>
                    <Text style={[styles.sheetItemTitle, { color: '#C43E52' }]}>Archive / Delete</Text>
                    <Text style={styles.sheetItemSub}>Remove from active master catalog</Text>
                  </View>
                </TouchableOpacity>
              </>
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
  navyHeader: {
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#34155C',
    borderWidth: 1,
    borderColor: '#8235F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandIconTextTop: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 8,
  },
  brandIconTextBot: {
    fontSize: 7,
    fontWeight: '900',
    color: '#D8B4FE',
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
    backgroundColor: '#34155C',
  },
  roleBadgeOps: {
    backgroundColor: '#073A50',
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  roleBadgeTextAdmin: {
    color: '#DCD5F0',
  },
  roleBadgeTextOps: {
    color: '#66D8FF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontSize: 10.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  // --- Level 1 Connected Tabs ---
  level1TabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  l1Tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#261B46',
    borderWidth: 1,
    borderColor: '#3E2E69',
    borderRadius: 8,
    paddingVertical: 8,
  },
  l1TabActive: {
    backgroundColor: '#8235F4',
    borderColor: '#9E61FF',
  },
  l1TabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A7A0C0',
  },
  l1TabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // --- Sub-Tabs Connected Connector Tree ---
  connectedSubTabsContainer: {
    marginTop: 10,
    paddingLeft: 12,
  },
  connectorLineBranch: {
    position: 'absolute',
    left: 28,
    top: -6,
    width: 20,
    height: 18,
  },
  connectorVerticalStem: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: 14,
    backgroundColor: '#9E61FF',
  },
  connectorHorizontalCross: {
    position: 'absolute',
    left: 0,
    bottom: 4,
    width: 14,
    height: 2,
    backgroundColor: '#9E61FF',
  },

  // --- Level 2 Tabs ---
  level2TabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 14,
  },
  l2Tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E143B',
    borderWidth: 1,
    borderColor: '#3B2961',
    borderRadius: 8,
    paddingVertical: 7,
  },
  l2TabActive: {
    backgroundColor: '#6C26D6',
    borderColor: '#8B38F5',
  },
  l2TabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#988EB6',
  },
  l2TabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // --- Level 3 Tabs ---
  level3TabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 14,
  },
  l3Tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#37235C',
    borderRadius: 8,
    paddingVertical: 6,
  },
  l3TabActive: {
    backgroundColor: '#551DB0',
    borderColor: '#7A2EDF',
  },
  l3TabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E82AF',
  },
  l3TabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // --- Body Content ---
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 60,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#211637',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#706984',
    marginTop: 1,
  },
  addBtnGradient: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1DCEC',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#302849',
    padding: 0,
  },
  filtersScroll: {
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1DCEC',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#EEE7FF',
    borderColor: '#8B38F5',
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4C4560',
  },
  filterChipTextActive: {
    color: '#8235F4',
    fontWeight: '700',
  },

  // Table Card
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DBEA',
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F6FB',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE7F2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  thCell: {
    fontSize: 9,
    fontWeight: '800',
    color: '#706984',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0EDF7',
  },
  productNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#211637',
  },
  productSkuText: {
    fontSize: 10.5,
    color: '#706984',
    marginTop: 1,
  },
  productCatText: {
    fontSize: 10,
    color: '#9C95B7',
    marginTop: 1,
  },
  warehouseCityText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#302849',
  },
  eventCodeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8235F4',
  },
  eventDatesText: {
    fontSize: 10,
    color: '#8235F4',
    fontWeight: '600',
    marginTop: 2,
  },

  // Pills
  trackingPill: {
    backgroundColor: '#F0EDF7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  trackingPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#4C4560',
  },
  statusPill: {
    backgroundColor: '#E5FAF3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#159A79',
  },
  statusPillInactive: {
    backgroundColor: '#F1EFF5',
  },
  statusPillTextInactive: {
    color: '#8A849C',
  },
  statusPillUpcoming: {
    backgroundColor: '#E8F5FF',
  },
  statusPillTextUpcoming: {
    color: '#0284C7',
  },
  threeDotBtn: {
    width: 30,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emptyTableState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#8B84A5',
  },

  // Info Box
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DBEA',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  infoBoxTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#211637',
    marginBottom: 6,
  },
  infoBoxLine: {
    fontSize: 10.5,
    color: '#706984',
    lineHeight: 16,
  },
  footnoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E0D4FF',
  },
  footnoteText: {
    fontSize: 10.5,
    color: '#5B309A',
    flex: 1,
  },

  // --- Modal Styles ---
  modalRoot: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  modalHeaderNavy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 14 : 14,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  modalHeaderBreadcrumb: {
    fontSize: 9.5,
    color: '#C277FF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: '#AFA4D4',
    marginTop: 1,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#302849',
    marginBottom: 5,
    marginTop: 10,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED9E9',
    borderRadius: 9,
    height: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 12.5,
    color: '#211637',
    padding: 0,
  },
  choiceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED9E9',
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  choiceChipActive: {
    backgroundColor: '#EEE7FF',
    borderColor: '#8235F4',
  },
  choiceChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4C4560',
  },
  choiceChipTextActive: {
    color: '#8235F4',
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED9E9',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211637',
  },
  switchSub: {
    fontSize: 10,
    color: '#706984',
    marginTop: 1,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED9E9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#554D6E',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  validationNote: {
    fontSize: 10,
    color: '#8A849C',
    textAlign: 'center',
    marginTop: 12,
  },

  // Action Dialog & Sheet
  actionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 25, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DED9E9',
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#211637',
  },
  dialogSub: {
    fontSize: 11,
    color: '#706984',
    marginTop: 2,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionSheetCard: {
    backgroundColor: '#1E143B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#493464',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#34215B',
    paddingBottom: 12,
    marginBottom: 12,
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSheetSub: {
    fontSize: 10.5,
    color: '#B78AFF',
    marginTop: 2,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  sheetIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetItemSub: {
    fontSize: 10,
    color: '#9C95B7',
    marginTop: 1,
  },
});
