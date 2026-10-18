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
import {
  getUserAccessibleWarehouses,
  getMovementEventOptions,
} from '../../services/locationScopeHelper';
import CommonCalendarModal from '../../components/CommonCalendarModal';
import SearchableDropdown from '../../components/SearchableDropdown';
import TwoPartLocationPicker from '../../components/TwoPartLocationPicker';

import carrierService from '../../services/carrierService';


export default function CreateReturnScreen({ editingReturn, onCancel, onSaveReturn, outboundList = [], session }) {
  // Master products, warehouses & events (strictly master-created only)
  const masterProducts = (masterService?.getProducts?.() || []);
  const masterWarehouses = masterService?.getWarehouses?.() || [];
  const masterEvents = masterService?.getEvents?.() || [];

  const [sourceType, setSourceType] = useState('Event');
  const [destType, setDestType] = useState('Warehouse');

  const warehouseOptions = masterWarehouses
    .filter((w) => (w.status || 'active').toLowerCase() === 'active')
    .map((w) => (typeof w === 'string' ? w : w.name || w.code));

  const eventOptions = masterEvents
    .filter((e) => (e.status || 'active').toLowerCase() === 'active')
    .map((e) => (typeof e === 'string' ? e : e.name || e.code));

  // Completed outbound list for dropdown selection (empty if no user-created outbounds)
  const completedOutbounds = Array.isArray(outboundList) ? outboundList : [];

  // Default selected outbound
  const defaultSelectedOutbound = completedOutbounds[0] || null;

  // --- SECTION 1: RETURN CONSIGNMENT DETAILS ---
  const [consignmentDate, setConsignmentDate] = useState(editingReturn?.date || '10/10/2026');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [outboundNo, setOutboundNo] = useState(editingReturn?.refNo || editingReturn?.outboundNo || defaultSelectedOutbound?.no || '');
  const [source, setSource] = useState(
    editingReturn?.source || defaultSelectedOutbound?.destination || eventOptions[0] || ''
  );
  const [destination, setDestination] = useState(
    editingReturn?.destination || defaultSelectedOutbound?.source || warehouseOptions[0] || ''
  );

  // --- SECTION 2: PRODUCT DETAILS ---
  const [productItems, setProductItems] = useState(() => {
    if (editingReturn?.productLines && editingReturn.productLines.length > 0) {
      return JSON.parse(JSON.stringify(editingReturn.productLines));
    }
    if (masterProducts.length > 0) {
      return [
        {
          id: '1',
          srNo: 1,
          productId: masterProducts[0]?.id || '',
          productName: masterProducts[0]?.name || '',
          uom: masterProducts[0]?.uom || 'Pieces (Pcs)',
          returnedQty: '1',
          price: String(masterProducts[0]?.unitPrice || 0),
          amount: Number(masterProducts[0]?.unitPrice || 0) * 1,
        },
      ];
    }
    return [
      {
        id: '1',
        srNo: 1,
        productId: '',
        productName: '',
        uom: 'Pieces (Pcs)',
        returnedQty: '1',
        price: '0',
        amount: 0,
      },
    ];
  });

  // --- SECTION 3: RECEIVING METHOD ('courier' | 'transport') ---
  const [receivingMethod, setReceivingMethod] = useState(() => {
    const meth = (editingReturn?.method || '').toLowerCase();
    if (meth.includes('courier') || editingReturn?.receivingMethodDetails?.type?.toLowerCase() === 'courier') {
      return 'courier';
    }
    return 'transport';
  });

  // Courier fields (persistent, never cleared across tabs or save)
  const [awbNo, setAwbNo] = useState(
    editingReturn?.receivingMethodDetails?.awbNo || editingReturn?.awbNo || ''
  );
  const [courierCarrier, setCourierCarrier] = useState(
    editingReturn?.receivingMethodDetails?.carrier || editingReturn?.courierCarrier || editingReturn?.carrier || ''
  );

  // Transport fields (persistent, never cleared across tabs or save)
  const [shipmentNo, setShipmentNo] = useState(
    editingReturn?.receivingMethodDetails?.shipmentNo || editingReturn?.shipmentNo || ''
  );
  const [transporter, setTransporter] = useState(
    editingReturn?.receivingMethodDetails?.transporter || editingReturn?.transporter || ''
  );
  const [vehicleNo, setVehicleNo] = useState(
    editingReturn?.receivingMethodDetails?.vehicleNo || editingReturn?.vehicleNo || ''
  );
  const [lrDocketNo, setLrDocketNo] = useState(
    editingReturn?.receivingMethodDetails?.lrDocketNo || editingReturn?.lrDocketNo || ''
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
    if (receivingMethod === 'courier') {
      await carrierService.addCarrier(trimmed);
      setCourierCarrier(trimmed);
    } else {
      await carrierService.addTransporter(trimmed);
      setTransporter(trimmed);
    }
    setNewLogisticsName('');
  };

  const handleDeleteLogisticsEntity = async (name) => {
    if (receivingMethod === 'courier') {
      await carrierService.deleteCarrier(name);
      if (courierCarrier === name) setCourierCarrier('');
    } else {
      await carrierService.deleteTransporter(name);
      if (transporter === name) setTransporter('');
    }
  };

  // --- MODALS FOR EASY PICKING ---
  const [isOutboundPickerVisible, setIsOutboundPickerVisible] = useState(false);
  const [isProductPickerVisible, setIsProductPickerVisible] = useState(false);
  const [activeEditingItemIndex, setActiveEditingItemIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [isDestPickerVisible, setIsDestPickerVisible] = useState(false);
  const [isCarrierPickerVisible, setIsCarrierPickerVisible] = useState(false);

  // --- AUTO-FILL HANDLER WHEN OUTBOUND NO. IS SELECTED ---
  const handleSelectOutbound = (ob) => {
    setOutboundNo(ob.no);
    // Auto-fill: Return source is the outbound destination (event site)
    if (ob.destination) {
      setSource(ob.destination);
    }
    // Auto-fill: Return destination is the outbound source (warehouse)
    if (ob.source) {
      setDestination(ob.source);
    }
    setIsOutboundPickerVisible(false);
  };

  // --- SECTION 2 HELPERS ---
  const handleAddItem = () => {
    const nextSr = productItems.length + 1;
    const defaultProd = masterProducts.length > 0
      ? (masterProducts[nextSr % masterProducts.length] || masterProducts[0])
      : null;
    const newItem = {
      id: String(Date.now()),
      srNo: nextSr,
      productId: defaultProd?.id || '',
      productName: defaultProd?.name || '',
      trackingType: defaultProd?.trackingType || 'Countable',
      uom: defaultProd?.uom || 'Pieces (Pcs)',
      returnedQty: '1',
      price: String(defaultProd?.unitPrice || 0),
      amount: (defaultProd?.unitPrice || 0) * 1,
    };
    setProductItems([...productItems, newItem]);
  };

  const handleRemoveItem = (index) => {
    if (productItems.length === 1) {
      Alert.alert('Notice', 'At least one product line is recommended.');
      return;
    }
    const filtered = productItems.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
    }));
    setProductItems(reindexed);
  };

  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const handleTypeProduct = (index, text) => {
    setActiveSearchIndex(index);
    setActiveSearchQuery(text);

    const updated = [...productItems];
    updated[index] = { ...updated[index], productName: text };
    setProductItems(updated);
  };

  const handleClearProduct = (index) => {
    const updated = [...productItems];
    updated[index] = {
      ...updated[index],
      productId: '',
      productName: '',
      sku: '',
      trackingType: 'Countable',
      uom: 'Pieces (Pcs)',
      price: '0',
      amount: 0,
    };
    setProductItems(updated);
    setActiveSearchQuery('');
  };

  const applyProductToRow = (index, product, closeSearch = true) => {
    const updated = [...productItems];
    const item = { ...updated[index] };

    item.productId = product.id;
    item.productName = product.name;
    item.sku = product.sku || product.id || '';
    item.trackingType = product.trackingType || 'Countable';
    item.uom = product.uom || 'Pieces (Pcs)';
    item.price = String(product.unitPrice || 0);

    const qtyNum = parseFloat(item.returnedQty) || 0;
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
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleUpdateItemField = (index, field, value) => {
    const updated = [...productItems];
    const item = { ...updated[index], [field]: value };

    // Calculate Amount = Returned Qty * Price
    const qtyNum = parseFloat(item.returnedQty) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);

    updated[index] = item;
    setProductItems(updated);
  };

  const handleSelectProduct = (product) => {
    if (activeEditingItemIndex === null) return;
    applyProductToRow(activeEditingItemIndex, product, true);
    setIsProductPickerVisible(false);
    setActiveEditingItemIndex(null);
  };

  const getTrackingBadgeStyle = (trackingType) => {
    const lower = (trackingType || '').toLowerCase();
    if (lower.includes('serial')) {
      return {
        bg: '#F3E8FF',
        text: '#6D28D9',
        label: 'Serialized',
      };
    }
    if (lower.includes('consumable')) {
      return {
        bg: '#FEF3C7',
        text: '#D97706',
        label: 'Consumable',
      };
    }
    if (lower.includes('non')) {
      return {
        bg: '#E0F2FE',
        text: '#0284C7',
        label: 'Non-Serialized',
      };
    }
    return {
      bg: '#E6F4EA',
      text: '#18794E',
      label: 'Countable',
    };
  };

  // Totals Calculation
  const totalQuantity = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.returnedQty) || 0),
    0
  );
  const totalAmount = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.amount) || 0),
    0
  );

  // --- ACTIONS ---
  const handleSaveDraft = () => {
    if (!outboundNo.trim()) {
      Alert.alert('Draft Validation', 'Please select or enter an Outbound No. to save as draft.');
      return;
    }

    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const draftReturn = {
      id: editingReturn?.id || `RET-DRAFT-${Date.now()}`,
      no: editingReturn?.no || `RET-2026-D${randomSuffix}`,
      date: consignmentDate.trim() || '10 Oct 2026',
      refNo: outboundNo.trim(), // Stored as the refNo matching Outbound No.
      source: source.trim() || 'Event Return Site',
      destination: destination.trim() || 'Warehouse Central',
      method:
        receivingMethod === 'courier'
          ? `Courier (${courierCarrier || 'Standard'})`
          : `Transport (${transporter || 'Return Van'})`,
      status: 'Draft',
      itemsCount: productItems.length,
      totalQty: totalQuantity,
      totalAmount: totalAmount,
      receivingMethodDetails: {
        type: receivingMethod === 'courier' ? 'Courier' : 'Transport',
        awbNo: awbNo.trim(),
        carrier: courierCarrier.trim(),
        shipmentNo: shipmentNo.trim() || ('RET-SHP-' + Date.now().toString().slice(-6)),
        transporter: transporter.trim(),
        vehicleNo: vehicleNo.trim(),
        lrDocketNo: lrDocketNo.trim(),
      },
      awbNo: awbNo.trim(),
      carrier: courierCarrier.trim(),
      courierCarrier: courierCarrier.trim(),
      shipmentNo: shipmentNo.trim() || ('RET-SHP-' + Date.now().toString().slice(-6)),
      transporter: transporter.trim(),
      vehicleNo: vehicleNo.trim(),
      lrDocketNo: lrDocketNo.trim(),
      productLines: productItems,
    };

    Alert.alert(
      'Draft Saved',
      `Return draft ${draftReturn.no} linked to Outbound ${outboundNo} has been saved successfully.`,
      [
        {
          text: 'OK',
          onPress: () => onSaveReturn(draftReturn),
        },
      ]
    );
  };

  const handleCreateReturn = () => {
    // 1. Validate Consignment Details
    if (!consignmentDate.trim()) {
      Alert.alert('Validation Error', 'Please specify a return Date.');
      return;
    }
    if (!outboundNo.trim()) {
      Alert.alert('Validation Error', 'Outbound No. is required.');
      return;
    }
    if (!source.trim()) {
      Alert.alert('Validation Error', 'Please specify Return Origin (Source).');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Validation Error', 'Please specify Receiving Warehouse (Destination).');
      return;
    }

    // 2. Validate Products
    if (productItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product line item.');
      return;
    }
    for (let i = 0; i < productItems.length; i++) {
      const it = productItems[i];
      if (!it.productName || it.productName === 'Select Product') {
        Alert.alert('Validation Error', `Please select a product for row #${it.srNo}.`);
        return;
      }
      const q = parseFloat(it.returnedQty);
      if (isNaN(q) || q <= 0) {
        Alert.alert('Validation Error', `Returned Qty must be greater than 0 for row #${it.srNo}.`);
        return;
      }
    }

    // 3. Validate Receiving Method
    if (receivingMethod === 'courier') {
      if (!awbNo.trim()) {
        Alert.alert('Validation Error', 'AWB / Tracking No. is required for Courier return.');
        return;
      }
      if (!courierCarrier.trim()) {
        Alert.alert('Validation Error', 'Carrier name is required for Courier return.');
        return;
      }
    } else {
      if (!transporter.trim()) {
        Alert.alert('Validation Error', 'Transporter / Carrier is required for Transport return.');
        return;
      }
    }

    // 4. Generate Created Record
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const newReturn = {
      id: editingReturn?.id || `RET-${Date.now()}`,
      no: editingReturn?.no || `RET-2026-${randomSuffix}`,
      date: consignmentDate.trim(),
      refNo: outboundNo.trim(), // Linked Outbound No.
      source: source.trim(),
      destination: destination.trim(),
      method:
        receivingMethod === 'courier'
          ? `Courier (${courierCarrier.trim()})`
          : `Transport (${transporter.trim()})`,
      status: 'Inspected',
      itemsCount: productItems.length,
      totalQty: totalQuantity,
      totalAmount: totalAmount,
      receivingMethodDetails: {
        type: receivingMethod === 'courier' ? 'Courier' : 'Transport',
        awbNo: awbNo.trim(),
        carrier: courierCarrier.trim(),
        shipmentNo: shipmentNo.trim() || ('RET-SHP-' + Date.now().toString().slice(-6)),
        transporter: transporter.trim(),
        vehicleNo: vehicleNo.trim(),
        lrDocketNo: lrDocketNo.trim(),
      },
      awbNo: awbNo.trim(),
      carrier: courierCarrier.trim(),
      courierCarrier: courierCarrier.trim(),
      shipmentNo: shipmentNo.trim() || ('RET-SHP-' + Date.now().toString().slice(-6)),
      transporter: transporter.trim(),
      vehicleNo: vehicleNo.trim(),
      lrDocketNo: lrDocketNo.trim(),
      productLines: productItems,
    };

    Alert.alert(
      'Return Created',
      `Return movement ${newReturn.no} for Outbound ${outboundNo} created successfully with ${productItems.length} product lines (Total Qty: ${totalQuantity}, ₹${totalAmount.toLocaleString()}).`,
      [
        {
          text: 'View in Return List',
          onPress: () => onSaveReturn(newReturn),
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
        {/* BREADCRUMB ROW matching SVG */}
        <TouchableOpacity
          style={styles.breadcrumbRow}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Ionicons name="chevron-back" size={16} color="#6D43C0" />
          <Text style={styles.breadcrumbText}>‹ Movement / Return / New</Text>
        </TouchableOpacity>

        {/* ============================================================== */}
        {/* SECTION 1: CONSIGNMENT DETAILS                                 */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Consignment Details</Text>
          </View>

          {/* Outbound No. Dropdown Picker (Auto-fills source & destination) */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>
              Outbound No. <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownInputHighlight}
              activeOpacity={0.8}
              onPress={() => setIsOutboundPickerVisible(true)}
            >
              <Ionicons name="link-outline" size={14} color="#6D43C0" style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.dropdownTextBold,
                  !outboundNo && { color: '#9A93A7' },
                ]}
                numberOfLines={1}
              >
                {outboundNo || 'Select Outbound No.'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#6D43C0" />
            </TouchableOpacity>
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
              <Ionicons name="add" size={13} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.addItemBtnText}>Add item</Text>
            </TouchableOpacity>
          </View>

          {/* Product Items Table */}
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
                  <Text style={styles.thText}>Returned Qty</Text>
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
                    <View style={[styles.tdCell, { width: 75, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={styles.tdText}>{item.uom || 'Pcs'}</Text>
                    </View>

                    {/* Tracking Type */}
                    <View style={[styles.tdCell, { width: 110, justifyContent: 'center', alignItems: 'center' }]}>
                      <View style={[styles.trackingBadgeSmall, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.trackingBadgeSmallText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Returned Qty */}
                    <View style={[styles.tdCell, { width: 90 }]}>
                      <TextInput
                        style={[styles.tdTextInput, styles.tdNumericInput]}
                        keyboardType="numeric"
                        value={String(item.returnedQty)}
                        placeholder="0"
                        placeholderTextColor="#9A93A7"
                        onChangeText={(val) => handleUpdateItemField(index, 'returnedQty', val)}
                      />
                    </View>

                    {/* Action (Remove) */}
                    <View style={[styles.tdCell, { width: 65, justifyContent: 'center', alignItems: 'center', borderRightWidth: 0 }]}>
                      <TouchableOpacity
                        style={styles.tdActionBtn}
                        activeOpacity={0.7}
                        onPress={() => handleRemoveItem(index)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Totals Row */}
              <View style={styles.tableTotalRow}>
                <View style={[styles.tdCell, { width: 395, paddingLeft: 8 }]}>
                  <Text style={styles.totalRowLabel}>TOTALS ({productItems.length} lines)</Text>
                </View>
                <View style={[styles.tdCell, { width: 90, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={styles.totalRowQty}>{totalQuantity}</Text>
                </View>
                <View style={[styles.tdCell, { width: 65, borderRightWidth: 0 }]} />
              </View>
            </View>
          </ScrollView>
        </View>

        {/* ============================================================== */}
        {/* SECTION 3: RECEIVING METHOD (Courier vs Transport)             */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Receiving Method</Text>
          </View>

          {/* Segmented Switch: Courier vs Transport */}
          <View style={styles.methodToggleContainer}>
            <TouchableOpacity
              style={[
                styles.methodToggleBtn,
                receivingMethod === 'courier'
                  ? styles.methodToggleBtnActive
                  : styles.methodToggleBtnInactive,
              ]}
              activeOpacity={0.85}
              onPress={() => setReceivingMethod('courier')}
            >
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={16}
                color={receivingMethod === 'courier' ? '#FFFFFF' : '#372064'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.methodToggleText,
                  receivingMethod === 'courier'
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
                receivingMethod === 'transport'
                  ? styles.methodToggleBtnActive
                  : styles.methodToggleBtnInactive,
              ]}
              activeOpacity={0.85}
              onPress={() => setReceivingMethod('transport')}
            >
              <MaterialCommunityIcons
                name="truck-fast-outline"
                size={17}
                color={receivingMethod === 'transport' ? '#FFFFFF' : '#372064'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.methodToggleText,
                  receivingMethod === 'transport'
                    ? styles.methodToggleTextActive
                    : styles.methodToggleTextInactive,
                ]}
              >
                Transport
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional Fields: COURIER */}
          {receivingMethod === 'courier' && (
            <View style={styles.methodSectionBlock}>
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    AWB / Tracking No. <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="barcode-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
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
                      {courierCarrier || 'Select / enter carrier'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#625A72" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Conditional Fields: TRANSPORT */}
          {receivingMethod === 'transport' && (
            <View style={styles.methodSectionBlock}>

              {/* Row 1: Carrier / Transporter */}
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    Fleet / Transporter <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
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
                      {transporter || 'Enter fleet / transporter'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#625A72" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Vehicle No. (optional) & LR / Docket No. (optional) */}
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Vehicle No. (optional)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="car-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter vehicle number"
                      placeholderTextColor="#9A93A7"
                      value={vehicleNo}
                      onChangeText={setVehicleNo}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>LR / Docket No. (optional)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="newspaper-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
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
        {/* ACTIONS (Cancel, Save Draft, Create Return)                    */}
        {/* ============================================================== */}
        <View style={styles.actionsBarCard}>
          {/* Cancel */}
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
            <Ionicons name="document-outline" size={14} color="#6D43C0" style={{ marginRight: 4 }} />
            <Text style={styles.saveDraftBtnText}>Save Draft</Text>
          </TouchableOpacity>

          {/* Create Return */}
          <TouchableOpacity
            style={styles.createInboundBtn}
            activeOpacity={0.85}
            onPress={handleCreateReturn}
          >
            <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.createInboundBtnText}>Create Return</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: OUTBOUND NO. PICKER MODAL (Auto-fills Source & Dest)  */}
      {/* ============================================================== */}
      <Modal
        visible={isOutboundPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOutboundPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <View>
                <Text style={styles.pickerModalTitle}>Select Completed Outbound No.</Text>
                <Text style={styles.pickerModalSub}>
                  Auto-fills return origin and destination warehouse
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsOutboundPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={completedOutbounds}
              keyExtractor={(item) => item.id || item.no}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.outboundPickerRow,
                    outboundNo === item.no && styles.outboundPickerRowActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectOutbound(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={styles.outboundNoBadge}>{item.no}</Text>
                      <Text style={styles.outboundRefText}>• {item.refNo}</Text>
                    </View>
                    <Text style={styles.outboundRouteText}>
                      Dispatched to: <Text style={{ fontWeight: '700', color: '#211642' }}>{item.destination}</Text>
                    </Text>
                    <Text style={styles.outboundOriginText}>
                      Origin Hub: {item.source}
                    </Text>
                  </View>
                  <Ionicons
                    name={outboundNo === item.no ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color="#6D43C0"
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: PRODUCT PICKER MODAL                                  */}
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

            {/* Product Search */}
            <View style={styles.pickerSearchWrap}>
              <Ionicons name="search" size={16} color="#625A72" style={{ marginRight: 8 }} />
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
                  (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
                  (p.category && p.category.toLowerCase().includes(productSearchQuery.toLowerCase()))
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productPickerRow}
                  activeOpacity={0.7}
                  onPress={() => handleSelectProduct(item)}
                >
                  <View style={styles.productPickerRowLeft}>
                    <Text style={styles.productPickerName}>{item.name}</Text>
                    <Text style={styles.productPickerSub}>
                      SKU: {item.sku} • {item.category} • UoM: {item.uom}
                    </Text>
                  </View>
                  <View style={styles.productPickerRowRight}>
                    <Text style={styles.productPickerPrice}>
                      ₹{(item.unitPrice || 0).toLocaleString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#6D43C0" />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#8B8498', fontSize: 13 }}>No products found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: RETURN ORIGIN (SOURCE) PICKER MODAL                   */}
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
              <Text style={styles.pickerModalTitle}>Select Return Origin (Event/Site)</Text>
              <TouchableOpacity
                onPress={() => setIsSourcePickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {completedOutbounds.map((ob, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.simplePickerRow,
                    source === ob.destination && styles.simplePickerRowActive,
                  ]}
                  onPress={() => {
                    setSource(ob.destination);
                    setIsSourcePickerVisible(false);
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={source === ob.destination ? '#6D43C0' : '#625A72'}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.simplePickerText,
                        source === ob.destination && styles.simplePickerTextActive,
                      ]}
                    >
                      {ob.destination}
                    </Text>
                    <Text style={styles.simplePickerSub}>From Outbound: {ob.no}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: RECEIVING WAREHOUSE (DESTINATION) PICKER MODAL        */}
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
              <Text style={styles.pickerModalTitle}>Select Receiving Warehouse</Text>
              <TouchableOpacity
                onPress={() => setIsDestPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {destinationWarehouseList.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
                    No active warehouse assigned. Please create in Master tab.
                  </Text>
                </View>
              ) : (
                destinationWarehouseList.map((whName) => (
                  <TouchableOpacity
                    key={whName}
                    style={[
                      styles.simplePickerRow,
                      destination === whName && styles.simplePickerRowActive,
                    ]}
                    onPress={() => {
                      setDestination(whName);
                      setIsDestPickerVisible(false);
                    }}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color={destination === whName ? '#6D43C0' : '#625A72'}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.simplePickerText,
                          destination === whName && styles.simplePickerTextActive,
                        ]}
                      >
                        {whName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: CARRIER / TRANSPORTER PICKER MODAL                    */}
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
                {receivingMethod === 'courier' ? 'Choose Carrier' : 'Choose Transporter'}
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
                  receivingMethod === 'courier'
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
              {(receivingMethod === 'courier' ? carrierList : transporterList).map((c, idx) => {
                const isSelected =
                  receivingMethod === 'courier' ? courierCarrier === c : transporter === c;
                return (
                  <View key={idx} style={styles.entityRowContainer}>
                    <TouchableOpacity
                      style={[styles.simplePickerRow, { flex: 1, borderBottomWidth: 0 }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (receivingMethod === 'courier') {
                          setCourierCarrier(c);
                        } else {
                          setTransporter(c);
                        }
                        setIsCarrierPickerVisible(false);
                      }}
                    >
                      <Ionicons
                        name={receivingMethod === 'courier' ? 'cube-outline' : 'bus-outline'}
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

              {(receivingMethod === 'courier' ? carrierList : transporterList).length === 0 && (
                <View style={styles.emptyEntityContainer}>
                  <Ionicons name="information-circle-outline" size={24} color="#9A93A7" />
                  <Text style={styles.emptyEntityText}>
                    {receivingMethod === 'courier'
                      ? 'No carriers yet. Add a carrier above.'
                      : 'No transporters yet. Add a transporter above.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Universal Calendar Modal */}
      <CommonCalendarModal
        visible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        selectedDate={consignmentDate}
        onSelectDate={(formatted) => setConsignmentDate(formatted)}
        format="SLASH"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  topNavyHeader: {
    backgroundColor: '#17102F',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2B2050',
  },
  navyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  navyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  navySubtitle: {
    fontSize: 11,
    color: '#D8D0EA',
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

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    padding: 14,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#17102F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#211642',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#372064',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#625A72',
    marginBottom: 10,
  },

  fieldsRow: {
    flexDirection: 'row',
    marginHorizontal: -5,
    marginBottom: 10,
  },
  fieldCol: {
    flex: 1,
    paddingHorizontal: 5,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#625A72',
    marginBottom: 5,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  autoBadge: {
    fontSize: 8.5,
    color: '#6D43C0',
    fontWeight: '700',
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 11,
    color: '#211642',
    paddingVertical: 0,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 8,
  },
  dropdownInputHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F3FB',
    borderWidth: 1.5,
    borderColor: '#6D43C0',
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 8,
  },
  dropdownText: {
    fontSize: 11,
    color: '#211642',
    flex: 1,
    marginRight: 4,
  },
  dropdownTextBold: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6D43C0',
    flex: 1,
    marginRight: 4,
  },
  cardValidationHint: {
    fontSize: 10,
    color: '#8B8498',
    marginTop: 4,
    fontStyle: 'italic',
  },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemBtnText: {
    fontSize: 10,
    fontWeight: '600',
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
    marginBottom: 10,
  },
  productSubHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#372064',
  },
  productSubHeaderSub: {
    fontSize: 9,
    color: '#6D43C0',
    fontWeight: '600',
  },

  tableScrollInner: {
    paddingBottom: 4,
  },
  tableBlock: {
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F5FB',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
  },
  thCell: {
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  thText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#372064',
    textAlign: 'center',
  },

  tableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9F4',
    minHeight: 38,
  },
  tdCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#EDE9F4',
    justifyContent: 'center',
  },
  tdSrText: {
    fontSize: 9,
    color: '#625A72',
    fontWeight: '600',
  },
  tdDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9FD',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  tdDropdownText: {
    fontSize: 9.5,
    color: '#211642',
    fontWeight: '600',
    flex: 1,
    marginRight: 2,
  },
  tdTextInput: {
    fontSize: 9.5,
    color: '#211642',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 3,
    textAlign: 'center',
  },
  tdNumericInput: {
    fontWeight: '700',
    color: '#372064',
  },
  tdAmountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#211642',
  },
  tdActionBtn: {
    padding: 4,
  },

  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F2FC',
    minHeight: 32,
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#372064',
    letterSpacing: 0.3,
  },
  totalRowQty: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5521B5',
  },
  totalRowAmount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03543F',
  },

  productFooterNotes: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0ECFA',
  },
  bulletNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bulletNoteText: {
    fontSize: 9.5,
    color: '#625A72',
    flex: 1,
  },

  methodStatusBadge: {
    backgroundColor: '#EDEBFE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  methodStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#5521B5',
  },
  methodToggleContainer: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  methodToggleBtnActive: {
    backgroundColor: '#6D43C0',
  },
  methodToggleBtnInactive: {
    backgroundColor: '#F0ECFA',
    borderWidth: 1,
    borderColor: '#E5DFF0',
  },
  methodToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  methodToggleTextActive: {
    color: '#FFFFFF',
  },
  methodToggleTextInactive: {
    color: '#372064',
  },

  methodSectionBlock: {
    marginBottom: 8,
  },
  transportBanner: {
    backgroundColor: '#F7F5FB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6D43C0',
  },
  transportBannerTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#211642',
  },
  methodFooterNotes: {
    borderTopWidth: 1,
    borderTopColor: '#E5DFF0',
    paddingTop: 8,
    marginTop: 6,
  },
  methodNoteText: {
    fontSize: 9.5,
    color: '#625A72',
    lineHeight: 14,
  },

  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  readyBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#03543F',
  },
  reviewGrid: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 10,
  },
  reviewCardItem: {
    flex: 1,
    backgroundColor: '#F7F5FB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE9F4',
    padding: 8,
    marginHorizontal: 4,
  },
  reviewItemLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8B8498',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  reviewItemValueMain: {
    fontSize: 11,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 2,
  },
  reviewItemSub: {
    fontSize: 9.5,
    color: '#625A72',
  },
  reviewMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECFA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  reviewMethodText: {
    fontSize: 10,
    color: '#372064',
    fontWeight: '600',
    flex: 1,
  },
  reviewDraftNotice: {
    fontSize: 9.5,
    color: '#8B8498',
    fontStyle: 'italic',
  },

  actionsBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#17102F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cancelBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#F0ECFA',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#372064',
  },
  saveDraftBtn: {
    flex: 1.2,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6D43C0',
    borderRadius: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  saveDraftBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D43C0',
  },
  createInboundBtn: {
    flex: 1.5,
    height: 38,
    backgroundColor: '#6D43C0',
    borderRadius: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createInboundBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 16, 47, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '75%',
    padding: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17102F',
  },
  pickerModalSub: {
    fontSize: 10.5,
    color: '#625A72',
    marginTop: 2,
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F4FA',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#211642',
  },

  outboundPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9FD',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  outboundPickerRowActive: {
    backgroundColor: '#F0ECFA',
    borderColor: '#6D43C0',
  },
  outboundNoBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D43C0',
    marginRight: 6,
  },
  outboundRefText: {
    fontSize: 11,
    color: '#8B8498',
  },
  outboundRouteText: {
    fontSize: 11,
    color: '#625A72',
    marginTop: 2,
  },
  outboundOriginText: {
    fontSize: 10,
    color: '#8B8498',
    marginTop: 1,
  },

  productPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFA',
  },
  productPickerRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  productPickerName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#211642',
  },
  productPickerSub: {
    fontSize: 10,
    color: '#625A72',
    marginTop: 2,
  },
  productPickerRowRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  productPickerPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D43C0',
    marginRight: 6,
  },

  simplePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4FA',
  },
  simplePickerRowActive: {
    backgroundColor: '#F3EEFF',
  },
  simplePickerText: {
    fontSize: 12,
    color: '#211642',
    fontWeight: '500',
  },
  simplePickerTextActive: {
    color: '#6D43C0',
    fontWeight: '700',
  },
  simplePickerSub: {
    fontSize: 9.5,
    color: '#8B8498',
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
  trackingBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trackingBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
