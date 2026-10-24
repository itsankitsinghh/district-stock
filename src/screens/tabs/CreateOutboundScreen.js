import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import carrierService from '../../services/carrierService';
import { authService } from '../../services/authService';
import {
  getUserAccessibleWarehouses,
  getMovementEventOptions,
} from '../../services/locationScopeHelper';
import CommonCalendarModal from '../../components/CommonCalendarModal';
import TwoPartLocationPicker from '../../components/TwoPartLocationPicker';
import VisionCameraScanner from '../../components/VisionCameraScanner';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 80;
const EXPANDED_HEIGHT = 380;

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
  const [userAssignedWarehouses, setUserAssignedWarehouses] = useState(() => getUserAccessibleWarehouses(session));

  useEffect(() => {
    const refreshMaster = () => {
      setMasterProducts(masterService?.getProducts?.() || []);
      setMasterWarehouses(masterService?.getWarehouses?.() || []);
      setMasterEvents(masterService?.getEvents?.() || []);
      setUserAssignedWarehouses(getUserAccessibleWarehouses(session));
    };
    refreshMaster();
    if (masterService?.subscribe) {
      const unsub = masterService.subscribe(() => {
        refreshMaster();
      });
      return () => unsub();
    }
  }, [session]);

  const [sourceType, setSourceType] = useState('Warehouse');
  const [destType, setDestType] = useState('Event');

  const warehouseOptions = masterWarehouses
    .filter((w) => (w.status || 'active').toLowerCase() === 'active')
    .map((w) => (typeof w === 'string' ? w : w.name || w.code));

  const eventOptions = masterEvents
    .filter((e) => (e.status || 'active').toLowerCase() === 'active')
    .map((e) => (typeof e === 'string' ? e : e.name || e.code));

  const sourceWarehouseList = userAssignedWarehouses.length > 0 ? userAssignedWarehouses : warehouseOptions;

  // Current outbound record status
  const [currentOutbound, setCurrentOutbound] = useState(editingOutbound || null);
  const currentStatus = (currentOutbound?.status || 'Draft').toUpperCase();
  const isDraft = currentStatus === 'DRAFT' || !currentOutbound;
  const outboundNo = currentOutbound?.no || null;

  // Active Sub-screen: null (Main Form) | 'scan-serial'
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Default Source from Dashboard Warehouse selection or first accessible warehouse
  const dashboardSelectedWh =
    selectedDashboardWarehouse && selectedDashboardWarehouse !== 'ALL'
      ? selectedDashboardWarehouse
      : authService?.getSelectedWarehouse?.() && authService.getSelectedWarehouse() !== 'ALL'
      ? authService.getSelectedWarehouse()
      : '';

  const initialSource =
    editingOutbound?.source ||
    (dashboardSelectedWh && warehouseOptions.includes(dashboardSelectedWh)
      ? dashboardSelectedWh
      : sourceWarehouseList[0] || warehouseOptions[0] || '');

  // --- SECTION 1: CONSIGNMENT DETAILS ---
  const [consignmentDate, setConsignmentDate] = useState(editingOutbound?.date || '14/10/2026');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [refNo, setRefNo] = useState(editingOutbound?.refNo || '');
  const [source, setSource] = useState(initialSource);
  const [destination, setDestination] = useState(editingOutbound?.destination || eventOptions[0] || '');

  useEffect(() => {
    if (!source && warehouseOptions.length > 0) {
      setSource(sourceWarehouseList[0] || warehouseOptions[0]);
    }
  }, [warehouseOptions, source, sourceWarehouseList]);

  useEffect(() => {
    if (!destination && eventOptions.length > 0) {
      setDestination(eventOptions[0]);
    }
  }, [eventOptions, destination]);

  // --- SECTION 2: PRODUCT DETAILS ---
  const [productItems, setProductItems] = useState(() => {
    if (editingOutbound?.productLines && editingOutbound.productLines.length > 0) {
      return editingOutbound.productLines.map((line, idx) => ({
        id: line.id || String(idx + 1),
        srNo: idx + 1,
        productId: line.productId || '',
        productName: line.productName || line.name || '',
        sku: line.sku || '',
        trackingType: line.trackingType || 'Countable',
        uom: line.uom || 'Pieces',
        dispatchedQty: String(line.dispatchedQty !== undefined ? line.dispatchedQty : (line.qty || '')),
        serialNumbers: Array.isArray(line.serialNumbers) ? line.serialNumbers : [],
        price: String(line.price || line.unitPrice || 0),
        amount: Number(line.amount) || 0,
        remarks: line.remarks || '',
      }));
    }
    return [
      {
        id: '1',
        srNo: 1,
        productId: '',
        productName: '',
        sku: '',
        trackingType: 'Countable',
        uom: 'Pieces',
        dispatchedQty: '',
        serialNumbers: [],
        price: '0',
        amount: 0,
        remarks: '',
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

  // Courier fields (persistent, never cleared)
  const [awbNo, setAwbNo] = useState(
    editingOutbound?.shippingMethodDetails?.awbNo || editingOutbound?.awbNo || ''
  );
  const [courierCarrier, setCourierCarrier] = useState(
    editingOutbound?.shippingMethodDetails?.carrier || editingOutbound?.courierCarrier || editingOutbound?.carrier || ''
  );

  // Transport fields (persistent, never cleared)
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
  const [isCarrierPickerVisible, setIsCarrierPickerVisible] = useState(false);

  // Section 4: Notes
  const [notes, setNotes] = useState(editingOutbound?.notes || '');

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
      trackingType: 'Countable',
      uom: 'Pieces',
      dispatchedQty: '',
      serialNumbers: [],
      price: '0',
      amount: 0,
      remarks: '',
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
      trackingType: 'Countable',
      uom: 'Pieces',
      serialNumbers: [],
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

  // Open Screen 2: Scan Serial Number
  const handleOpenScan = (index) => {
    const item = productItems[index];
    if (!item?.productName) {
      setActiveSearchIndex(index);
      setActiveSearchQuery('');
      return;
    }
    const qty = parseInt(item.dispatchedQty, 10) || 0;
    if (qty <= 0) {
      Alert.alert('Notice', 'Please enter Dispatched Quantity before scanning serial numbers.');
      return;
    }
    setActiveItemIndex(index);
    setActiveSubScreen('scan-serial');
  };

  // Save scanned serials from Scan Screen
  const handleSaveScannedSerials = (serials) => {
    const updated = [...productItems];
    const item = { ...updated[activeItemIndex] };
    item.serialNumbers = serials;
    updated[activeItemIndex] = item;
    setProductItems(updated);
    setActiveSubScreen(null);
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

  // --- MANDATORY FIELDS VALIDATION ---
  const validateMandatoryFields = () => {
    if (!consignmentDate.trim()) {
      Alert.alert('Validation Error', 'Please select a consignment Date.');
      return false;
    }
    if (!source || !source.trim()) {
      Alert.alert('Validation Error', 'Source location is mandatory. Please select a Source.');
      return false;
    }
    if (!destination || !destination.trim()) {
      Alert.alert('Validation Error', 'Destination location is mandatory. Please select a Destination.');
      return false;
    }
    if (!productItems || productItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one Product line item.');
      return false;
    }
    for (let i = 0; i < productItems.length; i++) {
      const item = productItems[i];
      if (!item.productName || !item.productName.trim()) {
        Alert.alert('Validation Error', `Line #${i + 1}: Product name is mandatory. Please select a product.`);
        return false;
      }
      const qty = parseInt(item.dispatchedQty, 10);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Validation Error', `Line #${i + 1} (${item.productName}): Dispatched quantity must be greater than 0.`);
        return false;
      }
      const isSerial = (item.trackingType || '').toLowerCase().includes('serial');
      if (isSerial) {
        const scannedCount = (item.serialNumbers || []).length;
        if (scannedCount < qty) {
          Alert.alert(
            'Incomplete Serials',
            `Line #${i + 1} (${item.productName}): ${scannedCount} of ${qty} serial numbers scanned. Please scan all serials before dispatching.`
          );
          return false;
        }
      }
    }
    if (shippingMethod === 'courier') {
      if (!awbNo || !awbNo.trim()) {
        Alert.alert('Validation Error', 'AWB / Tracking No. is mandatory for Courier shipping.');
        return false;
      }
      if (!courierCarrier || !courierCarrier.trim()) {
        Alert.alert('Validation Error', 'Carrier name is mandatory for Courier shipping.');
        return false;
      }
    } else {
      if (!transporter || !transporter.trim()) {
        Alert.alert('Validation Error', 'Transporter / Fleet is mandatory for Transport shipping.');
        return false;
      }
    }
    return true;
  };

  // --- ACTIONS ---
  const handleSaveDraft = () => {
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const finalRefNo = refNo.trim() || `SO-${randomSuffix}`;
    const draftOutbound = {
      id: editingOutbound?.id || `OUT-DRAFT-${Date.now()}`,
      no: editingOutbound?.no || `OUT-2026-D${randomSuffix}`,
      date: consignmentDate.trim() || '14/10/2026',
      refNo: finalRefNo,
      source: source.trim(),
      destination: destination.trim(),
      method:
        shippingMethod === 'courier'
          ? `Courier (${courierCarrier || 'Standard'})`
          : `Transport (${transporter || 'Dedicated Truck'})`,
      status: 'Draft',
      itemsCount: productItems.length,
      totalQty: totalQuantity,
      totalAmount: totalAmount,
      notes: notes.trim(),
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
      `Outbound draft ${draftOutbound.no} for Reference ${draftOutbound.refNo} has been saved successfully.`,
      [
        {
          text: 'OK',
          onPress: () => onSaveOutbound(draftOutbound),
        },
      ]
    );
  };

  const handleCreateOutbound = () => {
    if (!validateMandatoryFields()) {
      return;
    }

    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const finalRefNo = refNo.trim() || `SO-${randomSuffix}`;
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
      notes: notes.trim(),
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
      `Outbound shipment ${newOutbound.no} dispatched successfully with ${productItems.length} product lines (Total Qty: ${totalQuantity}).`,
      [
        {
          text: 'View in Outbound List',
          onPress: () => onSaveOutbound(newOutbound),
        },
      ]
    );
  };

  // =========================================================================
  // SUB-SCREEN 2: SCAN SERIAL NUMBER SCREEN (VisionCamera Powered)
  // =========================================================================
  if (activeSubScreen === 'scan-serial') {
    const currentItem = productItems[activeItemIndex] || productItems[0];
    return (
      <ScanSerialNumberScreen
        item={currentItem}
        refNo={refNo}
        onBack={() => setActiveSubScreen(null)}
        onSave={handleSaveScannedSerials}
      />
    );
  }

  // =========================================================================
  // MAIN VIEW: CREATE OUTBOUND SCREEN
  // =========================================================================
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP HEADER BAR: Breadcrumb + Status Badge */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            style={styles.breadcrumbRow}
            activeOpacity={0.8}
            onPress={onCancel}
          >
            <Ionicons name="chevron-back" size={16} color="#6D43C0" />
            <Text style={styles.breadcrumbText}>
              ‹ Movement / Outbound /{' '}
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>
                {outboundNo || 'New'}
              </Text>
            </Text>
          </TouchableOpacity>

          {currentOutbound && (
            <View style={styles.topHeaderStatusBadgeWrap}>
              <View
                style={[
                  styles.statusBadgeSmall,
                  currentStatus.includes('DRAFT') && { backgroundColor: '#F3E8FF' },
                  currentStatus.includes('DISPATCH') && { backgroundColor: '#DEF7EC' },
                  currentStatus.includes('TRANSIT') && { backgroundColor: '#E0F2FE' },
                  currentStatus.includes('COMPLETE') && { backgroundColor: '#DEF7EC' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeSmallText,
                    currentStatus.includes('DRAFT') && { color: '#7E22CE' },
                    currentStatus.includes('DISPATCH') && { color: '#03543F' },
                    currentStatus.includes('TRANSIT') && { color: '#0284C7' },
                    currentStatus.includes('COMPLETE') && { color: '#03543F' },
                  ]}
                >
                  {currentOutbound.status || 'Draft'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ============================================================== */}
        {/* SECTION 1: CONSIGNMENT DETAILS                                 */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Consignment Details</Text>
          </View>

          {/* Row 1: Date & Ref No. */}
          <View style={styles.fieldsRow}>
            {/* Consignment Date */}
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>
                Consignment Date <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerInput}
                activeOpacity={0.8}
                onPress={() => setIsCalendarVisible(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#6D43C0"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.datePickerInputText}>
                  {consignmentDate}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ref No. / Order No. */}
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>Ref No. / Order No.</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color="#6D43C0"
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. SO-88210"
                  placeholderTextColor="#9A93A7"
                  value={refNo}
                  onChangeText={setRefNo}
                />
              </View>
            </View>
          </View>

          {/* Line 2: Source Location */}
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

          {/* Line 3: Destination Location */}
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
                style={{ marginRight: 3 }}
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
                <View style={[styles.thCell, { width: 95 }]}>
                  <Text style={styles.thText}>Dispatched Qty</Text>
                </View>
                <View style={[styles.thCell, { width: 125 }]}>
                  <Text style={styles.thText}>Serial Numbers</Text>
                </View>
                <View style={[styles.thCell, { width: 65, borderRightWidth: 0 }]}>
                  <Text style={styles.thText}>Action</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {productItems.map((item, index) => {
                const badge = getTrackingBadgeStyle(item.trackingType);
                const isSerial = (item.trackingType || '').toLowerCase().includes('serial');
                const scannedCount = item.serialNumbers?.length || 0;
                const targetQty = parseInt(item.dispatchedQty, 10) || 0;
                const isScanComplete = targetQty > 0 && scannedCount >= targetQty;

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

                        {/* Product Auto-Suggest Dropdown List */}
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
                          width: 95,
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
                          width: 65,
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

                    {/* Serial Numbers Column (Scan Button for Serial Track) */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: 125,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      {isSerial ? (
                        <TouchableOpacity
                          style={[
                            styles.serialScanBtn,
                            isScanComplete && styles.serialScanBtnComplete,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => handleOpenScan(index)}
                        >
                          <Ionicons
                            name={isScanComplete ? 'checkmark-circle' : 'barcode-outline'}
                            size={13}
                            color={isScanComplete ? '#15803D' : '#6D43C0'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.serialScanBtnText,
                              isScanComplete && styles.serialScanBtnTextComplete,
                            ]}
                          >
                            {isScanComplete
                              ? `Done (${scannedCount})`
                              : `Scan (${scannedCount}/${targetQty})`}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>N/A</Text>
                      )}
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
                <View style={[styles.tdCell, { width: 415, paddingLeft: 10 }]}>
                  <Text style={styles.totalRowLabel}>
                    TOTALS ({productItems.length} lines)
                  </Text>
                </View>
                <View
                  style={[
                    styles.tdCell,
                    {
                      width: 95,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={styles.totalRowQty}>{totalQuantity}</Text>
                </View>
                <View style={[styles.tdCell, { width: 190, borderRightWidth: 0, paddingLeft: 10 }]}>
                  <Text style={{ fontSize: 11, color: '#625A72', fontWeight: '600' }}>
                    {productItems.filter((p) => (p.trackingType || '').toLowerCase().includes('serial')).reduce((acc, p) => acc + (p.serialNumbers?.length || 0), 0)} serials recorded
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* ============================================================== */}
        {/* SECTION 3: SHIPPING METHOD (Courier vs Transport)              */}
        {/* ============================================================== */}
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
                {/* AWB / Tracking No. */}
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

                {/* Carrier */}
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
              {/* Row 1: Transporter */}
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
        {/* SECTION 4: SUMMARY & NOTES                                     */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Summary & Notes</Text>
          </View>

          <View style={styles.summaryChipsRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>Total Line Items</Text>
              <Text style={styles.summaryChipValue}>{productItems.length}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>Total Dispatched Qty</Text>
              <Text style={styles.summaryChipValue}>{totalQuantity}</Text>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>Notes / Handling Instructions</Text>
            <TextInput
              style={styles.notesTextArea}
              placeholder="Add optional notes, transport instructions or gate remarks..."
              placeholderTextColor="#9A93A7"
              multiline={true}
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* ============================================================== */}
        {/* BOTTOM ACTION BUTTONS                                          */}
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
            <Ionicons
              name="document-outline"
              size={15}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.saveDraftBtnText}>Save Draft</Text>
          </TouchableOpacity>

          {/* Dispatch Outbound */}
          <TouchableOpacity
            style={[styles.saveDraftBtn, { backgroundColor: '#10B981', flex: 1.3 }]}
            activeOpacity={0.8}
            onPress={handleCreateOutbound}
          >
            <Ionicons
              name="send-outline"
              size={15}
              color="#FFFFFF"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.saveDraftBtnText}>Dispatch Outbound</Text>
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
      {/* MODAL 2: CARRIER / TRANSPORTER PICKER MODAL                    */}
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
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===========================================================================
// SUB-SCREEN: SCAN SERIAL NUMBER SCREEN (VisionCamera Powered)
// ===========================================================================
function ScanSerialNumberScreen({ item, refNo, onBack, onSave }) {
  const [scannedSerials, setScannedSerials] = useState(
    Array.isArray(item.serialNumbers) ? [...item.serialNumbers] : []
  );
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualSerialInput, setManualSerialInput] = useState('');
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState(null);

  // Sliding Drawer ("Door") State & Animation
  const drawerAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const isDrawerOpenRef = useRef(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const snapDrawer = (toOpen) => {
    isDrawerOpenRef.current = toOpen;
    setIsDrawerOpen(toOpen);
    Animated.spring(drawerAnim, {
      toValue: toOpen ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        drawerAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const startHeight = isDrawerOpenRef.current ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        const newHeight = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(EXPANDED_HEIGHT, startHeight - gestureState.dy)
        );
        drawerAnim.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          snapDrawer(true);
        } else if (gestureState.dy > 20) {
          snapDrawer(false);
        } else {
          snapDrawer(!isDrawerOpenRef.current);
        }
      },
    })
  ).current;

  // Laser beam scan line animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 70,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserAnim]);

  const maxExpected = parseInt(item.dispatchedQty, 10) || 0;

  // Barcode scanned callback
  const handleBarcodeScanned = ({ data }) => {
    const code = (data || '').trim().toUpperCase();
    if (!code) return;
    if (scannedSerials.includes(code)) {
      setLastScannedFeedback(`Already Scanned: ${code}`);
      return;
    }
    if (maxExpected > 0 && scannedSerials.length >= maxExpected) {
      Alert.alert('Limit Reached', `All ${maxExpected} units for this line item have already been scanned.`);
      return;
    }
    setScannedSerials((prev) => [...prev, code]);
    setLastScannedFeedback(`Scanned: ${code}`);
  };

  const handleAddManualSerial = () => {
    const code = manualSerialInput.trim().toUpperCase();
    if (!code) return;
    if (scannedSerials.includes(code)) {
      Alert.alert('Notice', `Serial "${code}" is already in the list.`);
      return;
    }
    if (maxExpected > 0 && scannedSerials.length >= maxExpected) {
      Alert.alert('Limit Reached', `All ${maxExpected} units for this line item have already been entered.`);
      return;
    }
    setScannedSerials((prev) => [...prev, code]);
    setManualSerialInput('');
    setManualInputModalVisible(false);
    setLastScannedFeedback(`Added: ${code}`);
  };

  const handleRemoveSerial = (index) => {
    setScannedSerials((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAll = () => {
    if (scannedSerials.length === 0) return;
    Alert.alert(
      'Clear All Serials',
      'Are you sure you want to clear all scanned serial numbers?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => setScannedSerials([]) },
      ]
    );
  };

  const handleSaveAndExit = () => {
    onSave(scannedSerials);
  };

  const enteredQty = maxExpected;
  const remainingQty = enteredQty > 0 ? Math.max(0, enteredQty - scannedSerials.length) : 0;

  return (
    <View style={styles.scannerRoot}>
      {/* 1. TOP NAVY HEADER matching SVG (#17102F) */}
      <View style={styles.scannerTopHeader}>
        <View style={styles.scannerHeaderRow}>
          <TouchableOpacity
            style={styles.scannerBackBtn}
            activeOpacity={0.7}
            onPress={handleSaveAndExit}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.scannerHeaderTitleCol}>
            <Text style={styles.scannerHeaderTitle}>
              Outbound #{refNo || 'SO-OUT'}
            </Text>
            <Text style={styles.scannerHeaderSub}>
              Scan product serial numbers
            </Text>
          </View>
          <TouchableOpacity
            style={styles.scannerHeaderSaveBtn}
            activeOpacity={0.8}
            onPress={handleSaveAndExit}
          >
            <Ionicons name="checkmark" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.scannerHeaderSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PRODUCT CARD */}
      <View style={styles.scannerProductCard}>
        <View style={styles.scannerProductIconBox}>
          <MaterialCommunityIcons name="speaker" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.scannerProductInfoCol}>
          <Text style={styles.scannerProductTag}>PRODUCT</Text>
          <Text style={styles.scannerProductName} numberOfLines={1}>
            {item.productName || 'Serial Track Item'}
          </Text>
        </View>
        <View style={styles.scannerSerialTrackBadge}>
          <Text style={styles.scannerSerialTrackText}>Serial Track</Text>
        </View>
      </View>

      {/* 3. CAMERA VIEWFINDER CARD */}
      <View style={[styles.scannerCameraCard, { backgroundColor: 'transparent' }]}>
        <VisionCameraScanner
          style={StyleSheet.absoluteFillObject}
          facing="back"
          isTorchOn={isTorchOn}
          isActive={true}
          onBarcodeScanned={handleBarcodeScanned}
          onCameraReady={() => console.log('Outbound Vision Camera Ready')}
          onMountError={(err) => console.warn('Outbound Vision Camera Mount Error:', err)}
          renderNoPermission={({ requestPermission }) => (
            <View style={[StyleSheet.absoluteFillObject, styles.scannerCameraFallback]}>
              <Ionicons name="camera-outline" size={50} color="#CDBBFF" />
              <Text style={styles.scannerCameraFallbackText}>
                Camera permission required
              </Text>
              <TouchableOpacity
                style={styles.scannerRequestPermBtn}
                activeOpacity={0.8}
                onPress={requestPermission}
              >
                <Text style={styles.scannerRequestPermBtnText}>Allow Access</Text>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Torch Button (Top-Right Floating Circle) */}
        <TouchableOpacity
          style={styles.scannerTorchFloatingBtn}
          activeOpacity={0.8}
          onPress={() => setIsTorchOn(!isTorchOn)}
        >
          <MaterialCommunityIcons
            name={isTorchOn ? 'flashlight' : 'flashlight-off'}
            size={18}
            color={isTorchOn ? '#FBBF24' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Reticle Focus Box with rounded corner brackets & glowing laser line */}
        <View style={styles.scannerReticle}>
          <View style={[styles.scannerCornerBracket, styles.bracketTopLeft]} />
          <View style={[styles.scannerCornerBracket, styles.bracketTopRight]} />
          <View style={[styles.scannerCornerBracket, styles.bracketBottomLeft]} />
          <View style={[styles.scannerCornerBracket, styles.bracketBottomRight]} />

          {/* Animated Laser Line */}
          <Animated.View
            style={[
              styles.scannerLaserLine,
              { transform: [{ translateY: laserAnim }] },
            ]}
          />
        </View>

        {/* Floating Bottom Pill inside camera */}
        <View style={styles.scannerAlignPill}>
          <Text style={styles.scannerAlignPillText}>
            Point camera at barcode / QR code
          </Text>
        </View>

        {/* Live Scan Toast */}
        {lastScannedFeedback ? (
          <View style={styles.scannerLiveToast}>
            <Ionicons name="checkmark-circle" size={14} color="#4ADE80" style={{ marginRight: 5 }} />
            <Text style={styles.scannerLiveToastText}>{lastScannedFeedback}</Text>
          </View>
        ) : null}
      </View>

      {/* 4. DRAGGABLE SCANNED SERIAL NUMBERS PANEL ("DOOR" / DRAWER) */}
      <Animated.View
        style={[
          styles.scannerBottomSheet,
          { height: drawerAnim, overflow: 'hidden' },
        ]}
      >
        {/* DRAG HANDLE & HEADER */}
        <View {...panResponder.panHandlers} style={styles.scannerSheetDragHeaderArea}>
          <View style={styles.scannerGrabHandle} />

          <View style={styles.scannerSheetHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.scannerSheetTitle}>Scanned Serial Numbers</Text>
              <View style={styles.scannerCountBadge}>
                <Text style={styles.scannerCountBadgeText}>
                  {scannedSerials.length}
                </Text>
              </View>
            </View>

            {isDrawerOpen ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {scannedSerials.length > 0 && (
                  <TouchableOpacity
                    style={styles.scannerClearAllBtn}
                    activeOpacity={0.7}
                    onPress={handleClearAll}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={14}
                      color="#6D43C0"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.scannerClearAllText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 6 }}
                  onPress={() => snapDrawer(false)}
                >
                  <Ionicons name="chevron-down" size={20} color="#6D43C0" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scannerDragPromptBadge}>
                <Ionicons
                  name="chevron-up"
                  size={14}
                  color="#6D43C0"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.scannerDragPromptText}>Drag to view</Text>
              </View>
            )}
          </View>
        </View>

        {/* Serials Scrollable List */}
        <ScrollView
          style={styles.scannerSerialsScrollView}
          contentContainerStyle={{ paddingBottom: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {scannedSerials.length === 0 ? (
            <View style={styles.scannerEmptyList}>
              <Ionicons name="barcode-outline" size={32} color="#D1CADB" />
              <Text style={styles.scannerEmptyListText}>
                No serial numbers scanned yet.
              </Text>
            </View>
          ) : (
            scannedSerials.map((sn, idx) => (
              <View key={`${sn}-${idx}`} style={styles.scannerSerialItemCard}>
                <View style={styles.scannerSerialIndexCircle}>
                  <Text style={styles.scannerSerialIndexText}>{idx + 1}</Text>
                </View>
                <Text style={styles.scannerSerialCodeText}>{sn}</Text>
                <TouchableOpacity
                  style={styles.scannerSerialDeleteTouch}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => handleRemoveSerial(idx)}
                >
                  <Ionicons name="close" size={16} color="#777187" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Outlined "Add Serial Number Manually" Button */}
        <TouchableOpacity
          style={styles.scannerAddManualBtn}
          activeOpacity={0.8}
          onPress={() => setManualInputModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="keyboard-outline"
            size={18}
            color="#6D43C0"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.scannerAddManualText}>
            Add Serial Number Manually
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 5. BOTTOM STATS STRIP */}
      <View style={styles.scannerBottomStatsStrip}>
        <View style={styles.scannerStatCol}>
          <Text style={styles.scannerStatLabel}>Dispatched Qty</Text>
          <Text style={styles.scannerStatValueWhite}>{enteredQty > 0 ? enteredQty : '-'}</Text>
        </View>

        <View style={styles.scannerStatDivider} />

        <View style={styles.scannerStatCol}>
          <View style={styles.scannerStatIconHeader}>
            <Ionicons name="checkmark-circle" size={12} color="#4ADE80" style={{ marginRight: 4 }} />
            <Text style={[styles.scannerStatLabel, { color: '#4ADE80' }]}>Scanned Qty</Text>
          </View>
          <Text style={styles.scannerStatValueWhite}>{scannedSerials.length}</Text>
        </View>

        <View style={styles.scannerStatDivider} />

        <View style={styles.scannerStatCol}>
          <View style={styles.scannerStatIconHeader}>
            <Ionicons name="time" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={[styles.scannerStatLabel, { color: '#FBBF24' }]}>Remaining</Text>
          </View>
          <Text style={styles.scannerStatValueWhite}>{enteredQty > 0 ? remainingQty : '-'}</Text>
        </View>
      </View>

      {/* MODAL: MANUAL SERIAL NUMBER INPUT */}
      <Modal
        visible={manualInputModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setManualInputModalVisible(false)}
      >
        <View style={styles.popupCenterOverlay}>
          <View style={styles.manualModalContainer}>
            <Text style={styles.manualModalTitle}>Enter Serial Number</Text>
            <Text style={styles.manualModalSub}>
              Type barcode or serial number manually
            </Text>

            <TextInput
              style={styles.manualModalInput}
              placeholder="e.g. SN-OUT-89210"
              placeholderTextColor="#9A93A7"
              value={manualSerialInput}
              onChangeText={setManualSerialInput}
              autoCapitalize="characters"
              autoFocus={true}
              onSubmitEditing={handleAddManualSerial}
            />

            <View style={styles.manualModalBtnRow}>
              <TouchableOpacity
                style={styles.manualModalCancelBtn}
                onPress={() => {
                  setManualSerialInput('');
                  setManualInputModalVisible(false);
                }}
              >
                <Text style={styles.manualModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualModalAddBtn}
                onPress={handleAddManualSerial}
              >
                <Text style={styles.manualModalAddText}>Add Serial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===========================================================================
// STYLES
// ===========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },

  // Top Header Bar
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#6D43C0',
    fontWeight: '700',
    marginLeft: 2,
  },
  topHeaderStatusBadgeWrap: {
    alignItems: 'center',
  },
  statusBadgeSmall: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Card Container
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ECE8F4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17102F',
    letterSpacing: -0.2,
  },

  // Fields Grid
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fieldCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#372064',
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9FE',
    borderWidth: 1,
    borderColor: '#D8D1E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#17102F',
    paddingVertical: 0,
  },
  datePickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9FE',
    borderWidth: 1,
    borderColor: '#D8D1E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  datePickerInputText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#17102F',
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBF9FE',
    borderWidth: 1,
    borderColor: '#D8D1E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  dropdownText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#17102F',
    flex: 1,
  },

  // Add Item Button
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  addItemBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Product Details Table
  tableScrollInner: {
    paddingVertical: 4,
  },
  tableBlock: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tdCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    justifyContent: 'center',
  },
  tdProductInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 34,
  },
  tdProductTextInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    paddingVertical: 0,
  },
  tdProductSkuText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  tdUomText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },

  // Auto-suggest dropdown
  zipDropdownCard: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99999,
  },
  zipDropdownScroll: {
    maxHeight: 180,
  },
  zipDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  zipDropdownItemActive: {
    backgroundColor: '#F0F9FF',
  },
  zipDropdownItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  zipDropdownItemSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Tracking Badge
  trackingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Serial Scan Button in Row
  serialScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  serialScanBtnComplete: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  serialScanBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6D43C0',
  },
  serialScanBtnTextComplete: {
    color: '#15803D',
  },

  // Table Total Row
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  totalRowQty: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },

  // Shipping Method Segmented Toggle
  methodToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2EDFA',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  methodToggleBtnActive: {
    backgroundColor: '#6D43C0',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  methodToggleBtnInactive: {
    backgroundColor: 'transparent',
  },
  methodToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  methodToggleTextActive: {
    color: '#FFFFFF',
  },
  methodToggleTextInactive: {
    color: '#372064',
  },
  methodSectionBlock: {
    marginTop: 2,
  },

  // Summary Chips
  summaryChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#F8F6FD',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECE6F6',
  },
  summaryChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#625A72',
    marginBottom: 3,
  },
  summaryChipValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17102F',
  },
  notesTextArea: {
    backgroundColor: '#FBF9FE',
    borderWidth: 1,
    borderColor: '#D8D1E6',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#17102F',
    textAlignVertical: 'top',
    minHeight: 64,
  },

  // Bottom Actions Bar
  actionsBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D8D1E6',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#625A72',
  },
  saveDraftBtn: {
    flex: 1.1,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#6D43C0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  saveDraftBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals & Pickers
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 16, 47, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  pickerModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17102F',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  addEntityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addEntityInput: {
    flex: 1,
    backgroundColor: '#F8F6FD',
    borderWidth: 1,
    borderColor: '#D8D1E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12.5,
    color: '#17102F',
  },
  addEntityBtn: {
    backgroundColor: '#6D43C0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addEntityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  entityRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEFF',
  },
  simplePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  simplePickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#17102F',
  },
  deleteEntityBtn: {
    padding: 8,
  },

  // =========================================================================
  // SCANNER SUB-SCREEN STYLES
  // =========================================================================
  scannerRoot: {
    flex: 1,
    backgroundColor: '#17102F',
  },
  scannerTopHeader: {
    backgroundColor: '#17102F',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2050',
  },
  scannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHeaderTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  scannerHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scannerHeaderSub: {
    fontSize: 11,
    color: '#A9A1BD',
    marginTop: 2,
  },
  scannerHeaderSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  scannerHeaderSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Scanner Product Card
  scannerProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
  },
  scannerProductIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#6D43C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  scannerProductInfoCol: {
    flex: 1,
  },
  scannerProductTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#6D43C0',
    letterSpacing: 0.5,
  },
  scannerProductName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#17102F',
    marginTop: 2,
  },
  scannerSerialTrackBadge: {
    backgroundColor: '#E2EBFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scannerSerialTrackText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#315EA8',
  },

  // Scanner Camera Viewfinder
  scannerCameraCard: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  scannerCameraFallback: {
    backgroundColor: '#1E143E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scannerCameraFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  scannerRequestPermBtn: {
    marginTop: 14,
    backgroundColor: '#6D43C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scannerRequestPermBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scannerTorchFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(23, 16, 47, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scannerReticle: {
    width: 220,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4ADE80',
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  scannerLaserLine: {
    width: '90%',
    height: 2.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  scannerAlignPill: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(23, 16, 47, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  scannerAlignPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D8D1E6',
  },
  scannerLiveToast: {
    position: 'absolute',
    top: 12,
    backgroundColor: '#1E143E',
    borderWidth: 1,
    borderColor: '#4ADE80',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scannerLiveToastText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4ADE80',
  },

  // Scanner Draggable Bottom Sheet
  scannerBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  scannerSheetDragHeaderArea: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  scannerGrabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  scannerSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  scannerSheetTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#17102F',
  },
  scannerCountBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  scannerCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D43C0',
  },
  scannerClearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  scannerClearAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  scannerDragPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scannerDragPromptText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  scannerSerialsScrollView: {
    maxHeight: 230,
    marginTop: 4,
  },
  scannerEmptyList: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerEmptyListText: {
    fontSize: 12,
    color: '#8A819F',
    marginTop: 6,
  },
  scannerSerialItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  scannerSerialIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6D43C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  scannerSerialIndexText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scannerSerialCodeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#17102F',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scannerSerialDeleteTouch: {
    padding: 4,
  },
  scannerAddManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6D43C0',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#FAF5FF',
  },
  scannerAddManualText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D43C0',
  },

  // Scanner Bottom Stats Strip
  scannerBottomStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E143E',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#2B2050',
  },
  scannerStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  scannerStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A9A1BD',
  },
  scannerStatValueWhite: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  scannerStatIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#32235E',
  },

  // Centered Modal
  popupCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 16, 47, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualModalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  manualModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17102F',
  },
  manualModalSub: {
    fontSize: 11.5,
    color: '#716886',
    marginTop: 3,
    marginBottom: 12,
  },
  manualModalInput: {
    backgroundColor: '#F8F6FD',
    borderWidth: 1.5,
    borderColor: '#6D43C0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    fontWeight: '700',
    color: '#17102F',
    letterSpacing: 0.5,
  },
  manualModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  manualModalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manualModalCancelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#716886',
  },
  manualModalAddBtn: {
    backgroundColor: '#6D43C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manualModalAddText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
