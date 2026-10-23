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
import masterService from '../../services/masterService';
import pincodeService from '../../services/pincodeService';
import { authService } from '../../services/authService';
import { getUserAccessibleWarehouses } from '../../services/locationScopeHelper';
import { COLORS } from '../../theme/colors';

// Tracking type choices
const TRACKING_TYPES = ['Countable', 'Serial Track', 'Consumable'];
const UOM_LIST = ['Pieces', 'Bag', 'Box'];
const RETURNABILITY_LIST = ['Returnable', 'Consumable'];

export default function MasterTabScreen({ session, onLogout }) {
  const [liveUser, setLiveUser] = useState(session || authService?.getCurrentSession?.() || null);

  useEffect(() => {
    const unsub = authService?.subscribe?.(() => {
      const current = authService.getCurrentSession();
      if (current) {
        const freshUser = authService.getUserById(current.id || current.userId);
        setLiveUser(freshUser || current);
      }
    });
    if (session?.id || session?.userId) {
      const fresh = authService.getUserById(session.id || session.userId);
      if (fresh) setLiveUser(fresh);
    }
    return () => unsub?.();
  }, [session]);

  const activeUser = liveUser || session || authService?.getCurrentSession?.();
  const rawAssigned = Array.isArray(activeUser?.assignedLocations)
    ? activeUser.assignedLocations
    : activeUser?.assignedLocations
    ? [activeUser.assignedLocations]
    : [];

  const userRole = activeUser?.role || session?.role || 'Admin';
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

  // Product Table Column Filters & Pagination
  const [filterProdName, setFilterProdName] = useState('');
  const [filterProdUom, setFilterProdUom] = useState('');
  const [filterProdCategory, setFilterProdCategory] = useState('');
  const [filterProdTracking, setFilterProdTracking] = useState('');
  const [filterProdWarehouse, setFilterProdWarehouse] = useState('');
  const [filterProdStatus, setFilterProdStatus] = useState('All');
  const [showProdStatusModal, setShowProdStatusModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Warehouse Table Column Filters & Pagination (Matching Product Tab)
  const [filterWhName, setFilterWhName] = useState('');
  const [filterWhCity, setFilterWhCity] = useState('');
  const [filterWhState, setFilterWhState] = useState('');
  const [filterWhStatus, setFilterWhStatus] = useState('All');
  const [showWhStatusModal, setShowWhStatusModal] = useState(false);
  const [currentWhPage, setCurrentWhPage] = useState(1);
  const WH_PAGE_SIZE = 10;

  // Event Table Column Filters & Pagination (Matching Warehouse & Product Tab)
  const [filterEvCode, setFilterEvCode] = useState('');
  const [filterEvCity, setFilterEvCity] = useState('');
  const [filterEvState, setFilterEvState] = useState('');
  const [filterEvStatus, setFilterEvStatus] = useState('All');
  const [showEvStatusModal, setShowEvStatusModal] = useState(false);
  const [currentEvPage, setCurrentEvPage] = useState(1);
  const EV_PAGE_SIZE = 10;

  // Modals & Action Menus
  const [activeModal, setActiveModal] = useState(null); // 'productModal' | 'warehouseModal' | 'eventModal' | 'categoryModal' | 'productTypeModal' | 'actionSheet' | null
  const [editingItem, setEditingItem] = useState(null);
  const [actionTarget, setActionTarget] = useState(null); // { type: 'product'|'warehouse'|'event'|'category'|'productType', data: item }

  // Form States - Product
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pTrackingType, setPTrackingType] = useState('Countable');
  const [pWarehouse, setPWarehouse] = useState('');
  const [pCategory, setPCategory] = useState('Electronics');
  const [pUom, setPUom] = useState('Pieces');
  const [pLowStock, setPLowStock] = useState('10');
  const [pUnitPrice, setPUnitPrice] = useState('0.00');
  const [pReturnability, setPReturnability] = useState('Returnable');
  const [pNotes, setPNotes] = useState('');
  const [pStatus, setPStatus] = useState(true);
  const [formError, setFormError] = useState('');
  const [showAddCatInline, setShowAddCatInline] = useState(false);
  const [newCatInlineText, setNewCatInlineText] = useState('');

  // Form States - Warehouse
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whZipCode, setWhZipCode] = useState('');
  const [whCity, setWhCity] = useState('');
  const [whState, setWhState] = useState('');
  const [whCountry, setWhCountry] = useState('India');
  const [whPocName, setWhPocName] = useState('');
  const [whContactNo, setWhContactNo] = useState('');
  const [whStatus, setWhStatus] = useState(true);
  const [pincodeSuggestions, setPincodeSuggestions] = useState([]);
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);

  // Form States - Event (Matching Warehouse: Event Code replaces Warehouse Name)
  const [evCode, setEvCode] = useState('');
  const [evName, setEvName] = useState('');
  const [evAddress, setEvAddress] = useState('');
  const [evZipCode, setEvZipCode] = useState('');
  const [evCity, setEvCity] = useState('');
  const [evState, setEvState] = useState('');
  const [evCountry, setEvCountry] = useState('India');
  const [evPocName, setEvPocName] = useState('');
  const [evContactNo, setEvContactNo] = useState('');
  const [evStatus, setEvStatus] = useState(true);
  const [evPincodeSuggestions, setEvPincodeSuggestions] = useState([]);
  const [showEvPincodeDropdown, setShowEvPincodeDropdown] = useState(false);

  // Form States - Category / Product Type
  const [catNameInput, setCatNameInput] = useState('');
  const [ptNameInput, setPtNameInput] = useState('');
  const [ptDescInput, setPtDescInput] = useState('');

  // Refresh Master Data
  const loadMasterData = () => {
    setProducts(masterService?.getProducts?.() || []);
    setWarehouses(masterService?.getWarehouses?.() || []);
    setEvents(masterService?.getEvents?.() || []);
    setCategories(masterService?.getCategories?.() || []);
    setProductTypes(masterService?.getProductTypes?.() || []);
  };

  useEffect(() => {
    loadMasterData();
    const unsubscribe = masterService?.subscribe?.(() => {
      loadMasterData();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userRole]);

  // Open Add Product Form
  const handleOpenAddProduct = () => {
    setEditingItem(null);
    setPName('');
    setPSku('');
    setPTrackingType('Countable');
    setPWarehouse('');
    setPCategory(categories[0]?.name || 'Electronics');
    setPUom('Pieces');
    setPLowStock('10');
    setPUnitPrice('');
    setPReturnability('Returnable');
    setPNotes('');
    setPStatus(true);
    setFormError('');
    setShowAddCatInline(false);
    setNewCatInlineText('');
    setActiveModal('productModal');
  };

  // Open Edit Product Form
  const handleOpenEditProduct = (item) => {
    setEditingItem(item);
    setPName(item.name);
    setPSku(item.sku);
    setPTrackingType(item.trackingType || 'Countable');
    setPWarehouse(item.warehouse || '');
    setPCategory(item.category || (categories[0]?.name || 'Electronics'));
    setPUom(item.uom || 'Pieces');
    setPLowStock(String(item.lowStockAlert !== undefined ? item.lowStockAlert : 10));
    setPUnitPrice(String(item.unitPrice !== undefined ? item.unitPrice : ''));
    setPReturnability(item.returnability);
    setPNotes(item.notes || '');
    setPStatus(item.status === 'active');
    setFormError('');
    setShowAddCatInline(false);
    setNewCatInlineText('');
    setActiveModal('productModal');
  };

  // Quick inline add category
  const handleAddInlineCategory = () => {
    const trimmed = newCatInlineText.trim();
    if (!trimmed) return;
    const res = masterService.addCategory(trimmed);
    if (res.success) {
      loadMasterData();
      setPCategory(res.category.name);
      setNewCatInlineText('');
      setShowAddCatInline(false);
    } else {
      Alert.alert('Category Exists', res.message || 'Category already exists.');
    }
  };

  // Save Product
  const handleSaveProduct = () => {
    if (!pName.trim()) {
      setFormError('Product Name is required.');
      return;
    }

    setFormError('');

    const autoSku =
      editingItem?.sku ||
      pSku.trim() ||
      `DST-${(pName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'PRD').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    if (editingItem) {
      const res = masterService.updateProduct(editingItem.id, {
        name: pName.trim(),
        sku: autoSku,
        trackingType: pTrackingType ? pTrackingType.trim() : 'Countable',
        warehouse: pWarehouse ? pWarehouse.trim() : '',
        category: pCategory ? pCategory.trim() : 'General',
        uom: pUom ? pUom.trim() : 'Pieces (Pcs)',
        lowStockAlert: Number(pLowStock) || 10,
        unitPrice: Number(pUnitPrice) || 0,
        returnability: pReturnability || 'Returnable',
        notes: pNotes || '',
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
        sku: autoSku,
        trackingType: pTrackingType ? pTrackingType.trim() : 'Countable',
        warehouse: pWarehouse ? pWarehouse.trim() : '',
        category: pCategory ? pCategory.trim() : 'General',
        uom: pUom ? pUom.trim() : 'Pieces (Pcs)',
        lowStockAlert: Number(pLowStock) || 10,
        unitPrice: Number(pUnitPrice) || 0,
        returnability: pReturnability || 'Returnable',
        notes: pNotes || '',
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
    setWhAddress('');
    setWhZipCode('');
    setWhCity('');
    setWhState('');
    setWhCountry('India');
    setWhPocName('');
    setWhContactNo('');
    setWhStatus(true);
    setFormError('');
    setShowPincodeDropdown(false);
    setPincodeSuggestions([]);
    setActiveModal('warehouseModal');
  };

  // Indian Pincode Auto-Fill & Dropdown search
  const handleZipCodeChange = async (text) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
    setWhZipCode(clean);

    if (clean.length >= 1) {
      const suggestions = pincodeService.searchPincodes(clean);
      setPincodeSuggestions(suggestions);
      setShowPincodeDropdown(suggestions.length > 0);
    } else {
      setPincodeSuggestions([]);
      setShowPincodeDropdown(false);
    }

    if (clean.length === 6) {
      const match = await pincodeService.lookupPincode(clean);
      if (match) {
        setWhCity(match.city);
        setWhState(match.state);
        setWhCountry(match.country || 'India');
        setShowPincodeDropdown(false);
      }
    }
  };

  const handleSelectPincode = async (item) => {
    const pin = item.pincode;
    setWhZipCode(pin);
    setShowPincodeDropdown(false);
    const match = await pincodeService.lookupPincode(pin);
    if (match) {
      setWhCity(match.city);
      setWhState(match.state);
      setWhCountry(match.country || 'India');
    } else {
      setWhCity(item.city);
      setWhState(item.state);
      setWhCountry(item.country || 'India');
    }
  };

  // Save Warehouse
  const handleSaveWarehouse = () => {
    if (!whName.trim() || !whAddress.trim() || !whCity.trim()) {
      setFormError('Warehouse Name, Address, and City are required.');
      return;
    }
    setFormError('');

    if (editingItem) {
      const res = masterService.updateWarehouse(editingItem.id, {
        name: whName.trim(),
        code: whCode.trim(),
        address: whAddress.trim(),
        zipCode: whZipCode.trim(),
        city: whCity.trim(),
        state: whState.trim(),
        country: whCountry.trim() || 'India',
        pocName: whPocName.trim(),
        contactNo: whContactNo.trim(),
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
        address: whAddress.trim(),
        zipCode: whZipCode.trim(),
        city: whCity.trim(),
        state: whState.trim(),
        country: whCountry.trim() || 'India',
        pocName: whPocName.trim(),
        contactNo: whContactNo.trim(),
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
    setEvCode('');
    setEvName('');
    setEvAddress('');
    setEvZipCode('');
    setEvCity('');
    setEvState('');
    setEvCountry('India');
    setEvPocName('');
    setEvContactNo('');
    setEvStatus(true);
    setFormError('');
    setShowEvPincodeDropdown(false);
    setEvPincodeSuggestions([]);
    setActiveModal('eventModal');
  };

  // Indian Pincode Auto-Fill & Dropdown search for Event
  const handleEvZipCodeChange = async (text) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
    setEvZipCode(clean);

    if (clean.length >= 1) {
      const suggestions = pincodeService.searchPincodes(clean);
      setEvPincodeSuggestions(suggestions);
      setShowEvPincodeDropdown(suggestions.length > 0);
    } else {
      setEvPincodeSuggestions([]);
      setShowEvPincodeDropdown(false);
    }

    if (clean.length === 6) {
      const match = await pincodeService.lookupPincode(clean);
      if (match) {
        setEvCity(match.city);
        setEvState(match.state);
        setEvCountry(match.country || 'India');
        setShowEvPincodeDropdown(false);
      }
    }
  };

  const handleSelectEvPincode = async (item) => {
    const pin = item.pincode;
    setEvZipCode(pin);
    setShowEvPincodeDropdown(false);
    const match = await pincodeService.lookupPincode(pin);
    if (match) {
      setEvCity(match.city);
      setEvState(match.state);
      setEvCountry(match.country || 'India');
    } else {
      setEvCity(item.city);
      setEvState(item.state);
      setEvCountry(item.country || 'India');
    }
  };

  // Save Event
  const handleSaveEvent = () => {
    if (!evCode.trim() || !evAddress.trim() || !evCity.trim()) {
      setFormError('Event Name/Code, Event Address, and City are required.');
      return;
    }
    setFormError('');

    if (editingItem) {
      const res = masterService.updateEvent(editingItem.id, {
        code: evCode.trim(),
        name: evName.trim() || evCode.trim(),
        address: evAddress.trim(),
        zipCode: evZipCode.trim(),
        city: evCity.trim(),
        state: evState.trim(),
        country: evCountry.trim() || 'India',
        pocName: evPocName.trim(),
        contactNo: evContactNo.trim(),
        status: evStatus ? 'active' : 'inactive',
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
        name: evName.trim() || evCode.trim(),
        address: evAddress.trim(),
        zipCode: evZipCode.trim(),
        city: evCity.trim(),
        state: evState.trim(),
        country: evCountry.trim() || 'India',
        pocName: evPocName.trim(),
        contactNo: evContactNo.trim(),
        status: evStatus ? 'active' : 'inactive',
      });
      if (res.success) {
        loadMasterData();
        setActiveModal(null);
        Alert.alert('Success', `Event "${res.event.code}" registered.`);
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
  };

  // Delete Action
  const handleDeleteAction = () => {
    if (!actionTarget) return;
    const { type, data } = actionTarget;
    Alert.alert(
      'Delete',
      `Are you sure you want to delete "${data.name || data.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (type === 'product') masterService.deleteProduct(data.id);
            else if (type === 'warehouse') masterService.deleteWarehouse(data.id);
            else if (type === 'event') masterService.deleteEvent(data.id);
            else if (type === 'category') masterService.deleteCategory(data.id);
            loadMasterData();
            setActiveModal(null);
          },
        },
      ]
    );
  };

  // Reset product table pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterProdName, filterProdUom, filterProdCategory, filterProdTracking, filterProdWarehouse, filterProdStatus]);

  // Filtered Products (Table Filters)
  const filteredProducts = products.filter((p) => {
    if (filterProdName.trim() && !p.name.toLowerCase().includes(filterProdName.toLowerCase().trim())) {
      return false;
    }
    if (filterProdUom.trim() && !(p.uom || '').toLowerCase().includes(filterProdUom.toLowerCase().trim())) {
      return false;
    }
    if (filterProdCategory.trim() && !(p.category || '').toLowerCase().includes(filterProdCategory.toLowerCase().trim())) {
      return false;
    }
    if (filterProdTracking.trim() && !(p.trackingType || '').toLowerCase().includes(filterProdTracking.toLowerCase().trim())) {
      return false;
    }
    if (filterProdWarehouse.trim() && !(p.warehouse || '').toLowerCase().includes(filterProdWarehouse.toLowerCase().trim())) {
      return false;
    }
    if (filterProdStatus !== 'All') {
      if ((p.status || '').toLowerCase() !== filterProdStatus.toLowerCase()) {
        return false;
      }
    }
    return true;
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalItems);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset warehouse table pagination on filter change
  useEffect(() => {
    setCurrentWhPage(1);
  }, [filterWhName, filterWhCity, filterWhState, filterWhStatus]);

  // Filtered Warehouses (Table Column Filters)
  const filteredWarehouses = warehouses.filter((w) => {
    if (filterWhName.trim()) {
      const q = filterWhName.toLowerCase().trim();
      const match = (w.name || '').toLowerCase().includes(q) || (w.code || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterWhCity.trim() && !(w.city || '').toLowerCase().includes(filterWhCity.toLowerCase().trim())) {
      return false;
    }
    if (filterWhState.trim() && !(w.state || '').toLowerCase().includes(filterWhState.toLowerCase().trim())) {
      return false;
    }
    if (filterWhStatus !== 'All') {
      if ((w.status || '').toLowerCase() !== filterWhStatus.toLowerCase()) {
        return false;
      }
    }
    return true;
  });

  const totalWhItems = filteredWarehouses.length;
  const totalWhPages = Math.max(1, Math.ceil(totalWhItems / WH_PAGE_SIZE));
  const startWhIndex = totalWhItems === 0 ? 0 : (currentWhPage - 1) * WH_PAGE_SIZE + 1;
  const endWhIndex = Math.min(currentWhPage * WH_PAGE_SIZE, totalWhItems);
  const paginatedWarehouses = filteredWarehouses.slice(
    (currentWhPage - 1) * WH_PAGE_SIZE,
    currentWhPage * WH_PAGE_SIZE
  );

  // Reset event table pagination on filter change
  useEffect(() => {
    setCurrentEvPage(1);
  }, [filterEvCode, filterEvCity, filterEvState, filterEvStatus]);

  // Filtered Events (Table Column Filters)
  const filteredEvents = events.filter((e) => {
    if (filterEvCode.trim()) {
      const q = filterEvCode.toLowerCase().trim();
      const match = (e.code || '').toLowerCase().includes(q) || (e.name || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterEvCity.trim() && !(e.city || '').toLowerCase().includes(filterEvCity.toLowerCase().trim())) {
      return false;
    }
    if (filterEvState.trim() && !(e.state || '').toLowerCase().includes(filterEvState.toLowerCase().trim())) {
      return false;
    }
    if (filterEvStatus !== 'All') {
      if ((e.status || '').toLowerCase() !== filterEvStatus.toLowerCase()) {
        return false;
      }
    }
    return true;
  });

  const totalEvItems = filteredEvents.length;
  const totalEvPages = Math.max(1, Math.ceil(totalEvItems / EV_PAGE_SIZE));
  const startEvIndex = totalEvItems === 0 ? 0 : (currentEvPage - 1) * EV_PAGE_SIZE + 1;
  const endEvIndex = Math.min(currentEvPage * EV_PAGE_SIZE, totalEvItems);
  const paginatedEvents = filteredEvents.slice(
    (currentEvPage - 1) * EV_PAGE_SIZE,
    currentEvPage * EV_PAGE_SIZE
  );

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
      {/* 1. MASTER SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER) */}
      <View style={styles.whiteSubHeader}>
        <Text style={styles.subHeaderTitle}>Master</Text>
      </View>

      {/* ========================================================= */}
      {/* 1. HIERARCHICAL TABS ON WHITE/LIGHT PAGE                  */}
      {/* ========================================================= */}
      <View style={styles.tabNavWhiteCard}>
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
              color={level1Tab === 'product' ? '#FFFFFF' : '#635B80'}
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
              color={level1Tab === 'warehouse' ? '#FFFFFF' : '#635B80'}
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
              color={level1Tab === 'event' ? '#FFFFFF' : '#635B80'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.l1TabText, level1Tab === 'event' && styles.l1TabTextActive]}>
              Event
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT BODY AREA                                 */}
      {/* ========================================================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >
        {/* VIEW 01: PRODUCT LIST (Directly under Product Tab - Reference Table Format) */}
        {level1Tab === 'product' && (
          <View>
            {/* Section Header with + Add Button */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Products</Text>
                <Text style={styles.sectionSubtitle}>{totalItems} registered items</Text>
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

            {/* Product Table Container with Horizontal Scroll */}
            <View style={styles.productTableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: 830 }}>
                <View style={{ flex: 1 }}>
                  {/* Table Column Headers (Row 1) */}
                  <View style={styles.tableHeaderRowRef}>
                    <Text style={[styles.tableThText, { width: 170 }]}>Product Name</Text>
                    <Text style={[styles.tableThText, { width: 90 }]}>UoM</Text>
                    <Text style={[styles.tableThText, { width: 120 }]}>Category</Text>
                    <Text style={[styles.tableThText, { width: 130 }]}>Tracking Type</Text>
                    <Text style={[styles.tableThText, { width: 130 }]}>Warehouse</Text>
                    <Text style={[styles.tableThText, { width: 110 }]}>Status</Text>
                    <Text style={[styles.tableThText, { width: 70, textAlign: 'center' }]}>Action</Text>
                  </View>

                  {/* Table Search & Filter Inputs (Row 2, matching reference) */}
                  <View style={styles.tableFilterRowRef}>
                    {/* Search Product Name */}
                    <View style={{ width: 170, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterProdName}
                          onChangeText={setFilterProdName}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search UoM */}
                    <View style={{ width: 90, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterProdUom}
                          onChangeText={setFilterProdUom}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search Category */}
                    <View style={{ width: 120, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterProdCategory}
                          onChangeText={setFilterProdCategory}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search Tracking Type */}
                    <View style={{ width: 130, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterProdTracking}
                          onChangeText={setFilterProdTracking}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search Warehouse */}
                    <View style={{ width: 130, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterProdWarehouse}
                          onChangeText={setFilterProdWarehouse}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Status Dropdown Filter */}
                    <View style={{ width: 110, paddingRight: 8 }}>
                      <TouchableOpacity
                        style={styles.tableStatusDropdown}
                        onPress={() => setShowProdStatusModal(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.tableStatusDropdownText} numberOfLines={1}>
                          {filterProdStatus === 'All' ? 'Select' : filterProdStatus}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Column (Empty in search row) */}
                    <View style={{ width: 70 }} />
                  </View>

                  {/* Table Data Rows (10 items per page with fixed 10-row anchor) */}
                  <View style={styles.tableRowsContainer}>
                    {paginatedProducts.map((p, idx) => {
                      const isActive = p.status === 'active';
                      return (
                        <View
                          key={p.id}
                          style={[
                            styles.tableDataRowRef,
                            idx % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        >
                          {/* Product Name */}
                          <View style={{ width: 170, paddingRight: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleOpenAction('product', p)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.productNameLinkText} numberOfLines={1}>
                                {p.name}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* UoM */}
                          <View style={{ width: 90, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {p.uom}
                            </Text>
                          </View>

                          {/* Category */}
                          <View style={{ width: 120, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {p.category}
                            </Text>
                          </View>

                          {/* Tracking Type */}
                          <View style={{ width: 130, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {p.trackingType}
                            </Text>
                          </View>

                          {/* Warehouse */}
                          <View style={{ width: 130, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {p.warehouse || '—'}
                            </Text>
                          </View>

                          {/* Status (ACTIVE / INACTIVE Badge matching reference) */}
                          <View style={{ width: 110, paddingRight: 8 }}>
                            <View
                              style={[
                                styles.statusRefBadge,
                                isActive ? styles.statusRefBadgeActive : styles.statusRefBadgeInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusRefBadgeText,
                                  isActive ? styles.statusRefBadgeTextActive : styles.statusRefBadgeTextInactive,
                                ]}
                              >
                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                          </View>

                          {/* Action ⋮ */}
                          <View style={{ width: 70, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.tableActionThreeDotBtn}
                              onPress={() => handleOpenAction('product', p)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="ellipsis-vertical" size={17} color="#6366F1" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {paginatedProducts.length > 0 && paginatedProducts.length < PAGE_SIZE && (
                      Array.from({ length: PAGE_SIZE - paginatedProducts.length }).map((_, i) => (
                        <View
                          key={`empty-prod-${i}`}
                          style={[
                            styles.tableDataRowRef,
                            (paginatedProducts.length + i) % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        />
                      ))
                    )}

                    {paginatedProducts.length === 0 && (
                      <View style={styles.tableEmptyContainer}>
                        <Ionicons name="search-outline" size={30} color="#CBD5E1" />
                        <Text style={styles.tableEmptyTitle}>No products found</Text>
                        <Text style={styles.tableEmptySub}>Try adjusting your search or status filter</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Pagination Controls (Matching Image 2 exactly) */}
            <View style={styles.paginationCardRef}>
              <Text style={styles.paginationCountText}>
                <Text style={styles.paginationBold}>{startIndex}</Text> to{' '}
                <Text style={styles.paginationBold}>{endIndex}</Text> of{' '}
                <Text style={styles.paginationBold}>{totalItems.toLocaleString()}</Text>
              </Text>

              <View style={styles.paginationNavControls}>
                {/* First Page |< */}
                <TouchableOpacity
                  disabled={currentPage <= 1}
                  onPress={() => setCurrentPage(1)}
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentPage <= 1 && styles.pageNavSymbolDisabled]}>
                    {'|‹'}
                  </Text>
                </TouchableOpacity>

                {/* Prev Page < */}
                <TouchableOpacity
                  disabled={currentPage <= 1}
                  onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={15} color={currentPage <= 1 ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Page 1 of 77 */}
                <Text style={styles.pageIndicatorText}>
                  Page <Text style={styles.paginationBold}>{currentPage}</Text> of{' '}
                  <Text style={styles.paginationBold}>{totalPages}</Text>
                </Text>

                {/* Next Page > */}
                <TouchableOpacity
                  disabled={currentPage >= totalPages}
                  onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-forward" size={15} color={currentPage >= totalPages ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Last Page >| */}
                <TouchableOpacity
                  disabled={currentPage >= totalPages}
                  onPress={() => setCurrentPage(totalPages)}
                  style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentPage >= totalPages && styles.pageNavSymbolDisabled]}>
                    {'›|'}
                  </Text>
                </TouchableOpacity>
              </View>
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

            {/* Warehouse Table Container with Horizontal Scroll */}
            <View style={styles.productTableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: 670 }}>
                <View style={{ flex: 1 }}>
                  {/* Table Column Headers (Row 1) */}
                  <View style={styles.tableHeaderRowRef}>
                    <Text style={[styles.tableThText, { width: 200 }]}>Warehouse</Text>
                    <Text style={[styles.tableThText, { width: 130 }]}>City</Text>
                    <Text style={[styles.tableThText, { width: 140 }]}>State</Text>
                    <Text style={[styles.tableThText, { width: 110 }]}>Status</Text>
                    <Text style={[styles.tableThText, { width: 70, textAlign: 'center' }]}>Action</Text>
                  </View>

                  {/* Table Search & Filter Inputs (Row 2) */}
                  <View style={styles.tableFilterRowRef}>
                    {/* Search Warehouse */}
                    <View style={{ width: 200, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterWhName}
                          onChangeText={setFilterWhName}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search City */}
                    <View style={{ width: 130, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterWhCity}
                          onChangeText={setFilterWhCity}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search State */}
                    <View style={{ width: 140, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterWhState}
                          onChangeText={setFilterWhState}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Status Dropdown Filter */}
                    <View style={{ width: 110, paddingRight: 8 }}>
                      <TouchableOpacity
                        style={styles.tableStatusDropdown}
                        onPress={() => setShowWhStatusModal(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.tableStatusDropdownText} numberOfLines={1}>
                          {filterWhStatus === 'All' ? 'Select' : filterWhStatus}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Column (Empty in search row) */}
                    <View style={{ width: 70 }} />
                  </View>

                  {/* Table Data Rows (10 items per page with fixed 10-row anchor) */}
                  <View style={styles.tableRowsContainer}>
                    {paginatedWarehouses.map((w, idx) => {
                      const isActive = w.status === 'active';
                      return (
                        <View
                          key={w.id}
                          style={[
                            styles.tableDataRowRef,
                            idx % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        >
                          {/* Warehouse Name & Code */}
                          <View style={{ width: 200, paddingRight: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleOpenAction('warehouse', w)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.productNameLinkText} numberOfLines={1}>
                                {w.name}
                              </Text>
                            </TouchableOpacity>
                            <Text style={[styles.productSkuText, { fontSize: 10.5, marginTop: 1 }]} numberOfLines={1}>
                              {w.code} {w.zipCode ? `· ${w.zipCode}` : ''}
                            </Text>
                          </View>

                          {/* City */}
                          <View style={{ width: 130, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {w.city}
                            </Text>
                          </View>

                          {/* State */}
                          <View style={{ width: 140, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {w.state || '-'}
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View style={{ width: 110, paddingRight: 8 }}>
                            <View
                              style={[
                                styles.statusRefBadge,
                                isActive ? styles.statusRefBadgeActive : styles.statusRefBadgeInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusRefBadgeText,
                                  isActive ? styles.statusRefBadgeTextActive : styles.statusRefBadgeTextInactive,
                                ]}
                              >
                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                          </View>

                          {/* Action ⋮ */}
                          <View style={{ width: 70, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.tableActionThreeDotBtn}
                              onPress={() => handleOpenAction('warehouse', w)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="ellipsis-vertical" size={17} color="#6366F1" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {paginatedWarehouses.length > 0 && paginatedWarehouses.length < WH_PAGE_SIZE && (
                      Array.from({ length: WH_PAGE_SIZE - paginatedWarehouses.length }).map((_, i) => (
                        <View
                          key={`empty-wh-${i}`}
                          style={[
                            styles.tableDataRowRef,
                            (paginatedWarehouses.length + i) % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        />
                      ))
                    )}

                    {paginatedWarehouses.length === 0 && (
                      <View style={styles.tableEmptyContainer}>
                        <Ionicons name="search-outline" size={30} color="#CBD5E1" />
                        <Text style={styles.tableEmptyTitle}>No warehouses found</Text>
                        <Text style={styles.tableEmptySub}>Try adjusting your search or status filter</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Pagination Controls (Matching Product Tab) */}
            <View style={styles.paginationCardRef}>
              <Text style={styles.paginationCountText}>
                <Text style={styles.paginationBold}>{startWhIndex}</Text> to{' '}
                <Text style={styles.paginationBold}>{endWhIndex}</Text> of{' '}
                <Text style={styles.paginationBold}>{totalWhItems.toLocaleString()}</Text>
              </Text>

              <View style={styles.paginationNavControls}>
                {/* First Page |< */}
                <TouchableOpacity
                  disabled={currentWhPage <= 1}
                  onPress={() => setCurrentWhPage(1)}
                  style={[styles.pageNavBtn, currentWhPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentWhPage <= 1 && styles.pageNavSymbolDisabled]}>
                    {'|‹'}
                  </Text>
                </TouchableOpacity>

                {/* Prev Page < */}
                <TouchableOpacity
                  disabled={currentWhPage <= 1}
                  onPress={() => setCurrentWhPage((prev) => Math.max(1, prev - 1))}
                  style={[styles.pageNavBtn, currentWhPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={15} color={currentWhPage <= 1 ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Page indicator */}
                <Text style={styles.pageIndicatorText}>
                  Page <Text style={styles.paginationBold}>{currentWhPage}</Text> of{' '}
                  <Text style={styles.paginationBold}>{totalWhPages}</Text>
                </Text>

                {/* Next Page > */}
                <TouchableOpacity
                  disabled={currentWhPage >= totalWhPages}
                  onPress={() => setCurrentWhPage((prev) => Math.min(totalWhPages, prev + 1))}
                  style={[styles.pageNavBtn, currentWhPage >= totalWhPages && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-forward" size={15} color={currentWhPage >= totalWhPages ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Last Page >| */}
                <TouchableOpacity
                  disabled={currentWhPage >= totalWhPages}
                  onPress={() => setCurrentWhPage(totalWhPages)}
                  style={[styles.pageNavBtn, currentWhPage >= totalWhPages && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentWhPage >= totalWhPages && styles.pageNavSymbolDisabled]}>
                    {'›|'}
                  </Text>
                </TouchableOpacity>
              </View>
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

            {/* Event Table Container with Horizontal Scroll */}
            <View style={styles.productTableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: 670 }}>
                <View style={{ flex: 1 }}>
                  {/* Table Column Headers (Row 1) */}
                  <View style={styles.tableHeaderRowRef}>
                    <Text style={[styles.tableThText, { width: 200 }]}>Event Code</Text>
                    <Text style={[styles.tableThText, { width: 130 }]}>City</Text>
                    <Text style={[styles.tableThText, { width: 140 }]}>State</Text>
                    <Text style={[styles.tableThText, { width: 110 }]}>Status</Text>
                    <Text style={[styles.tableThText, { width: 70, textAlign: 'center' }]}>Action</Text>
                  </View>

                  {/* Table Search & Filter Inputs (Row 2) */}
                  <View style={styles.tableFilterRowRef}>
                    {/* Search Event Code */}
                    <View style={{ width: 200, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterEvCode}
                          onChangeText={setFilterEvCode}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search City */}
                    <View style={{ width: 130, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterEvCity}
                          onChangeText={setFilterEvCity}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Search State */}
                    <View style={{ width: 140, paddingRight: 8 }}>
                      <View style={styles.tableInputBox}>
                        <TextInput
                          style={styles.tableSearchInput}
                          placeholder=""
                          value={filterEvState}
                          onChangeText={setFilterEvState}
                          placeholderTextColor="#9AA3B4"
                        />
                      </View>
                    </View>

                    {/* Status Dropdown Filter */}
                    <View style={{ width: 110, paddingRight: 8 }}>
                      <TouchableOpacity
                        style={styles.tableStatusDropdown}
                        onPress={() => setShowEvStatusModal(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.tableStatusDropdownText} numberOfLines={1}>
                          {filterEvStatus === 'All' ? 'Select' : filterEvStatus}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Column (Empty in search row) */}
                    <View style={{ width: 70 }} />
                  </View>

                  {/* Table Data Rows (10 items per page with fixed 10-row anchor) */}
                  <View style={styles.tableRowsContainer}>
                    {paginatedEvents.map((ev, idx) => {
                      const isActive = (ev.status || '').toLowerCase() === 'active';
                      return (
                        <View
                          key={ev.id || ev.code}
                          style={[
                            styles.tableDataRowRef,
                            idx % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        >
                          {/* Event Code & Name / Subtitle */}
                          <View style={{ width: 200, paddingRight: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleOpenAction('event', ev)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.productNameLinkText} numberOfLines={1}>
                                {ev.code}
                              </Text>
                            </TouchableOpacity>
                            <Text style={[styles.productSkuText, { fontSize: 10.5, marginTop: 1 }]} numberOfLines={1}>
                              {ev.name && ev.name !== ev.code ? ev.name : ev.address} {ev.zipCode ? `· ${ev.zipCode}` : ''}
                            </Text>
                          </View>

                          {/* City */}
                          <View style={{ width: 130, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {ev.city || '-'}
                            </Text>
                          </View>

                          {/* State */}
                          <View style={{ width: 140, paddingRight: 8 }}>
                            <Text style={styles.tableDataCellText} numberOfLines={1}>
                              {ev.state || '-'}
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View style={{ width: 110, paddingRight: 8 }}>
                            <View
                              style={[
                                styles.statusRefBadge,
                                isActive ? styles.statusRefBadgeActive : styles.statusRefBadgeInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusRefBadgeText,
                                  isActive ? styles.statusRefBadgeTextActive : styles.statusRefBadgeTextInactive,
                                ]}
                              >
                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                          </View>

                          {/* Action ⋮ */}
                          <View style={{ width: 70, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.tableActionThreeDotBtn}
                              onPress={() => handleOpenAction('event', ev)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="ellipsis-vertical" size={17} color="#6366F1" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {paginatedEvents.length > 0 && paginatedEvents.length < EV_PAGE_SIZE && (
                      Array.from({ length: EV_PAGE_SIZE - paginatedEvents.length }).map((_, i) => (
                        <View
                          key={`empty-ev-${i}`}
                          style={[
                            styles.tableDataRowRef,
                            (paginatedEvents.length + i) % 2 === 1 && { backgroundColor: '#FAF9FC' },
                          ]}
                        />
                      ))
                    )}

                    {paginatedEvents.length === 0 && (
                      <View style={styles.tableEmptyContainer}>
                        <Ionicons name="search-outline" size={30} color="#CBD5E1" />
                        <Text style={styles.tableEmptyTitle}>No events found</Text>
                        <Text style={styles.tableEmptySub}>Try adjusting your search or status filter</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Pagination Controls (Matching Product Tab) */}
            <View style={styles.paginationCardRef}>
              <Text style={styles.paginationCountText}>
                <Text style={styles.paginationBold}>{startEvIndex}</Text> to{' '}
                <Text style={styles.paginationBold}>{endEvIndex}</Text> of{' '}
                <Text style={styles.paginationBold}>{totalEvItems.toLocaleString()}</Text>
              </Text>

              <View style={styles.paginationNavControls}>
                {/* First Page |< */}
                <TouchableOpacity
                  disabled={currentEvPage <= 1}
                  onPress={() => setCurrentEvPage(1)}
                  style={[styles.pageNavBtn, currentEvPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentEvPage <= 1 && styles.pageNavSymbolDisabled]}>
                    {'|‹'}
                  </Text>
                </TouchableOpacity>

                {/* Prev Page < */}
                <TouchableOpacity
                  disabled={currentEvPage <= 1}
                  onPress={() => setCurrentEvPage((prev) => Math.max(1, prev - 1))}
                  style={[styles.pageNavBtn, currentEvPage <= 1 && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={15} color={currentEvPage <= 1 ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Page indicator */}
                <Text style={styles.pageIndicatorText}>
                  Page <Text style={styles.paginationBold}>{currentEvPage}</Text> of{' '}
                  <Text style={styles.paginationBold}>{totalEvPages}</Text>
                </Text>

                {/* Next Page > */}
                <TouchableOpacity
                  disabled={currentEvPage >= totalEvPages}
                  onPress={() => setCurrentEvPage((prev) => Math.min(totalEvPages, prev + 1))}
                  style={[styles.pageNavBtn, currentEvPage >= totalEvPages && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-forward" size={15} color={currentEvPage >= totalEvPages ? '#C4BECD' : '#2563EB'} />
                </TouchableOpacity>

                {/* Last Page >| */}
                <TouchableOpacity
                  disabled={currentEvPage >= totalEvPages}
                  onPress={() => setCurrentEvPage(totalEvPages)}
                  style={[styles.pageNavBtn, currentEvPage >= totalEvPages && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavSymbol, currentEvPage >= totalEvPages && styles.pageNavSymbolDisabled]}>
                    {'›|'}
                  </Text>
                </TouchableOpacity>
              </View>
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

            {/* 1. product name */}
            <Text style={styles.inputLabel}>product name *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter product name"
                placeholderTextColor="#9AA3B4"
                value={pName}
                onChangeText={setPName}
              />
            </View>

            {/* 2. UoM */}
            <Text style={styles.inputLabel}>UoM</Text>
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

            {/* 3. Category */}
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.choiceChipsRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id || c.name}
                  style={[styles.choiceChip, pCategory === c.name && styles.choiceChipActive]}
                  onPress={() => setPCategory(c.name)}
                >
                  <Text style={[styles.choiceChipText, pCategory === c.name && styles.choiceChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.choiceChip, styles.addCategoryChip, showAddCatInline && styles.choiceChipActive]}
                onPress={() => setShowAddCatInline(!showAddCatInline)}
              >
                {showAddCatInline && (
                  <Ionicons name="close" size={13} color="#7138E8" style={{ marginRight: 2 }} />
                )}
                <Text style={[styles.choiceChipText, { color: '#7138E8', fontWeight: '700' }]}>
                  {showAddCatInline ? 'Close' : '+ Add'}
                </Text>
              </TouchableOpacity>
            </View>
            {showAddCatInline && (
              <View style={styles.inlineAddCatBox}>
                <TextInput
                  style={styles.inlineAddCatInput}
                  placeholder="Enter new category name"
                  placeholderTextColor="#9AA3B4"
                  value={newCatInlineText}
                  onChangeText={setNewCatInlineText}
                  onSubmitEditing={handleAddInlineCategory}
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity style={styles.inlineAddCatSaveBtn} onPress={handleAddInlineCategory}>
                  <Text style={styles.inlineAddCatSaveText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inlineAddCatCancelBtn}
                  onPress={() => {
                    setShowAddCatInline(false);
                    setNewCatInlineText('');
                  }}
                >
                  <Ionicons name="close" size={16} color="#706984" />
                </TouchableOpacity>
              </View>
            )}

            {/* 4. Tracking Type */}
            <Text style={styles.inputLabel}>Tracking Type</Text>
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

            {/* 4.1 Warehouse (Only active warehouses assigned to current user) */}
            <Text style={styles.inputLabel}>Warehouse</Text>
            {(() => {
              const activeMasterWhs = (masterService?.getWarehouses?.() || []).filter(
                (w) => (w.status || 'active').toLowerCase() === 'active'
              );
              const accessibleNames = getUserAccessibleWarehouses(activeUser);
              const matchedWhs = activeMasterWhs.filter((w) =>
                accessibleNames.some(
                  (loc) => loc && (loc.toLowerCase().trim() === w.name.toLowerCase().trim() || loc.toLowerCase().trim() === (w.code || '').toLowerCase().trim())
                )
              );
              const finalWhs = matchedWhs.length > 0 ? matchedWhs : activeMasterWhs;

              if (finalWhs.length === 0) {
                return (
                  <View style={[styles.inputBox, { backgroundColor: '#F8FAFC', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                      No active warehouses found. Please create one in Warehouse tab.
                    </Text>
                  </View>
                );
              }
              return (
                <View style={styles.choiceChipsRow}>
                  {finalWhs.map((w) => (
                    <TouchableOpacity
                      key={w.id || w.name}
                      style={[styles.choiceChip, pWarehouse === w.name && styles.choiceChipActive]}
                      onPress={() => setPWarehouse(pWarehouse === w.name ? '' : w.name)}
                    >
                      <Text style={[styles.choiceChipText, pWarehouse === w.name && styles.choiceChipTextActive]}>
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}

            {/* 5. Low Stock Alert */}
            <Text style={styles.inputLabel}>Low Stock Alert</Text>
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

            {/* 6. Unit Price */}
            <Text style={styles.inputLabel}>Unit Price</Text>
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

            {/* 7. status */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchTitle}>status</Text>
                <Text style={styles.switchSub}>{pStatus ? 'Active' : 'Inactive'}</Text>
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

            {/* Warehouse Name */}
            <Text style={styles.inputLabel}>Warehouse Name *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Central Mumbai Distribution Hub"
                placeholderTextColor="#9AA3B4"
                value={whName}
                onChangeText={setWhName}
              />
            </View>

            {/* Warehouse Address */}
            <Text style={styles.inputLabel}>Warehouse Address *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Plot 45, Kurla West Commercial Estate"
                placeholderTextColor="#9AA3B4"
                value={whAddress}
                onChangeText={setWhAddress}
              />
            </View>

            {/* Zip Code */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>* </Text>
              <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Zip Code</Text>
            </View>
            <View style={[styles.inputBox, showPincodeDropdown && { borderColor: '#38BDF8', borderWidth: 1.5 }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter Zip Code"
                placeholderTextColor="#9AA3B4"
                value={whZipCode}
                keyboardType="numeric"
                maxLength={6}
                onChangeText={handleZipCodeChange}
                onFocus={() => {
                  if (whZipCode.length >= 1) {
                    const suggestions = pincodeService.searchPincodes(whZipCode);
                    setPincodeSuggestions(suggestions);
                    setShowPincodeDropdown(suggestions.length > 0);
                  }
                }}
              />
            </View>

            {/* Pincode Auto-Suggest Dropdown List */}
            {showPincodeDropdown && pincodeSuggestions.length > 0 && (
              <View style={styles.zipDropdownCard}>
                <ScrollView nestedScrollEnabled style={styles.zipDropdownScroll} keyboardShouldPersistTaps="handled">
                  {pincodeSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.pincode}
                      style={[styles.zipDropdownItem, index === 0 && styles.zipDropdownItemActive]}
                      onPress={() => handleSelectPincode(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.zipDropdownItemText}>{item.pincode}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* City */}
            <Text style={styles.inputLabel}>City *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mumbai"
                placeholderTextColor="#9AA3B4"
                value={whCity}
                onChangeText={setWhCity}
              />
            </View>

            {/* State */}
            <Text style={styles.inputLabel}>State *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Maharashtra"
                placeholderTextColor="#9AA3B4"
                value={whState}
                onChangeText={setWhState}
              />
            </View>

            {/* Country */}
            <Text style={styles.inputLabel}>Country *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. India"
                placeholderTextColor="#9AA3B4"
                value={whCountry}
                onChangeText={setWhCountry}
              />
            </View>

            {/* POC Name */}
            <Text style={styles.inputLabel}>POC Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rajesh Sharma"
                placeholderTextColor="#9AA3B4"
                value={whPocName}
                onChangeText={setWhPocName}
              />
            </View>

            {/* Contact No. */}
            <Text style={styles.inputLabel}>Contact No.</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98201 12345"
                placeholderTextColor="#9AA3B4"
                value={whContactNo}
                keyboardType="phone-pad"
                onChangeText={setWhContactNo}
              />
            </View>

            {/* Status Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Status: {whStatus ? 'Active' : 'Inactive'}</Text>
              <Switch
                value={whStatus}
                onValueChange={setWhStatus}
                trackColor={{ false: '#E2E8F0', true: '#7138E8' }}
                thumbColor="#FFFFFF"
              />
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
                {editingItem ? 'Edit Event' : 'New Event Registration'}
              </Text>
              <Text style={styles.modalHeaderSub}>Event dispatch venue & schedule setup</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            {/* Event Name / Code (Single unified field) */}
            <Text style={styles.inputLabel}>Event Name / Code *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. EV-MUM-101 or Sunburn Arena Mumbai"
                placeholderTextColor="#9AA3B4"
                value={evCode}
                onChangeText={(text) => {
                  setEvCode(text);
                  setEvName(text);
                }}
              />
            </View>

            {/* Event Address */}
            <Text style={styles.inputLabel}>Event Address *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Jio World Garden, BKC"
                placeholderTextColor="#9AA3B4"
                value={evAddress}
                onChangeText={setEvAddress}
              />
            </View>

            {/* Zip Code */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>* </Text>
              <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Zip Code</Text>
            </View>
            <View style={[styles.inputBox, showEvPincodeDropdown && { borderColor: '#38BDF8', borderWidth: 1.5 }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter Zip Code"
                placeholderTextColor="#9AA3B4"
                value={evZipCode}
                keyboardType="numeric"
                maxLength={6}
                onChangeText={handleEvZipCodeChange}
                onFocus={() => {
                  if (evZipCode.length >= 1) {
                    const suggestions = pincodeService.searchPincodes(evZipCode);
                    setEvPincodeSuggestions(suggestions);
                    setShowEvPincodeDropdown(suggestions.length > 0);
                  }
                }}
              />
            </View>

            {/* Pincode Auto-Suggest Dropdown List */}
            {showEvPincodeDropdown && evPincodeSuggestions.length > 0 && (
              <View style={styles.zipDropdownCard}>
                <ScrollView nestedScrollEnabled style={styles.zipDropdownScroll} keyboardShouldPersistTaps="handled">
                  {evPincodeSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.pincode}
                      style={[styles.zipDropdownItem, index === 0 && styles.zipDropdownItemActive]}
                      onPress={() => handleSelectEvPincode(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.zipDropdownItemText}>{item.pincode}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* City */}
            <Text style={styles.inputLabel}>City *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mumbai"
                placeholderTextColor="#9AA3B4"
                value={evCity}
                onChangeText={setEvCity}
              />
            </View>

            {/* State */}
            <Text style={styles.inputLabel}>State *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Maharashtra"
                placeholderTextColor="#9AA3B4"
                value={evState}
                onChangeText={setEvState}
              />
            </View>

            {/* Country */}
            <Text style={styles.inputLabel}>Country *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. India"
                placeholderTextColor="#9AA3B4"
                value={evCountry}
                onChangeText={setEvCountry}
              />
            </View>

            {/* POC Name */}
            <Text style={styles.inputLabel}>POC Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Kunal Kapoor"
                placeholderTextColor="#9AA3B4"
                value={evPocName}
                onChangeText={setEvPocName}
              />
            </View>

            {/* Contact No. */}
            <Text style={styles.inputLabel}>Contact No.</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98200 45678"
                placeholderTextColor="#9AA3B4"
                value={evContactNo}
                keyboardType="phone-pad"
                onChangeText={setEvContactNo}
              />
            </View>

            {/* Status Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Status: {evStatus ? 'Active' : 'Inactive'}</Text>
              <Switch
                value={evStatus}
                onValueChange={setEvStatus}
                trackColor={{ false: '#E2E8F0', true: '#7138E8' }}
                thumbColor="#FFFFFF"
              />
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

      {/* THREE-DOT SIMPLE ACTION MENU (Edit, Deactivate, Delete ONLY) */}
      <Modal visible={activeModal === 'actionSheet'} animationType="fade" transparent={true}>
        <TouchableOpacity
          style={styles.actionsBackdrop}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.simpleActionCard} onStartShouldSetResponder={() => true}>
            {actionTarget && (
              <>
                {/* 1. Edit */}
                <TouchableOpacity
                  style={styles.simpleActionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveModal(null);
                    if (actionTarget.type === 'product') handleOpenEditProduct(actionTarget.data);
                    else if (actionTarget.type === 'warehouse') {
                      setEditingItem(actionTarget.data);
                      setWhCode(actionTarget.data.code);
                      setWhName(actionTarget.data.name);
                      setWhAddress(actionTarget.data.address || '');
                      setWhZipCode(actionTarget.data.zipCode || '');
                      setWhCity(actionTarget.data.city || '');
                      setWhState(actionTarget.data.state || '');
                      setWhCountry(actionTarget.data.country || 'India');
                      setWhPocName(actionTarget.data.pocName || '');
                      setWhContactNo(actionTarget.data.contactNo || '');
                      setWhStatus(actionTarget.data.status === 'active');
                      setFormError('');
                      setShowPincodeDropdown(false);
                      setActiveModal('warehouseModal');
                    } else if (actionTarget.type === 'event') {
                      setEditingItem(actionTarget.data);
                      setEvCode(actionTarget.data.code);
                      setEvName(actionTarget.data.name || actionTarget.data.code);
                      setEvAddress(actionTarget.data.address || actionTarget.data.venue || '');
                      setEvZipCode(actionTarget.data.zipCode || '');
                      setEvCity(actionTarget.data.city || '');
                      setEvState(actionTarget.data.state || '');
                      setEvCountry(actionTarget.data.country || 'India');
                      setEvPocName(actionTarget.data.pocName || '');
                      setEvContactNo(actionTarget.data.contactNo || '');
                      setEvStatus((actionTarget.data.status || '').toLowerCase() === 'active');
                      setFormError('');
                      setShowEvPincodeDropdown(false);
                      setActiveModal('eventModal');
                    }
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#2563EB" />
                  <Text style={styles.simpleActionText}>Edit</Text>
                </TouchableOpacity>

                <View style={styles.simpleActionDivider} />

                {/* 2. Deactivate / Activate */}
                <TouchableOpacity
                  style={styles.simpleActionItem}
                  activeOpacity={0.7}
                  onPress={handleToggleStatusAction}
                >
                  <Ionicons
                    name={
                      actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                        ? 'pause-circle-outline'
                        : 'play-circle-outline'
                    }
                    size={18}
                    color={
                      actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                        ? '#D97706'
                        : '#10B981'
                    }
                  />
                  <Text style={styles.simpleActionText}>
                    {actionTarget.data.status === 'active' || actionTarget.data.status === 'Active'
                      ? 'Deactivate'
                      : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.simpleActionDivider} />

                {/* 3. Delete */}
                <TouchableOpacity
                  style={styles.simpleActionItem}
                  activeOpacity={0.7}
                  onPress={handleDeleteAction}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                  <Text style={[styles.simpleActionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* STATUS FILTER PICKER MODAL */}
      <Modal visible={showProdStatusModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowProdStatusModal(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter by Status</Text>
            {['All', 'Active', 'Inactive'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.pickerItem, filterProdStatus === opt && styles.pickerItemActive]}
                onPress={() => {
                  setFilterProdStatus(opt);
                  setShowProdStatusModal(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    filterProdStatus === opt && styles.pickerItemTextActive,
                  ]}
                >
                  {opt === 'All' ? 'Select (All)' : opt}
                </Text>
                {filterProdStatus === opt && (
                  <Ionicons name="checkmark-circle" size={18} color="#7138E8" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WAREHOUSE STATUS FILTER PICKER MODAL */}
      <Modal visible={showWhStatusModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowWhStatusModal(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter Warehouse by Status</Text>
            {['All', 'Active', 'Inactive'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.pickerItem, filterWhStatus === opt && styles.pickerItemActive]}
                onPress={() => {
                  setFilterWhStatus(opt);
                  setShowWhStatusModal(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    filterWhStatus === opt && styles.pickerItemTextActive,
                  ]}
                >
                  {opt === 'All' ? 'Select (All)' : opt}
                </Text>
                {filterWhStatus === opt && (
                  <Ionicons name="checkmark-circle" size={18} color="#7138E8" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EVENT STATUS FILTER PICKER MODAL */}
      <Modal visible={showEvStatusModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowEvStatusModal(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter Event by Status</Text>
            {['All', 'Active', 'Inactive'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.pickerItem, filterEvStatus === opt && styles.pickerItemActive]}
                onPress={() => {
                  setFilterEvStatus(opt);
                  setShowEvStatusModal(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    filterEvStatus === opt && styles.pickerItemTextActive,
                  ]}
                >
                  {opt === 'All' ? 'Select (All)' : opt}
                </Text>
                {filterEvStatus === opt && (
                  <Ionicons name="checkmark-circle" size={18} color="#7138E8" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
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
  tabNavWhiteCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8E5F3',
    shadowColor: '#160D33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#F3F0FA',
    borderWidth: 1,
    borderColor: '#E4DEF5',
    borderRadius: 10,
    paddingVertical: 9,
  },
  l1TabActive: {
    backgroundColor: '#8235F4',
    borderColor: '#7225EA',
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  l1TabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#655B82',
  },
  l1TabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // --- Sub-Tabs Connected Connector Tree ---
  connectedSubTabsContainer: {
    marginTop: 8,
    paddingLeft: 10,
  },
  connectorLineBranch: {
    position: 'absolute',
    left: 26,
    top: -5,
    width: 20,
    height: 18,
  },
  connectorVerticalStem: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: 14,
    backgroundColor: '#8235F4',
  },
  connectorHorizontalCross: {
    position: 'absolute',
    left: 0,
    bottom: 4,
    width: 14,
    height: 2,
    backgroundColor: '#8235F4',
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
    backgroundColor: '#F8F6FD',
    borderWidth: 1,
    borderColor: '#E9E4F7',
    borderRadius: 8,
    paddingVertical: 7,
  },
  l2TabActive: {
    backgroundColor: '#6C26D6',
    borderColor: '#5B1EB8',
    shadowColor: '#6C26D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  l2TabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E648B',
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
    backgroundColor: '#F5F2FB',
    borderWidth: 1,
    borderColor: '#E4DCF5',
    borderRadius: 8,
    paddingVertical: 6.5,
  },
  l3TabActive: {
    backgroundColor: '#551DB0',
    borderColor: '#451593',
  },
  l3TabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6E648B',
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
  labelWithActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  smallAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DED1FF',
  },
  smallAddPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7138E8',
    marginLeft: 2,
  },
  addCategoryChip: {
    borderStyle: 'dashed',
    borderColor: '#9866F5',
    backgroundColor: '#FAF7FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inlineAddCatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8CEEF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    marginBottom: 6,
    gap: 6,
  },
  inlineAddCatInput: {
    flex: 1,
    fontSize: 12,
    color: '#211637',
    paddingVertical: 4,
  },
  inlineAddCatSaveBtn: {
    backgroundColor: '#7138E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inlineAddCatSaveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineAddCatCancelBtn: {
    padding: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
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
  simpleActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  simpleActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  simpleActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  simpleActionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 8,
  },

  // Reference Table & Pagination Styles
  productTableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 12,
  },
  tableHeaderRowRef: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableThText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  tableFilterRowRef: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableInputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tableSearchInput: {
    fontSize: 11.5,
    color: '#1F2937',
    padding: 0,
  },
  tableStatusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    height: 32,
    paddingHorizontal: 8,
  },
  tableStatusDropdownText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  tableDataRowRef: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowsContainer: {
    minHeight: 480,
  },
  productNameLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  tableDataCellText: {
    fontSize: 12,
    color: '#374151',
  },
  statusRefBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusRefBadgeActive: {
    backgroundColor: '#E8F8F0',
  },
  statusRefBadgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusRefBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusRefBadgeTextActive: {
    color: '#10B981',
  },
  statusRefBadgeTextInactive: {
    color: '#EF4444',
  },
  tableActionThreeDotBtn: {
    padding: 4,
  },
  tableEmptyContainer: {
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tableEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  tableEmptySub: {
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  paginationCardRef: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  paginationCountText: {
    fontSize: 12,
    color: '#374151',
  },
  paginationBold: {
    fontWeight: '700',
    color: '#111827',
  },
  paginationNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavSymbol: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  pageNavSymbolDisabled: {
    color: '#9CA3AF',
  },
  pageIndicatorText: {
    fontSize: 11.5,
    color: '#4B5563',
    marginHorizontal: 4,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: '#F5F3FF',
  },
  pickerItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: '#7138E8',
    fontWeight: '700',
  },

  // Pincode Dropdown & Auto-fill styles
  // Pincode Dropdown matching reference screenshot format
  zipDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  zipDropdownScroll: {
    maxHeight: 210,
  },
  zipDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  zipDropdownItemActive: {
    backgroundColor: '#F3F4F6',
  },
  zipDropdownItemText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
