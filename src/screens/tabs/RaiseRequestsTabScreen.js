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
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import CommonCalendarModal from '../../components/CommonCalendarModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RaiseRequestsTabScreen({ session, onLogout, onNavigateTab }) {
  // --- Form States ---
  const [eventsList, setEventsList] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDate, setEventDate] = useState('');
  
  // Product rows: start with one empty row as shown in SVG
  const [productRows, setProductRows] = useState([
    { rowId: 'row-1', productId: '', name: '', uom: '—', qty: '0' },
  ]);

  // Inventory & Delivery Details
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [pocName, setPocName] = useState(session?.name || 'Sneha Patil');
  const [pocNo, setPocNo] = useState('9820198201');

  // --- Modals State ---
  const [calendarTarget, setCalendarTarget] = useState(null); // 'eventDate' | 'requiredDate' | null
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeRowIdx, setActiveRowIdx] = useState(0);
  const [eventSearch, setEventSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedReq, setSubmittedReq] = useState(null);

  // Load Events & Products on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const rawEvs = masterService.getEvents ? (masterService?.getEvents?.() || []) : [];
    const evs = rawEvs.filter((e) => (e.status || 'active').toLowerCase() === 'active');
    const prods = masterService.getProducts ? (masterService?.getProducts?.() || []) : [];
    setEventsList(evs);
    setCatalogProducts(prods);
    if (evs.length === 1 && !selectedEvent) {
      setSelectedEvent(evs[0]);
      setEventDate(evs[0].dates || '');
      if (evs[0].venue) {
        setDeliveryLocation(evs[0].venue);
      }
    }
  };

  // --- Calculations for Stepper Progress ---
  const isStep1Done = Boolean(selectedEvent);
  const validProductsCount = productRows.filter(
    (r) => r.productId && Number(r.qty) > 0
  ).length;
  const isStep2Done = validProductsCount > 0;
  const isStep3Done = Boolean(requiredDate.trim() && deliveryLocation.trim());

  // --- Handlers: Event Selection ---
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setEventDate(event.dates || '10–12 Oct 2026');
    if (!deliveryLocation && event.venue) {
      setDeliveryLocation(event.venue);
    }
    setEventModalVisible(false);
  };

  // --- Handlers: Product Rows ---
  const handleAddProductRow = () => {
    setProductRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: '',
        name: '',
        uom: '—',
        qty: '0',
      },
    ]);
  };

  const handleOpenProductPicker = (idx) => {
    setActiveRowIdx(idx);
    setProductSearch('');
    setProductModalVisible(true);
  };

  const handleSelectProduct = (product) => {
    setProductRows((prev) => {
      const updated = [...prev];
      updated[activeRowIdx] = {
        ...updated[activeRowIdx],
        productId: product.id,
        name: product.name,
        uom: product.uom || 'Pieces (Pcs)',
        qty: updated[activeRowIdx].qty === '0' || !updated[activeRowIdx].qty ? '1' : updated[activeRowIdx].qty,
      };
      return updated;
    });
    setProductModalVisible(false);
  };

  const handleQtyChange = (idx, text) => {
    const cleanNumber = text.replace(/[^0-9]/g, '');
    setProductRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        qty: cleanNumber,
      };
      return updated;
    });
  };

  const handleRemoveRow = (idx) => {
    if (productRows.length === 1) {
      // If only 1 row, clear it
      setProductRows([
        { rowId: `row-${Date.now()}`, productId: '', name: '', uom: '—', qty: '0' },
      ]);
      return;
    }
    setProductRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Handlers: Cancel & Reset ---
  const handleCancelPress = () => {
    const hasData =
      selectedEvent ||
      productRows.some((r) => r.productId) ||
      requiredDate ||
      deliveryLocation;

    if (hasData) {
      Alert.alert(
        'Discard Request?',
        'Any details you have entered will be cleared.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard & Reset',
            style: 'destructive',
            onPress: () => {
              resetForm();
              if (onNavigateTab) {
                onNavigateTab('dashboard');
              }
            },
          },
        ]
      );
    } else {
      if (onNavigateTab) {
        onNavigateTab('dashboard');
      }
    }
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setEventDate('');
    setProductRows([
      { rowId: 'row-1', productId: '', name: '', uom: '—', qty: '0' },
    ]);
    setRequiredDate('');
    setDeliveryLocation('');
    setPocName(session?.name || 'Sneha Patil');
    setPocNo('9820198201');
  };

  // --- Handlers: Submit Request ---
  const handleSubmitPress = () => {
    if (!selectedEvent) {
      Alert.alert('Event Required', 'Please select an event for this stock request.');
      return;
    }

    const validItems = productRows.filter(
      (r) => r.productId && Number(r.qty) > 0
    );

    if (validItems.length === 0) {
      Alert.alert(
        'Product Required',
        'Please add at least one product with quantity greater than 0.'
      );
      return;
    }

    if (!requiredDate.trim()) {
      Alert.alert('Date Required', 'Please provide Inventory Required Date.');
      return;
    }

    if (!deliveryLocation.trim()) {
      Alert.alert('Location Required', 'Please enter delivery location for the event.');
      return;
    }

    // Prepare requisition payload
    const payload = {
      eventCode: selectedEvent.code,
      eventName: selectedEvent.name,
      eventDate: eventDate || selectedEvent.dates,
      items: validItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        uom: item.uom,
        qty: Number(item.qty),
      })),
      requiredDate: requiredDate.trim(),
      deliveryLocation: deliveryLocation.trim(),
      pocName: pocName.trim() || 'Sneha Patil',
      pocNo: pocNo.trim() || '9820198201',
      planner: session?.name || 'Sneha Patil',
    };

    const newRequisition = masterService.addRequisition
      ? masterService.addRequisition(payload)
      : { id: `REQ-${Date.now()}`, ...payload, status: 'Pending Admin Review' };

    setSubmittedReq(newRequisition);
    setSuccessModalVisible(true);
  };

  const filteredEvents = eventsList.filter((e) => {
    const q = eventSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      e.name?.toLowerCase().includes(q) ||
      e.code?.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q)
    );
  });

  const filteredProducts = catalogProducts.filter((p) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* 1. Header (matches SVG top banner: #17102F background with title, subtitle, and × close circle) */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Raise Request</Text>
          <View style={styles.scopeRow}>
            <View style={styles.scopeDot} />
            <Text style={styles.headerSubtitle}>Create a stock request for your event</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCancelPress}
          style={styles.closeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeBtnText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Description before sections */}
        <View style={styles.pageMetaHeader}>
          <Text style={styles.pageTitle}>New stock request</Text>
          <Text style={styles.pageSubtitle}>
            Complete all three sections before submitting.
          </Text>
        </View>

        {/* 3-Section Stepper Indicator Card (SVG lines 10-21) */}
        <View style={styles.stepperCard}>
          {/* Step 1: Event */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                isStep1Done ? styles.stepCircleActive : styles.stepCirclePending,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  isStep1Done ? styles.stepNumberActive : styles.stepNumberPending,
                ]}
              >
                1
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                isStep1Done ? styles.stepLabelActive : styles.stepLabelPending,
              ]}
            >
              Event
            </Text>
          </View>

          {/* Line 1 */}
          <View
            style={[
              styles.stepDivider,
              isStep1Done && isStep2Done ? styles.stepDividerActive : null,
            ]}
          />

          {/* Step 2: Products */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                isStep2Done ? styles.stepCircleActive : styles.stepCirclePending,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  isStep2Done ? styles.stepNumberActive : styles.stepNumberPending,
                ]}
              >
                2
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                isStep2Done ? styles.stepLabelActive : styles.stepLabelPending,
              ]}
            >
              Products
            </Text>
          </View>

          {/* Line 2 */}
          <View
            style={[
              styles.stepDivider,
              isStep2Done && isStep3Done ? styles.stepDividerActive : null,
            ]}
          />

          {/* Step 3: Delivery */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                isStep3Done ? styles.stepCircleActive : styles.stepCirclePending,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  isStep3Done ? styles.stepNumberActive : styles.stepNumberPending,
                ]}
              >
                3
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                isStep3Done ? styles.stepLabelActive : styles.stepLabelPending,
              ]}
            >
              Delivery
            </Text>
          </View>
        </View>

        {/* SECTION 1: Event Details (SVG lines 22-31) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Event Details</Text>
          <Text style={styles.sectionSubtitle}>
            Select the event this request is for.
          </Text>

          {/* Event Code Field */}
          <Text style={styles.fieldLabel}>Event Code</Text>
          <TouchableOpacity
            style={styles.dropdownInput}
            activeOpacity={0.8}
            onPress={() => {
              setEventSearch('');
              setEventModalVisible(true);
            }}
          >
            <Text
              style={[
                styles.dropdownInputText,
                selectedEvent ? styles.dropdownInputTextFilled : null,
              ]}
              numberOfLines={1}
            >
              {selectedEvent
                ? `${selectedEvent.code}  —  ${selectedEvent.name}`
                : 'Select event code'}
            </Text>
            <Text style={styles.dropdownChevron}>⌄</Text>
          </TouchableOpacity>

          {/* Event Date Field */}
          <View style={styles.eventDateRow}>
            <View style={styles.eventDateLabelCol}>
              <Text style={styles.fieldLabel}>Event Date</Text>
            </View>
            <View style={[styles.eventDateInputCol, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput
                style={[styles.dateInputField, { flex: 1, paddingRight: 32 }]}
                placeholder="DD / MM / YYYY"
                placeholderTextColor="#8B8498"
                value={eventDate}
                onChangeText={setEventDate}
              />
              <TouchableOpacity
                onPress={() => setCalendarTarget('eventDate')}
                style={{ position: 'absolute', right: 10, padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#6D43C0" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 2: Product Requirements (SVG lines 32-65) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Product Requirements</Text>
          <Text style={styles.sectionSubtitle}>
            Add products and requested quantities.
          </Text>

          {/* Add Product Button Bar */}
          <View style={styles.addProductBtnRow}>
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={handleAddProductRow}
              activeOpacity={0.8}
            >
              <Text style={styles.addProductBtnText}>+ Add Product</Text>
            </TouchableOpacity>
            <Text style={styles.scrollHintText}>Product rows scroll →</Text>
          </View>

          {/* Horizontal Scroll Table */}
          <View style={styles.tableBorderWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableGrid}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.colCell, styles.colProdName]}>
                    <Text style={styles.headerCellText}>Product Name</Text>
                  </View>
                  <View style={[styles.colCell, styles.colUom]}>
                    <Text style={styles.headerCellText}>UoM</Text>
                  </View>
                  <View style={[styles.colCell, styles.colQty]}>
                    <Text style={styles.headerCellText}>Qty</Text>
                  </View>
                  <View style={[styles.colCell, styles.colAction]}>
                    <Text style={styles.headerCellText}>Action</Text>
                  </View>
                </View>

                {/* Table Rows */}
                {productRows.map((row, idx) => (
                  <View key={row.rowId || idx} style={styles.tableDataRow}>
                    {/* Product Name Selector */}
                    <TouchableOpacity
                      style={[styles.colCell, styles.colProdName, styles.cellProdTouch]}
                      activeOpacity={0.7}
                      onPress={() => handleOpenProductPicker(idx)}
                    >
                      <Text
                        style={[
                          styles.dataCellText,
                          row.productId ? styles.dataCellTextSelected : styles.dataCellTextPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {row.name ? row.name : 'Select product'}
                      </Text>
                      <Ionicons name="chevron-down" size={13} color="#6D43C0" />
                    </TouchableOpacity>

                    {/* UoM */}
                    <View style={[styles.colCell, styles.colUom]}>
                      <Text style={styles.dataCellText} numberOfLines={1}>
                        {row.uom || '—'}
                      </Text>
                    </View>

                    {/* Qty Input */}
                    <View style={[styles.colCell, styles.colQty]}>
                      <TextInput
                        style={styles.qtyTextInput}
                        keyboardType="numeric"
                        value={String(row.qty)}
                        onChangeText={(t) => handleQtyChange(idx, t)}
                        placeholder="0"
                        placeholderTextColor="#8B8498"
                        selectTextOnFocus
                      />
                    </View>

                    {/* Remove Action */}
                    <View style={[styles.colCell, styles.colAction]}>
                      <TouchableOpacity
                        onPress={() => handleRemoveRow(idx)}
                        style={styles.removeRowBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Scroll progress track & Hint */}
          <View style={styles.scrollIndicatorTrack}>
            <View style={styles.scrollIndicatorThumb} />
          </View>
          <Text style={styles.swipeHintFooter}>
            Swipe horizontally to view Product Name, UoM and Qty.
          </Text>
        </View>

        {/* SECTION 3: Inventory & Delivery Details (SVG lines 66-81) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Inventory & Delivery Details</Text>
          <Text style={styles.sectionSubtitle}>
            When do you need the stock and where?
          </Text>

          {/* Inventory Required Date */}
          <Text style={styles.fieldLabel}>Inventory Required Date</Text>
          <View style={styles.iconInputBox}>
            <TextInput
              style={styles.iconInputField}
              placeholder="DD / MM / YYYY"
              placeholderTextColor="#8B8498"
              value={requiredDate}
              onChangeText={setRequiredDate}
            />
            <TouchableOpacity
              onPress={() => setCalendarTarget('requiredDate')}
              style={styles.iconInputRightBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color="#6D43C0" />
            </TouchableOpacity>
          </View>

          {/* Delivery Location */}
          <Text style={styles.fieldLabel}>Delivery Location</Text>
          <View style={styles.iconInputBox}>
            <TextInput
              style={styles.iconInputField}
              placeholder="Enter event delivery location"
              placeholderTextColor="#8B8498"
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
            />
          </View>

          {/* POC Name & POC Number (Two Column Row) */}
          <View style={styles.pocTwoColRow}>
            {/* POC Name */}
            <View style={styles.pocCol}>
              <Text style={styles.fieldLabel}>POC Name</Text>
              <View style={styles.iconInputBox}>
                <TextInput
                  style={styles.iconInputField}
                  placeholder="Contact person name"
                  placeholderTextColor="#8B8498"
                  value={pocName}
                  onChangeText={setPocName}
                />
              </View>
            </View>

            {/* POC Number */}
            <View style={styles.pocCol}>
              <Text style={styles.fieldLabel}>POC No.</Text>
              <View style={styles.iconInputBox}>
                <TextInput
                  style={styles.iconInputField}
                  placeholder="Mobile number"
                  placeholderTextColor="#8B8498"
                  keyboardType="phone-pad"
                  value={pocNo}
                  onChangeText={setPocNo}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Box (SVG lines 82-87) */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelPress}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitPress}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Submit Request  →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.submitFootnote}>
          Submit sends the requisition to Admin for review.
        </Text>
      </ScrollView>

      {/* EVENT PICKER MODAL */}
      <Modal
        visible={eventModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEventModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Event</Text>
                <Text style={styles.modalSubtitle}>
                  Choose the active or upcoming event for this request
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEventModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#372064" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={17} color="#8B8498" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search event code, title, or venue..."
                placeholderTextColor="#8B8498"
                value={eventSearch}
                onChangeText={setEventSearch}
                autoFocus={false}
              />
              {eventSearch.length > 0 && (
                <TouchableOpacity onPress={() => setEventSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#8B8498" />
                </TouchableOpacity>
              )}
            </View>

            {/* Events List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
            >
              {filteredEvents.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Text style={styles.modalEmptyText}>No matching events found</Text>
                </View>
              ) : (
                filteredEvents.map((ev) => (
                  <TouchableOpacity
                    key={ev.id || ev.code}
                    style={[
                      styles.eventCardItem,
                      selectedEvent?.id === ev.id && styles.eventCardItemSelected,
                    ]}
                    onPress={() => handleSelectEvent(ev)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventCardTop}>
                      <View style={styles.eventCodePill}>
                        <Text style={styles.eventCodePillText}>{ev.code}</Text>
                      </View>
                      <View style={styles.eventStatusBadge}>
                        <Text style={styles.eventStatusText}>{ev.status || 'Active'}</Text>
                      </View>
                    </View>

                    <Text style={styles.eventNameText}>{ev.name}</Text>

                    <View style={styles.eventMetaRow}>
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="location-outline" size={13} color="#625A72" />
                        <Text style={styles.eventMetaText}>{ev.venue}</Text>
                      </View>
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="calendar-outline" size={13} color="#625A72" />
                        <Text style={styles.eventMetaText}>{ev.dates}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PRODUCT PICKER MODAL */}
      <Modal
        visible={productModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProductModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Product</Text>
                <Text style={styles.modalSubtitle}>
                  Pick an inventory item to add to your requirement list
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProductModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#372064" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={17} color="#8B8498" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by product name, SKU, or category..."
                placeholderTextColor="#8B8498"
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {productSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#8B8498" />
                </TouchableOpacity>
              )}
            </View>

            {/* Products List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
            >
              {filteredProducts.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Text style={styles.modalEmptyText}>No catalog products found</Text>
                </View>
              ) : (
                filteredProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.productCardItem}
                    onPress={() => handleSelectProduct(p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productCardLeft}>
                      <Text style={styles.productCardName}>{p.name}</Text>
                      <View style={styles.productCardMetaRow}>
                        <Text style={styles.productCardSku}>{p.sku}</Text>
                        <Text style={styles.productCardDot}>•</Text>
                        <Text style={styles.productCardCat}>{p.category}</Text>
                        <Text style={styles.productCardDot}>•</Text>
                        <Text style={styles.productCardUom}>{p.uom}</Text>
                      </View>
                    </View>

                    <View style={styles.productCardRight}>
                      <View style={styles.availStockBadge}>
                        <Text style={styles.availStockText}>
                          Avail: {p.availableQty ?? 0}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color="#8B8498" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SUCCESS CONFIRMATION MODAL */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={54} color="#6D43C0" />
            </View>

            <Text style={styles.successModalTitle}>Request Submitted!</Text>
            <Text style={styles.successModalSub}>
              Requisition sent to Admin for stock allocation & review.
            </Text>

            {submittedReq && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Requisition ID:</Text>
                  <Text style={styles.summaryValHighlight}>{submittedReq.id}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Event:</Text>
                  <Text style={styles.summaryVal}>{submittedReq.eventName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Required Date:</Text>
                  <Text style={styles.summaryVal}>{submittedReq.requiredDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryVal}>{submittedReq.items?.length || 0} product(s)</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <View style={styles.statusPillPending}>
                    <Text style={styles.statusPillPendingText}>Pending Admin Review</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successPrimaryBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setSuccessModalVisible(false);
                  resetForm();
                  if (onNavigateTab) {
                    onNavigateTab('my-requisitions');
                  }
                }}
              >
                <Text style={styles.successPrimaryBtnText}>View in My Requisitions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successSecondaryBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setSuccessModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.successSecondaryBtnText}>Raise Another Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Universal Calendar Modal */}
      <CommonCalendarModal
        visible={calendarTarget !== null}
        onClose={() => setCalendarTarget(null)}
        selectedDate={calendarTarget === 'eventDate' ? eventDate : requiredDate}
        onSelectDate={(formatted) => {
          if (calendarTarget === 'eventDate') {
            setEventDate(formatted);
          } else if (calendarTarget === 'requiredDate') {
            setRequiredDate(formatted);
          }
        }}
        format="SPACED_SLASH"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },

  // --- Header on White Area ---
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1435',
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
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#706984',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#706584',
    fontSize: 17,
    fontWeight: '600',
    marginTop: -2,
  },

  // --- Scroll Content & Top Meta ---
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 36,
  },
  pageMetaHeader: {
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#211642',
  },
  pageSubtitle: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#625A72',
    marginTop: 3,
  },

  // --- Stepper Card (SVG lines 10-21) ---
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#6D43C0',
  },
  stepCirclePending: {
    backgroundColor: '#E9E2F5',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepNumberPending: {
    color: '#6D43C0',
  },
  stepLabel: {
    fontSize: 10.5,
  },
  stepLabelActive: {
    color: '#372064',
    fontWeight: '600',
  },
  stepLabelPending: {
    color: '#625A72',
    fontWeight: '500',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: '#D9D3E5',
    marginHorizontal: 8,
  },
  stepDividerActive: {
    backgroundColor: '#6D43C0',
  },

  // --- Common Section Card Style ---
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 9,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#211642',
  },
  sectionSubtitle: {
    fontSize: 9.5,
    fontWeight: '400',
    color: '#625A72',
    marginTop: 2,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#625A72',
    marginBottom: 5,
  },

  // Dropdown Input Box (SVG lines 26-28)
  dropdownInput: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    height: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dropdownInputText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#8B8498',
    flex: 1,
  },
  dropdownInputTextFilled: {
    color: '#211642',
    fontWeight: '600',
  },
  dropdownChevron: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D43C0',
    marginLeft: 6,
  },

  // Event Date Row
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  eventDateLabelCol: {
    width: '40%',
  },
  eventDateInputCol: {
    width: '58%',
  },
  dateInputField: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    height: 28,
    paddingHorizontal: 10,
    fontSize: 9.5,
    color: '#211642',
    fontWeight: '400',
  },

  // --- SECTION 2: Product Requirements Styles ---
  addProductBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addProductBtn: {
    backgroundColor: '#6D43C0',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  addProductBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollHintText: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#6D43C0',
  },

  // Table Structure
  tableBorderWrapper: {
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableGrid: {
    minWidth: 440,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F0ECFA',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
    height: 35,
    alignItems: 'center',
  },
  headerCellText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#372064',
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE7F3',
    height: 36,
    alignItems: 'center',
  },

  // Column Dimensions
  colCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  colProdName: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
  },
  cellProdTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colUom: {
    width: 75,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
  },
  colQty: {
    width: 75,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
  },
  colAction: {
    width: 60,
    alignItems: 'center',
  },
  dataCellText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#211642',
  },
  dataCellTextPlaceholder: {
    color: '#8B8498',
  },
  dataCellTextSelected: {
    color: '#211642',
    fontWeight: '600',
  },
  qtyTextInput: {
    fontSize: 9.5,
    color: '#211642',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#E2DCED',
    borderRadius: 4,
    textAlign: 'center',
  },
  removeRowBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll Indicator Track (SVG lines 63-64)
  scrollIndicatorTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8E2F1',
    marginTop: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  scrollIndicatorThumb: {
    width: 112,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#8B6BD1',
  },
  swipeHintFooter: {
    fontSize: 8.5,
    fontWeight: '400',
    color: '#625A72',
    marginTop: 2,
  },

  // --- SECTION 3: Inventory & Delivery Details Styles ---
  iconInputBox: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  iconInputField: {
    flex: 1,
    fontSize: 9.5,
    color: '#211642',
    paddingVertical: 2,
  },
  iconInputRightBtn: {
    paddingLeft: 6,
    paddingVertical: 4,
  },
  calendarIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D43C0',
  },

  pocTwoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pocCol: {
    flex: 1,
  },

  // --- Action Buttons Box (SVG lines 82-87) ---
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 9,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  cancelBtn: {
    width: 104,
    height: 35,
    borderRadius: 7,
    backgroundColor: '#F0ECFA',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#372064',
  },
  submitBtn: {
    flex: 1,
    height: 35,
    borderRadius: 7,
    backgroundColor: '#6D43C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  submitFootnote: {
    fontSize: 9,
    fontWeight: '400',
    color: '#625A72',
    paddingHorizontal: 4,
    textAlign: 'center',
    marginBottom: 16,
  },

  // --- Modals Styles ---
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
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
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 11,
    color: '#211642',
    paddingVertical: 4,
  },
  modalEmptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 11,
    color: '#8B8498',
  },

  // Event List Item
  eventCardItem: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  eventCardItemSelected: {
    borderColor: '#6D43C0',
    backgroundColor: '#F7F3FF',
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventCodePill: {
    backgroundColor: '#EBE5F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCodePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  eventStatusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0369A1',
  },
  eventNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#211642',
    marginBottom: 6,
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 9.5,
    color: '#625A72',
  },

  // Product List Item
  productCardItem: {
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  productCardName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#211642',
  },
  productCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  productCardSku: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6D43C0',
  },
  productCardDot: {
    fontSize: 9,
    color: '#8B8498',
  },
  productCardCat: {
    fontSize: 9,
    color: '#625A72',
  },
  productCardUom: {
    fontSize: 9,
    color: '#8B8498',
  },
  productCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availStockBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  availStockText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 8,
  },
  successIconCircle: {
    marginBottom: 10,
  },
  successModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#211642',
    textAlign: 'center',
  },
  successModalSub: {
    fontSize: 10.5,
    color: '#625A72',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8F6FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#625A72',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 10,
    color: '#211642',
    fontWeight: '600',
  },
  summaryValHighlight: {
    fontSize: 10.5,
    color: '#6D43C0',
    fontWeight: '700',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillPendingText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#92400E',
  },
  successActions: {
    width: '100%',
    gap: 8,
  },
  successPrimaryBtn: {
    backgroundColor: '#6D43C0',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successSecondaryBtn: {
    backgroundColor: '#F0ECFA',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  successSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#372064',
  },
});
