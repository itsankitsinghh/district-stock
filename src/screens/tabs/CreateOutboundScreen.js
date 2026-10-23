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
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import { authService } from '../../services/authService';
import {
  getUserAccessibleWarehouses,
  getMovementEventOptions,
} from '../../services/locationScopeHelper';
import CommonCalendarModal from '../../components/CommonCalendarModal';
import SearchableDropdown from '../../components/SearchableDropdown';
import TwoPartLocationPicker from '../../components/TwoPartLocationPicker';

import carrierService from '../../services/carrierService';


export default function CreateOutboundScreen({
  editingOutbound,
  onCancel,
  onSaveOutbound,
  session,
  selectedDashboardWarehouse,
}) {
  // Master products & accessible locations (strictly master-created only)
  const [masterProducts, setMasterProducts] = useState(() => masterService?.getProducts?.() || []);
  const [masterWarehouses, setMasterWarehouses] = useState(() => masterService?.getWarehouses?.() || []);
  const [masterEvents, setMasterEvents] = useState(() => masterService?.getEvents?.() || []);

  useEffect(() => {
    const refreshMaster = () => {
      setMasterProducts(masterService?.getProducts?.() || []);
      setMasterWarehouses(masterService?.getWarehouses?.() || []);
      setMasterEvents(masterService?.getEvents?.() || []);
    };
    refreshMaster();
    if (masterService?.subscribe) {
      const unsub = masterService.subscribe(() => {
        refreshMaster();
      });
      return () => unsub();
    }
  }, []);

  const [sourceType, setSourceType] = useState('Warehouse');
  const [destType, setDestType] = useState('Event');

  const warehouseOptions = masterWarehouses
    .filter((w) => (w.status || 'active').toLowerCase() === 'active')
    .map((w) => (typeof w === 'string' ? w : w.name || w.code));

  const eventOptions = masterEvents
    .filter((e) => (e.status || 'active').toLowerCase() === 'active')
    .map((e) => (typeof e === 'string' ? e : e.name || e.code));

  const sourceWarehouseList = warehouseOptions;
  const destinationEventList = eventOptions;

  // Default Source from Dashboard Warehouse selection or first accessible warehouse
  const dashboardSelectedWh =
    selectedDashboardWarehouse && selectedDashboardWarehouse !== 'ALL'
      ? selectedDashboardWarehouse
      : authService?.getSelectedWarehouse?.() && authService.getSelectedWarehouse() !== 'ALL'
      ? authService.getSelectedWarehouse()
      : '';

  const initialSource =
    dashboardSelectedWh && warehouseOptions.includes(dashboardSelectedWh)
      ? dashboardSelectedWh
      : warehouseOptions[0] || '';

  // --- SECTION 1: CONSIGNMENT DETAILS ---
  const [consignmentDate, setConsignmentDate] = useState(editingOutbound?.date || '14/10/2026');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [refNo, setRefNo] = useState(editingOutbound?.refNo || '');
  const [source, setSource] = useState(editingOutbound?.source || initialSource);
  const [destination, setDestination] = useState(editingOutbound?.destination || eventOptions[0] || '');

  useEffect(() => {
    if (!source && warehouseOptions.length > 0) {
      setSource(warehouseOptions[0]);
    }
  }, [warehouseOptions, source]);

  useEffect(() => {
    if (!destination && eventOptions.length > 0) {
      setDestination(eventOptions[0]);
    }
  }, [eventOptions, destination]);

  // --- SECTION 2: PRODUCT DETAILS (Exact matching format as Inbound) ---
  const [productItems, setProductItems] = useState(() => {
    if (editingOutbound?.productLines && editingOutbound.productLines.length > 0) {
      return JSON.parse(JSON.stringify(editingOutbound.productLines));
    }
    return [
      {
        id: '1',
        srNo: 1,
        productId: '',
        productName: '',
        sku: '',
        trackingType: '',
        uom: '',
        dispatchedQty: '',
        price: '0',
        amount: 0,
      },
    ];
  });

  // Live Type-to-Search state
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // --- SECTION 3: SHIPPING METHOD ('courier' | 'transport') ---
  const [shippingMethod, setShippingMethod] = useState(() => {
    const meth = (editingOutbound?.method || '').toLowerCase();
    if (meth.includes('transport') || editingOutbound?.shippingMethodDetails?.type?.toLowerCase() === 'transport') {
      return 'transport';
    }
    return 'courier';
  });

  // Courier fields (persistent, never cleared across tabs or save)
  const [awbNo, setAwbNo] = useState(
    editingOutbound?.shippingMethodDetails?.awbNo || editingOutbound?.awbNo || ''
  );
  const [courierCarrier, setCourierCarrier] = useState(
    editingOutbound?.shippingMethodDetails?.carrier || editingOutbound?.courierCarrier || editingOutbound?.carrier || ''
  );

  // Transport fields (persistent, never cleared across tabs or save)
  const [shipmentNo, setShipmentNo] = useState(
    editingOutbound?.shippingMethodDetails?.shipmentNo || editingOutbound?.shipmentNo || ''
  );
  const [transporter, setTransporter] = useState(
    editingOutbound?.shippingMethodDetails?.transporter || editingOutbound?.transporter || ''
  );
  const [vehicleNo, setVehicleNo] = useState(
    editingOutbound?.shippingMethodDetails?.vehicleNo || editingOutbound?.vehicleNo || ''
  );
  const [lrDocketNo, setLrDocketNo] = useState(
    editingOutbound?.shippingMethodDetails?.lrDocketNo || editingOutbound?.lrDocketNo || ''
  );

  // Dynamic Logistics Entities (Carriers & Transporters)
  const [carrierList, setCarrierList] = useState(carrierService.getCarriers());
  const [transporterList, setTransporterList] = useState(carrierService.getTransporters());
  const [newLogisticsName, setNewLogisticsName] = useState('');

  useEffect(() => {
    carrierService.init().then(() => {
      setCarrierList(carrierService.getCarriers());
      setTransporterList(carrierService.getTransporters());
    });
    const unsub = carrierService.subscribe(() => {
      setCarrierList(carrierService.getCarriers());
      setTransporterList(carrierService.getTransporters());
    });
    return () => unsub();
  }, []);

  const handleAddLogisticsEntity = async () => {
    const trimmed = newLogisticsName.trim();
    if (!trimmed) return;
    if (shippingMethod === 'courier') {
      await carrierService.addCarrier(trimmed);
      setCourierCarrier(trimmed);
    } else {
      await carrierService.addTransporter(trimmed);
      setTransporter(trimmed);
    }
    setNewLogisticsName('');
  };

  const handleDeleteLogisticsEntity = async (name) => {
    if (shippingMethod === 'courier') {
      await carrierService.deleteCarrier(name);
      if (courierCarrier === name) setCourierCarrier('');
    } else {
      await carrierService.deleteTransporter(name);
      if (transporter === name) setTransporter('');
    }
  };

  // Modals
  const [isProductPickerVisible, setIsProductPickerVisible] = useState(false);
  const [activeEditingItemIndex, setActiveEditingItemIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [isDestPickerVisible, setIsDestPickerVisible] = useState(false);
  const [isCarrierPickerVisible, setIsCarrierPickerVisible] = useState(false);

  // Tracking Badge Style Helper
  const getTrackingBadgeStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('serial')) {
      return {
        bg: '#E2EBFF',
        text: '#315EA8',
        label: 'Serial Track',
      };
    }
    if (t.includes('consumable')) {
      return {
        bg: '#FFF0D8',
        text: '#A65B00',
        label: 'Consumable',
      };
    }
    return {
      bg: '#DDF7E8',
      text: '#18794E',
      label: 'Countable',
    };
  };

  // --- SECTION 2 HELPERS ---
  const handleAddItem = () => {
    const nextSr = productItems.length + 1;
    const newItem = {
      id: String(Date.now() + Math.random()),
      srNo: nextSr,
      productId: '',
      productName: '',
      sku: '',
      trackingType: '',
      uom: '',
      dispatchedQty: '',
      price: '0',
      amount: 0,
    };
    setProductItems([...productItems, newItem]);
  };

  const handleRemoveItem = (index) => {
    if (productItems.length === 1) {
      Alert.alert('Notice', 'At least one product line item is required.');
      return;
    }
    const filtered = productItems.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
    }));
    setProductItems(reindexed);
    if (activeSearchIndex === index) {
      setActiveSearchIndex(null);
    }
  };

  const handleTypeProduct = (index, text) => {
    setActiveSearchIndex(index);
    setActiveSearchQuery(text);

    const updated = [...productItems];
    updated[index] = { ...updated[index], productName: text };
    setProductItems(updated);

    const trimmed = text.trim().toLowerCase();
    if (trimmed.length >= 2) {
      const exact = masterProducts.find(
        (p) => p.name.toLowerCase() === trimmed || (p.sku && p.sku.toLowerCase() === trimmed)
      );
      if (exact) {
        applyProductToRow(index, exact, false);
      }
    }
  };

  const handleClearProduct = (index) => {
    const updated = [...productItems];
    updated[index] = {
      ...updated[index],
      productId: '',
      productName: '',
      sku: '',
      trackingType: '',
      uom: '',
      price: '0',
      amount: 0,
    };
    setProductItems(updated);
    setActiveSearchQuery('');
  };

  const handleQtyChange = (index, val) => {
    const updated = [...productItems];
    const item = { ...updated[index] };
    const cleanVal = val.replace(/[^0-9]/g, '');
    item.dispatchedQty = cleanVal;
    const qtyNum = parseInt(cleanVal, 10) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);
    updated[index] = item;
    setProductItems(updated);
  };

  const applyProductToRow = (index, product, closeSearch = true) => {
    const updated = [...productItems];
    const item = { ...updated[index] };

    item.productId = product.id;
    item.productName = product.name;
    item.sku = product.sku || product.id;
    item.trackingType = product.trackingType || 'Countable';
    item.uom = product.uom || 'Pieces';
    item.price = String(product.unitPrice || 0);

    const qtyNum = parseFloat(item.dispatchedQty) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);

    updated[index] = item;
    setProductItems(updated);
    if (closeSearch) {
      setActiveSearchIndex(null);
      setActiveSearchQuery('');
    }
  };

  const filteredMasterProducts = masterProducts.filter((p) => {
    if (!activeSearchQuery.trim()) return true;
    const q = activeSearchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleSelectProduct = (product) => {
    if (activeEditingItemIndex === null) return;
    applyProductToRow(activeEditingItemIndex, product, true);
    setIsProductPickerVisible(false);
    setActiveEditingItemIndex(null);
  };

  // Totals Calculation
  const totalQuantity = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.dispatchedQty) || 0),
    0
  );
  const totalAmount = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.amount) || 0),
    0
  );

  // --- ACTIONS ---
  const handleSaveDraft = () => {
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const finalRefNo = refNo.trim() || (`SO-${randomSuffix}`);
    const draftOutbound = {
      id: editingOutbound?.id || `OUT-DRAFT-${Date.now()}`,
      no: editingOutbound?.no || `OUT-2026-D${randomSuffix}`,
      date: consignmentDate.trim() || '14/10/2026',
      refNo: finalRefNo,
      source: source.trim() || 'Warehouse Central',
      destination: destination.trim() || 'Event Destination',
      method:
        shippingMethod === 'courier'
          ? `Courier (${courierCarrier || 'Standard'})`
          : `Transport (${transporter || 'Dedicated Truck'})`,
      status: 'Draft',
      itemsCount: productItems.length,
      totalQty: totalQuantity,
      totalAmount: totalAmount,
      shippingMethodDetails: {
        type: shippingMethod === 'courier' ? 'Courier' : 'Transport',
        awbNo: awbNo.trim(),
        carrier: courierCarrier.trim(),
        shipmentNo: shipmentNo.trim() || ('SHP-OUT-' + Date.now().toString().slice(-6)),
        transporter: transporter.trim(),
        vehicleNo: vehicleNo.trim(),
        lrDocketNo: lrDocketNo.trim(),
      },
      awbNo: awbNo.trim(),
      carrier: courierCarrier.trim(),
      courierCarrier: courierCarrier.trim(),
      shipmentNo: shipmentNo.trim() || ('SHP-OUT-' + Date.now().toString().slice(-6)),
      transporter: transporter.trim(),
      vehicleNo: vehicleNo.trim(),
      lrDocketNo: lrDocketNo.trim(),
      productLines: productItems,
    };

    Alert.alert(
      'Draft Saved',
      `Outbound draft ${draftOutbound.no} for Reference ${refNo || finalRefNo} has been saved successfully.`,
      [
        {
          text: 'OK',
          onPress: () => onSaveOutbound(draftOutbound),
        },
      ]
    );
  };

  const handleCreateOutbound = () => {
    // 1. Validate Consignment Details
    if (!consignmentDate.trim()) {
      Alert.alert('Validation Error', 'Please specify a consignment Date.');
      return;
    }
    if (!source.trim()) {
      Alert.alert('Validation Error', 'Please select or enter the Source Warehouse.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Validation Error', 'Please select or enter the Destination Event.');
      return;
    }

    // 2. Validate Products
    if (productItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product line item.');
      return;
    }
    for (let i = 0; i < productItems.length; i++) {
      const it = productItems[i];
      if (!it.productName.trim()) {
        Alert.alert('Validation Error', `Line #${i + 1}: Please select a Product from Product Master.`);
        return;
      }
      const q = parseInt(it.dispatchedQty, 10);
      if (!q || q <= 0) {
        Alert.alert('Validation Error', `Line #${i + 1} (${it.productName}): Dispatched Qty must be entered and greater than 0.`);
        return;
      }
    }

    // 3. Validate Shipping Method
    if (shippingMethod === 'courier') {
      if (!awbNo.trim()) {
        Alert.alert('Validation Error', 'AWB / Tracking No. is required for Courier shipping.');
        return;
      }
      if (!courierCarrier.trim()) {
        Alert.alert('Validation Error', 'Carrier name is required for Courier shipping.');
        return;
      }
    } else {
      if (!transporter.trim()) {
        Alert.alert('Validation Error', 'Transporter is required for Transport shipping.');
        return;
      }
    }

    // 4. Generate Created Record
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const finalRefNo = refNo.trim() || (`SO-${randomSuffix}`);
    const newOutbound = {
      id: editingOutbound?.id || `OUT-${Date.now()}`,
      no: editingOutbound?.no || `OUT-2026-${randomSuffix}`,
      date: consignmentDate.trim() || '14/10/2026',
      refNo: finalRefNo,
      source: source.trim(),
      destination: destination.trim(),
      method:
        shippingMethod === 'courier'
          ? `Courier (${courierCarrier.trim()})`
          : `Transport (${transporter.trim()})`,
      status: 'Dispatched',
      itemsCount: productItems.length,
      totalQty: totalQuantity,
      totalAmount: totalAmount,
      shippingMethodDetails: {
        type: shippingMethod === 'courier' ? 'Courier' : 'Transport',
        awbNo: awbNo.trim(),
        carrier: courierCarrier.trim(),
        shipmentNo: shipmentNo.trim() || ('SHP-OUT-' + Date.now().toString().slice(-6)),
        transporter: transporter.trim(),
        vehicleNo: vehicleNo.trim(),
        lrDocketNo: lrDocketNo.trim(),
      },
      awbNo: awbNo.trim(),
      carrier: courierCarrier.trim(),
      courierCarrier: courierCarrier.trim(),
      shipmentNo: shipmentNo.trim() || ('SHP-OUT-' + Date.now().toString().slice(-6)),
      transporter: transporter.trim(),
      vehicleNo: vehicleNo.trim(),
      lrDocketNo: lrDocketNo.trim(),
      productLines: productItems,
    };

    Alert.alert(
      'Outbound Created',
      `Outbound shipment ${newOutbound.no} dispatched successfully with ${productItems.length} product lines (Total Qty: ${totalQuantity}, ₹${totalAmount.toLocaleString()}).`,
      [
        {
          text: 'View in Outbound List',
          onPress: () => onSaveOutbound(newOutbound),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BREADCRUMB ROW matching Inbound */}
        <TouchableOpacity
          style={styles.breadcrumbRow}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Ionicons name="chevron-back" size={16} color="#6D43C0" />
          <Text style={styles.breadcrumbText}>‹ Movement / Outbound / New</Text>
        </TouchableOpacity>

        {/* ============================================================== */}
        {/* SECTION 1: CONSIGNMENT DETAILS                                 */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Consignment Details</Text>
          </View>

          {/* Line 1: Source */}
          <TwoPartLocationPicker
            label="Source"
            required={true}
            type={sourceType}
            onTypeChange={(t) => {
              setSourceType(t);
              setSource('');
            }}
            value={source}
            onSelect={(val) => setSource(val)}
            warehouses={warehouseOptions}
            events={eventOptions}
          />

          {/* Line 2: Destination */}
          <TwoPartLocationPicker
            label="Destination"
            required={true}
            type={destType}
            onTypeChange={(t) => {
              setDestType(t);
              setDestination('');
            }}
            value={destination}
            onSelect={(val) => setDestination(val)}
            warehouses={warehouseOptions}
            events={eventOptions}
          />
        </View>

        {/* ============================================================== */}
        {/* SECTION 2: PRODUCT DETAILS                                     */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Product Details</Text>
            <TouchableOpacity
              style={styles.addItemBtn}
              activeOpacity={0.85}
              onPress={handleAddItem}
            >
              <Ionicons
                name="add"
                size={14}
                color="#FFFFFF"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.addItemBtnText}>Add item</Text>
            </TouchableOpacity>
          </View>

          {/* Product Items Table (Horizontally Scrollable) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.tableScrollInner}
          >
            <View style={styles.tableBlock}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.thCell, { width: 230 }]}>
                  <Text style={styles.thText}>Product Name</Text>
                </View>
                <View style={[styles.thCell, { width: 75 }]}>
                  <Text style={styles.thText}>UoM</Text>
                </View>
                <View style={[styles.thCell, { width: 110 }]}>
                  <Text style={styles.thText}>Tracking Type</Text>
                </View>
                <View style={[styles.thCell, { width: 90 }]}>
                  <Text style={styles.thText}>Dispatched Qty</Text>
                </View>
                <View style={[styles.thCell, { width: 65, borderRightWidth: 0 }]}>
                  <Text style={styles.thText}>Action</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {productItems.map((item, index) => {
                const badge = getTrackingBadgeStyle(item.trackingType);

                return (
                  <View key={item.id} style={styles.tableBodyRow}>
                    {/* Product Name with Type-to-Search */}
                    <View style={[styles.tdCell, { width: 230, paddingVertical: 4, zIndex: activeSearchIndex === index ? 9999 : 1 }]}>
                      <View style={{ width: '100%' }}>
                        <View style={[styles.tdProductInputWrap, activeSearchIndex === index && { borderColor: '#38BDF8', borderWidth: 1.5 }]}>
                          <Ionicons name="search" size={13} color="#6D43C0" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.tdProductTextInput}
                            placeholder="Type to search product..."
                            placeholderTextColor="#9A93A7"
                            value={item.productName || ''}
                            onChangeText={(text) => handleTypeProduct(index, text)}
                            onFocus={() => {
                              setActiveSearchIndex(index);
                              setActiveSearchQuery(item.productName || '');
                            }}
                          />
                          {item.productName ? (
                            <TouchableOpacity
                              onPress={() => handleClearProduct(index)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={15} color="#8F87A0" />
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Product Auto-Suggest Dropdown List (same as zipcode) */}
                        {activeSearchIndex === index && filteredMasterProducts.length > 0 && (
                          <View style={styles.zipDropdownCard}>
                            <ScrollView
                              nestedScrollEnabled={true}
                              style={styles.zipDropdownScroll}
                              keyboardShouldPersistTaps="handled"
                            >
                              {filteredMasterProducts.map((p, pIdx) => (
                                <TouchableOpacity
                                  key={p.id || p.sku || pIdx}
                                  style={[
                                    styles.zipDropdownItem,
                                    pIdx === 0 && styles.zipDropdownItemActive,
                                  ]}
                                  onPress={() => applyProductToRow(index, p, true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.zipDropdownItemText} numberOfLines={1}>
                                    {p.name}
                                  </Text>
                                  {p.sku ? (
                                    <Text style={styles.zipDropdownItemSub} numberOfLines={1}>
                                      SKU: {p.sku} • {p.trackingType || 'Countable'} • {p.uom || 'Unit'}
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                      {item.sku ? (
                        <Text style={styles.tdProductSkuText} numberOfLines={1}>
                          SKU: {item.sku}
                        </Text>
                      ) : null}
                    </View>

                    {/* UoM */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: 75,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Text style={styles.tdUomText}>{item.uom || '—'}</Text>
                    </View>

                    {/* Tracking Type */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: 110,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      {item.trackingType ? (
                        <View
                          style={[
                            styles.trackingBadge,
                            { backgroundColor: badge.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.trackingBadgeText,
                              { color: badge.text },
                            ]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.tdUomText}>—</Text>
                      )}
                    </View>

                    {/* Dispatched Qty */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: 90,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 4,
                          width: 60,
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: '700',
                          color: '#1E293B',
                          backgroundColor: '#FFFFFF',
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={item.dispatchedQty || ''}
                        onChangeText={(val) => handleQtyChange(index, val)}
                      />
                    </View>

                    {/* Action Cell */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: 65,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRightWidth: 0,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        activeOpacity={0.7}
                        onPress={() => handleRemoveItem(index)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Totals Row */}
              <View style={styles.tableTotalRow}>
                <View style={[styles.tdCell, { width: 375, paddingLeft: 10 }]}>
                  <Text style={styles.totalRowLabel}>
                    TOTALS ({productItems.length} lines)
                  </Text>
                </View>
                <View
                  style={[
                    styles.tdCell,
                    {
                      width: 55,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={styles.totalRowQty}>{totalQuantity}</Text>
                </View>
                <View style={[styles.tdCell, { width: 125, borderRightWidth: 0 }]}>
                  <Text style={styles.totalRowAmount}>
                    ₹{totalAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* SECTION 3: SHIPPING METHOD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Shipping Method</Text>
          </View>

          {/* Segmented Switch: Courier vs Transport */}
          <View style={styles.methodToggleContainer}>
            <TouchableOpacity
              style={[
                styles.methodToggleBtn,
                shippingMethod === 'courier'
                  ? styles.methodToggleBtnActive
                  : styles.methodToggleBtnInactive,
              ]}
              activeOpacity={0.85}
              onPress={() => setShippingMethod('courier')}
            >
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={16}
                color={shippingMethod === 'courier' ? '#FFFFFF' : '#372064'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.methodToggleText,
                  shippingMethod === 'courier'
                    ? styles.methodToggleTextActive
                    : styles.methodToggleTextInactive,
                ]}
              >
                Courier
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodToggleBtn,
                shippingMethod === 'transport'
                  ? styles.methodToggleBtnActive
                  : styles.methodToggleBtnInactive,
              ]}
              activeOpacity={0.85}
              onPress={() => setShippingMethod('transport')}
            >
              <MaterialCommunityIcons
                name="truck-fast-outline"
                size={17}
                color={shippingMethod === 'transport' ? '#FFFFFF' : '#372064'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.methodToggleText,
                  shippingMethod === 'transport'
                    ? styles.methodToggleTextActive
                    : styles.methodToggleTextInactive,
                ]}
              >
                Transport
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional Fields: COURIER */}
          {shippingMethod === 'courier' && (
            <View style={styles.methodSectionBlock}>
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    AWB / Tracking No. <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="barcode-outline"
                      size={14}
                      color="#625A72"
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter AWB number"
                      placeholderTextColor="#9A93A7"
                      value={awbNo}
                      onChangeText={setAwbNo}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    Carrier <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dropdownInput}
                    activeOpacity={0.8}
                    onPress={() => setIsCarrierPickerVisible(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !courierCarrier && { color: '#9A93A7' },
                      ]}
                      numberOfLines={1}
                    >
                      {courierCarrier || 'Select carrier'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#625A72" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Conditional Fields: TRANSPORT */}
          {shippingMethod === 'transport' && (
            <View style={styles.methodSectionBlock}>

              {/* Row 1: Carrier / Transporter */}
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    Transporter / Fleet <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dropdownInput}
                    activeOpacity={0.8}
                    onPress={() => setIsCarrierPickerVisible(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !transporter && { color: '#9A93A7' },
                      ]}
                      numberOfLines={1}
                    >
                      {transporter || 'Select transporter'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#625A72" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Vehicle No. & LR / Docket No. */}
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Vehicle No. (optional)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="car-outline"
                      size={14}
                      color="#625A72"
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. MH-04-AZ-8921"
                      placeholderTextColor="#9A93A7"
                      value={vehicleNo}
                      onChangeText={setVehicleNo}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>LR / Docket No. (optional)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="newspaper-outline"
                      size={14}
                      color="#625A72"
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter LR / docket number"
                      placeholderTextColor="#9A93A7"
                      value={lrDocketNo}
                      onChangeText={setLrDocketNo}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ============================================================== */}
        {/* ============================================================== */}
        <View style={styles.actionsBarCard}>
          {/* Cancel / Back */}
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={onCancel}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          {/* Save Draft */}
          <TouchableOpacity
            style={styles.saveDraftBtn}
            activeOpacity={0.8}
            onPress={handleSaveDraft}
          >
            <Ionicons
              name="document-outline"
              size={15}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.saveDraftBtnText}>Save Draft</Text>
          </TouchableOpacity>

          {/* Create Outbound */}
          <TouchableOpacity
            style={[styles.saveDraftBtn, { backgroundColor: '#10B981', flex: 1.3 }]}
            activeOpacity={0.8}
            onPress={handleCreateOutbound}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.saveDraftBtnText}>Create Outbound</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: CALENDAR MODAL                                        */}
      {/* ============================================================== */}
      <CommonCalendarModal
        visible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        onSelectDate={(formattedDate) => {
          setConsignmentDate(formattedDate);
          setIsCalendarVisible(false);
        }}
        selectedDate={consignmentDate}
      />

      {/* ============================================================== */}
      {/* MODAL 2: SOURCE WAREHOUSE PICKER MODAL                         */}
      {/* ============================================================== */}
      <Modal
        visible={isSourcePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSourcePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Source Warehouse</Text>
              <TouchableOpacity
                onPress={() => setIsSourcePickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {sourceWarehouseList.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#8B8498', fontSize: 13 }}>
                    No warehouses assigned to this user.
                  </Text>
                </View>
              ) : (
                sourceWarehouseList.map((whName, idx) => (
                  <TouchableOpacity
                    key={`wh-${idx}`}
                    style={[
                      styles.simplePickerRow,
                      source === whName && styles.simplePickerRowActive,
                    ]}
                    onPress={() => {
                      setSource(whName);
                      setIsSourcePickerVisible(false);
                    }}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color={source === whName ? '#6D43C0' : '#625A72'}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.simplePickerText,
                        source === whName && styles.simplePickerTextActive,
                      ]}
                    >
                      {whName}
                    </Text>
                    {source === whName && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#6D43C0"
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DESTINATION EVENT PICKER MODAL                        */}
      {/* ============================================================== */}
      <Modal
        visible={isDestPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDestPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <View>
                <Text style={styles.pickerModalTitle}>Select Destination Event</Text>
                <Text style={{ fontSize: 11, color: '#817A91', marginTop: 2 }}>
                  Active events and venues
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDestPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {destinationEventList.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#8B8498', fontSize: 13 }}>
                    No events registered in Master.
                  </Text>
                </View>
              ) : (
                destinationEventList.map((evName, idx) => (
                  <TouchableOpacity
                    key={`ev-${idx}`}
                    style={[
                      styles.simplePickerRow,
                      destination === evName && styles.simplePickerRowActive,
                    ]}
                    onPress={() => {
                      setDestination(evName);
                      setIsDestPickerVisible(false);
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={destination === evName ? '#6D43C0' : '#625A72'}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.simplePickerText,
                        destination === evName && styles.simplePickerTextActive,
                      ]}
                    >
                      {evName}
                    </Text>
                    {destination === evName && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#6D43C0"
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: CARRIER / TRANSPORTER PICKER MODAL                    */}
      {/* ============================================================== */}
      <Modal
        visible={isCarrierPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCarrierPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                {shippingMethod === 'courier'
                  ? 'Choose Carrier'
                  : 'Choose Transporter'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCarrierPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            {/* Inline Add New Entity Form */}
            <View style={styles.addEntityInputRow}>
              <TextInput
                style={styles.addEntityInput}
                placeholder={
                  shippingMethod === 'courier'
                    ? 'Enter new carrier name...'
                    : 'Enter new transporter name...'
                }
                placeholderTextColor="#9A93A7"
                value={newLogisticsName}
                onChangeText={setNewLogisticsName}
              />
              <TouchableOpacity
                style={styles.addEntityBtn}
                activeOpacity={0.7}
                onPress={handleAddLogisticsEntity}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addEntityBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {(shippingMethod === 'courier' ? carrierList : transporterList).map((c, idx) => {
                const isSelected =
                  shippingMethod === 'courier' ? courierCarrier === c : transporter === c;
                return (
                  <View key={idx} style={styles.entityRowContainer}>
                    <TouchableOpacity
                      style={[styles.simplePickerRow, { flex: 1, borderBottomWidth: 0 }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (shippingMethod === 'courier') {
                          setCourierCarrier(c);
                        } else {
                          setTransporter(c);
                        }
                        setIsCarrierPickerVisible(false);
                      }}
                    >
                      <Ionicons
                        name={shippingMethod === 'courier' ? 'cube-outline' : 'bus-outline'}
                        size={16}
                        color={isSelected ? '#6D43C0' : '#8A819F'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.simplePickerText,
                          isSelected && { color: '#6D43C0', fontWeight: '700' },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteEntityBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteLogisticsEntity(c)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#E03137" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {(shippingMethod === 'courier' ? carrierList : transporterList).length === 0 && (
                <View style={styles.emptyEntityContainer}>
                  <Ionicons name="information-circle-outline" size={24} color="#9A93A7" />
                  <Text style={styles.emptyEntityText}>
                    {shippingMethod === 'courier'
                      ? 'No carriers yet. Add a carrier above.'
                      : 'No transporters yet. Add a transporter above.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: FULL PRODUCT PICKER MODAL (Backup selector)           */}
      {/* ============================================================== */}
      <Modal
        visible={isProductPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsProductPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Master Product</Text>
              <TouchableOpacity
                onPress={() => setIsProductPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchWrap}>
              <Ionicons
                name="search"
                size={16}
                color="#625A72"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search products or SKU..."
                placeholderTextColor="#9A93A7"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
              />
            </View>

            <FlatList
              data={masterProducts.filter(
                (p) =>
                  p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                  (p.sku &&
                    p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
                  (p.category &&
                    p.category.toLowerCase().includes(productSearchQuery.toLowerCase()))
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const itemBadge = getTrackingBadgeStyle(item.trackingType);
                return (
                  <TouchableOpacity
                    style={styles.productPickerRow}
                    activeOpacity={0.7}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={styles.productPickerRowLeft}>
                      <Text style={styles.productPickerName}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                        <View
                          style={[
                            styles.trackingBadgeSmall,
                            { backgroundColor: itemBadge.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.trackingBadgeSmallText,
                              { color: itemBadge.text },
                            ]}
                          >
                            {itemBadge.label}
                          </Text>
                        </View>
                        <Text style={styles.productPickerSub}>
                          {' '}• {item.sku} • {item.uom}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productPickerRowRight}>
                      <Text style={styles.productPickerPrice}>
                        ₹{(item.unitPrice || 0).toLocaleString()}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6D43C0"
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#8B8498', fontSize: 13 }}>
                    No products found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F0F8',
  },

  // 1. TOP NAVY HEADER matching Inbound (#17102F)
  topNavyHeader: {
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#261B46',
  },
  navyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#271D47',
    borderWidth: 1,
    borderColor: '#3D2F6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  navyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  navySubtitle: {
    fontSize: 11,
    color: '#C6BEE0',
    marginTop: 2,
  },
  badgeLiveMode: {
    backgroundColor: '#2A1D54',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A3B7E',
  },
  badgeLiveModeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BDA2FF',
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },

  // Breadcrumb matching Inbound
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D43C0',
    marginLeft: 4,
  },

  // Shared White Card styling
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#21183B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#777187',
    marginBottom: 10,
  },
  sectionBadge: {
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // Fields Grid
  fieldsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  fieldCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#625A72',
    marginBottom: 4,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9D4E3',
    borderRadius: 7,
    paddingHorizontal: 8,
    height: 36,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: '#21183B',
    paddingVertical: 0,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D9D4E3',
    borderRadius: 7,
    paddingHorizontal: 8,
    height: 36,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 12,
    color: '#21183B',
    flex: 1,
  },
  cardValidationHint: {
    fontSize: 10,
    color: '#938C9F',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // SECTION 2: PRODUCT DETAILS TABLE
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productSubHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0ECFA',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    marginBottom: 10,
  },
  productSubHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#49336F',
  },

  // Horizontal Table Block
  tableScrollInner: {
    paddingBottom: 4,
  },
  tableBlock: {
    borderWidth: 1,
    borderColor: '#DCD7E8',
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F7FC',
    borderBottomWidth: 1,
    borderBottomColor: '#DCD7E8',
  },
  thCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#DCD7E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#49336F',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DFEC',
    backgroundColor: '#FFFFFF',
    minHeight: 52,
  },
  tdCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#E3DFEC',
    justifyContent: 'center',
  },

  // Tracking Badges
  trackingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  trackingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  trackingBadgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  trackingBadgeSmallText: {
    fontSize: 8,
    fontWeight: '700',
  },

  tdUomText: {
    fontSize: 11,
    color: '#332B45',
  },

  // Table Total Row
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F2FA',
    minHeight: 38,
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#49336F',
  },
  totalRowQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D43C0',
  },
  totalRowAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D43C0',
    paddingRight: 8,
    textAlign: 'right',
  },

  // SECTION 3: SHIPPING METHOD
  methodStatusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  methodStatusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2E7D32',
  },
  methodToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE6F2',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  methodToggleBtnActive: {
    backgroundColor: '#6D43C0',
    shadowColor: '#6D43C0',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  methodToggleBtnInactive: {
    backgroundColor: 'transparent',
  },
  methodToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  methodToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  methodToggleTextInactive: {
    color: '#49336F',
  },
  methodSectionBlock: {
    marginTop: 4,
  },
  transportBanner: {
    backgroundColor: '#F0ECFA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  transportBannerTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // SECTION 4: ACTIONS BAR
  actionsBarCard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#74648E',
    backgroundColor: '#2A2143',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveDraftBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#6D43C0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 7, 25, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pickerModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17102F',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F4FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#21183B',
    paddingVertical: 0,
  },
  productPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFA',
  },
  productPickerRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  productPickerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#21183B',
  },
  productPickerSub: {
    fontSize: 11,
    color: '#817A91',
  },
  productPickerRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPickerPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D43C0',
    marginRight: 6,
  },
  simplePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFA',
    borderRadius: 6,
  },
  simplePickerRowActive: {
    backgroundColor: '#F0ECFA',
  },
  simplePickerText: {
    fontSize: 13,
    color: '#21183B',
    fontWeight: '500',
  },
  simplePickerTextActive: {
    color: '#6D43C0',
    fontWeight: '700',
  },

  // Type-to-Search Product Input & Live Results
  tdProductInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CEE2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    height: 36,
  },
  tdProductTextInput: {
    flex: 1,
    fontSize: 11,
    color: '#211642',
    fontWeight: '600',
    padding: 0,
  },
  tdProductSkuText: {
    fontSize: 9.5,
    color: '#706584',
    marginTop: 2,
    marginLeft: 2,
  },
  zipDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    zIndex: 9999,
  },
  zipDropdownScroll: {
    maxHeight: 180,
  },
  zipDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  zipDropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  zipDropdownItemText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  zipDropdownItemSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  liveSearchBox: {
    marginTop: 10,
    backgroundColor: '#FAF8FE',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  liveSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5F5',
  },
  liveSearchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#211642',
  },
  liveSearchCountBadge: {
    backgroundColor: '#EBE4F8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  liveSearchCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D43C0',
  },
  liveSearchScroll: {
    maxHeight: 180,
  },
  liveSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 5,
  },
  liveSearchRowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3EEFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  liveSearchRowName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#211642',
  },
  liveSearchRowMeta: {
    fontSize: 10,
    color: '#706584',
    marginTop: 2,
  },
  liveSearchRowPrice: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#372064',
    marginTop: 2,
  },
  liveSearchEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  liveSearchEmptyText: {
    fontSize: 11.5,
    color: '#706584',
    fontWeight: '600',
  },
  liveSearchEmptySub: {
    fontSize: 10,
    color: '#9E96AF',
    marginTop: 2,
  },
  addEntityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addEntityInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F9F8FC',
    borderWidth: 1,
    borderColor: '#D8D1E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E1B26',
  },
  addEntityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addEntityBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  entityRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF7',
  },
  deleteEntityBtn: {
    padding: 8,
    marginLeft: 4,
  },
  emptyEntityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyEntityText: {
    fontSize: 12,
    color: '#8A819F',
    marginTop: 6,
    textAlign: 'center',
  },
});
