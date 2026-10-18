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
  FlatList,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import inboundService from '../../services/inboundService';
import { authService } from '../../services/authService';
import { getUserAccessibleWarehouses } from '../../services/locationScopeHelper';
import CommonCalendarModal from '../../components/CommonCalendarModal';
import SearchableDropdown from '../../components/SearchableDropdown';
import TwoPartLocationPicker from '../../components/TwoPartLocationPicker';
import carrierService from '../../services/carrierService';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CreateInboundScreen({
  onCancel,
  onSaveInbound,
  editingInbound,
  session,
  selectedDashboardWarehouse,
}) {
  // Master products, warehouses & events (strictly master-created only)
  const masterProducts = masterService?.getProducts?.() || [];
  const masterWarehouses = masterService?.getWarehouses?.() || [];
  const masterEvents = masterService?.getEvents?.() || [];

  const userAssignedWarehouses = getUserAccessibleWarehouses(session);

  const [sourceType, setSourceType] = useState('Warehouse');
  const [destType, setDestType] = useState('Warehouse');

  const warehouseOptions = masterWarehouses
    .filter((w) => (w.status || 'active').toLowerCase() === 'active')
    .map((w) => (typeof w === 'string' ? w : w.name || w.code));

  const eventOptions = masterEvents
    .filter((e) => (e.status || 'active').toLowerCase() === 'active')
    .map((e) => (typeof e === 'string' ? e : e.name || e.code));

  const destWarehouseOptions = warehouseOptions;

  const [currentInbound, setCurrentInbound] = useState(editingInbound || null);
  const currentStatus = (currentInbound?.status || 'Draft').toUpperCase();
  const isDraft = currentStatus === 'DRAFT';
  const isGenerated = currentStatus === 'GENERATED';
  const isCompleted = currentStatus === 'COMPLETED';
  const isInProgress = currentStatus.includes('PROGRESS') || currentStatus.includes('PUTAWAY');
  const isPutawayMode = isGenerated || isInProgress || isCompleted;
  const isDraftOrNew = isDraft || !currentInbound;

  // Mode for draft editing (new inbound is always editable; existing draft starts in read-only mode)
  const [isEditingDraft, setIsEditingDraft] = useState(!currentInbound);
  const isEditable = !currentInbound || isEditingDraft;

  // Confirmation modal for Mark as Generated
  const [isGenerateConfirmVisible, setIsGenerateConfirmVisible] = useState(false);

  // Active sub-screen: null (Main Screen) | 'scan-serial' | 'add-quantity'
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Inbound ID and No
  const inboundId = currentInbound?.id || null;
  const inboundNo = currentInbound?.no || null;

  // --- SECTION 1: CONSIGNMENT DETAILS ---
  const [consignmentDate, setConsignmentDate] = useState(editingInbound?.date || '14/10/2026');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [refNo, setRefNo] = useState(editingInbound?.refNo || '');

  // Default Source from Dashboard Warehouse selection
  const dashboardSelectedWh =
    selectedDashboardWarehouse && selectedDashboardWarehouse !== 'ALL'
      ? selectedDashboardWarehouse
      : authService?.getSelectedWarehouse?.() && authService.getSelectedWarehouse() !== 'ALL'
      ? authService.getSelectedWarehouse()
      : '';

  const initialSource =
    editingInbound?.source ||
    dashboardSelectedWh ||
    (userAssignedWarehouses[0] || '');

  const [source, setSource] = useState(initialSource);

  const inboundSourceOptions = Array.from(
    new Set(
      masterWarehouses.filter((w) => (w.status || 'active').toLowerCase() === 'active').map((w) => w.name)
    )
  );

  // Destination options: all warehouses assigned to that user, EXCEPT the chosen source warehouse
  const destinationOptions = userAssignedWarehouses.filter(
    (wh) => wh.toLowerCase().trim() !== (source || '').toLowerCase().trim()
  );

  const [destination, setDestination] = useState(() => {
    if (editingInbound?.destination) return editingInbound.destination;
    const initialDestOpts = userAssignedWarehouses.filter(
      (wh) => wh.toLowerCase().trim() !== (initialSource || '').toLowerCase().trim()
    );
    return initialDestOpts[0] || '';
  });

  const handleSelectSource = (item) => {
    setSource(item);
    setIsSourcePickerVisible(false);
    // If destination currently matches new source, pick another valid destination
    if (destination && destination.toLowerCase().trim() === item.toLowerCase().trim()) {
      const remaining = userAssignedWarehouses.filter(
        (wh) => wh.toLowerCase().trim() !== item.toLowerCase().trim()
      );
      setDestination(remaining[0] || '');
    }
  };


  // --- SECTION 2: PRODUCT DETAILS (Matching Figma SVG & Mockup) ---
  const [productItems, setProductItems] = useState(() => {
    if (editingInbound?.productLines && editingInbound.productLines.length > 0) {
      return editingInbound.productLines.map((line, idx) => ({
        id: line.id || String(idx + 1),
        srNo: idx + 1,
        productId: line.productId || '',
        productName: line.productName || line.name || '',
        sku: line.sku || '',
        trackingType: line.trackingType || '',
        uom: line.uom || '',
        receivedQty: String(line.receivedQty !== undefined ? line.receivedQty : ''),
        putawayQty: Number(line.putawayQty) || 0,
        serialNumbers: Array.isArray(line.serialNumbers) ? line.serialNumbers : [],
        remarks: line.remarks || '',
        price: String(line.price || '0'),
        amount: Number(line.amount) || 0,
      }));
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
        receivedQty: '',
        putawayQty: 0,
        serialNumbers: [],
        remarks: '',
        price: '0',
        amount: 0,
      },
    ];
  });

  // --- SECTION 3: RECEIVING METHOD ('courier' | 'transport') ---
  const [receivingMethod, setReceivingMethod] = useState(() => {
    const meth = (editingInbound?.method || '').toLowerCase();
    if (meth.includes('transport') || editingInbound?.receivingMethodDetails?.type?.toLowerCase() === 'transport') {
      return 'transport';
    }
    return 'courier';
  });

  // Courier fields (persistent, never cleared across tabs or save)
  const [awbNo, setAwbNo] = useState(
    editingInbound?.receivingMethodDetails?.awbNo || editingInbound?.awbNo || ''
  );
  const [courierCarrier, setCourierCarrier] = useState(
    editingInbound?.receivingMethodDetails?.carrier || editingInbound?.courierCarrier || editingInbound?.carrier || ''
  );

  // Transport fields (persistent, never cleared across tabs or save)
  const [shipmentNo, setShipmentNo] = useState(
    editingInbound?.receivingMethodDetails?.shipmentNo || editingInbound?.shipmentNo || ''
  );
  const [transporter, setTransporter] = useState(
    editingInbound?.receivingMethodDetails?.transporter || editingInbound?.transporter || ''
  );
  const [vehicleNo, setVehicleNo] = useState(
    editingInbound?.receivingMethodDetails?.vehicleNo || editingInbound?.vehicleNo || ''
  );
  const [lrDocketNo, setLrDocketNo] = useState(
    editingInbound?.receivingMethodDetails?.lrDocketNo || editingInbound?.lrDocketNo || ''
  );

  // Dynamic Carriers & Transporters State
  const [carrierList, setCarrierList] = useState([]);
  const [transporterList, setTransporterList] = useState([]);
  const [newLogisticsName, setNewLogisticsName] = useState('');

  useEffect(() => {
    carrierService.init().then(() => {
      setCarrierList(carrierService.getCarriers());
      setTransporterList(carrierService.getTransporters());
    });
    const unsub = carrierService.subscribe(({ carriers, transporters }) => {
      setCarrierList(carriers);
      setTransporterList(transporters);
    });
    return unsub;
  }, []);

  const handleAddLogisticsEntity = async () => {
    const trimmed = newLogisticsName.trim();
    if (!trimmed) {
      Alert.alert('Name Required', `Please enter a ${receivingMethod === 'courier' ? 'carrier' : 'transporter'} name.`);
      return;
    }
    if (receivingMethod === 'courier') {
      await carrierService.addCarrier(trimmed);
      setCourierCarrier(trimmed);
    } else {
      await carrierService.addTransporter(trimmed);
      setTransporter(trimmed);
    }
    setNewLogisticsName('');
  };

  const handleDeleteLogisticsEntity = (name) => {
    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (receivingMethod === 'courier') {
              await carrierService.deleteCarrier(name);
              if (courierCarrier === name) setCourierCarrier('');
            } else {
              await carrierService.deleteTransporter(name);
              if (transporter === name) setTransporter('');
            }
          },
        },
      ]
    );
  };

  // --- MODALS FOR EASY PICKING ---
  const [isProductPickerVisible, setIsProductPickerVisible] = useState(false);
  const [activeEditingItemIndex, setActiveEditingItemIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Inline type-to-search state for Product Details
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [isDestPickerVisible, setIsDestPickerVisible] = useState(false);
  const [isCarrierPickerVisible, setIsCarrierPickerVisible] = useState(false);

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
      receivedQty: '',
      putawayQty: 0,
      serialNumbers: [],
      remarks: '',
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

    // Auto-match if exact SKU or name typed
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
    item.receivedQty = cleanVal;
    const qtyNum = parseInt(cleanVal, 10) || 0;
    const priceNum = parseFloat(item.price) || 0;
    item.amount = Math.round(qtyNum * priceNum);
    updated[index] = item;
    setProductItems(updated);
  };

  const handlePriceChange = (index, val) => {
    const updated = [...productItems];
    const item = { ...updated[index] };
    const cleanVal = val.replace(/[^0-9.]/g, '');
    item.price = cleanVal;
    const qtyNum = parseFloat(item.receivedQty) || 0;
    const priceNum = parseFloat(cleanVal) || 0;
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

    const qtyNum = parseFloat(item.receivedQty) || 0;
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

  // Open Screen 2: Scan Serial Number
  const handleOpenScan = (index) => {
    const item = productItems[index];
    if (!item?.productName) {
      setActiveSearchIndex(index);
      setActiveSearchQuery('');
      return;
    }
    setActiveItemIndex(index);
    setActiveSubScreen('scan-serial');
  };

  // Popup Modal state for Countable / Consumable quantity entry
  const [qtyModalVisible, setQtyModalVisible] = useState(false);
  const [qtyModalItemIndex, setQtyModalItemIndex] = useState(null);
  const [modalQtyValue, setModalQtyValue] = useState(1);

  // Open Popup Modal directly on Create Inbound screen (No new page navigation!)
  const handleOpenAddQty = (index) => {
    const item = productItems[index];
    if (!item?.productName) {
      setActiveEditingItemIndex(index);
      setProductSearchQuery('');
      setIsProductPickerVisible(true);
      return;
    }
    setQtyModalItemIndex(index);
    setModalQtyValue(parseInt(item?.putawayQty, 10) || parseInt(item?.receivedQty, 10) || 1);
    setQtyModalVisible(true);
  };

  // Direct Putaway Qty entry for Countable / Consumable items (no modal needed)
  const handleDirectPutawayChange = async (index, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    const updated = [...productItems];
    const item = { ...updated[index] };
    const maxReceived = parseInt(item.receivedQty, 10) || 0;
    let qtyNum = cleanVal === '' ? 0 : parseInt(cleanVal, 10);

    if (qtyNum > maxReceived) {
      Alert.alert(
        'Limit Exceeded',
        `Putaway quantity (${qtyNum}) cannot exceed Received quantity (${maxReceived}). Value adjusted to ${maxReceived}.`
      );
      qtyNum = maxReceived;
    }

    item.putawayQty = qtyNum;
    updated[index] = item;
    setProductItems(updated);

    if (inboundId) {
      const res = await inboundService.recordPutaway(inboundId, item.id, {
        type: 'quantity',
        quantity: qtyNum,
      });
      if (res && res.success && res.inbound) {
        setCurrentInbound(res.inbound);
      }
    }
  };

  // Save quantity from Popup Modal (Putaway)
  const handleSaveModalQty = async () => {
    if (qtyModalItemIndex === null) return;
    const updated = [...productItems];
    const item = { ...updated[qtyModalItemIndex] };
    const maxReceived = parseInt(item.receivedQty, 10) || 0;
    const enteredQty = Math.max(0, parseInt(modalQtyValue, 10) || 0);
    const safePutaway = Math.min(maxReceived, enteredQty);

    item.putawayQty = safePutaway;
    updated[qtyModalItemIndex] = item;
    setProductItems(updated);
    setQtyModalVisible(false);
    setQtyModalItemIndex(null);

    if (inboundId) {
      const res = await inboundService.recordPutaway(inboundId, item.id, {
        type: 'quantity',
        quantity: safePutaway,
      });
      if (res.success) {
        if (res.inbound) {
          setCurrentInbound(res.inbound);
        }
        if (res.allCompleted) {
          Alert.alert('Consignment Completed', `All items for inbound ${res.inbound.no} have been put away! Status updated to Completed.`);
        } else if ((res.inbound?.status || '').toLowerCase().includes('progress')) {
          Alert.alert('Putaway Recorded', `Putaway recorded for ${item.productName}. Status updated to In Progress.`);
        } else if ((res.inbound?.status || '').toLowerCase().includes('generated')) {
          Alert.alert('Putaway Cleared', `Putaway cleared. Status reverted to Generated.`);
        }
      }
    }
  };

  // Save scanned serials from Screen 2 (Putaway)
  const handleSaveScannedSerials = async (serials) => {
    const updated = [...productItems];
    const item = { ...updated[activeItemIndex] };
    item.serialNumbers = serials;
    item.putawayQty = serials.length;

    updated[activeItemIndex] = item;
    setProductItems(updated);
    setActiveSubScreen(null);

    if (inboundId) {
      const res = await inboundService.recordPutaway(inboundId, item.id, {
        type: 'serial',
        serials: serials,
      });
      if (res.success) {
        if (res.inbound) {
          setCurrentInbound(res.inbound);
        }
        if (res.allCompleted) {
          Alert.alert('Consignment Completed', `All items for inbound ${res.inbound.no} have been put away! Status updated to Completed.`);
        } else if ((res.inbound?.status || '').toLowerCase().includes('progress')) {
          Alert.alert('Serials Scanned', `${serials.length} serials recorded for ${item.productName}. Status updated to In Progress.`);
        } else if ((res.inbound?.status || '').toLowerCase().includes('generated')) {
          Alert.alert('Serials Cleared', `Serials cleared. Status reverted to Generated.`);
        }
      }
    }
  };

  // Totals Calculation
  const totalQuantity = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.receivedQty) || 0),
    0
  );
  const totalPutawayQty = productItems.reduce(
    (acc, item) => acc + (parseFloat(item.putawayQty) || 0),
    0
  );
  const totalAmount = productItems.reduce(
    (acc, item) =>
      acc +
      (parseFloat(item.amount) ||
        (parseFloat(item.receivedQty) || 0) * (parseFloat(item.price) || 0)),
    0
  );

  // Helper for tracking badge colors
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

  // --- MANDATORY FIELDS VALIDATION ---
  const validateMandatoryFields = () => {
    // 1. Source Location
    if (!source || !source.trim()) {
      Alert.alert('Validation Error', 'Source location is mandatory. Please select a Source.');
      return false;
    }
    // 2. Destination Location
    if (!destination || !destination.trim()) {
      Alert.alert('Validation Error', 'Destination location is mandatory. Please select a Destination.');
      return false;
    }
    // 3. Products count
    if (!productItems || productItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one Product line item.');
      return false;
    }
    // 4. Each line item has product and receivedQty > 0
    for (let i = 0; i < productItems.length; i++) {
      const item = productItems[i];
      if (!item.productName || !item.productName.trim()) {
        Alert.alert('Validation Error', `Line #${i + 1}: Product name is mandatory. Please select a product.`);
        return false;
      }
      const qty = parseInt(item.receivedQty, 10);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Validation Error', `Line #${i + 1} (${item.productName}): Received quantity must be greater than 0.`);
        return false;
      }
    }
    // 5. Shipping method details
    if (receivingMethod === 'courier') {
      if (!courierCarrier || !courierCarrier.trim()) {
        Alert.alert('Validation Error', 'Courier carrier is mandatory for Courier receiving method.');
        return false;
      }
      if (!awbNo || !awbNo.trim()) {
        Alert.alert('Validation Error', 'AWB Number is mandatory for Courier receiving method.');
        return false;
      }
    } else {
      if (!transporter || !transporter.trim()) {
        Alert.alert('Validation Error', 'Transporter name is mandatory for Transport receiving method.');
        return false;
      }
      if (!vehicleNo || !vehicleNo.trim()) {
        Alert.alert('Validation Error', 'Vehicle Number is mandatory for Transport receiving method.');
        return false;
      }
    }
    return true;
  };

  // --- ACTIONS ---
  const handleCancelEdit = () => {
    if (!currentInbound) {
      onCancel();
      return;
    }
    // Revert form state back to currentInbound
    setRefNo(currentInbound.refNo || '');
    setSource(currentInbound.source || '');
    setDestination(currentInbound.destination || '');
    const meth = (currentInbound.method || '').toLowerCase();
    const isTrans = meth.includes('transport') || currentInbound.receivingMethodDetails?.type?.toLowerCase() === 'transport';
    setReceivingMethod(isTrans ? 'transport' : 'courier');
    setCourierCarrier(currentInbound.receivingMethodDetails?.carrier || currentInbound.courierCarrier || currentInbound.carrier || '');
    setAwbNo(currentInbound.receivingMethodDetails?.awbNo || currentInbound.awbNo || '');
    setTransporter(currentInbound.receivingMethodDetails?.transporter || currentInbound.transporter || '');
    setVehicleNo(currentInbound.receivingMethodDetails?.vehicleNo || currentInbound.vehicleNo || '');
    setLrDocketNo(currentInbound.receivingMethodDetails?.lrDocketNo || currentInbound.lrDocketNo || '');
    setShipmentNo(currentInbound.receivingMethodDetails?.shipmentNo || currentInbound.shipmentNo || '');
    setProductItems(Array.isArray(currentInbound.productLines) ? JSON.parse(JSON.stringify(currentInbound.productLines)) : []);
    setIsEditingDraft(false);
  };

  const handleSaveDraft = async () => {
    // Check that each mandatory field is filled
    if (!validateMandatoryFields()) {
      return;
    }

    const finalRefNo = refNo.trim() || ('REF-' + Math.floor(1000 + Math.random() * 9000));
    const draftData = {
      id: currentInbound?.id || null,
      no: currentInbound?.no || null,
      date: consignmentDate.trim() || '14/10/2026',
      refNo: finalRefNo,
      source: source.trim(),
      destination: destination.trim(),
      method:
        receivingMethod === 'courier'
          ? `Courier (${courierCarrier.trim()})`
          : `Transport (${transporter.trim()})`,
      receivingMethodDetails: {
        type: receivingMethod === 'courier' ? 'Courier' : 'Transport',
        awbNo: awbNo.trim(),
        carrier: courierCarrier.trim(),
        shipmentNo: shipmentNo.trim() || ('SHP-' + Date.now().toString().slice(-6)),
        transporter: transporter.trim(),
        vehicleNo: vehicleNo.trim(),
        lrDocketNo: lrDocketNo.trim(),
      },
      // Top-level mirrors to ensure data is never lost or blank
      awbNo: awbNo.trim(),
      carrier: courierCarrier.trim(),
      courierCarrier: courierCarrier.trim(),
      shipmentNo: shipmentNo.trim() || ('SHP-' + Date.now().toString().slice(-6)),
      transporter: transporter.trim(),
      vehicleNo: vehicleNo.trim(),
      lrDocketNo: lrDocketNo.trim(),
      productLines: productItems,
    };

    const res = await inboundService.saveDraft(draftData);
    if (res.success) {
      setCurrentInbound(res.inbound);
      setIsEditingDraft(false);
      Alert.alert(
        'Draft Saved',
        `Inbound draft ${res.inbound.no || ''} has been saved successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSaveInbound) onSaveInbound(res.inbound);
            },
          },
        ]
      );
    } else {
      Alert.alert('Save Failed', res.message || 'Could not save draft.');
    }
  };

  const handlePressMarkAsGenerated = () => {
    if (!validateMandatoryFields()) {
      return;
    }
    setIsGenerateConfirmVisible(true);
  };

  const handleConfirmGenerate = async () => {
    setIsGenerateConfirmVisible(false);
    if (!currentInbound?.id) {
      Alert.alert('Error', 'Inbound ID not found.');
      return;
    }

    const finRes = await inboundService.finalizeInbound(currentInbound.id);
    if (finRes.success) {
      setCurrentInbound(finRes.inbound);
      setIsEditingDraft(false);
      Alert.alert(
        'Inbound Generated',
        `Inbound ${finRes.inbound.no} has been generated successfully. Status is now Generated. Consignment is ready for Putaway.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSaveInbound) onSaveInbound(finRes.inbound);
            },
          },
        ]
      );
    } else {
      Alert.alert('Generation Failed', finRes.message || 'Failed to generate inbound record.');
    }
  };

  // =========================================================================
  // SUB-SCREEN 2: SCAN SERIAL NUMBER SCREEN (Matching Figma Middle Screen)
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
  // MAIN VIEW: CREATE INBOUND SCREEN (Matching Figma Left Screen)
  // =========================================================================
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP HEADER BAR: Breadcrumb + Action Buttons (Edit, Generate) */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            style={styles.breadcrumbRow}
            activeOpacity={0.8}
            onPress={onCancel}
          >
            <Ionicons name="chevron-back" size={16} color="#6D43C0" />
            <Text style={styles.breadcrumbText}>
              ‹ Movement / Inbound /{' '}
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>
                {inboundNo || 'New'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* If existing Draft: Edit button in Read-only mode, or Cancel Edit in Edit mode */}
          {currentInbound && isDraft && (
            <View style={styles.topHeaderActionBtnsRow}>
              {!isEditingDraft ? (
                <TouchableOpacity
                  style={styles.headerEditBtn}
                  activeOpacity={0.8}
                  onPress={() => setIsEditingDraft(true)}
                >
                  <Ionicons
                    name="pencil"
                    size={13}
                    color="#6D43C0"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.headerEditBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.headerCancelEditBtn}
                  activeOpacity={0.8}
                  onPress={handleCancelEdit}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color="#DC2626"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.headerCancelEditBtnText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* If Generated, In Progress, Completed: show status badge */}
          {currentInbound && !isDraft && (
            <View style={styles.topHeaderStatusBadgeWrap}>
              <View
                style={[
                  styles.statusBadgeSmall,
                  currentStatus.includes('GENERATED') && { backgroundColor: '#E0F2FE' },
                  (currentStatus.includes('PROGRESS') || currentStatus.includes('PUTAWAY')) && { backgroundColor: '#FEF3C7' },
                  currentStatus.includes('COMPLETED') && { backgroundColor: '#DEF7EC' },
                  currentStatus.includes('CANCEL') && { backgroundColor: '#FDE8E8' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeSmallText,
                    currentStatus.includes('GENERATED') && { color: '#0284C7' },
                    (currentStatus.includes('PROGRESS') || currentStatus.includes('PUTAWAY')) && { color: '#D97706' },
                    currentStatus.includes('COMPLETED') && { color: '#03543F' },
                    currentStatus.includes('CANCEL') && { color: '#9B1C1C' },
                  ]}
                >
                  {currentStatus.includes('GENERATED')
                    ? 'Generated'
                    : currentStatus.includes('PROGRESS') || currentStatus.includes('PUTAWAY')
                    ? 'In Progress'
                    : currentStatus.includes('COMPLETED')
                    ? 'Completed'
                    : 'Canceled'}
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
            onSelect={(val) => handleSelectSource(val)}
            warehouses={warehouseOptions}
            events={eventOptions}
            disabled={!isEditable}
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
            warehouses={destWarehouseOptions}
            events={eventOptions}
            disabled={!isEditable}
          />
        </View>

        {/* ============================================================== */}
        {/* SECTION 2: PRODUCT DETAILS (MATCHING FIGMA AND SVG)            */}
        {/* ============================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Product Details</Text>
            {isEditable && (
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
            )}
          </View>

          {/* Product Items Table (Horizontally Scrollable for Full Cross-Platform Fit) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.tableScrollInner}
          >
            <View style={styles.tableBlock}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.thCell, { width: isEditable ? 230 : 180 }]}>
                  <Text style={styles.thText}>Product Name</Text>
                </View>
                <View style={[styles.thCell, { width: 75 }]}>
                  <Text style={styles.thText}>UoM</Text>
                </View>
                <View style={[styles.thCell, { width: 110 }]}>
                  <Text style={styles.thText}>Tracking Type</Text>
                </View>
                <View style={[styles.thCell, { width: isEditable ? 90 : 85 }]}>
                  <Text style={styles.thText}>Received Qty</Text>
                </View>
                {isPutawayMode && (
                  <View style={[styles.thCell, { width: 120 }]}>
                    <Text style={styles.thText}>Putaway Qty</Text>
                  </View>
                )}
                <View style={[styles.thCell, { width: isEditable ? 65 : (isPutawayMode ? 90 : 65), borderRightWidth: 0 }]}>
                  <Text style={styles.thText}>Action</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {productItems.map((item, index) => {
                const badge = getTrackingBadgeStyle(item.trackingType);
                const isSerial =
                  (item.trackingType || '').toLowerCase().includes('serial') ||
                  (item.trackingType || '').toLowerCase().includes('track');
                const isItemComplete =
                  isPutawayMode &&
                  Number(item.putawayQty || 0) >= Number(item.receivedQty || 0) &&
                  Number(item.receivedQty || 0) > 0;
                const remaining = Math.max(
                  0,
                  (parseInt(item.receivedQty, 10) || 0) - (parseInt(item.putawayQty, 10) || 0)
                );

                return (
                  <View key={item.id} style={styles.tableBodyRow}>
                    {/* Product Name */}
                    <View style={[styles.tdCell, { width: isEditable ? 230 : 180, paddingVertical: 4, zIndex: activeSearchIndex === index ? 9999 : 1 }]}>
                      {isEditable ? (
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
                      ) : (
                        <View style={{ paddingHorizontal: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
                            {item.productName || '—'}
                          </Text>
                        </View>
                      )}
                      {item.sku ? (
                        <Text style={styles.tdProductSkuText} numberOfLines={1}>
                          SKU: {item.sku}
                        </Text>
                      ) : null}
                    </View>

                    {/* UoM (read-only, populated on product selection) */}
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

                    {/* Tracking Type (read-only, populated on product selection) */}
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

                    {/* Received Qty */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: isEditable ? 90 : 80,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      {isEditable ? (
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
                          value={item.receivedQty || ''}
                          onChangeText={(val) => handleQtyChange(index, val)}
                        />
                      ) : (
                        <Text style={styles.tdQtyText}>{item.receivedQty || '0'}</Text>
                      )}
                    </View>

                    {/* Putaway Qty (only in Putaway / Non-draft modes) */}
                    {isPutawayMode && (
                      <View
                        style={[
                          styles.tdCell,
                          {
                            width: 120,
                            justifyContent: 'center',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        {isSerial ? (
                          /* Tracking / Serialized: Scanning triggers Camera Scanner */
                          <TouchableOpacity
                            style={[
                              styles.scanPutawayBtn,
                              isItemComplete && styles.scanPutawayBtnComplete,
                            ]}
                            activeOpacity={0.8}
                            disabled={isCompleted}
                            onPress={() => handleOpenScan(index)}
                          >
                            <Ionicons
                              name={isItemComplete ? 'checkmark-circle' : 'barcode-outline'}
                              size={13}
                              color="#FFFFFF"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.scanPutawayBtnText}>
                              {isItemComplete
                                ? `✓ ${item.putawayQty || 0}`
                                : `Scan (${item.putawayQty || 0}/${item.receivedQty || 0})`}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          /* Countable & Consumable: Direct numeric TextInput for Putaway Qty */
                          <TextInput
                            style={[
                              styles.putawayDirectInput,
                              isItemComplete && styles.putawayDirectInputComplete,
                              isCompleted && { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', color: '#64748B' },
                            ]}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            editable={!isCompleted}
                            value={
                              item.putawayQty !== undefined && item.putawayQty !== null
                                ? String(item.putawayQty)
                                : ''
                            }
                            onChangeText={(val) => handleDirectPutawayChange(index, val)}
                            selectTextOnFocus={true}
                          />
                        )}
                      </View>
                    )}

                    {/* Action Cell */}
                    <View
                      style={[
                        styles.tdCell,
                        {
                          width: isEditable ? 65 : (isPutawayMode ? 90 : 65),
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRightWidth: 0,
                        },
                      ]}
                    >
                      {isEditable ? (
                        /* In edit mode, Action contains Delete icon */
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
                      ) : isPutawayMode ? (
                        /* In Putaway mode: Shows Done badge or remaining count */
                        isItemComplete ? (
                          <View style={styles.doneBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#166534"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.doneBadgeText}>Done</Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>{remaining} left</Text>
                          </View>
                        )
                      ) : (
                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>—</Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Totals Row */}
              <View style={styles.tableTotalRow}>
                <View style={[styles.tdCell, { width: isEditable ? 415 : 365, paddingLeft: 10 }]}>
                  <Text style={styles.totalRowLabel}>
                    TOTALS ({productItems.length} lines)
                  </Text>
                </View>
                <View
                  style={[
                    styles.tdCell,
                    {
                      width: isEditable ? 90 : 85,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={styles.totalRowQty}>{totalQuantity}</Text>
                </View>
                {isPutawayMode && (
                  <View
                    style={[
                      styles.tdCell,
                      {
                        width: 120,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={styles.totalRowQty}>{totalPutawayQty}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.tdCell,
                    {
                      width: isEditable ? 65 : (isPutawayMode ? 90 : 65),
                      borderRightWidth: 0,
                    },
                  ]}
                />
              </View>
            </View>
          </ScrollView>
        </View>

        {/* SECTION 3: RECEIVING METHOD */}
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
                !isEditable && { opacity: receivingMethod === 'courier' ? 1 : 0.6 },
              ]}
              activeOpacity={0.85}
              disabled={!isEditable}
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
                !isEditable && { opacity: receivingMethod === 'transport' ? 1 : 0.6 },
              ]}
              activeOpacity={0.85}
              disabled={!isEditable}
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
                    <Ionicons
                      name="barcode-outline"
                      size={14}
                      color="#625A72"
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={[styles.textInput, !isEditable && { color: '#64748B' }]}
                      placeholder="Enter AWB number"
                      placeholderTextColor="#9A93A7"
                      value={awbNo}
                      onChangeText={setAwbNo}
                      editable={isEditable}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>
                    Carrier <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.dropdownInput, !isEditable && { backgroundColor: '#F8FAFC' }]}
                    activeOpacity={0.8}
                    disabled={!isEditable}
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
                    {isEditable && <Ionicons name="chevron-down" size={14} color="#625A72" />}
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
                    Transporter / Fleet <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.dropdownInput, !isEditable && { backgroundColor: '#F8FAFC' }]}
                    activeOpacity={0.8}
                    disabled={!isEditable}
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
                    {isEditable && <Ionicons name="chevron-down" size={14} color="#625A72" />}
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
                      style={[styles.textInput, !isEditable && { color: '#64748B' }]}
                      placeholder="e.g. MH-12-AB-4321"
                      placeholderTextColor="#9A93A7"
                      value={vehicleNo}
                      onChangeText={setVehicleNo}
                      editable={isEditable}
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
                      style={[styles.textInput, !isEditable && { color: '#64748B' }]}
                      placeholder="Enter LR / docket number"
                      placeholderTextColor="#9A93A7"
                      value={lrDocketNo}
                      onChangeText={setLrDocketNo}
                      editable={isEditable}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

        </View>

        {/* ============================================================== */}
        {/* ACTIONS BAR                                                   */}
        {/* ============================================================== */}
        <View style={styles.actionsBarCard}>
          {!currentInbound ? (
            /* 1. New Inbound: Cancel + Save as Draft */
            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity
                style={styles.bottomSecondaryBtn}
                activeOpacity={0.8}
                onPress={onCancel}
              >
                <Text style={styles.bottomSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveDraftBtn}
                activeOpacity={0.85}
                onPress={handleSaveDraft}
              >
                <Ionicons
                  name="document-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveDraftBtnText}>Save as Draft</Text>
              </TouchableOpacity>
            </View>
          ) : isDraft && isEditingDraft ? (
            /* 2. Draft in Edit Mode: Cancel Edit + Save as Draft */
            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity
                style={styles.bottomSecondaryBtn}
                activeOpacity={0.8}
                onPress={handleCancelEdit}
              >
                <Text style={styles.bottomSecondaryBtnText}>Cancel Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveDraftBtn}
                activeOpacity={0.85}
                onPress={handleSaveDraft}
              >
                <Ionicons
                  name="document-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveDraftBtnText}>Save as Draft</Text>
              </TouchableOpacity>
            </View>
          ) : isDraft && !isEditingDraft ? (
            /* 3. Draft in Read-Only Mode: Back to Movement + Mark as Generated */
            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity
                style={styles.bottomSecondaryBtn}
                activeOpacity={0.8}
                onPress={onCancel}
              >
                <Text style={styles.bottomSecondaryBtnText}>Back to Movement</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.markGeneratedBtn}
                activeOpacity={0.85}
                onPress={handlePressMarkAsGenerated}
              >
                <Ionicons
                  name="flash"
                  size={15}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.markGeneratedBtnText}>Mark as Generated</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* 4. Generated / In Progress / Completed: Back to Movement */
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>Back to Movement</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CONFIRMATION MODAL: MARK AS GENERATED */}
        <Modal
          visible={isGenerateConfirmVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsGenerateConfirmVisible(false)}
        >
          <View style={styles.confirmModalOverlay}>
            <View style={styles.confirmModalCard}>
              <View style={styles.confirmModalIconWrap}>
                <Ionicons name="flash" size={26} color="#6D43C0" />
              </View>
              <Text style={styles.confirmModalTitle}>Generate Inbound Consignment?</Text>
              <Text style={styles.confirmModalMessage}>
                Are you sure you want to generate Inbound record{' '}
                <Text style={{ fontWeight: '700', color: '#2563EB' }}>
                  {currentInbound?.no}
                </Text>
                ? Once generated, consignment details will be locked and ready for Putaway.
              </Text>
              <View style={styles.confirmModalActionsRow}>
                <TouchableOpacity
                  style={styles.confirmModalCancelBtn}
                  activeOpacity={0.8}
                  onPress={() => setIsGenerateConfirmVisible(false)}
                >
                  <Text style={styles.confirmModalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmModalConfirmBtn}
                  activeOpacity={0.85}
                  onPress={handleConfirmGenerate}
                >
                  <Text style={styles.confirmModalConfirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

      {/* ============================================================== */}
      {/* MODAL 2: SOURCE PICKER MODAL                                   */}
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
              <Text style={styles.pickerModalTitle}>Select Consignment Source</Text>
              <TouchableOpacity
                onPress={() => setIsSourcePickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F8F6FC', borderRadius: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#6D43C0', textTransform: 'uppercase' }}>Warehouses & Locations</Text>
              </View>
              {userAssignedWarehouses.map((whName, idx) => (
                <TouchableOpacity
                  key={`wh-${idx}`}
                  style={[
                    styles.simplePickerRow,
                    source === whName && styles.simplePickerRowActive,
                  ]}
                  onPress={() => handleSelectSource(whName)}
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
                    <Ionicons name="checkmark-circle" size={18} color="#6D43C0" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DESTINATION WAREHOUSE PICKER MODAL                    */}
      {/* (Only user-assigned warehouses shown, excluding source)       */}
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
                <Text style={styles.pickerModalTitle}>
                  Select Destination Warehouse
                </Text>
                <Text style={{ fontSize: 11, color: '#817A91', marginTop: 2 }}>
                  Assigned warehouses (excluding source)
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
              {destinationOptions.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color="#8B8498"
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={{ color: '#8B8498', fontSize: 13, textAlign: 'center' }}>
                    No other assigned warehouse available (source is already selected).
                  </Text>
                </View>
              ) : (
                destinationOptions.map((whName, idx) => (
                  <TouchableOpacity
                    key={`dest-${idx}`}
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
                    {destination === whName && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#6D43C0"
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
      {/* MODAL 4: CARRIER PICKER MODAL                                  */}
      {/* ============================================================== */}
      <Modal
        visible={isCarrierPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsCarrierPickerVisible(false);
          setNewLogisticsName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                {receivingMethod === 'courier' ? 'Choose Carrier' : 'Choose Transporter'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCarrierPickerVisible(false);
                  setNewLogisticsName('');
                }}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#17102F" />
              </TouchableOpacity>
            </View>

            {/* Smart Add New Carrier / Transporter Bar */}
            <View style={styles.addEntityInputRow}>
              <View style={styles.addEntityInputWrap}>
                <Ionicons
                  name="paper-plane-outline"
                  size={16}
                  color="#9A93A7"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.addEntityTextInput}
                  placeholder={
                    receivingMethod === 'courier'
                      ? 'Add new carrier name...'
                      : 'Add new transporter name...'
                  }
                  placeholderTextColor="#9A93A7"
                  value={newLogisticsName}
                  onChangeText={setNewLogisticsName}
                  onSubmitEditing={handleAddLogisticsEntity}
                />
              </View>
              <TouchableOpacity
                style={styles.addEntityBtn}
                activeOpacity={0.8}
                onPress={handleAddLogisticsEntity}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
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
                      style={styles.entityRowSelectArea}
                      onPress={() => {
                        if (receivingMethod === 'courier') {
                          setCourierCarrier(c);
                        } else {
                          setTransporter(c);
                        }
                        setIsCarrierPickerVisible(false);
                        setNewLogisticsName('');
                      }}
                    >
                      <Ionicons
                        name="paper-plane-outline"
                        size={16}
                        color={isSelected ? '#6D43C0' : '#8A819C'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.simplePickerText,
                          isSelected && styles.entitySelectedText,
                          { flex: 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {c}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#6D43C0"
                          style={{ marginRight: 8 }}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Delete Option for each item */}
                    <TouchableOpacity
                      style={styles.entityDeleteBtn}
                      onPress={() => handleDeleteLogisticsEntity(c)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {(receivingMethod === 'courier' ? carrierList : transporterList).length === 0 && (
                <View style={styles.emptyEntityContainer}>
                  <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyEntityText}>
                    No {receivingMethod === 'courier' ? 'carriers' : 'transporters'} added yet.
                  </Text>
                  <Text style={styles.emptyEntitySubtext}>
                    Type a name above and tap Add.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL: ADD QUANTITY (MATCHING District_Stock_Add_Quantity_Modal_Compact.svg) */}
      {/* ============================================================== */}
      <Modal
        visible={qtyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQtyModalVisible(false)}
      >
        <View style={styles.popupCenterOverlay}>
          <View style={styles.qtyPopupContainer}>
            {/* Header: Title ("Add Quantity") + Close (X) */}
            <View style={styles.qtyPopupHeader}>
              <Text style={styles.qtyPopupTitle}>Add Quantity</Text>
              <TouchableOpacity
                style={styles.qtyPopupCloseBtn}
                activeOpacity={0.7}
                onPress={() => setQtyModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#777187" />
              </TouchableOpacity>
            </View>

            {/* Divider Line matching SVG */}
            <View style={styles.qtyPopupDivider} />

            {/* Product Details Row: Icon + Name & SKU + Tag Badge */}
            {qtyModalItemIndex !== null && productItems[qtyModalItemIndex] && (
              <View style={styles.qtyPopupProductRow}>
                <View style={styles.qtyPopupProductThumb}>
                  <Ionicons
                    name={
                      (productItems[qtyModalItemIndex].trackingType || '')
                        .toLowerCase()
                        .includes('consumable')
                        ? 'water-outline'
                        : 'git-commit-outline'
                    }
                    size={16}
                    color="#332B45"
                  />
                </View>
                <View style={styles.qtyPopupProductMeta}>
                  <Text style={styles.qtyPopupProductName} numberOfLines={1}>
                    {productItems[qtyModalItemIndex].productName || 'Product'}
                  </Text>
                  <Text style={styles.qtyPopupProductSku} numberOfLines={1}>
                    {productItems[qtyModalItemIndex].sku || 'CAB-002'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.qtyPopupBadge,
                    {
                      backgroundColor: (
                        productItems[qtyModalItemIndex].trackingType || ''
                      )
                        .toLowerCase()
                        .includes('consumable')
                        ? '#FFF0D8'
                        : '#DDF7E8',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.qtyPopupBadgeText,
                      {
                        color: (
                          productItems[qtyModalItemIndex].trackingType || ''
                        )
                          .toLowerCase()
                          .includes('consumable')
                          ? '#A65B00'
                          : '#18794E',
                      },
                    ]}
                  >
                    {(productItems[qtyModalItemIndex].trackingType || '')
                      .toLowerCase()
                      .includes('consumable')
                      ? 'Consumable'
                      : 'Countable'}
                  </Text>
                </View>
              </View>
            )}

            {/* Unit Label matching SVG */}
            <Text style={styles.qtyPopupUomText}>
              Unit: {qtyModalItemIndex !== null && productItems[qtyModalItemIndex]?.uom ? productItems[qtyModalItemIndex].uom : 'Pieces'}
            </Text>

            {/* Stepper Row matching SVG (width: 40 [-], width: 208 [Value], width: 40 [+], height: 38) */}
            <View style={styles.qtyPopupStepperRow}>
              <TouchableOpacity
                style={styles.qtyPopupStepBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setModalQtyValue((prev) => Math.max(0, (parseInt(prev, 10) || 0) - 1))
                }
              >
                <Ionicons name="remove" size={18} color="#6D43C0" />
              </TouchableOpacity>

              <View style={styles.qtyPopupInputWrap}>
                <TextInput
                  style={styles.qtyPopupTextInput}
                  keyboardType="number-pad"
                  value={String(modalQtyValue)}
                  onChangeText={(text) => {
                    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    setModalQtyValue(isNaN(num) ? 0 : num);
                  }}
                  selectTextOnFocus={true}
                />
              </View>

              <TouchableOpacity
                style={styles.qtyPopupStepBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setModalQtyValue((prev) => (parseInt(prev, 10) || 0) + 1)
                }
              >
                <Ionicons name="add" size={18} color="#6D43C0" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons Row matching SVG (Cancel: #F3F1F7, Save Quantity: #6D43C0) */}
            <View style={styles.qtyPopupActionsRow}>
              <TouchableOpacity
                style={styles.qtyPopupCancelBtn}
                activeOpacity={0.8}
                onPress={() => setQtyModalVisible(false)}
              >
                <Text style={styles.qtyPopupCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qtyPopupSaveBtn}
                activeOpacity={0.85}
                onPress={handleSaveModalQty}
              >
                <Text style={styles.qtyPopupSaveText}>Save Quantity</Text>
              </TouchableOpacity>
            </View>
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

// ===========================================================================
// COMPONENT: SCAN SERIAL NUMBER SCREEN (Matching District Stock Final SVG)
// ===========================================================================
function ScanSerialNumberScreen({ item, refNo, onBack, onSave }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scannedSerials, setScannedSerials] = useState(
    item.serialNumbers && item.serialNumbers.length > 0
      ? item.serialNumbers
      : []
  );
  const [lastScannedFeedback, setLastScannedFeedback] = useState('');
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const [manualSerialInput, setManualSerialInput] = useState('');

  // Draggable Drawer States (Closed by default as requested: "start se close ho")
  const COLLAPSED_HEIGHT = 62;
  const EXPANDED_HEIGHT = 330;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isDrawerOpenRef = useRef(false);
  isDrawerOpenRef.current = isDrawerOpen;

  const drawerAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  const snapDrawer = (open) => {
    setIsDrawerOpen(open);
    isDrawerOpenRef.current = open;
    Animated.spring(drawerAnim, {
      toValue: open ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
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

  // Auto request camera permissions on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

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

  const maxExpected = parseInt(item.receivedQty, 10) || 0;

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
    if (inboundService?.isSerialRegistered?.(code)) {
      Alert.alert('Duplicate Serial', `Serial number "${code}" is already registered in warehouse.`);
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
    if (inboundService?.isSerialRegistered?.(code)) {
      Alert.alert('Duplicate Serial', `Serial number "${code}" is already registered in warehouse.`);
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

  const expectedQty = item.expectedQty ? Number(item.expectedQty) : 1000;
  const remainingQty = Math.max(0, expectedQty - scannedSerials.length);
  const hasCameraPermission = permission?.granted;

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
              Inbound #{refNo || 'PO-88210'}
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

      {/* 2. PRODUCT CARD (White, rounded, speaker icon, PRODUCT tag, Serial Track badge) */}
      <View style={styles.scannerProductCard}>
        <View style={styles.scannerProductIconBox}>
          <MaterialCommunityIcons name="speaker" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.scannerProductInfoCol}>
          <Text style={styles.scannerProductTag}>PRODUCT</Text>
          <Text style={styles.scannerProductName} numberOfLines={1}>
            {item.productName || 'JBL Speaker'}
          </Text>
        </View>
        <View style={styles.scannerSerialTrackBadge}>
          <Text style={styles.scannerSerialTrackText}>Serial Track</Text>
        </View>
      </View>

      {/* 3. CAMERA VIEWFINDER CARD (flex: 1 fills open space when door is closed) */}
      <View style={[styles.scannerCameraCard, hasCameraPermission && { backgroundColor: 'transparent' }]}>
        {hasCameraPermission ? (
          <CameraView
            key={`inbound-cam-surface-${hasCameraPermission}`}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={isTorchOn}
            barcodeScannerSettings={{
              barcodeTypes: [
                'code128',
                'code39',
                'ean13',
                'ean8',
                'qr',
                'upc_a',
                'upc_e',
              ],
            }}
            onBarcodeScanned={handleBarcodeScanned}
            onCameraReady={() => console.log('Inbound Camera Ready')}
            onMountError={(err) => console.warn('Inbound Camera Mount Error:', err)}
          />
        ) : (
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
        {/* DRAG HANDLE & HEADER (User drags here to open/close) */}
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

      {/* 5. BOTTOM STATS STRIP (Dark Navy/Purple matching SVG) */}
      <View style={styles.scannerBottomStatsStrip}>
        {/* Col 1: Expected Qty */}
        <View style={styles.scannerStatCol}>
          <Text style={styles.scannerStatLabel}>Expected Qty</Text>
          <Text style={styles.scannerStatValueWhite}>{expectedQty}</Text>
        </View>

        <View style={styles.scannerStatDivider} />

        {/* Col 2: Scanned Qty */}
        <View style={styles.scannerStatCol}>
          <View style={styles.scannerStatIconHeader}>
            <Ionicons name="checkmark-circle" size={12} color="#4ADE80" style={{ marginRight: 4 }} />
            <Text style={[styles.scannerStatLabel, { color: '#4ADE80' }]}>Scanned Qty</Text>
          </View>
          <Text style={styles.scannerStatValueWhite}>{scannedSerials.length}</Text>
        </View>

        <View style={styles.scannerStatDivider} />

        {/* Col 3: Remaining */}
        <View style={styles.scannerStatCol}>
          <View style={styles.scannerStatIconHeader}>
            <Ionicons name="time" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={[styles.scannerStatLabel, { color: '#FBBF24' }]}>Remaining</Text>
          </View>
          <Text style={styles.scannerStatValueWhite}>{remainingQty}</Text>
        </View>
      </View>

      {/* MODAL: MANUAL SERIAL NUMBER INPUT (CENTERED ON SCREEN) */}
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
              placeholder="e.g. SN123456794"
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
  // 1. TOP NAVY HEADER matching SVG (#17102F)
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
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    color: '#D0C9DF',
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

  // Top Header Bar
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  topHeaderActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#6D43C0',
    backgroundColor: '#FAF5FF',
  },
  headerEditBtnActive: {
    backgroundColor: '#6D43C0',
    borderColor: '#6D43C0',
  },
  headerEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D43C0',
  },
  headerEditBtnTextActive: {
    color: '#FFFFFF',
  },
  headerGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 7,
    backgroundColor: '#6D43C0',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerGenerateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 10,
    fontWeight: '700',
  },

  // Breadcrumb matching SVG
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D43C0',
    marginLeft: 4,
  },

  // Shared White Card styling matching SVG
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
  productSubHeaderSub: {
    fontSize: 10,
    color: '#6D43C0',
    fontWeight: '600',
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
  tdProductSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdProductIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F0ECFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  tdProductName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#21183B',
  },
  tdProductSku: {
    fontSize: 9,
    color: '#817A91',
    marginTop: 1,
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
  tdQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#21183B',
  },

  // Action Cell: Scan / Add Qty + Divider + Delete Trash Icon
  actionCellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  scanActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addQtyActionBtn: {
    backgroundColor: '#F0EAFE',
    borderWidth: 1,
    borderColor: '#BDA7F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addQtyActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D43C0',
  },
  actionDivider: {
    fontSize: 12,
    color: '#B9B2C7',
    marginHorizontal: 6,
  },
  deleteSignBtn: {
    padding: 3,
  },

  putawayDirectInput: {
    borderWidth: 1.5,
    borderColor: '#6D43C0',
    backgroundColor: '#FAF8FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 68,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#3B1879',
  },
  putawayDirectInputComplete: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    color: '#065F46',
  },
  scanPutawayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 80,
  },
  scanPutawayBtnComplete: {
    backgroundColor: '#059669',
  },
  scanPutawayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  doneBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
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

  // Quick Guide Banner Matching SVG line 21
  quickGuideBanner: {
    backgroundColor: '#F8F6FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ECE6F6',
  },
  quickGuideTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#49336F',
    marginBottom: 2,
  },
  quickGuideText: {
    fontSize: 10,
    color: '#777187',
  },

  productFooterNotes: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  bulletNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bulletNoteText: {
    fontSize: 10,
    color: '#716B82',
    flex: 1,
  },

  // SECTION 3: RECEIVING METHOD
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
  methodFooterNotes: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0ECFA',
  },
  methodNoteText: {
    fontSize: 10,
    color: '#817A91',
    lineHeight: 14,
  },

  // SECTION 4: REVIEW
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#03543F',
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  reviewCardItem: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECE8F5',
  },
  reviewItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#817A91',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  reviewItemValueMain: {
    fontSize: 12,
    fontWeight: '700',
    color: '#21183B',
  },
  reviewItemSub: {
    fontSize: 10,
    color: '#625A72',
    marginTop: 2,
  },
  reviewMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EAFE',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  reviewMethodText: {
    fontSize: 11,
    color: '#5521B5',
    fontWeight: '600',
    flex: 1,
  },
  reviewDraftNotice: {
    fontSize: 10,
    color: '#817A91',
    fontStyle: 'italic',
  },

  // SECTION 5: ACTIONS BAR
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
  popupCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 7, 25, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  simplePickerSub: {
    fontSize: 11,
    color: '#817A91',
    marginTop: 2,
  },

  // =========================================================================
  // SUB-SCREEN 2: SCAN SERIAL NUMBER STYLES
  // =========================================================================
  scanScrollContent: {
    padding: 14,
  },
  scanProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6E1EF',
    marginBottom: 10,
  },
  scanProductThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#201838',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanProductTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#21183B',
  },
  scanProductSku: {
    fontSize: 12,
    color: '#817A91',
    marginTop: 2,
  },
  serialTrackBadge: {
    backgroundColor: '#E2EBFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serialTrackBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#315EA8',
  },

  scanStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E6E1EF',
    marginBottom: 12,
  },
  scanStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  scanStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#21183B',
  },
  scanStatLabel: {
    fontSize: 11,
    color: '#817A91',
    marginTop: 2,
  },
  scanStatDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E6E1EF',
    alignSelf: 'center',
  },

  viewfinderContainer: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E192B',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  // =========================================================================
  // QUANTITY POPUP MODAL (MATCHING District_Stock_Add_Quantity_Modal_Compact.svg)
  // =========================================================================
  qtyPopupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E0F0',
    padding: 18,
    width: '100%',
    maxWidth: 342,
    alignSelf: 'center',
    shadowColor: '#17102F',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  qtyPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyPopupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#21183B',
  },
  qtyPopupCloseBtn: {
    padding: 4,
  },
  qtyPopupDivider: {
    height: 1,
    backgroundColor: '#ECE8F4',
    marginTop: 12,
    marginBottom: 14,
  },
  qtyPopupProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qtyPopupProductThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0ECFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPopupProductMeta: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  qtyPopupProductName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#21183B',
  },
  qtyPopupProductSku: {
    fontSize: 10,
    color: '#777187',
    marginTop: 2,
  },
  qtyPopupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  qtyPopupBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  qtyPopupUomText: {
    fontSize: 10,
    color: '#777187',
    marginBottom: 8,
  },
  qtyPopupStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  qtyPopupStepBtn: {
    width: 40,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#F0EAFE',
    borderWidth: 1,
    borderColor: '#CDBCF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPopupInputWrap: {
    flex: 1,
    height: 38,
    marginHorizontal: 8,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#6D43C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPopupTextInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#21183B',
    padding: 0,
  },
  qtyPopupActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qtyPopupCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#F3F1F7',
    borderWidth: 1,
    borderColor: '#E5E0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPopupCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#655D75',
  },
  qtyPopupSaveBtn: {
    flex: 1.35,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#6D43C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPopupSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // =========================================================================
  // DISTRICT STOCK INBOUND SERIAL SCANNER (Matching SVG & Mockup)
  // =========================================================================
  scannerRoot: {
    flex: 1,
    backgroundColor: '#17102F',
  },
  scannerTopHeader: {
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  scannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#302449',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scannerHeaderTitleCol: {
    flex: 1,
  },
  scannerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  scannerHeaderSub: {
    fontSize: 12,
    color: '#CDBBFF',
    marginTop: 2,
  },
  scannerHeaderSaveBtn: {
    backgroundColor: '#6D43C0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#6D43C0',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerHeaderSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. PRODUCT CARD
  scannerProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  scannerProductIconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#17102F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scannerProductInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  scannerProductTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6D43C0',
    letterSpacing: 0.5,
  },
  scannerProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#21183B',
    marginTop: 2,
  },
  scannerSerialTrackBadge: {
    backgroundColor: '#F0EAFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9,
  },
  scannerSerialTrackText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6D43C0',
  },

  // 3. CAMERA CARD
  scannerCameraCard: {
    marginHorizontal: 16,
    flex: 1,
    minHeight: 180,
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#282733',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCameraFallback: {
    backgroundColor: '#1F1A33',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scannerCameraFallbackText: {
    color: '#CDBBFF',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  scannerRequestPermBtn: {
    backgroundColor: '#6D43C0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scannerRequestPermBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scannerTorchFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#17102F',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerReticle: {
    width: 170,
    height: 105,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#CDBBFF',
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scannerLaserLine: {
    position: 'absolute',
    top: 15,
    left: 4,
    right: 4,
    height: 2.5,
    backgroundColor: '#A979FF',
    shadowColor: '#A979FF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  scannerAlignPill: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: '#17102F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scannerAlignPillText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scannerLiveToast: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 101, 52, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4ADE80',
    zIndex: 10,
  },
  scannerLiveToastText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 4. SCANNED SERIALS SHEET (DRAGGABLE "DOOR")
  scannerBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  scannerSheetDragHeaderArea: {
    paddingBottom: 4,
  },
  scannerDragPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scannerDragPromptText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6D43C0',
  },
  scannerGrabHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#C7C0DB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  scannerSheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannerSheetTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#21183B',
  },
  scannerCountBadge: {
    backgroundColor: '#F0EAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  scannerCountBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6D43C0',
  },
  scannerClearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  scannerClearAllText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6D43C0',
  },
  scannerSerialsScrollView: {
    flex: 1,
  },
  scannerEmptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  scannerEmptyListText: {
    fontSize: 12,
    color: '#817A91',
    marginTop: 6,
  },
  scannerSerialItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DAEE',
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerSerialIndexCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0EAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  scannerSerialIndexText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6D43C0',
  },
  scannerSerialCodeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#21183B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scannerSerialDeleteTouch: {
    padding: 4,
  },
  scannerAddManualBtn: {
    backgroundColor: '#F8F5FF',
    borderWidth: 1.2,
    borderColor: '#A98BEA',
    borderRadius: 10,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  scannerAddManualText: {
    color: '#6D43C0',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // 5. BOTTOM STATS STRIP
  scannerBottomStatsStrip: {
    backgroundColor: '#17102F',
    height: 74,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerStatCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerStatIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  scannerStatLabel: {
    fontSize: 9,
    color: '#C8C0DC',
    fontWeight: '500',
    marginBottom: 2,
  },
  scannerStatValueWhite: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scannerStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#51436F',
  },

  // MODAL: MANUAL SERIAL
  manualModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 342,
    alignSelf: 'center',
    shadowColor: '#17102F',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  manualModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17102F',
  },
  manualModalSub: {
    fontSize: 12,
    color: '#817A91',
    marginTop: 3,
    marginBottom: 16,
  },
  manualModalInput: {
    height: 44,
    backgroundColor: '#F9F8FC',
    borderWidth: 1,
    borderColor: '#D9D4E3',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#21183B',
    marginBottom: 16,
  },
  manualModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualModalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F3F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualModalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#605872',
  },
  manualModalAddBtn: {
    flex: 1.3,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#6D43C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualModalAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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

  // Smart Add Carrier / Transporter Modal Styles
  addEntityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addEntityInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  addEntityTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  addEntityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entityRowSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  entitySelectedText: {
    color: '#6D43C0',
    fontWeight: '700',
  },
  entityDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  emptyEntityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyEntityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptyEntitySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Edit & Cancel Edit Header Buttons
  headerCancelEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  headerCancelEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Bottom Buttons Layout
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  bottomSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4CEE2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#625A72',
  },
  markGeneratedBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#6D43C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  markGeneratedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmModalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  confirmModalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmModalConfirmBtn: {
    flex: 1.2,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#6D43C0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmModalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Putaway In-Line Direct Input & Scan Styles
  putawayDirectInput: {
    width: 68,
    height: 32,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 6,
    backgroundColor: '#FBF8FF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#6D43C0',
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  putawayDirectInputComplete: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
    color: '#166534',
  },
  scanPutawayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 84,
  },
  scanPutawayBtnComplete: {
    backgroundColor: '#10B981',
  },
  scanPutawayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doneBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '700',
  },
});
