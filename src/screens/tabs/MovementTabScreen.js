import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateInboundScreen from './CreateInboundScreen';
import CreateOutboundScreen from './CreateOutboundScreen';
import CreateTransferScreen from './CreateTransferScreen';
import CreateReturnScreen from './CreateReturnScreen';
import TablePagination from '../../components/TablePagination';
import CommonCalendarModal from '../../components/CommonCalendarModal';
import inboundService from '../../services/inboundService';
import movementService from '../../services/movementService';

// --- INITIAL DATASETS (Empty initial data as requested for clean testing) ---
const INITIAL_INBOUND_DATA = [];
const INITIAL_OUTBOUND_DATA = [];
const INITIAL_RETURN_DATA = [];
const INITIAL_TRANSFER_DATA = [];

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const CALENDAR_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MovementTabScreen({ session, onLogout, selectedDashboardWarehouse }) {
  // 4 Tabs: 'inbound' | 'outbound' | 'return' | 'transfer'
  const [activeTab, setActiveTab] = useState('inbound');
  const [searchQuery, setSearchQuery] = useState('');

  // Table Datasets
  const [inboundList, setInboundList] = useState(INITIAL_INBOUND_DATA);
  const [outboundList, setOutboundList] = useState(INITIAL_OUTBOUND_DATA);
  const [returnList, setReturnList] = useState(INITIAL_RETURN_DATA);
  const [transferList, setTransferList] = useState(INITIAL_TRANSFER_DATA);

  // Column-specific filter values
  const [colFilters, setColFilters] = useState({
    no: '',
    inwardType: '',
    refNo: '',
    source: '',
    platform: '',
    orderNo: '',
    destination: '',
    date: '',
    status: '',
    method: '',
  });

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Date picker modal state (October 2026 default matching screenshot)
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(9); // 0-indexed: 9 = October

  // Status picker modal state
  const [isStatusPickerVisible, setIsStatusPickerVisible] = useState(false);

  // Modal States
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedInboundForEdit, setSelectedInboundForEdit] = useState(null);
  const [selectedOutboundForEdit, setSelectedOutboundForEdit] = useState(null);
  const [selectedTransferForEdit, setSelectedTransferForEdit] = useState(null);
  const [selectedReturnForEdit, setSelectedReturnForEdit] = useState(null);
  const [isCreatingInbound, setIsCreatingInbound] = useState(false);

  // Load Inbounds from Inbound Service
  const loadInbounds = () => {
    const list = inboundService?.getInbounds?.(session?.assignedLocations || null) || [];
    setInboundList(list);
  };

  const loadMovements = () => {
    setOutboundList(movementService.getOutbounds());
    setTransferList(movementService.getTransfers());
    setReturnList(movementService.getReturns());
  };

  useEffect(() => {
    loadInbounds();
    loadMovements();
    const unsub = movementService.subscribe((data) => {
      if (data) {
        setOutboundList(data.outbounds || []);
        setTransferList(data.transfers || []);
        setReturnList(data.returns || []);
      }
    });
    return () => unsub();
  }, [session]);
  const [isCreatingOutbound, setIsCreatingOutbound] = useState(false);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);

  // New Movement Form Fields
  const [formNo, setFormNo] = useState('');
  const [formDate, setFormDate] = useState('10 Oct 2026');
  const [formRefNo, setFormRefNo] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formMethod, setFormMethod] = useState('');
  const [formStatus, setFormStatus] = useState('In Progress');

  // Action 3-dots popover state (Edit, Delete, Upload Doc)
  const [actionMenuRow, setActionMenuRow] = useState(null);

  // In-place edit state in Details Modal
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editRefNo, setEditRefNo] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDestination, setEditDestination] = useState('');

  useEffect(() => {
    if (selectedRow) {
      setEditRefNo(selectedRow.refNo || '');
      setEditSource(selectedRow.source || '');
      setEditDestination(selectedRow.destination || '');
      setIsEditingDetail(false);
    }
  }, [selectedRow?.id]);

  // Subtitle matching Figma SVGs
  const getSubtitle = () => {
    switch (activeTab) {
      case 'inbound':
        return 'Inbound movements';
      case 'outbound':
        return 'Outbound movements';
      case 'return':
        return 'Return movements';
      case 'transfer':
        return 'Transfer movements';
      default:
        return 'Inbound movements';
    }
  };

  // Active Tab Title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'inbound':
        return 'Inbound';
      case 'outbound':
        return 'Outbound';
      case 'return':
        return 'Return';
      case 'transfer':
        return 'Transfer';
      default:
        return 'Inbound';
    }
  };

  // Method column title per SVG
  const getMethodColumnTitle = () => {
    if (activeTab === 'inbound' || activeTab === 'return') {
      return 'Receiving Method';
    }
    if (activeTab === 'outbound') {
      return 'Shipping Method';
    }
    return 'Transfer Method';
  };

  // ID Column title per SVG
  const getIdColumnTitle = () => {
    switch (activeTab) {
      case 'inbound':
        return 'Inbound No.';
      case 'outbound':
        return 'Outbound No.';
      case 'return':
        return 'Return No.';
      case 'transfer':
        return 'Transfer No.';
      default:
        return 'Movement No.';
    }
  };

  // Current active dataset
  const getCurrentData = () => {
    switch (activeTab) {
      case 'inbound':
        return inboundList;
      case 'outbound':
        return outboundList;
      case 'return':
        return returnList;
      case 'transfer':
        return transferList;
      default:
        return inboundList;
    }
  };

  // Handle column header sorting
  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  // Check if any column filter is active
  const hasActiveColFilters = Object.values(colFilters).some((v) => !!v);

  // Clear all column filters
  const handleResetColFilters = () => {
    setColFilters({
      no: '',
      inwardType: '',
      refNo: '',
      source: '',
      platform: '',
      orderNo: '',
      destination: '',
      date: '',
      status: '',
      method: '',
    });
  };

  // Smart Date Matcher
  const matchDate = (recordDateStr, filterDateStr) => {
    if (!filterDateStr) return true;
    if (!recordDateStr) return false;
    const rec = recordDateStr.toLowerCase();
    const filt = filterDateStr.toLowerCase();
    if (rec.includes(filt)) return true;

    // YYYY-MM-DD format from calendar picker
    const parts = filt.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const dayNum = parseInt(parts[2], 10);
      const MONTH_ABBR = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
      ];
      const monthShort = MONTH_ABBR[monthNum - 1];
      const dayStr = String(dayNum);
      const dayPadded = String(dayNum).padStart(2, '0');

      const matchesDay = rec.includes(dayStr) || rec.includes(dayPadded);
      const matchesMonth = rec.includes(monthShort) || rec.includes(String(monthNum));
      const matchesYear = rec.includes(year);

      if (matchesDay && matchesMonth && matchesYear) return true;
    }
    return false;
  };

  // Filtered and Sorted dataset based on search, column filters, and sortColumn
  const filteredData = getCurrentData()
    .filter((item) => {
      // 1. Global top search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal =
          (item.no && item.no.toLowerCase().includes(q)) ||
          (item.inwardType && item.inwardType.toLowerCase().includes(q)) ||
          (item.refNo && item.refNo.toLowerCase().includes(q)) ||
          (item.source && item.source.toLowerCase().includes(q)) ||
          (item.platform && item.platform.toLowerCase().includes(q)) ||
          (item.orderNo && item.orderNo.toLowerCase().includes(q)) ||
          (item.destination && item.destination.toLowerCase().includes(q)) ||
          (item.method && item.method.toLowerCase().includes(q)) ||
          (item.status && item.status.toLowerCase().includes(q)) ||
          (item.date && item.date.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      // 2. Column-specific filters
      if (colFilters.no && !(item.no || '').toLowerCase().includes(colFilters.no.toLowerCase())) {
        return false;
      }
      if (colFilters.inwardType && !(item.inwardType || '').toLowerCase().includes(colFilters.inwardType.toLowerCase())) {
        return false;
      }
      if (colFilters.refNo && !(item.refNo || '').toLowerCase().includes(colFilters.refNo.toLowerCase())) {
        return false;
      }
      if (colFilters.source && !(item.source || '').toLowerCase().includes(colFilters.source.toLowerCase())) {
        return false;
      }
      if (colFilters.platform && !(item.platform || '').toLowerCase().includes(colFilters.platform.toLowerCase())) {
        return false;
      }
      if (colFilters.orderNo && !(item.orderNo || '').toLowerCase().includes(colFilters.orderNo.toLowerCase())) {
        return false;
      }
      if (colFilters.destination && !(item.destination || '').toLowerCase().includes(colFilters.destination.toLowerCase())) {
        return false;
      }
      if (colFilters.method && !(item.method || '').toLowerCase().includes(colFilters.method.toLowerCase())) {
        return false;
      }
      if (colFilters.status && !(item.status || '').toLowerCase().includes(colFilters.status.toLowerCase())) {
        return false;
      }
      if (colFilters.date && !matchDate(item.date, colFilters.date)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      if (sortColumn === 'date') {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const valA = (a[sortColumn] || '').toString().toLowerCase();
      const valB = (b[sortColumn] || '').toString().toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination State (10 items per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedData = filteredData.slice(
    (validPage - 1) * ITEMS_PER_PAGE,
    validPage * ITEMS_PER_PAGE
  );

  // Open + New Modal with prefilled defaults
  const handleOpenNewModal = () => {
    // End-to-end Create Inbound screen workflow matching Figma SVG
    if (activeTab === 'inbound') {
      setIsCreatingInbound(true);
      return;
    }
    // End-to-end Create Outbound screen workflow with Shipping Method
    if (activeTab === 'outbound') {
      setIsCreatingOutbound(true);
      return;
    }
    // End-to-end Create Transfer screen workflow with Transfer Method
    if (activeTab === 'transfer') {
      setIsCreatingTransfer(true);
      return;
    }
    // End-to-end Create Return screen workflow with Outbound No. selection
    if (activeTab === 'return') {
      setIsCreatingReturn(true);
      return;
    }

    const prefix = 'MOV';
    const randomNum = String(Math.floor(100 + Math.random() * 900));
    setFormNo(`${prefix}-2026-${randomNum}`);
    setFormDate('10 Oct 2026');
    setFormRefNo(`REF-${randomNum}`);
    setFormSource(activeTab === 'inbound' ? 'Central Supplier' : 'Warehouse A - Central');
    setFormDestination(activeTab === 'inbound' ? 'Warehouse A - Central' : 'Event Hub');
    setFormMethod(
      activeTab === 'inbound' || activeTab === 'return' ? 'Dock Receiving' : 'Dedicated Truck'
    );
    setFormStatus('In Progress');
    setIsNewModalVisible(true);
  };

  // Save new movement
  const handleSaveNewMovement = () => {
    if (!formNo.trim() || !formSource.trim() || !formDestination.trim()) {
      Alert.alert('Validation Error', 'Please enter Movement No., Source, and Destination.');
      return;
    }

    const newItem = {
      id: `${activeTab.toUpperCase()}-${Date.now()}`,
      no: formNo.trim(),
      date: formDate.trim() || '10 Oct 2026',
      refNo: formRefNo.trim() || 'REF-NEW',
      source: formSource.trim(),
      destination: formDestination.trim(),
      method: formMethod.trim() || 'Standard Delivery',
      status: formStatus || 'In Progress',
    };

    if (activeTab === 'inbound') {
      setInboundList([newItem, ...inboundList]);
    } else if (activeTab === 'outbound') {
      movementService.addOutbound(newItem);
    } else if (activeTab === 'return') {
      movementService.addReturn(newItem);
    } else {
      movementService.addTransfer(newItem);
    }

    setIsNewModalVisible(false);
  };

  // Delete row
  const handleDeleteRow = (id) => {
    if (activeTab === 'inbound') {
      setInboundList(inboundList.filter((item) => item.id !== id));
    } else if (activeTab === 'outbound') {
      movementService.deleteOutbound(id);
    } else if (activeTab === 'return') {
      movementService.deleteReturn(id);
    } else {
      movementService.deleteTransfer(id);
    }
    setSelectedRow(null);
    setActionMenuRow(null);
  };

  // Helper to ensure line items exist for putaway
  const getRowProductLines = (row) => {
    if (Array.isArray(row?.productLines) && row.productLines.length > 0) {
      return row.productLines;
    }
    if (Array.isArray(row?.items) && row.items.length > 0) {
      return row.items;
    }
    return [];
  };

  // Update record status and fields across state
  // Update record status and fields across state
  const handleUpdateRecordStatus = (id, newStatus, extraData = {}) => {
    const updater = (list) =>
      list.map((item) =>
        item.id === id ? { ...item, status: newStatus, ...extraData } : item
      );

    if (activeTab === 'inbound') {
      setInboundList(updater);
      inboundService?.updateInbound?.(id, { status: newStatus, ...extraData });
    } else if (activeTab === 'outbound') {
      setOutboundList(updater);
      movementService.updateOutbound(id, { status: newStatus, ...extraData });
    } else if (activeTab === 'return') {
      setReturnList(updater);
      movementService.updateReturn(id, { status: newStatus, ...extraData });
    } else {
      setTransferList(updater);
      movementService.updateTransfer(id, { status: newStatus, ...extraData });
    }

    setSelectedRow((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus, ...extraData } : prev
    );
  };

  // 1. Finalize Draft -> Status becomes GENERATED
  const handleFinalizeMovement = () => {
    if (!selectedRow) return;
    const lines = getRowProductLines(selectedRow);
    handleUpdateRecordStatus(selectedRow.id, 'Generated', { productLines: lines });
    Alert.alert(
      'Movement Finalized',
      `Record ${selectedRow.no} is now finalized. Status has been changed to Generated.`
    );
  };

  // 2. Save In-Place Edits
  const handleSaveDetailEdit = () => {
    if (!selectedRow) return;
    handleUpdateRecordStatus(selectedRow.id, selectedRow.status, {
      refNo: editRefNo.trim() || selectedRow.refNo,
      source: editSource.trim() || selectedRow.source,
      destination: editDestination.trim() || selectedRow.destination,
    });
    setIsEditingDetail(false);
    Alert.alert('Details Saved', 'Consignment details updated successfully.');
  };

  // 3. Putaway / Receiving Qty Change -> Status transitions:
  // - All items complete -> Completed
  // - Any item has putaway/scanned qty > 0 -> In Progress
  // - All items cleared to 0 -> Generated
  const handlePutawayQtyChange = (lineIndex, newQtyStr) => {
    if (!selectedRow) return;
    const currentLines = getRowProductLines(selectedRow);
    const parsedQty = Math.max(0, parseInt(newQtyStr, 10) || 0);

    const updatedLines = currentLines.map((line, idx) => {
      if (idx !== lineIndex) return line;
      const target = parseInt(line.expectedQty || line.receivedQty, 10) || parsedQty;
      return {
        ...line,
        expectedQty: target,
        putawayQty: parsedQty,
        remainingQty: Math.max(0, target - parsedQty),
        receivedQty: parsedQty,
      };
    });

    const allCompleted =
      updatedLines.length > 0 &&
      updatedLines.every((l) => {
        const target = parseInt(l.expectedQty || l.receivedQty, 10) || 0;
        const done = parseInt(l.putawayQty !== undefined ? l.putawayQty : l.receivedQty, 10) || 0;
        return target > 0 && done >= target;
      });

    const hasAnyPutaway = updatedLines.some((l) => {
      const done = parseInt(l.putawayQty !== undefined ? l.putawayQty : l.receivedQty, 10) || 0;
      return done > 0;
    });

    let newStatus = selectedRow.status;
    if (allCompleted) {
      newStatus = 'Completed';
    } else if (hasAnyPutaway) {
      newStatus = 'In Progress';
    } else {
      newStatus = 'Generated';
    }

    handleUpdateRecordStatus(selectedRow.id, newStatus, { productLines: updatedLines });
  };

  // Scan item increment (+1)
  const handleScanPutawayItem = (lineIndex) => {
    if (!selectedRow) return;
    const currentLines = getRowProductLines(selectedRow);
    const line = currentLines[lineIndex];
    if (!line) return;
    const cur = parseInt(line.putawayQty !== undefined ? line.putawayQty : line.receivedQty, 10) || 0;
    const max = parseInt(line.expectedQty || line.receivedQty, 10) || (cur + 1);
    const nextQty = Math.min(max, cur + 1);
    handlePutawayQtyChange(lineIndex, nextQty);
  };

  // Complete Putaway directly
  const handleCompleteAllPutaway = () => {
    if (!selectedRow) return;
    const currentLines = getRowProductLines(selectedRow);
    const updatedLines = currentLines.map((l) => {
      const target = parseInt(l.expectedQty || l.receivedQty, 10) || 1;
      return {
        ...l,
        expectedQty: target,
        putawayQty: target,
        receivedQty: target,
        remainingQty: 0,
      };
    });
    handleUpdateRecordStatus(selectedRow.id, 'COMPLETED', { productLines: updatedLines });
    Alert.alert(
      'Putaway Completed',
      `All items for Inbound ${selectedRow.no} have been received and stored. Status is now COMPLETED.`
    );
  };

  // Cancel Inbound
  const handleCancelInbound = (targetRow) => {
    const row = targetRow || selectedRow;
    if (!row) return;
    Alert.alert(
      'Cancel Inbound Record',
      `Are you sure you want to cancel Inbound ${row.no}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            handleUpdateRecordStatus(row.id, 'CANCELED');
            setActionMenuRow(null);
            Alert.alert('Inbound Canceled', `Inbound ${row.no} status has been updated to CANCELED.`);
          },
        },
      ]
    );
  };

  // Document Upload Handler
  const handleUploadDocument = (row) => {
    const target = row || selectedRow;
    if (!target) return;
    const docNames = ['Invoice_Signed_Copy.pdf', 'LR_Consignment_Docket.pdf', 'Delivery_Challan_Signed.pdf'];
    const randomDoc = docNames[Math.floor(Math.random() * docNames.length)];
    const existingDocs = target.documents || [];
    const updatedDocs = [...existingDocs, `${randomDoc} (${new Date().toLocaleDateString()})`];
    handleUpdateRecordStatus(target.id, target.status, { documents: updatedDocs });
    setActionMenuRow(null);
    Alert.alert('Document Uploaded', `Document "${randomDoc}" has been successfully attached to Inbound ${target.no}.`);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    let bg = '#F3EEFF';
    let text = '#6D43C0';

    if (s.includes('draft')) {
      bg = '#F3E8FF';
      text = '#7E22CE';
    } else if (s.includes('generated')) {
      bg = '#E0F2FE';
      text = '#0284C7';
    } else if (s.includes('progress') || s.includes('putaway')) {
      bg = '#FEF3C7';
      text = '#D97706';
    } else if (s.includes('completed') || s.includes('received')) {
      bg = '#DEF7EC';
      text = '#03543F';
    } else if (s.includes('cancel')) {
      bg = '#FDE8E8';
      text = '#9B1C1C';
    } else if (s.includes('transit') || s.includes('dispatch')) {
      bg = '#EDEBFE';
      text = '#5521B5';
    } else if (s.includes('pending')) {
      bg = '#FEF3C7';
      text = '#92400E';
    }

    let displayText = status || 'Draft';
    if (s.includes('draft')) displayText = 'Draft';
    else if (s.includes('generated')) displayText = 'Generated';
    else if (s.includes('progress') || s.includes('putaway')) displayText = 'In Progress';
    else if (s.includes('completed')) displayText = 'Completed';
    else if (s.includes('cancel')) displayText = 'Canceled';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{displayText}</Text>
      </View>
    );
  };

  if (isCreatingInbound) {
    return (
      <CreateInboundScreen
        editingInbound={selectedInboundForEdit}
        session={session}
        selectedDashboardWarehouse={selectedDashboardWarehouse}
        onCancel={() => {
          setIsCreatingInbound(false);
          setSelectedInboundForEdit(null);
        }}
        onSaveInbound={(newInbound) => {
          loadInbounds();
          setIsCreatingInbound(false);
          setSelectedInboundForEdit(null);
        }}
      />
    );
  }

  if (isCreatingOutbound) {
    return (
      <CreateOutboundScreen
        editingOutbound={selectedOutboundForEdit}
        session={session}
        selectedDashboardWarehouse={selectedDashboardWarehouse}
        onCancel={() => {
          setIsCreatingOutbound(false);
          setSelectedOutboundForEdit(null);
        }}
        onSaveOutbound={(newOutbound) => {
          movementService.addOutbound(newOutbound);
          loadMovements();
          setIsCreatingOutbound(false);
          setSelectedOutboundForEdit(null);
        }}
      />
    );
  }

  if (isCreatingTransfer) {
    return (
      <CreateTransferScreen
        editingTransfer={selectedTransferForEdit}
        session={session}
        selectedDashboardWarehouse={selectedDashboardWarehouse}
        onCancel={() => {
          setIsCreatingTransfer(false);
          setSelectedTransferForEdit(null);
        }}
        onSaveTransfer={(newTransfer) => {
          movementService.addTransfer(newTransfer);
          loadMovements();
          setIsCreatingTransfer(false);
          setSelectedTransferForEdit(null);
        }}
      />
    );
  }

  if (isCreatingReturn) {
    return (
      <CreateReturnScreen
        editingReturn={selectedReturnForEdit}
        session={session}
        onCancel={() => {
          setIsCreatingReturn(false);
          setSelectedReturnForEdit(null);
        }}
        onSaveReturn={(newReturn) => {
          movementService.addReturn(newReturn);
          loadMovements();
          setIsCreatingReturn(false);
          setSelectedReturnForEdit(null);
        }}
        outboundList={outboundList}
      />
    );
  }

  // Render Calendar Days Grid matching screenshot
  const renderCalendarDays = () => {
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay(); // 0 for Sunday
    const prevMonthDays = new Date(pickerYear, pickerMonth, 0).getDate();

    const cells = [];

    // Preceding days from previous month (dimmed)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push(
        <View key={`prev-${i}`} style={styles.calDayCell}>
          <Text style={styles.calDayTextDimmed}>{prevMonthDays - i}</Text>
        </View>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = colFilters.date === dateStr;

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[styles.calDayCell, isSelected && styles.calDayCellSelected]}
          onPress={() => {
            setColFilters((prev) => ({ ...prev, date: dateStr }));
            setIsDatePickerVisible(false);
          }}
        >
          <Text
            style={[
              styles.calDayText,
              isSelected && styles.calDayTextSelected,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    // Trailing days to fill 35 or 42 cells (dimmed)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <View key={`next-${i}`} style={styles.calDayCell}>
          <Text style={styles.calDayTextDimmed}>{i}</Text>
        </View>
      );
    }

    return cells;
  };

  return (
    <View style={styles.container}>
      {/* 1. MOVEMENT SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER) */}
      <View style={styles.whiteSubHeader}>
        <Text style={styles.subHeaderTitle}>Movement</Text>
      </View>

      <View style={styles.fixedPageContainer}>
        {/* 2. 4 TABS NAVIGATION SELECTOR (2x2 Grid) */}
        <View style={styles.tabsNavCard}>
          {/* Row 1: Inbound & Outbound */}
          <View style={styles.tabsNavRow}>
            <TouchableOpacity
              style={[
                styles.tabNavBtn,
                activeTab === 'inbound' ? styles.tabNavBtnActive : styles.tabNavBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('inbound');
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabNavText,
                  activeTab === 'inbound' ? styles.tabNavTextActive : styles.tabNavTextInactive,
                ]}
              >
                Inbound
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabNavBtn,
                activeTab === 'outbound' ? styles.tabNavBtnActive : styles.tabNavBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('outbound');
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabNavText,
                  activeTab === 'outbound' ? styles.tabNavTextActive : styles.tabNavTextInactive,
                ]}
              >
                Outbound
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Return & Transfer */}
          <View style={[styles.tabsNavRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[
                styles.tabNavBtn,
                activeTab === 'return' ? styles.tabNavBtnActive : styles.tabNavBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('return');
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabNavText,
                  activeTab === 'return' ? styles.tabNavTextActive : styles.tabNavTextInactive,
                ]}
              >
                Return
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabNavBtn,
                activeTab === 'transfer' ? styles.tabNavBtnActive : styles.tabNavBtnInactive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('transfer');
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabNavText,
                  activeTab === 'transfer' ? styles.tabNavTextActive : styles.tabNavTextInactive,
                ]}
              >
                Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. TABLE CARD CONTAINER */}
        <View style={styles.tableCardContainer}>
          {/* Card Top Title Row with + New button replacing 'Showing 1 table' */}
          <View style={styles.tableCardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.tableCardTitle}>{getTabTitle()}</Text>
              <View style={styles.tableCountPill}>
                <Text style={styles.tableCountPillText}>{filteredData.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newActionBtn}
              activeOpacity={0.85}
              onPress={handleOpenNewModal}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.newActionBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontally Scrollable Table */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.horizontalScrollWrapper}
          >
            <View style={styles.tableMainBox}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                {/* 1. Movement / Inbound No */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 130 }]}
                  onPress={() => handleSort('no')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>{getIdColumnTitle()}</Text>
                    <Ionicons
                      name={sortColumn === 'no' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'no' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 2. Date */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 105 }]}
                  onPress={() => handleSort('date')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>Date</Text>
                    <Ionicons
                      name={sortColumn === 'date' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'date' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 3. Ref No (Hidden in Inbound table per user request) */}
                {activeTab !== 'inbound' && (
                  <TouchableOpacity
                    style={[styles.tableHeaderCell, { width: 110 }]}
                    onPress={() => handleSort('refNo')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.thContentRow}>
                      <Text style={styles.tableHeaderText}>Ref No.</Text>
                      <Ionicons
                        name={sortColumn === 'refNo' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                        size={11}
                        color={sortColumn === 'refNo' ? '#6D43C0' : '#8E85A1'}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                {/* 4. Source */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 180 }]}
                  onPress={() => handleSort('source')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>Source</Text>
                    <Ionicons
                      name={sortColumn === 'source' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'source' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 5. Destination */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 180 }]}
                  onPress={() => handleSort('destination')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>Destination</Text>
                    <Ionicons
                      name={sortColumn === 'destination' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'destination' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 6. Method */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 150 }]}
                  onPress={() => handleSort('method')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>{getMethodColumnTitle()}</Text>
                    <Ionicons
                      name={sortColumn === 'method' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'method' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 7. Status */}
                <TouchableOpacity
                  style={[styles.tableHeaderCell, { width: 115, alignItems: 'center' }]}
                  onPress={() => handleSort('status')}
                  activeOpacity={0.7}
                >
                  <View style={styles.thContentRow}>
                    <Text style={styles.tableHeaderText}>Status</Text>
                    <Ionicons
                      name={sortColumn === 'status' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical-outline'}
                      size={11}
                      color={sortColumn === 'status' ? '#6D43C0' : '#8E85A1'}
                    />
                  </View>
                </TouchableOpacity>

                {/* 8. Action */}
                <View style={[styles.tableHeaderCell, { width: 80, alignItems: 'center' }]}>
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Filter Row directly underneath column headers */}
              <View style={styles.tableFilterRow}>
                {/* 1. Inbound No Filter Input */}
                <View style={[styles.tableFilterCell, { width: 130 }]}>
                  <TextInput
                    style={styles.colFilterInput}
                    placeholder="Filter No..."
                    placeholderTextColor="#A098B2"
                    value={colFilters.no}
                    onChangeText={(t) => setColFilters((prev) => ({ ...prev, no: t }))}
                  />
                </View>

                {/* 2. Date Filter Input / Picker Button */}
                <View style={[styles.tableFilterCell, { width: 105 }]}>
                  <TouchableOpacity
                    style={styles.colFilterDateBtn}
                    activeOpacity={0.8}
                    onPress={() => setIsDatePickerVisible(true)}
                  >
                    <Text
                      style={[
                        styles.colFilterDateText,
                        !colFilters.date && styles.colFilterDatePlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {colFilters.date || 'yyyy-mm-dd'}
                    </Text>
                    <Ionicons name="calendar-outline" size={12} color="#6D43C0" />
                  </TouchableOpacity>
                </View>

                {/* 3. Ref No Filter Input (Hidden in Inbound table) */}
                {activeTab !== 'inbound' && (
                  <View style={[styles.tableFilterCell, { width: 110 }]}>
                    <TextInput
                      style={styles.colFilterInput}
                      placeholder="Ref..."
                      placeholderTextColor="#A098B2"
                      value={colFilters.refNo}
                      onChangeText={(t) => setColFilters((prev) => ({ ...prev, refNo: t }))}
                    />
                  </View>
                )}

                {/* 4. Source Filter Input */}
                <View style={[styles.tableFilterCell, { width: 180 }]}>
                  <TextInput
                    style={styles.colFilterInput}
                    placeholder="Source..."
                    placeholderTextColor="#A098B2"
                    value={colFilters.source}
                    onChangeText={(t) => setColFilters((prev) => ({ ...prev, source: t }))}
                  />
                </View>

                {/* 5. Destination Filter Input */}
                <View style={[styles.tableFilterCell, { width: 180 }]}>
                  <TextInput
                    style={styles.colFilterInput}
                    placeholder="Destination..."
                    placeholderTextColor="#A098B2"
                    value={colFilters.destination}
                    onChangeText={(t) => setColFilters((prev) => ({ ...prev, destination: t }))}
                  />
                </View>

                {/* 6. Method Filter Input */}
                <View style={[styles.tableFilterCell, { width: 150 }]}>
                  <TextInput
                    style={styles.colFilterInput}
                    placeholder="Method..."
                    placeholderTextColor="#A098B2"
                    value={colFilters.method}
                    onChangeText={(t) => setColFilters((prev) => ({ ...prev, method: t }))}
                  />
                </View>

                {/* 7. Status Filter Button / Dropdown */}
                <View style={[styles.tableFilterCell, { width: 115 }]}>
                  <TouchableOpacity
                    style={styles.colFilterStatusBtn}
                    activeOpacity={0.8}
                    onPress={() => setIsStatusPickerVisible(true)}
                  >
                    <Text
                      style={[
                        styles.colFilterStatusText,
                        !colFilters.status && styles.colFilterStatusPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {colFilters.status || 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color="#6D43C0" />
                  </TouchableOpacity>
                </View>

                {/* 8. Action Cell: Clear filter if active */}
                <View style={[styles.tableFilterCell, { width: 80, alignItems: 'center' }]}>
                  {hasActiveColFilters ? (
                    <TouchableOpacity
                      style={styles.clearFilterIconBtn}
                      activeOpacity={0.7}
                      onPress={handleResetColFilters}
                    >
                      <Ionicons name="close-circle" size={17} color="#D64545" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Table Body Rows */}
              {filteredData.length === 0 ? (
                <View style={styles.emptyTableState}>
                  <MaterialCommunityIcons name="cube-outline" size={32} color="#A79FBF" />
                  <Text style={styles.emptyTableText}>No {getTabTitle()} movement records found</Text>
                </View>
              ) : (
                paginatedData.map((item, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <View
                      key={item.id || String(index)}
                      style={[
                        styles.tableDataRow,
                        isEven ? styles.tableDataRowEven : styles.tableDataRowOdd,
                      ]}
                    >
                      {/* 1. Movement No */}
                      <View style={[styles.tableDataCell, { width: 130 }]}>
                        <TouchableOpacity onPress={() => {
                          if (activeTab === 'inbound') {
                            setSelectedInboundForEdit(item);
                            setIsCreatingInbound(true);
                          } else {
                            setSelectedRow(item);
                          }
                        }}>
                          <Text style={[styles.cellNoText, (activeTab === 'inbound' || (item.no && item.no.startsWith('INB'))) && styles.cellNoTextBlue]}>
                            {item.no}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* 2. Date */}
                      <View style={[styles.tableDataCell, { width: 105 }]}>
                        <Text style={styles.cellDateText}>{item.date}</Text>
                      </View>

                      {/* 3. Ref No (Hidden in Inbound table) */}
                      {activeTab !== 'inbound' && (
                        <View style={[styles.tableDataCell, { width: 110 }]}>
                          <View style={styles.refBadge}>
                            <Text style={styles.refBadgeText}>{item.refNo}</Text>
                          </View>
                        </View>
                      )}

                      {/* 4. Source */}
                      <View style={[styles.tableDataCell, { width: 180 }]}>
                        <Text style={styles.cellTextPrimary} numberOfLines={1}>
                          {item.source}
                        </Text>
                      </View>

                      {/* 5. Destination */}
                      <View style={[styles.tableDataCell, { width: 180 }]}>
                        <Text style={styles.cellTextPrimary} numberOfLines={1}>
                          {item.destination}
                        </Text>
                      </View>

                      {/* 6. Method */}
                      <View style={[styles.tableDataCell, { width: 150 }]}>
                        <View style={styles.methodTag}>
                          <Ionicons name="paper-plane-outline" size={11} color="#6D43C0" style={{ marginRight: 4 }} />
                          <Text style={styles.methodTagText} numberOfLines={1}>
                            {item.method}
                          </Text>
                        </View>
                      </View>

                      {/* 7. Status */}
                      <View style={[styles.tableDataCell, { width: 115, alignItems: 'center' }]}>
                        {renderStatusBadge(item.status)}
                      </View>

                      {/* 8. Action */}
                      <View style={[styles.tableDataCell, { width: 80, alignItems: 'center' }]}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          activeOpacity={0.7}
                          onPress={() => setActionMenuRow(item)}
                        >
                          <Ionicons name="ellipsis-vertical" size={16} color="#6D43C0" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Table Footer: Swipe indicator + Pagination on bottom right */}
          <View style={styles.tableFooterSection}>
            <View style={styles.swipeIndicatorRow}>
              <View style={styles.swipeBarTrack}>
                <View style={styles.swipeBarThumb} />
              </View>
              <View style={styles.swipeGuideRow}>
                <Ionicons name="swap-horizontal" size={12} color="#6D43C0" style={{ marginRight: 4 }} />
                <Text style={styles.swipeGuideText}>
                  Swipe table horizontally to see all columns ⇆
                </Text>
              </View>
            </View>

            <TablePagination
              currentPage={validPage}
              totalItems={filteredData.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              primaryColor="#6D43C0"
            />
          </View>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 6. MODAL: CREATE NEW MOVEMENT                             */}
      {/* ========================================================= */}
      <Modal
        visible={isNewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>+ New {getTabTitle()} Record</Text>
                <Text style={styles.modalSubTitle}>Enter shipment logistics & destination</Text>
              </View>
              <TouchableOpacity onPress={() => setIsNewModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#8B8498" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              <Text style={styles.formLabel}>{getIdColumnTitle()}</Text>
              <TextInput
                style={styles.formInput}
                value={formNo}
                onChangeText={setFormNo}
                placeholder="e.g. INB-2026-009"
              />

              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="10 Oct 2026"
              />

              <Text style={styles.formLabel}>Ref No.</Text>
              <TextInput
                style={styles.formInput}
                value={formRefNo}
                onChangeText={setFormRefNo}
                placeholder="e.g. PO-88210 / SO-99130"
              />

              <Text style={styles.formLabel}>Source</Text>
              <TextInput
                style={styles.formInput}
                value={formSource}
                onChangeText={setFormSource}
                placeholder="Origin location or supplier"
              />

              <Text style={styles.formLabel}>Destination</Text>
              <TextInput
                style={styles.formInput}
                value={formDestination}
                onChangeText={setFormDestination}
                placeholder="Receiving hub or event site"
              />

              <Text style={styles.formLabel}>{getMethodColumnTitle()}</Text>
              <TextInput
                style={styles.formInput}
                value={formMethod}
                onChangeText={setFormMethod}
                placeholder="e.g. Dock Receiving / Dedicated Truck"
              />

              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusChipsRow}>
                {['Pending', 'In Progress', 'In Transit', 'Received', 'Completed'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusChip,
                      formStatus === st && styles.statusChipActive,
                    ]}
                    onPress={() => setFormStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        formStatus === st && styles.statusChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsNewModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveNewMovement}
              >
                <Text style={styles.modalSaveBtnText}>Save Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 7. MODAL: ROW DETAILS & FULL INBOUND WORKFLOW             */}
      {/* ========================================================= */}
      <Modal
        visible={!!selectedRow}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setSelectedRow(null);
          setIsEditingDetail(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {/* Header: Title, Subtitle, and Top Right Actions (Edit, Finalize, Close) */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.modalTitle}>{selectedRow?.no}</Text>
                  {selectedRow?.status && (
                    <View style={{ marginLeft: 8 }}>
                      {renderStatusBadge(selectedRow.status)}
                    </View>
                  )}
                </View>
                <Text style={styles.modalSubTitle}>{getTabTitle()} Movement Consignment</Text>
              </View>

              <View style={styles.detailHeaderActionsRow}>
                {/* 1st Button: Edit / Save Button (Active for DRAFT status or when editing) */}
                {(selectedRow?.status?.toUpperCase() === 'DRAFT' || isEditingDetail) && (
                  <TouchableOpacity
                    style={[
                      styles.detailHeaderActionBtn,
                      isEditingDetail ? styles.detailHeaderBtnSave : styles.detailHeaderBtnEdit,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isEditingDetail) {
                        handleSaveDetailEdit();
                      } else {
                        setIsEditingDetail(true);
                      }
                    }}
                  >
                    <Ionicons
                      name={isEditingDetail ? 'checkmark-circle' : 'pencil'}
                      size={13}
                      color={isEditingDetail ? '#FFFFFF' : '#6D43C0'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.detailHeaderActionBtnText,
                        isEditingDetail ? { color: '#FFFFFF' } : { color: '#6D43C0' },
                      ]}
                    >
                      {isEditingDetail ? 'Save' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 2nd Button: Finalize Button (Promotes DRAFT to GENERATED) */}
                {selectedRow?.status?.toUpperCase() === 'DRAFT' && !isEditingDetail && (
                  <TouchableOpacity
                    style={styles.detailHeaderBtnFinalize}
                    activeOpacity={0.8}
                    onPress={handleFinalizeMovement}
                  >
                    <Ionicons name="paper-plane" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.detailHeaderBtnFinalizeText}>Finalize</Text>
                  </TouchableOpacity>
                )}

                {/* Close X */}
                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 4 }}
                  onPress={() => {
                    setSelectedRow(null);
                    setIsEditingDetail(false);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#8B8498" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {selectedRow ? (
                <>
                  {/* Basic Consignment Details (View or Edit Mode) */}
                  <View style={styles.detailFieldsBox}>
                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{selectedRow.date}</Text>
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>Reference No:</Text>
                      {isEditingDetail ? (
                        <TextInput
                          style={styles.detailInlineInput}
                          value={editRefNo}
                          onChangeText={setEditRefNo}
                          placeholder="Ref No..."
                        />
                      ) : (
                        <Text style={styles.detailValue}>{selectedRow.refNo}</Text>
                      )}
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>Source:</Text>
                      {isEditingDetail ? (
                        <TextInput
                          style={styles.detailInlineInput}
                          value={editSource}
                          onChangeText={setEditSource}
                          placeholder="Source..."
                        />
                      ) : (
                        <Text style={styles.detailValue}>{selectedRow.source}</Text>
                      )}
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>Destination:</Text>
                      {isEditingDetail ? (
                        <TextInput
                          style={styles.detailInlineInput}
                          value={editDestination}
                          onChangeText={setEditDestination}
                          placeholder="Destination..."
                        />
                      ) : (
                        <Text style={styles.detailValue}>{selectedRow.destination}</Text>
                      )}
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>{getMethodColumnTitle()}:</Text>
                      <Text style={styles.detailValue}>{selectedRow.method}</Text>
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      {renderStatusBadge(selectedRow.status)}
                    </View>
                  </View>

                  {/* Putaway & Receiving Line Items Section */}
                  <View style={styles.putawaySectionBox}>
                    <View style={styles.putawaySectionHeaderRow}>
                      <View>
                        <Text style={styles.putawaySectionTitle}>Putaway & Receiving Items</Text>
                        <Text style={styles.putawaySectionSubtitle}>
                          Input received qty or scan barcode to advance to Putaway
                        </Text>
                      </View>
                      {(selectedRow.status?.toUpperCase() === 'IN PROGRESS' || selectedRow.status?.toUpperCase() === 'PUTAWAY') && (
                        <TouchableOpacity
                          style={styles.completePutawayQuickBtn}
                          onPress={handleCompleteAllPutaway}
                        >
                          <Ionicons name="checkmark-done-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.completePutawayQuickText}>Complete All</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {getRowProductLines(selectedRow).length === 0 ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                          No product lines found for this inbound record.
                        </Text>
                      </View>
                    ) : (
                      getRowProductLines(selectedRow).map((line, idx) => {
                        const targetQty = parseInt(line.expectedQty || line.receivedQty, 10) || 0;
                        const curPutaway = parseInt(line.putawayQty !== undefined ? line.putawayQty : line.receivedQty, 10) || 0;
                        const isLineComplete = targetQty > 0 && curPutaway >= targetQty;
                        return (
                          <View key={line.id || idx} style={styles.putawayItemCard}>
                            <View style={styles.putawayItemTopRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.putawayItemName} numberOfLines={1}>
                                  {idx + 1}. {line.productName}
                                </Text>
                                <Text style={styles.putawayItemSku}>
                                  SKU: {line.sku || 'N/A'} • Expected: {targetQty} {line.uom || ''}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.putawayLineStatusBadge,
                                  isLineComplete
                                    ? styles.putawayLineStatusComplete
                                    : styles.putawayLineStatusPending,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.putawayLineStatusText,
                                    isLineComplete ? { color: '#03543F' } : { color: '#D97706' },
                                  ]}
                                >
                                  {curPutaway} / {targetQty}
                                </Text>
                              </View>
                            </View>

                            {/* Stepper Input & Scan Controls */}
                            <View style={styles.putawayControlsRow}>
                              <View style={styles.putawayStepperBox}>
                                <TouchableOpacity
                                  style={styles.putawayStepBtn}
                                  onPress={() => {
                                    handlePutawayQtyChange(idx, Math.max(0, curPutaway - 1));
                                  }}
                                >
                                  <Ionicons name="remove" size={16} color="#6D43C0" />
                                </TouchableOpacity>

                                <TextInput
                                  style={styles.putawayQtyInput}
                                  keyboardType="number-pad"
                                  value={String(curPutaway)}
                                  onChangeText={(text) => handlePutawayQtyChange(idx, text)}
                                  selectTextOnFocus={true}
                                />

                                <TouchableOpacity
                                  style={styles.putawayStepBtn}
                                  onPress={() => {
                                    handlePutawayQtyChange(idx, curPutaway + 1);
                                  }}
                                >
                                  <Ionicons name="add" size={16} color="#6D43C0" />
                                </TouchableOpacity>
                              </View>

                              {/* Scan +1 Barcode Button */}
                              <TouchableOpacity
                                style={styles.scanAddBtn}
                                activeOpacity={0.8}
                                onPress={() => handleScanPutawayItem(idx)}
                              >
                                <Ionicons name="barcode-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.scanAddBtnText}>Scan +1</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Documents Section */}
                  <View style={styles.docsSectionBox}>
                    <View style={styles.docsSectionHeaderRow}>
                      <Text style={styles.docsSectionTitle}>Attached Documents</Text>
                      <TouchableOpacity
                        style={styles.uploadDocSmallBtn}
                        activeOpacity={0.8}
                        onPress={() => handleUploadDocument(selectedRow)}
                      >
                        <Ionicons name="cloud-upload-outline" size={13} color="#0D9488" style={{ marginRight: 4 }} />
                        <Text style={styles.uploadDocSmallText}>+ Upload Doc</Text>
                      </TouchableOpacity>
                    </View>

                    {selectedRow.documents && selectedRow.documents.length > 0 ? (
                      selectedRow.documents.map((doc, dIdx) => (
                        <View key={dIdx} style={styles.docItemRow}>
                          <Ionicons name="document-text-outline" size={15} color="#6D43C0" style={{ marginRight: 6 }} />
                          <Text style={styles.docItemText} numberOfLines={1}>{doc}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDocsText}>No documents attached yet.</Text>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>

            {/* Bottom Actions Row */}
            <View style={styles.detailActionButtonsRow}>
              {selectedRow?.status?.toUpperCase() === 'DRAFT' && (
                <TouchableOpacity
                  style={styles.deleteRowBtn}
                  onPress={() => {
                    if (selectedRow) {
                      handleDeleteRow(selectedRow.id);
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
                  <Text style={styles.deleteRowBtnText}>Delete Draft</Text>
                </TouchableOpacity>
              )}

              {selectedRow?.status?.toUpperCase() === 'GENERATED' && (
                <TouchableOpacity
                  style={styles.deleteRowBtn}
                  onPress={() => handleCancelInbound(selectedRow)}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
                  <Text style={styles.deleteRowBtnText}>Cancel Inbound</Text>
                </TouchableOpacity>
              )}

              {(selectedRow?.status?.toUpperCase() === 'IN PROGRESS' || selectedRow?.status?.toUpperCase() === 'PUTAWAY') && (
                <TouchableOpacity
                  style={styles.completePutawayBtn}
                  onPress={handleCompleteAllPutaway}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.completePutawayBtnText}>Complete Putaway</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeDetailBtn}
                onPress={() => {
                  setSelectedRow(null);
                  setIsEditingDetail(false);
                }}
              >
                <Text style={styles.closeDetailBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 8. MODAL: 3-DOTS ACTION POPOVER (EXACT FIGMA / SCREENSHOT) */}
      {/* ========================================================= */}
      <Modal
        visible={!!actionMenuRow}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionMenuRow(null)}
      >
        <TouchableOpacity
          style={styles.actionMenuModalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuRow(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.actionMenuCard}>
            {/* DRAFT Status: 1. Edit, 2. Delete, 3. Upload Doc */}
            {actionMenuRow?.status?.toUpperCase() === 'DRAFT' && (
              <>
                {/* 1. Edit */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                  activeOpacity={0.75}
                  onPress={() => {
                    const row = actionMenuRow;
                    setActionMenuRow(null);
                    if (activeTab === 'inbound') {
                      setSelectedInboundForEdit(row);
                      setIsCreatingInbound(true);
                    } else {
                      setSelectedRow(row);
                      setIsEditingDetail(true);
                    }
                  }}
                >
                  <Ionicons name="pencil" size={18} color="#0D9488" />
                </TouchableOpacity>

                {/* 2. Delete */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleRed]}
                  activeOpacity={0.75}
                  onPress={() => {
                    const rowToDelete = actionMenuRow;
                    setActionMenuRow(null);
                    Alert.alert(
                      'Delete Record',
                      `Are you sure you want to delete ${rowToDelete.no}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            if (activeTab === 'inbound') {
                              inboundService.deleteInbound(rowToDelete.id);
                              loadInbounds();
                            } else {
                              handleDeleteRow(rowToDelete.id);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>

                {/* 3. Upload Doc */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                  activeOpacity={0.75}
                  onPress={() => handleUploadDocument(actionMenuRow)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#0D9488" />
                </TouchableOpacity>
              </>
            )}

            {/* GENERATED Status: 1. Putaway, 2. Cancel, 3. Upload Doc */}
            {actionMenuRow?.status?.toUpperCase() === 'GENERATED' && (
              <>
                {/* 1. Putaway */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleIndigo]}
                  activeOpacity={0.75}
                  onPress={() => {
                    const row = actionMenuRow;
                    setActionMenuRow(null);
                    setSelectedInboundForEdit(row);
                    setIsCreatingInbound(true);
                  }}
                >
                  <Ionicons name="cube-outline" size={18} color="#6366F1" />
                </TouchableOpacity>

                {/* 2. Cancel */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleRed]}
                  activeOpacity={0.75}
                  onPress={() => handleCancelInbound(actionMenuRow)}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                </TouchableOpacity>

                {/* 3. Upload Doc */}
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                  activeOpacity={0.75}
                  onPress={() => handleUploadDocument(actionMenuRow)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#0D9488" />
                </TouchableOpacity>
              </>
            )}

            {/* PUTAWAY Status: 1. Continue Putaway, 2. Upload Doc */}
            {actionMenuRow?.status?.toUpperCase() === 'PUTAWAY' && (
              <>
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleIndigo]}
                  activeOpacity={0.75}
                  onPress={() => {
                    const row = actionMenuRow;
                    setActionMenuRow(null);
                    setSelectedInboundForEdit(row);
                    setIsCreatingInbound(true);
                  }}
                >
                  <Ionicons name="cube-outline" size={18} color="#6366F1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                  activeOpacity={0.75}
                  onPress={() => handleUploadDocument(actionMenuRow)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#0D9488" />
                </TouchableOpacity>
              </>
            )}

            {/* COMPLETED Status: Upload Doc only */}
            {actionMenuRow?.status?.toUpperCase() === 'COMPLETED' && (
              <TouchableOpacity
                style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                activeOpacity={0.75}
                onPress={() => handleUploadDocument(actionMenuRow)}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#0D9488" />
              </TouchableOpacity>
            )}

            {/* CANCELED or other statuses: Upload Doc only */}
            {actionMenuRow?.status?.toUpperCase() !== 'DRAFT' &&
              actionMenuRow?.status?.toUpperCase() !== 'GENERATED' &&
              actionMenuRow?.status?.toUpperCase() !== 'PUTAWAY' &&
              actionMenuRow?.status?.toUpperCase() !== 'COMPLETED' && (
                <TouchableOpacity
                  style={[styles.actionMenuCircleBtn, styles.actionMenuCircleTeal]}
                  activeOpacity={0.75}
                  onPress={() => handleUploadDocument(actionMenuRow)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#0D9488" />
                </TouchableOpacity>
              )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal matching calendar UI */}
      <CommonCalendarModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        selectedDate={colFilters.date}
        allowClear={true}
        onClear={() => setColFilters((prev) => ({ ...prev, date: '' }))}
        onSelectDate={(formatted) => setColFilters((prev) => ({ ...prev, date: formatted }))}
        format="ISO"
      />

      {/* Status Picker Modal */}
      <Modal
        visible={isStatusPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsStatusPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setIsStatusPickerVisible(false)}
        >
          <View style={styles.statusPickerCard}>
            <Text style={styles.statusPickerTitle}>Filter by Status</Text>
            {(activeTab === 'inbound'
              ? ['', 'Draft', 'Generated', 'In Progress', 'Completed', 'Canceled']
              : ['', 'Pending', 'In Progress', 'Completed', 'Canceled']
            ).map((st) => (
              <TouchableOpacity
                key={st || 'all'}
                style={[
                  styles.statusPickerOption,
                  (colFilters.status || '').toLowerCase() === st.toLowerCase() && styles.statusPickerOptionActive,
                ]}
                onPress={() => {
                  setColFilters((prev) => ({ ...prev, status: st }));
                  setIsStatusPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.statusPickerOptionText,
                    (colFilters.status || '').toLowerCase() === st.toLowerCase() && styles.statusPickerOptionTextActive,
                  ]}
                >
                  {st || 'All Statuses'}
                </Text>
                {colFilters.status === st && (
                  <Ionicons name="checkmark" size={16} color="#6D43C0" />
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

  // 1. Top Navy Header matching SVG
  topHeader: {
    backgroundColor: '#160D33',
    paddingTop: 6,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
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
  headerSubtitle: {
    fontSize: 12,
    color: '#BDB6D3',
    fontWeight: '500',
  },
  headerMoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#30264B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMoreText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: -2,
  },

  // Scroll Body
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // 2. 4 Tabs Navigation Selector (2x2 Grid)
  tabsNavCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    marginBottom: 8,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabsNavRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabNavBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabNavBtnActive: {
    backgroundColor: '#6D43C0',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabNavBtnInactive: {
    backgroundColor: '#F3EEFB',
  },
  tabNavText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabNavTextActive: {
    color: '#FFFFFF',
  },
  tabNavTextInactive: {
    color: '#372064',
  },

  newActionBtn: {
    height: 32,
    backgroundColor: '#6D43C0',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  newActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Fixed Page Container (No vertical screen scroll)
  fixedPageContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // 4. Table Card Container matching SVG
  tableCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    paddingTop: 10,
    marginBottom: 4,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  tableFooterSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0ECFA',
    paddingTop: 4,
  },
  tableCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#211642',
  },
  tableCountPill: {
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tableCountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D43C0',
  },
  tableCardSubTag: {
    fontSize: 10.5,
    color: '#6D43C0',
    fontWeight: '600',
  },

  // Horizontal Scroll Wrapper
  horizontalScrollWrapper: {
    paddingHorizontal: 12,
  },
  tableMainBox: {
    borderWidth: 1,
    borderColor: '#D9D3E5',
    borderRadius: 6,
    overflow: 'hidden',
  },

  // Table Header Row matching SVG
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

  // Table Body Data Row matching SVG
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
  tableDataCell: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  cellNoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#372064',
  },
  cellNoTextBlue: {
    color: '#2563EB',
    fontWeight: '700',
  },
  cellDateText: {
    fontSize: 10.5,
    color: '#625A72',
  },
  refBadge: {
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  refBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6D43C0',
  },
  cellTextPrimary: {
    fontSize: 11,
    color: '#211642',
    fontWeight: '600',
  },
  methodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FC',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  methodTagText: {
    fontSize: 10,
    color: '#533785',
    fontWeight: '600',
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Action Button
  actionIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDotsText: {
    fontSize: 16,
    color: '#6D43C0',
    fontWeight: '800',
  },

  // Empty State
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

  // Swipe Indicator matching SVG
  swipeIndicatorRow: {
    marginTop: 6,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  swipeBarTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E8E2F1',
    overflow: 'hidden',
  },
  swipeBarThumb: {
    width: '32%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#8B6BD1',
  },
  swipeGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  swipeGuideText: {
    fontSize: 9.5,
    color: '#625A72',
    fontWeight: '600',
  },

  // 5. Tip Card matching SVG
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    padding: 14,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#211642',
  },
  tipDescription: {
    fontSize: 10.5,
    color: '#625A72',
    lineHeight: 15,
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 16, 47, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    maxHeight: '85%',
  },
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFA',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#211642',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#706584',
    marginTop: 2,
  },
  modalFormScroll: {
    maxHeight: 340,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#372064',
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#211642',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F0ECFA',
  },
  statusChipActive: {
    backgroundColor: '#6D43C0',
  },
  statusChipText: {
    fontSize: 10,
    color: '#372064',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0ECFA',
    paddingTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0ECFA',
  },
  modalCancelBtnText: {
    color: '#625A72',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#6D43C0',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Detail Modal
  detailFieldsBox: {
    backgroundColor: '#FAF8FE',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#706584',
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#211642',
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  deleteRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteRowBtnText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
  },
  closeDetailBtn: {
    backgroundColor: '#6D43C0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Table Filter Row & Inputs
  thContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF8FD',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D3E5',
    paddingVertical: 5,
  },
  tableFilterCell: {
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#D9D3E5',
    justifyContent: 'center',
  },
  colFilterInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CEE2',
    borderRadius: 5,
    height: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10.5,
    color: '#211642',
  },
  colFilterDateBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CEE2',
    borderRadius: 5,
    height: 28,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colFilterDateText: {
    fontSize: 10,
    color: '#211642',
    flex: 1,
  },
  colFilterDatePlaceholder: {
    color: '#9E96AF',
  },
  colFilterStatusBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CEE2',
    borderRadius: 5,
    height: 28,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colFilterStatusText: {
    fontSize: 10.5,
    color: '#211642',
    flex: 1,
  },
  colFilterStatusPlaceholder: {
    color: '#9E96AF',
  },
  clearFilterIconBtn: {
    padding: 3,
  },

  // Date Picker Modal (Calendar)
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: 320,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5DFF0',
  },
  calHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calMonthYearTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calMonthYearTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#211642',
  },
  calNavArrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EEFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayNamesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calDayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  calDayNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#706584',
  },
  calGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  calDayCellSelected: {
    backgroundColor: '#6D43C0',
  },
  calDayText: {
    fontSize: 12,
    color: '#211642',
    fontWeight: '600',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calDayTextDimmed: {
    fontSize: 12,
    color: '#C7C1D4',
  },
  calFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0ECFA',
  },
  calFooterClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D64545',
  },
  calFooterTodayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D43C0',
  },

  // Status Picker Modal
  statusPickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: 270,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5DFF0',
  },
  statusPickerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#211642',
    marginBottom: 10,
  },
  statusPickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusPickerOptionActive: {
    backgroundColor: '#F3EEFB',
  },
  statusPickerOptionText: {
    fontSize: 12,
    color: '#372064',
    fontWeight: '600',
  },
  statusPickerOptionTextActive: {
    color: '#6D43C0',
    fontWeight: '800',
  },

  // Action Menu 3-Dots Popup Styles (Exact Figma / Screenshot)
  actionMenuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 16, 47, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E6E0F0',
    minWidth: 70,
  },
  actionMenuCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  actionMenuCircleTeal: {
    backgroundColor: '#EDF8F9',
  },
  actionMenuCircleRed: {
    backgroundColor: '#FEE2E2',
  },

  // Detail Modal Top Header Actions
  detailHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailHeaderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailHeaderBtnEdit: {
    backgroundColor: '#F3EEFB',
    borderWidth: 1,
    borderColor: '#D4C9EC',
  },
  detailHeaderBtnSave: {
    backgroundColor: '#059669',
  },
  detailHeaderActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailHeaderBtnFinalize: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailHeaderBtnFinalizeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailInlineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7BDDE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11.5,
    color: '#211642',
    minWidth: 140,
    textAlign: 'right',
  },

  // Putaway section styles
  putawaySectionBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE9F4',
  },
  putawaySectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  putawaySectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#211642',
  },
  putawaySectionSubtitle: {
    fontSize: 10,
    color: '#7B728D',
    marginTop: 1,
  },
  completePutawayQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completePutawayQuickText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  putawayItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  putawayItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  putawayItemName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#211642',
  },
  putawayItemSku: {
    fontSize: 10,
    color: '#7B728D',
    marginTop: 2,
  },
  putawayLineStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  putawayLineStatusComplete: {
    backgroundColor: '#DEF7EC',
  },
  putawayLineStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  putawayLineStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  putawayControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  putawayStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6EC',
    overflow: 'hidden',
  },
  putawayStepBtn: {
    width: 32,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBE6F6',
  },
  putawayQtyInput: {
    width: 44,
    height: 30,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#211642',
    padding: 0,
    backgroundColor: '#FFFFFF',
  },
  scanAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scanAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Document attachments
  docsSectionBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDE9F4',
  },
  docsSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  docsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#211642',
  },
  uploadDocSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF8F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7EDEE',
  },
  uploadDocSmallText: {
    color: '#0D9488',
    fontSize: 10,
    fontWeight: '700',
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  docItemText: {
    fontSize: 11,
    color: '#372064',
    flex: 1,
  },
  noDocsText: {
    fontSize: 10.5,
    color: '#A098B2',
    fontStyle: 'italic',
  },
  completePutawayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completePutawayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
