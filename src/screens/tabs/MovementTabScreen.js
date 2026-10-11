import React, { useState } from 'react';
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

// --- MOCK INITIAL DATASETS MATCHING DISTRICT STOCK OPERATIONS ---
const INITIAL_INBOUND_DATA = [
  {
    id: 'INB-001',
    no: 'INB-2026-001',
    date: '10 Oct 2026',
    refNo: 'PO-88201',
    source: 'SoundPro India (Vendor)',
    destination: 'Warehouse A - Central',
    method: 'Dock Receiving',
    status: 'Received',
  },
  {
    id: 'INB-002',
    no: 'INB-2026-002',
    date: '10 Oct 2026',
    refNo: 'PO-88205',
    source: 'District Stage Fabricators',
    destination: 'Warehouse B - West',
    method: 'Dedicated Truck',
    status: 'In Progress',
  },
  {
    id: 'INB-003',
    no: 'INB-2026-003',
    date: '09 Oct 2026',
    refNo: 'PO-88190',
    source: 'BrightLite Stage Systems',
    destination: 'Warehouse A - Central',
    method: 'Express Cargo',
    status: 'Received',
  },
  {
    id: 'INB-004',
    no: 'INB-2026-004',
    date: '08 Oct 2026',
    refNo: 'PO-88174',
    source: 'Apex Cable Works',
    destination: 'JLN Stadium Store',
    method: 'Local Delivery Van',
    status: 'Pending',
  },
  {
    id: 'INB-005',
    no: 'INB-2026-005',
    date: '07 Oct 2026',
    refNo: 'PO-88150',
    source: 'Global Truss & Rigging',
    destination: 'Warehouse A - Central',
    method: 'Container Freight',
    status: 'Received',
  },
];

const INITIAL_OUTBOUND_DATA = [
  {
    id: 'OUT-001',
    no: 'OUT-2026-001',
    date: '10 Oct 2026',
    refNo: 'SO-99120',
    source: 'Warehouse A - Central',
    destination: 'Jio Garden - City Music Fest',
    method: 'Dedicated Truck',
    status: 'Dispatched',
  },
  {
    id: 'OUT-002',
    no: 'OUT-2026-002',
    date: '10 Oct 2026',
    refNo: 'SO-99124',
    source: 'Warehouse B - West',
    destination: 'Hyatt Regency - Brand Launch',
    method: 'Express Van',
    status: 'In Transit',
  },
  {
    id: 'OUT-003',
    no: 'OUT-2026-003',
    date: '09 Oct 2026',
    refNo: 'SO-99105',
    source: 'Warehouse A - Central',
    destination: 'JLN Stadium Arena',
    method: 'Heavy Hauler',
    status: 'Completed',
  },
  {
    id: 'OUT-004',
    no: 'OUT-2026-004',
    date: '08 Oct 2026',
    refNo: 'SO-99088',
    source: 'JLN Stadium Store',
    destination: 'Arena Club Event B',
    method: 'Direct Delivery',
    status: 'Completed',
  },
  {
    id: 'OUT-005',
    no: 'OUT-2026-005',
    date: '07 Oct 2026',
    refNo: 'SO-99071',
    source: 'Warehouse A - Central',
    destination: 'Pune Tech Summit',
    method: 'Interstate Freight',
    status: 'Completed',
  },
];

const INITIAL_RETURN_DATA = [
  {
    id: 'RET-001',
    no: 'RET-2026-001',
    date: '10 Oct 2026',
    refNo: 'RN-33101',
    source: 'Jio Garden - Music Fest Day 1',
    destination: 'Warehouse A - Central',
    method: 'Return Van',
    status: 'Inspected',
  },
  {
    id: 'RET-002',
    no: 'RET-2026-002',
    date: '09 Oct 2026',
    refNo: 'RN-33095',
    source: 'Pune Hyatt Staging Site',
    destination: 'Warehouse B - West',
    method: 'Dedicated Truck',
    status: 'Quarantined',
  },
  {
    id: 'RET-003',
    no: 'RET-2026-003',
    date: '09 Oct 2026',
    refNo: 'RN-33088',
    source: 'JLN Stadium Pavilion',
    destination: 'Warehouse A - Central',
    method: 'Dock Receiving',
    status: 'Completed',
  },
  {
    id: 'RET-004',
    no: 'RET-2026-004',
    date: '08 Oct 2026',
    refNo: 'RN-33070',
    source: 'Goa Arena Beach Site',
    destination: 'Vagator Beach Store',
    method: 'Local Pickup',
    status: 'Completed',
  },
  {
    id: 'RET-005',
    no: 'RET-2026-005',
    date: '07 Oct 2026',
    refNo: 'RN-33055',
    source: 'Mumbai Exhibition Centre',
    destination: 'Warehouse A - Central',
    method: 'Return Logistics',
    status: 'Completed',
  },
];

const INITIAL_TRANSFER_DATA = [
  {
    id: 'TRF-001',
    no: 'TRF-2026-001',
    date: '10 Oct 2026',
    refNo: 'TO-55201',
    source: 'Warehouse A - Central',
    destination: 'Warehouse B - West Hub',
    method: 'Inter-warehouse Fleet',
    status: 'In Transit',
  },
  {
    id: 'TRF-002',
    no: 'TRF-2026-002',
    date: '10 Oct 2026',
    refNo: 'TO-55208',
    source: 'Warehouse B - West Hub',
    destination: 'JLN Stadium Store',
    method: 'Express Van Transfer',
    status: 'Dispatched',
  },
  {
    id: 'TRF-003',
    no: 'TRF-2026-003',
    date: '09 Oct 2026',
    refNo: 'TO-55190',
    source: 'Warehouse A - Central',
    destination: 'Vagator Beach Store',
    method: 'Long-haul Container',
    status: 'Completed',
  },
  {
    id: 'TRF-004',
    no: 'TRF-2026-004',
    date: '08 Oct 2026',
    refNo: 'TO-55175',
    source: 'JLN Stadium Store',
    destination: 'Warehouse A - Central',
    method: 'Internal Transport',
    status: 'Completed',
  },
  {
    id: 'TRF-005',
    no: 'TRF-2026-005',
    date: '07 Oct 2026',
    refNo: 'TO-55160',
    source: 'Warehouse B - West Hub',
    destination: 'Warehouse A - Central',
    method: 'Scheduled Transfer',
    status: 'Completed',
  },
];

export default function MovementTabScreen({ session, onLogout }) {
  // 4 Tabs: 'inbound' | 'outbound' | 'return' | 'transfer'
  const [activeTab, setActiveTab] = useState('inbound');
  const [searchQuery, setSearchQuery] = useState('');

  // Table Datasets
  const [inboundList, setInboundList] = useState(INITIAL_INBOUND_DATA);
  const [outboundList, setOutboundList] = useState(INITIAL_OUTBOUND_DATA);
  const [returnList, setReturnList] = useState(INITIAL_RETURN_DATA);
  const [transferList, setTransferList] = useState(INITIAL_TRANSFER_DATA);

  // Modal States
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCreatingInbound, setIsCreatingInbound] = useState(false);
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

  // Filtered dataset based on search
  const filteredData = getCurrentData().filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.no && item.no.toLowerCase().includes(q)) ||
      (item.refNo && item.refNo.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      (item.destination && item.destination.toLowerCase().includes(q)) ||
      (item.method && item.method.toLowerCase().includes(q)) ||
      (item.status && item.status.toLowerCase().includes(q))
    );
  });

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
      setOutboundList([newItem, ...outboundList]);
    } else if (activeTab === 'return') {
      setReturnList([newItem, ...returnList]);
    } else {
      setTransferList([newItem, ...transferList]);
    }

    setIsNewModalVisible(false);
  };

  // Delete row
  const handleDeleteRow = (id) => {
    if (activeTab === 'inbound') {
      setInboundList(inboundList.filter((item) => item.id !== id));
    } else if (activeTab === 'outbound') {
      setOutboundList(outboundList.filter((item) => item.id !== id));
    } else if (activeTab === 'return') {
      setReturnList(returnList.filter((item) => item.id !== id));
    } else {
      setTransferList(transferList.filter((item) => item.id !== id));
    }
    setSelectedRow(null);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let bg = '#F3EEFF';
    let text = '#6D43C0';

    if (s.includes('draft')) {
      bg = '#F0ECFA';
      text = '#6D43C0';
    } else if (s.includes('received') || s.includes('completed') || s.includes('inspected')) {
      bg = '#DEF7EC';
      text = '#03543F';
    } else if (s.includes('transit') || s.includes('dispatch') || s.includes('progress')) {
      bg = '#EDEBFE';
      text = '#5521B5';
    } else if (s.includes('pending')) {
      bg = '#FEF3C7';
      text = '#92400E';
    } else if (s.includes('quarantined') || s.includes('damaged') || s.includes('cancel')) {
      bg = '#FDE8E8';
      text = '#9B1C1C';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{status}</Text>
      </View>
    );
  };

  if (isCreatingInbound) {
    return (
      <CreateInboundScreen
        onCancel={() => setIsCreatingInbound(false)}
        onSaveInbound={(newInbound) => {
          setInboundList([newInbound, ...inboundList]);
          setIsCreatingInbound(false);
        }}
      />
    );
  }

  if (isCreatingOutbound) {
    return (
      <CreateOutboundScreen
        onCancel={() => setIsCreatingOutbound(false)}
        onSaveOutbound={(newOutbound) => {
          setOutboundList([newOutbound, ...outboundList]);
          setIsCreatingOutbound(false);
        }}
      />
    );
  }

  if (isCreatingTransfer) {
    return (
      <CreateTransferScreen
        onCancel={() => setIsCreatingTransfer(false)}
        onSaveTransfer={(newTransfer) => {
          setTransferList([newTransfer, ...transferList]);
          setIsCreatingTransfer(false);
        }}
      />
    );
  }

  if (isCreatingReturn) {
    return (
      <CreateReturnScreen
        onCancel={() => setIsCreatingReturn(false)}
        onSaveReturn={(newReturn) => {
          setReturnList([newReturn, ...returnList]);
          setIsCreatingReturn(false);
        }}
        outboundList={outboundList}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. TOP NAVY HEADER matching SVG */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Movement</Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerMoreBtn}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Movement Management',
              `Role: ${session?.role || 'Admin'}\nActive Screen: ${getTabTitle()} Movement Ledger`
            );
          }}
        >
          <Text style={styles.headerMoreText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. 4 TABS NAVIGATION SELECTOR matching SVG */}
        <View style={styles.tabsNavCard}>
          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'inbound' ? styles.tabNavBtnActive : styles.tabNavBtnInactive]}
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('inbound');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabNavText, activeTab === 'inbound' ? styles.tabNavTextActive : styles.tabNavTextInactive]}>
              Inbound
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'outbound' ? styles.tabNavBtnActive : styles.tabNavBtnInactive]}
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('outbound');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabNavText, activeTab === 'outbound' ? styles.tabNavTextActive : styles.tabNavTextInactive]}>
              Outbound
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'return' ? styles.tabNavBtnActive : styles.tabNavBtnInactive]}
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('return');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabNavText, activeTab === 'return' ? styles.tabNavTextActive : styles.tabNavTextInactive]}>
              Return
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'transfer' ? styles.tabNavBtnActive : styles.tabNavBtnInactive]}
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('transfer');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabNavText, activeTab === 'transfer' ? styles.tabNavTextActive : styles.tabNavTextInactive]}>
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. SEARCH BAR & + NEW BUTTON matching SVG */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#625A72" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search movement ID or reference..."
              placeholderTextColor="#8B8498"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8B8498" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.newActionBtn}
            activeOpacity={0.85}
            onPress={handleOpenNewModal}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
            <Text style={styles.newActionBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* 4. TABLE CARD CONTAINER matching SVG */}
        <View style={styles.tableCardContainer}>
          {/* Card Top Title Row */}
          <View style={styles.tableCardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.tableCardTitle}>{getTabTitle()}</Text>
              <View style={styles.tableCountPill}>
                <Text style={styles.tableCountPillText}>{filteredData.length}</Text>
              </View>
            </View>
            <Text style={styles.tableCardSubTag}>Showing 1 table</Text>
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
                <View style={[styles.tableHeaderCell, { width: 130 }]}>
                  <Text style={styles.tableHeaderText}>{getIdColumnTitle()}</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 105 }]}>
                  <Text style={styles.tableHeaderText}>Date</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 110 }]}>
                  <Text style={styles.tableHeaderText}>Ref No.</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 180 }]}>
                  <Text style={styles.tableHeaderText}>Source</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 180 }]}>
                  <Text style={styles.tableHeaderText}>Destination</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 150 }]}>
                  <Text style={styles.tableHeaderText}>{getMethodColumnTitle()}</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 115, alignItems: 'center' }]}>
                  <Text style={styles.tableHeaderText}>Status</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 80, alignItems: 'center' }]}>
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {filteredData.length === 0 ? (
                <View style={styles.emptyTableState}>
                  <MaterialCommunityIcons name="cube-outline" size={32} color="#A79FBF" />
                  <Text style={styles.emptyTableText}>No {getTabTitle()} movement records found</Text>
                  <Text style={styles.emptyTableSubText}>Tap "+ New" above to log a new movement record</Text>
                </View>
              ) : (
                filteredData.map((item, index) => {
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
                        <Text style={styles.cellNoText}>{item.no}</Text>
                      </View>

                      {/* 2. Date */}
                      <View style={[styles.tableDataCell, { width: 105 }]}>
                        <Text style={styles.cellDateText}>{item.date}</Text>
                      </View>

                      {/* 3. Ref No */}
                      <View style={[styles.tableDataCell, { width: 110 }]}>
                        <View style={styles.refBadge}>
                          <Text style={styles.refBadgeText}>{item.refNo}</Text>
                        </View>
                      </View>

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
                          onPress={() => setSelectedRow(item)}
                        >
                          <Text style={styles.actionDotsText}>⋯</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Swipe Indicator Bar matching SVG */}
          <View style={styles.swipeIndicatorRow}>
            <View style={styles.swipeBarTrack}>
              <View style={styles.swipeBarThumb} />
            </View>
            <View style={styles.swipeGuideRow}>
              <Ionicons name="swap-horizontal" size={13} color="#6D43C0" style={{ marginRight: 4 }} />
              <Text style={styles.swipeGuideText}>
                Swipe table horizontally to see all columns ⇆
              </Text>
            </View>
          </View>
        </View>

        {/* 5. TIP CARD matching SVG */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeaderRow}>
            <Ionicons name="bulb-outline" size={15} color="#6D43C0" style={{ marginRight: 6 }} />
            <Text style={styles.tipTitle}>Tip</Text>
          </View>
          <Text style={styles.tipDescription}>
            Only the selected movement table is displayed. Switch tabs above to inspect Inbound, Outbound, Return, or Transfer ledgers.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
      {/* 7. MODAL: ROW DETAILS & ACTIONS (⋯)                      */}
      {/* ========================================================= */}
      <Modal
        visible={!!selectedRow}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedRow(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{selectedRow?.no}</Text>
                <Text style={styles.modalSubTitle}>{getTabTitle()} Movement Overview</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRow(null)}>
                <Ionicons name="close-circle" size={24} color="#8B8498" />
              </TouchableOpacity>
            </View>

            {selectedRow ? (
              <View style={styles.detailFieldsBox}>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{selectedRow.date}</Text>
                </View>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>Reference No:</Text>
                  <Text style={styles.detailValue}>{selectedRow.refNo}</Text>
                </View>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>Source:</Text>
                  <Text style={styles.detailValue}>{selectedRow.source}</Text>
                </View>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>Destination:</Text>
                  <Text style={styles.detailValue}>{selectedRow.destination}</Text>
                </View>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>{getMethodColumnTitle()}:</Text>
                  <Text style={styles.detailValue}>{selectedRow.method}</Text>
                </View>
                <View style={styles.detailFieldRow}>
                  <Text style={styles.detailLabel}>Current Status:</Text>
                  {renderStatusBadge(selectedRow.status)}
                </View>

                {selectedRow.totalQty != null && (
                  <View style={styles.detailFieldRow}>
                    <Text style={styles.detailLabel}>Units / Valuation:</Text>
                    <Text style={[styles.detailValue, { color: '#6D43C0', fontWeight: '700' }]}>
                      {selectedRow.totalQty} units • ₹{(selectedRow.totalAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                )}

                {selectedRow.productLines && selectedRow.productLines.length > 0 && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDE9F4' }}>
                    <Text style={[styles.detailLabel, { marginBottom: 6, fontWeight: '700', color: '#211642' }]}>
                      Consignment Line Items ({selectedRow.productLines.length}):
                    </Text>
                    {selectedRow.productLines.map((line, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: '#211642', flex: 1 }}>
                          {idx + 1}. {line.productName} ({line.receivedQty} {line.uom})
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#372064' }}>
                          ₹{(line.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.detailActionButtonsRow}>
              <TouchableOpacity
                style={styles.deleteRowBtn}
                onPress={() => {
                  if (selectedRow) {
                    handleDeleteRow(selectedRow.id);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
                <Text style={styles.deleteRowBtnText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeDetailBtn}
                onPress={() => setSelectedRow(null)}
              >
                <Text style={styles.closeDetailBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
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

  // 1. Top Navy Header matching SVG
  topHeader: {
    backgroundColor: '#17102F',
    paddingTop: Platform.OS === 'ios' ? 14 : 14,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#D8D0EA',
    marginTop: 3,
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
    paddingTop: 14,
    paddingBottom: 40,
  },

  // 2. 4 Tabs Navigation Selector matching SVG
  tabsNavCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabNavBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabNavBtnActive: {
    backgroundColor: '#6D43C0',
  },
  tabNavBtnInactive: {
    backgroundColor: '#F0ECFA',
  },
  tabNavText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabNavTextActive: {
    color: '#FFFFFF',
  },
  tabNavTextInactive: {
    color: '#372064',
  },

  // 3. Search Bar & + New Button matching SVG
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#211642',
    paddingVertical: 0,
  },
  newActionBtn: {
    height: 42,
    backgroundColor: '#6D43C0',
    borderRadius: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  newActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // 4. Table Card Container matching SVG
  tableCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tableCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
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
    marginTop: 12,
    paddingHorizontal: 14,
  },
  swipeBarTrack: {
    width: '100%',
    height: 4,
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
    marginTop: 6,
  },
  swipeGuideText: {
    fontSize: 10,
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
});
