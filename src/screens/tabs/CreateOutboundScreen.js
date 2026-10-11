import React, { useState } from 'react';
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

const KNOWN_COURIERS = [
  'Blue Dart Express',
  'DHL Express',
  'Delhivery Logistics',
  'DTDC Courier',
  'FedEx India',
  'Trackon Courier',
];

const KNOWN_TRANSPORTERS = [
  'Dedicated Truck Fleet',
  'VRL Logistics Ltd',
  'TCI Freight Logistics',
  'SafeXpress Supply Chain',
  'Gati KWE Logistics',
  'Express Cargo Van',
  'Interstate Road Carriers',
];

export default function CreateOutboundScreen({ onCancel, onSaveOutbound }) {
  // Master products, warehouses, and events
  const masterProducts = masterService.getProducts();
  const masterWarehouses = masterService.getWarehouses();
  const masterEvents = masterService.getEvents();

  // Destination event suggestions
  const defaultDestinations = [
    'Jio Garden - City Music Fest',
    'Hyatt Regency - Brand Launch',
    'JLN Stadium Arena',
    'Fatorda Stadium - Sports Weekend',
    'Arena Club Event B',
    'Pune Tech Summit',
    'Mumbai Exhibition Centre',
    ...masterEvents.map((e) => `${e.venue} - ${e.name}`),
  ];

  // --- SECTION 1: CONSIGNMENT DETAILS ---
  const [consignmentDate, setConsignmentDate] = useState('10/10/2026');
  const [refNo, setRefNo] = useState('SO-99130');
  const [source, setSource] = useState(
    masterWarehouses[0]?.name || 'Warehouse A - Central'
  );
  const [destination, setDestination] = useState(
    defaultDestinations[0] || 'Jio Garden - City Music Fest'
  );

  // --- SECTION 2: PRODUCT DETAILS ---
  const [productItems, setProductItems] = useState([
    {
      id: '1',
      srNo: 1,
      productId: masterProducts[0]?.id || 'PRD-001',
      productName: masterProducts[0]?.name || 'Item 22',
      uom: masterProducts[0]?.uom || 'Pieces (Pcs)',
      dispatchedQty: '8',
      price: String(masterProducts[0]?.unitPrice || 1500),
      amount: 12000,
    },
    {
      id: '2',
      srNo: 2,
      productId: masterProducts[1]?.id || 'PRD-002',
      productName: masterProducts[1]?.name || 'Portable Speaker',
      uom: masterProducts[1]?.uom || 'Pieces (Pcs)',
      dispatchedQty: '4',
      price: String(masterProducts[1]?.unitPrice || 4200),
      amount: 16800,
    },
  ]);

  // --- SECTION 3: SHIPPING METHOD ('courier' | 'transport') ---
  const [shippingMethod, setShippingMethod] = useState('transport');

  // Courier fields
  const [awbNo, setAwbNo] = useState('AWB-5541902');
  const [courierCarrier, setCourierCarrier] = useState('Blue Dart Express');

  // Transport fields
  const [shipmentNo, setShipmentNo] = useState('SHP-OUT-2026-102');
  const [transporter, setTransporter] = useState('Dedicated Truck Fleet');
  const [vehicleNo, setVehicleNo] = useState('MH-04-AZ-8921');
  const [lrDocketNo, setLrDocketNo] = useState('LR-773319');

  // --- MODALS FOR EASY PICKING ---
  const [isProductPickerVisible, setIsProductPickerVisible] = useState(false);
  const [activeEditingItemIndex, setActiveEditingItemIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [isDestPickerVisible, setIsDestPickerVisible] = useState(false);
  const [isCarrierPickerVisible, setIsCarrierPickerVisible] = useState(false);

  // --- SECTION 2 HELPERS ---
  const handleAddItem = () => {
    const nextSr = productItems.length + 1;
    const defaultProd = masterProducts[nextSr % masterProducts.length] || masterProducts[0];
    const newItem = {
      id: String(Date.now()),
      srNo: nextSr,
      productId: defaultProd?.id || '',
      productName: defaultProd?.name || 'Select Product',
      uom: defaultProd?.uom || 'Pieces (Pcs)',
      dispatchedQty: '1',
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

  const handleUpdateItemField = (index, field, value) => {
    const updated = [...productItems];
    const item = { ...updated[index], [field]: value };

    // Calculate Amount = Dispatched Qty * Price
    const qtyNum = parseFloat(item.dispatchedQty) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);

    updated[index] = item;
    setProductItems(updated);
  };

  const handleSelectProduct = (product) => {
    if (activeEditingItemIndex === null) return;
    const updated = [...productItems];
    const item = { ...updated[activeEditingItemIndex] };

    item.productId = product.id;
    item.productName = product.name;
    item.uom = product.uom || 'Pieces (Pcs)';
    item.price = String(product.unitPrice || 0);

    const qtyNum = parseFloat(item.dispatchedQty) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);

    updated[activeEditingItemIndex] = item;
    setProductItems(updated);
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
    if (!refNo.trim()) {
      Alert.alert('Draft Validation', 'Please enter at least a Reference Number to save as draft.');
      return;
    }

    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const draftOutbound = {
      id: `OUT-DRAFT-${Date.now()}`,
      no: `OUT-2026-D${randomSuffix}`,
      date: consignmentDate.trim() || '10 Oct 2026',
      refNo: refNo.trim(),
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
      shippingMethodDetails:
        shippingMethod === 'courier'
          ? { type: 'Courier', awbNo, carrier: courierCarrier }
          : { type: 'Transport', shipmentNo, transporter, vehicleNo, lrDocketNo },
      productLines: productItems,
    };

    Alert.alert(
      'Draft Saved',
      `Outbound draft ${draftOutbound.no} for Reference ${refNo} has been saved successfully.`,
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
    if (!refNo.trim()) {
      Alert.alert('Validation Error', 'Reference No. is required.');
      return;
    }
    if (!source.trim()) {
      Alert.alert('Validation Error', 'Please select or enter the Source.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Validation Error', 'Please select or enter the Destination.');
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
      const q = parseFloat(it.dispatchedQty);
      if (isNaN(q) || q <= 0) {
        Alert.alert('Validation Error', `Dispatched Qty must be greater than 0 for row #${it.srNo}.`);
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
      if (!shipmentNo.trim()) {
        Alert.alert('Validation Error', 'Shipment No. is required for Transport shipping.');
        return;
      }
      if (!transporter.trim()) {
        Alert.alert('Validation Error', 'Carrier / Transporter is required for Transport shipping.');
        return;
      }
    }

    // 4. Generate Created Record
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const newOutbound = {
      id: `OUT-${Date.now()}`,
      no: `OUT-2026-${randomSuffix}`,
      date: consignmentDate.trim(),
      refNo: refNo.trim(),
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
      shippingMethodDetails:
        shippingMethod === 'courier'
          ? { type: 'Courier', awbNo, carrier: courierCarrier }
          : { type: 'Transport', shipmentNo, transporter, vehicleNo, lrDocketNo },
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
      {/* 1. TOP NAVY HEADER matching SVG (#17102F) */}
      <View style={styles.topNavyHeader}>
        <View style={styles.navyHeaderLeft}>
          <TouchableOpacity
            style={styles.backIconButton}
            activeOpacity={0.7}
            onPress={onCancel}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.navyTitle}>Create Outbound</Text>
            <Text style={styles.navySubtitle}>
              Record dispatched stock and shipment details
            </Text>
          </View>
        </View>

        <View style={styles.badgeLiveMode}>
          <Text style={styles.badgeLiveModeText}>NEW OUTBOUND</Text>
        </View>
      </View>

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
          <Text style={styles.breadcrumbText}>Movement / Outbound / New</Text>
        </TouchableOpacity>

        {/* ============================================================== */}
        {/* SECTION 1: CONSIGNMENT DETAILS                                 */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>1. Consignment Details</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>Dispatch Info</Text>
            </View>
          </View>

          {/* Row 1: Date & Reference No. */}
          <View style={styles.fieldsRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>Date *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9A93A7"
                  value={consignmentDate}
                  onChangeText={setConsignmentDate}
                />
              </View>
            </View>

            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>Reference No. *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="document-text-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter reference number"
                  placeholderTextColor="#9A93A7"
                  value={refNo}
                  onChangeText={setRefNo}
                />
              </View>
            </View>
          </View>

          {/* Row 2: Source & Destination */}
          <View style={styles.fieldsRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>Source (Warehouse) *</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => setIsSourcePickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !source && { color: '#9A93A7' },
                  ]}
                  numberOfLines={1}
                >
                  {source || 'Select warehouse'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#625A72" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>Destination (Event / Venue) *</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => setIsDestPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !destination && { color: '#9A93A7' },
                  ]}
                  numberOfLines={1}
                >
                  {destination || 'Select destination'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#625A72" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.cardValidationHint}>
            * Required fields should be validated before saving.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* SECTION 2: PRODUCT DETAILS                                     */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>2. Product Details</Text>
            <TouchableOpacity
              style={styles.addItemBtn}
              activeOpacity={0.85}
              onPress={handleAddItem}
            >
              <Ionicons name="add" size={13} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.addItemBtnText}>+ Add item</Text>
            </TouchableOpacity>
          </View>

          {/* Subheader bar inside card */}
          <View style={styles.productSubHeaderBar}>
            <Text style={styles.productSubHeaderText}>
              Product line items ({productItems.length})
            </Text>
            <Text style={styles.productSubHeaderSub}>
              Amount = Dispatched Qty × Price
            </Text>
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
                <View style={[styles.thCell, { width: 44 }]}>
                  <Text style={styles.thText}>Sr.</Text>
                </View>
                <View style={[styles.thCell, { width: 150 }]}>
                  <Text style={styles.thText}>Product Name</Text>
                </View>
                <View style={[styles.thCell, { width: 75 }]}>
                  <Text style={styles.thText}>UoM</Text>
                </View>
                <View style={[styles.thCell, { width: 90 }]}>
                  <Text style={styles.thText}>Dispatched Qty</Text>
                </View>
                <View style={[styles.thCell, { width: 80 }]}>
                  <Text style={styles.thText}>Price (₹)</Text>
                </View>
                <View style={[styles.thCell, { width: 90 }]}>
                  <Text style={styles.thText}>Amount (₹)</Text>
                </View>
                <View style={[styles.thCell, { width: 55, borderRightWidth: 0 }]}>
                  <Text style={styles.thText}>Action</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {productItems.map((item, index) => (
                <View key={item.id} style={styles.tableBodyRow}>
                  {/* Sr. No. */}
                  <View style={[styles.tdCell, { width: 44, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.tdSrText}>{item.srNo}</Text>
                  </View>

                  {/* Product Name (Tap to select from master catalog) */}
                  <View style={[styles.tdCell, { width: 150 }]}>
                    <TouchableOpacity
                      style={styles.tdDropdownBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setActiveEditingItemIndex(index);
                        setProductSearchQuery('');
                        setIsProductPickerVisible(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.tdDropdownText,
                          (!item.productName || item.productName === 'Select Product') && { color: '#9A93A7' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.productName || 'Select'}
                      </Text>
                      <Ionicons name="caret-down" size={10} color="#6D43C0" />
                    </TouchableOpacity>
                  </View>

                  {/* UoM */}
                  <View style={[styles.tdCell, { width: 75 }]}>
                    <TextInput
                      style={styles.tdTextInput}
                      value={item.uom}
                      placeholder="Pcs"
                      placeholderTextColor="#9A93A7"
                      onChangeText={(val) => handleUpdateItemField(index, 'uom', val)}
                    />
                  </View>

                  {/* Dispatched Qty */}
                  <View style={[styles.tdCell, { width: 90 }]}>
                    <TextInput
                      style={[styles.tdTextInput, styles.tdNumericInput]}
                      keyboardType="numeric"
                      value={String(item.dispatchedQty)}
                      placeholder="0"
                      placeholderTextColor="#9A93A7"
                      onChangeText={(val) => handleUpdateItemField(index, 'dispatchedQty', val)}
                    />
                  </View>

                  {/* Price */}
                  <View style={[styles.tdCell, { width: 80 }]}>
                    <TextInput
                      style={[styles.tdTextInput, styles.tdNumericInput]}
                      keyboardType="numeric"
                      value={String(item.price)}
                      placeholder="0"
                      placeholderTextColor="#9A93A7"
                      onChangeText={(val) => handleUpdateItemField(index, 'price', val)}
                    />
                  </View>

                  {/* Calculated Amount */}
                  <View style={[styles.tdCell, { width: 90, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 }]}>
                    <Text style={styles.tdAmountText}>
                      ₹{(item.amount || 0).toLocaleString()}
                    </Text>
                  </View>

                  {/* Action (Remove) */}
                  <View style={[styles.tdCell, { width: 55, justifyContent: 'center', alignItems: 'center', borderRightWidth: 0 }]}>
                    <TouchableOpacity
                      style={styles.tdActionBtn}
                      activeOpacity={0.7}
                      onPress={() => handleRemoveItem(index)}
                    >
                      <Ionicons name="trash-outline" size={15} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Totals Row */}
              <View style={styles.tableTotalRow}>
                <View style={[styles.tdCell, { width: 269, paddingLeft: 8 }]}>
                  <Text style={styles.totalRowLabel}>TOTALS ({productItems.length} lines)</Text>
                </View>
                <View style={[styles.tdCell, { width: 90, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={styles.totalRowQty}>{totalQuantity}</Text>
                </View>
                <View style={[styles.tdCell, { width: 80 }]} />
                <View style={[styles.tdCell, { width: 90, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 }]}>
                  <Text style={styles.totalRowAmount}>₹{totalAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.tdCell, { width: 55, borderRightWidth: 0 }]} />
              </View>
            </View>
          </ScrollView>

          {/* Product guidance footer notes matching SVG */}
          <View style={styles.productFooterNotes}>
            <View style={styles.bulletNoteRow}>
              <Ionicons name="calculator-outline" size={12} color="#6D43C0" style={{ marginRight: 6 }} />
              <Text style={styles.bulletNoteText}>
                Amount = Dispatched Qty × Price (calculated automatically in real-time)
              </Text>
            </View>
            <View style={styles.bulletNoteRow}>
              <Ionicons name="information-circle-outline" size={12} color="#6D43C0" style={{ marginRight: 6 }} />
              <Text style={styles.bulletNoteText}>
                Use Action to edit or remove a product line.
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* SECTION 3: SHIPPING METHOD (Courier vs Transport)              */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>3. Shipping Method</Text>
            <View style={styles.methodStatusBadge}>
              <Text style={styles.methodStatusBadgeText}>
                {shippingMethod === 'courier' ? 'Courier Shipping' : 'Freight Transport'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardSubtitle}>Choose how the consignment is being shipped.</Text>

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
                  <Text style={styles.fieldLabel}>AWB / Tracking No. *</Text>
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
                  <Text style={styles.fieldLabel}>Carrier *</Text>
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
          {shippingMethod === 'transport' && (
            <View style={styles.methodSectionBlock}>
              <View style={styles.transportBanner}>
                <Text style={styles.transportBannerTitle}>
                  Transport details (when Transport is selected)
                </Text>
              </View>

              {/* Row 1: Shipment No. & Carrier / Transporter */}
              <View style={styles.fieldsRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Shipment No. *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="receipt-outline" size={14} color="#625A72" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter shipment number"
                      placeholderTextColor="#9A93A7"
                      value={shipmentNo}
                      onChangeText={setShipmentNo}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Carrier / Transporter *</Text>
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
                      {transporter || 'Enter carrier / transporter'}
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

          {/* Notes matching SVG */}
          <View style={styles.methodFooterNotes}>
            <Text style={styles.methodNoteText}>
              • Courier and Transport fields switch based on the selected method.
            </Text>
            <Text style={styles.methodNoteText}>
              • Only the relevant shipping method fields should be required.
            </Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* SECTION 4: REVIEW                                              */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>4. Review</Text>
            <View style={styles.readyBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#03543F" style={{ marginRight: 4 }} />
              <Text style={styles.readyBadgeText}>Verification</Text>
            </View>
          </View>

          <Text style={styles.cardSubtitle}>
            Check consignment, product quantities and shipping method before dispatch.
          </Text>

          {/* Review Quick Summary Grid */}
          <View style={styles.reviewGrid}>
            <View style={styles.reviewCardItem}>
              <Text style={styles.reviewItemLabel}>CONSIGNMENT</Text>
              <Text style={styles.reviewItemValueMain} numberOfLines={1}>
                {refNo || 'No Ref'}
              </Text>
              <Text style={styles.reviewItemSub} numberOfLines={1}>
                {source} ➔ {destination}
              </Text>
            </View>

            <View style={styles.reviewCardItem}>
              <Text style={styles.reviewItemLabel}>ITEMS & VALUE</Text>
              <Text style={styles.reviewItemValueMain}>
                {productItems.length} lines ({totalQuantity} units)
              </Text>
              <Text style={[styles.reviewItemSub, { color: '#6D43C0', fontWeight: '700' }]}>
                ₹{totalAmount.toLocaleString()} Net Valuation
              </Text>
            </View>
          </View>

          <View style={styles.reviewMethodPill}>
            <MaterialCommunityIcons
              name={shippingMethod === 'courier' ? 'package-variant-closed' : 'truck-fast'}
              size={15}
              color="#5521B5"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.reviewMethodText}>
              {shippingMethod === 'courier'
                ? `Courier: ${courierCarrier || 'N/A'} (AWB: ${awbNo || 'N/A'})`
                : `Transport: ${transporter || 'N/A'} (Shipment: ${shipmentNo || 'N/A'}${vehicleNo ? `, Veh: ${vehicleNo}` : ''})`}
            </Text>
          </View>

          <Text style={styles.reviewDraftNotice}>
            Drafts can be edited before final confirmation.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* SECTION 5: ACTIONS (Cancel, Save Draft, Create Outbound)       */}
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

          {/* Create Outbound */}
          <TouchableOpacity
            style={styles.createInboundBtn}
            activeOpacity={0.85}
            onPress={handleCreateOutbound}
          >
            <Ionicons name="paper-plane" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.createInboundBtnText}>Create Outbound</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: PRODUCT PICKER MODAL                                  */}
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
              {masterWarehouses.map((wh) => (
                <TouchableOpacity
                  key={wh.id}
                  style={[
                    styles.simplePickerRow,
                    source === wh.name && styles.simplePickerRowActive,
                  ]}
                  onPress={() => {
                    setSource(wh.name);
                    setIsSourcePickerVisible(false);
                  }}
                >
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={source === wh.name ? '#6D43C0' : '#625A72'}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.simplePickerText,
                        source === wh.name && styles.simplePickerTextActive,
                      ]}
                    >
                      {wh.name}
                    </Text>
                    <Text style={styles.simplePickerSub}>
                      {wh.city} • {wh.code}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DESTINATION EVENT / VENUE PICKER MODAL                */}
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
              <Text style={styles.pickerModalTitle}>Select Destination Event / Venue</Text>
              <TouchableOpacity
                onPress={() => setIsDestPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {defaultDestinations.map((dst, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.simplePickerRow,
                    destination === dst && styles.simplePickerRowActive,
                  ]}
                  onPress={() => {
                    setDestination(dst);
                    setIsDestPickerVisible(false);
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={destination === dst ? '#6D43C0' : '#625A72'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.simplePickerText,
                      destination === dst && styles.simplePickerTextActive,
                    ]}
                  >
                    {dst}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: CARRIER PICKER MODAL                                  */}
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
                {shippingMethod === 'courier' ? 'Select Courier Carrier' : 'Select Freight Transporter'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCarrierPickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(shippingMethod === 'courier' ? KNOWN_COURIERS : KNOWN_TRANSPORTERS).map(
                (c, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.simplePickerRow}
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
                      name="paper-plane-outline"
                      size={16}
                      color="#6D43C0"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.simplePickerText}>{c}</Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
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
  dropdownText: {
    fontSize: 11,
    color: '#211642',
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
});
