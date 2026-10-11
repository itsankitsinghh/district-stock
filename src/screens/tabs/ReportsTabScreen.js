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
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import masterService from '../../services/masterService';
import {
  FINAL_REPORT_DEFINITIONS,
  getReportRowsForPreview,
  generateAndDownloadExcelReport,
} from '../../services/excelReportGenerator';
import TablePagination from '../../components/TablePagination';

// Available Warehouses
const WAREHOUSES = [
  'All Warehouses',
  'Sagar Complex Warehouse',
  'TESTIND-AUG26',
  "QA Singh's Warehouse",
  'Warehouse A - Central Staging',
];

export default function ReportsTabScreen({ session, onLogout }) {
  // Main Tab: 'ON_DEMAND' | 'SCHEDULE'
  const [activeTab, setActiveTab] = useState('ON_DEMAND');

  // Reports data
  const [reportsHistory, setReportsHistory] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);

  // Form State (Defaulting to Stock Inventory Report)
  const [selectedReport, setSelectedReport] = useState(FINAL_REPORT_DEFINITIONS[0]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('Sagar Complex Warehouse');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-10-11');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals
  const [reportPickerVisible, setReportPickerVisible] = useState(false);
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickingDateType, setPickingDateType] = useState('START'); // 'START' | 'END'
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [activePreviewReport, setActivePreviewReport] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  // In-Table Filter Inputs matching Screenshot
  const [tableFilterReport, setTableFilterReport] = useState('');
  const [tableFilterWh, setTableFilterWh] = useState('');
  const [tableFilterFrom, setTableFilterFrom] = useState('');
  const [tableFilterTo, setTableFilterTo] = useState('');
  const [tableFilterUser, setTableFilterUser] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('');

  // 10-Row Pagination States
  const [historyPage, setHistoryPage] = useState(1);
  const [previewPage, setPreviewPage] = useState(1);

  // Reset page when filter inputs change
  useEffect(() => {
    setHistoryPage(1);
  }, [tableFilterReport, tableFilterWh, tableFilterFrom, tableFilterTo, tableFilterUser, tableFilterStatus]);

  // Floating Toast Banner matching video
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Schedule Form State
  const [newScheduleReport, setNewScheduleReport] = useState(FINAL_REPORT_DEFINITIONS[0]);
  const [newScheduleFreq, setNewScheduleFreq] = useState('Daily');
  const [newScheduleTime, setNewScheduleTime] = useState('08:00 AM');
  const [newScheduleEmail, setNewScheduleEmail] = useState('ops@districtstock.com');

  const loadData = () => {
    if (masterService && typeof masterService.getReportsHistory === 'function') {
      setReportsHistory(masterService.getReportsHistory());
    }
    if (masterService && typeof masterService.getScheduledReports === 'function') {
      setScheduledReports(masterService.getScheduledReports());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4500);
  };

  // Generate & Download Excel Report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    showToast('Generating Excel (.xlsx / .csv) file...');

    try {
      let created = null;
      if (masterService && typeof masterService.generateReport === 'function') {
        created = masterService.generateReport(
          selectedReport.name,
          selectedWarehouse,
          startDate,
          endDate,
          session?.user?.name || 'Demo1',
          'XLSX'
        );
        loadData();
      }

      if (created) {
        const res = await generateAndDownloadExcelReport(created);
        if (res && res.success) {
          showToast(`Excel file downloaded: ${res.fileName}`);
        } else {
          showToast(`Report "${selectedReport.name}" generated in history.`);
        }
      }
    } catch (err) {
      console.log('Error generating report:', err);
      showToast('Report generated successfully.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Existing Report Row
  const handleDownloadRow = async (item) => {
    showToast(`Downloading ${item.reportName} in Excel format...`);
    try {
      const res = await generateAndDownloadExcelReport(item);
      if (res && res.success) {
        showToast(`Excel report downloaded: ${res.fileName}`);
      }
    } catch (err) {
      console.log('Download error:', err);
    }
  };

  // Delete Report Row
  const handleDeleteRow = (id, reportName) => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete "${reportName}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (masterService && typeof masterService.deleteReport === 'function') {
              masterService.deleteReport(id);
              loadData();
              showToast('Report deleted from history.');
            }
          },
        },
      ]
    );
  };

  // Quick Date Preset Picker
  const handleSelectDatePreset = (preset) => {
    if (preset === 'TODAY') {
      setStartDate('2026-10-11');
      setEndDate('2026-10-11');
    } else if (preset === 'LAST_7') {
      setStartDate('2026-10-04');
      setEndDate('2026-10-11');
    } else if (preset === 'LAST_30') {
      setStartDate('2026-09-11');
      setEndDate('2026-10-11');
    } else if (preset === 'QUARTER') {
      setStartDate('2026-07-01');
      setEndDate('2026-10-11');
    }
    setDatePickerVisible(false);
  };

  // Add Scheduled Job
  const handleAddSchedule = () => {
    if (masterService && typeof masterService.addScheduledReport === 'function') {
      masterService.addScheduledReport(
        newScheduleReport.name,
        selectedWarehouse,
        newScheduleFreq,
        newScheduleTime,
        newScheduleEmail
      );
      loadData();
      setScheduleModalVisible(false);
      showToast(`Schedule created for ${newScheduleReport.name}.`);
    }
  };

  // Toggle Schedule Status
  const handleToggleSchedule = (id) => {
    if (masterService && typeof masterService.toggleScheduledReportStatus === 'function') {
      masterService.toggleScheduledReportStatus(id);
      loadData();
    }
  };

  // Filtered History based on in-table search boxes
  const filteredHistory = reportsHistory.filter((item) => {
    if (tableFilterReport && !item.reportName.toLowerCase().includes(tableFilterReport.toLowerCase())) {
      return false;
    }
    if (tableFilterWh && !item.warehouse.toLowerCase().includes(tableFilterWh.toLowerCase())) {
      return false;
    }
    if (tableFilterFrom && !item.fromDate.toLowerCase().includes(tableFilterFrom.toLowerCase())) {
      return false;
    }
    if (tableFilterTo && !item.toDate.toLowerCase().includes(tableFilterTo.toLowerCase())) {
      return false;
    }
    if (tableFilterUser && !item.downloadedBy.toLowerCase().includes(tableFilterUser.toLowerCase())) {
      return false;
    }
    if (tableFilterStatus && !item.status.toLowerCase().includes(tableFilterStatus.toLowerCase())) {
      return false;
    }
    return true;
  });

  const HISTORY_PER_PAGE = 10;
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1435" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greetingText}>Reports</Text>
            <View style={styles.warehousePill}>
              <Ionicons name="business-outline" size={13} color="#D1C4E9" />
              <Text style={styles.warehouseText}>{selectedWarehouse}</Text>
            </View>
          </View>
          {onLogout && (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EDE9FE" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2 Top Tabs matching video: ON DEMAND | SCHEDULE */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ON_DEMAND' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ON_DEMAND')}
          >
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={16}
              color={activeTab === 'ON_DEMAND' ? '#FFFFFF' : '#C4B5FD'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'ON_DEMAND' && styles.tabBtnTextActive]}
            >
              ON DEMAND
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'SCHEDULE' && styles.tabBtnActive]}
            onPress={() => setActiveTab('SCHEDULE')}
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={16}
              color={activeTab === 'SCHEDULE' ? '#FFFFFF' : '#C4B5FD'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'SCHEDULE' && styles.tabBtnTextActive]}
            >
              SCHEDULE
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Success Toast Banner matching video */}
      {toastVisible && (
        <View style={styles.toastBanner}>
          <View style={styles.toastIconWrapper}>
            <MaterialCommunityIcons name="file-excel-box" size={22} color="#065F46" />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            style={styles.toastCloseBtn}
            onPress={() => setToastVisible(false)}
          >
            <Ionicons name="close" size={16} color="#047857" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TAB 1: ON DEMAND REPORT GENERATOR                                 */}
        {/* ================================================================= */}
        {activeTab === 'ON_DEMAND' && (
          <View>
            {/* Generate Report Form Card */}
            <View style={styles.formCard}>
              {/* 1. SEARCH OR SELECT REPORT Dropdown (5 Finalized Reports) */}
              <Text style={styles.fieldLabel}>SEARCH OR SELECT REPORT</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setReportPickerVisible(true)}
              >
                <View style={styles.dropdownValueRow}>
                  <View style={styles.reportIconBox}>
                    <MaterialCommunityIcons
                      name={selectedReport.icon}
                      size={20}
                      color="#6D43C0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownValueText}>{selectedReport.name}</Text>
                    <Text style={styles.dropdownSubtext} numberOfLines={1}>
                      {selectedReport.description}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>

              {/* 2. WAREHOUSE Dropdown */}
              <Text style={styles.fieldLabel}>WAREHOUSE</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setWarehousePickerVisible(true)}
              >
                <View style={styles.dropdownValueRow}>
                  <Ionicons name="business" size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <Text style={styles.dropdownValueText}>{selectedWarehouse}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>

              {/* 3. DATE RANGE SELECTORS */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>START DATE</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => {
                      setPickingDateType('START');
                      setDatePickerVisible(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#6D43C0" />
                    <Text style={styles.datePickerBtnText}>{startDate}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>END DATE</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => {
                      setPickingDateType('END');
                      setDatePickerVisible(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#6D43C0" />
                    <Text style={styles.datePickerBtnText}>{endDate}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. DEFAULT EXCEL INDICATOR (No format selector needed) */}
              <View style={styles.excelNoticePill}>
                <MaterialCommunityIcons name="file-excel-box" size={18} color="#059669" />
                <Text style={styles.excelNoticeText}>
                  Default Export: <Text style={{ fontWeight: '800' }}>Microsoft Excel (.xlsx)</Text> with product-level detail
                </Text>
              </View>

              {/* 5. GENERATE REPORT BUTTON matching video */}
              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  isGenerating && styles.generateBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleGenerateReport}
                disabled={isGenerating}
              >
                <MaterialCommunityIcons
                  name={isGenerating ? 'loading' : 'file-download'}
                  size={19}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.generateBtnText}>
                  {isGenerating ? 'Generating Excel...' : 'Generate Report'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ============================================================= */}
            {/* EXACT HORIZONTAL REPORTS HISTORY TABLE MATCHING SCREENSHOT     */}
            {/* ============================================================= */}
            <View style={styles.historyCardContainer}>
              <View style={styles.historyHeaderRow}>
                <View>
                  <Text style={styles.historyMainTitle}>Reports History</Text>
                  <Text style={styles.historyMainSubtitle}>
                    List of Reports generated
                  </Text>
                </View>
                <TouchableOpacity onPress={loadData} style={styles.syncBtn}>
                  <Ionicons name="refresh" size={14} color="#6D43C0" />
                  <Text style={styles.syncBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {/* Swipe Guide Indicator */}
              <View style={styles.swipeHintRow}>
                <Ionicons name="swap-horizontal" size={13} color="#94A3B8" />
                <Text style={styles.swipeHintText}>Swipe horizontally to view all columns & filters</Text>
              </View>

              {/* HORIZONTAL SCROLLING TABLE */}
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                style={styles.horizontalScroll}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                <View style={styles.tableWrapper}>
                  {/* TABLE HEADER ROW 1: COLUMN TITLES */}
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.thCell, { width: 44 }]}>
                      <Text style={styles.thText}>S.</Text>
                    </View>
                    <View style={[styles.thCell, { width: 220 }]}>
                      <Text style={styles.thText}>Report Name</Text>
                    </View>
                    <View style={[styles.thCell, { width: 180 }]}>
                      <Text style={styles.thText}>Warehouse N...</Text>
                    </View>
                    <View style={[styles.thCell, { width: 130 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.thText}>From Date</Text>
                        <Ionicons name="information-circle-outline" size={12} color="#EF4444" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                    <View style={[styles.thCell, { width: 130 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.thText}>To Date</Text>
                        <Ionicons name="information-circle-outline" size={12} color="#EF4444" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                    <View style={[styles.thCell, { width: 125 }]}>
                      <Text style={styles.thText}>Downloaded ..</Text>
                    </View>
                    <View style={[styles.thCell, { width: 155 }]}>
                      <Text style={styles.thText}>Generated Ti...</Text>
                    </View>
                    <View style={[styles.thCell, { width: 130 }]}>
                      <Text style={styles.thText}>Status</Text>
                    </View>
                    <View style={[styles.thCell, { width: 110, borderRightWidth: 0 }]}>
                      <Text style={styles.thText}>Actions</Text>
                    </View>
                  </View>

                  {/* TABLE HEADER ROW 2: SEARCH / FILTER INPUTS (MATCHING SCREENSHOT) */}
                  <View style={styles.tableFilterRow}>
                    <View style={[styles.tfCell, { width: 44 }]} />
                    <View style={[styles.tfCell, { width: 220 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="Select / Search"
                        placeholderTextColor="#94A3B8"
                        value={tableFilterReport}
                        onChangeText={setTableFilterReport}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 180 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="Warehouse..."
                        placeholderTextColor="#94A3B8"
                        value={tableFilterWh}
                        onChangeText={setTableFilterWh}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 130 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="yyyy-mm-dd 📅"
                        placeholderTextColor="#94A3B8"
                        value={tableFilterFrom}
                        onChangeText={setTableFilterFrom}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 130 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="yyyy-mm-dd 📅"
                        placeholderTextColor="#94A3B8"
                        value={tableFilterTo}
                        onChangeText={setTableFilterTo}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 125 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="User..."
                        placeholderTextColor="#94A3B8"
                        value={tableFilterUser}
                        onChangeText={setTableFilterUser}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 155 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="yyyy-mm-dd 📅"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 130 }]}>
                      <TextInput
                        style={styles.tfInput}
                        placeholder="Select"
                        placeholderTextColor="#94A3B8"
                        value={tableFilterStatus}
                        onChangeText={setTableFilterStatus}
                      />
                    </View>
                    <View style={[styles.tfCell, { width: 110, borderRightWidth: 0 }]} />
                  </View>

                  {/* TABLE DATA ROWS */}
                  {filteredHistory.length === 0 ? (
                    <View style={styles.tableEmptyBox}>
                      <Text style={styles.tableEmptyText}>No matching reports in history</Text>
                    </View>
                  ) : (
                    paginatedHistory.map((row, idx) => {
                      const serialNo = (historyPage - 1) * HISTORY_PER_PAGE + idx + 1;
                      return (
                        <View
                          key={row.id}
                          style={[
                            styles.tableDataRow,
                            idx % 2 === 1 && styles.tableDataRowAlt,
                          ]}
                        >
                          {/* 1. Serial No */}
                          <View style={[styles.tdCell, { width: 44 }]}>
                            <Text style={styles.tdTextSerial}>{serialNo}</Text>
                          </View>

                          {/* 2. Report Name */}
                          <TouchableOpacity
                            style={[styles.tdCell, { width: 220 }]}
                            onPress={() => {
                              setActivePreviewReport(row);
                              setPreviewPage(1);
                              setPreviewModalVisible(true);
                            }}
                          >
                            <Text style={styles.tdTextReportName} numberOfLines={1}>
                              {row.reportName}
                            </Text>
                          </TouchableOpacity>

                          {/* 3. Warehouse Name */}
                          <View style={[styles.tdCell, { width: 180 }]}>
                            <Text style={styles.tdTextWarehouse} numberOfLines={1}>
                              {row.warehouse}
                            </Text>
                          </View>

                          {/* 4. From Date */}
                          <View style={[styles.tdCell, { width: 130 }]}>
                            <Text style={styles.tdTextDate}>{row.fromDate || '--'}</Text>
                          </View>

                          {/* 5. To Date */}
                          <View style={[styles.tdCell, { width: 130 }]}>
                            <Text style={styles.tdTextDate}>{row.toDate || '--'}</Text>
                          </View>

                          {/* 6. Downloaded By */}
                          <View style={[styles.tdCell, { width: 125 }]}>
                            <Text style={styles.tdTextUser}>{row.downloadedBy || 'Demo1'}</Text>
                          </View>

                          {/* 7. Generated Time */}
                          <View style={[styles.tdCell, { width: 155 }]}>
                            <Text style={styles.tdTextTime} numberOfLines={1}>
                              {row.generatedTime}
                            </Text>
                          </View>

                          {/* 8. Status Badge */}
                          <View style={[styles.tdCell, { width: 130 }]}>
                            <View style={styles.statusPill}>
                              <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
                              <Text style={styles.statusPillText}>{row.status}</Text>
                            </View>
                          </View>

                          {/* 9. Actions (Download Excel & Delete) matching Screenshot */}
                          <View style={[styles.tdCell, { width: 110, borderRightWidth: 0 }]}>
                            <View style={styles.actionsRow}>
                              <TouchableOpacity
                                style={styles.actionDownloadBtn}
                                onPress={() => handleDownloadRow(row)}
                              >
                                <Ionicons name="download-outline" size={16} color="#0284C7" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionDeleteBtn}
                                onPress={() => handleDeleteRow(row.id, row.reportName)}
                              >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              {/* 10-Row Table Pagination Matching User Screenshot */}
              <TablePagination
                currentPage={historyPage}
                totalItems={filteredHistory.length}
                itemsPerPage={HISTORY_PER_PAGE}
                onPageChange={setHistoryPage}
                primaryColor="#38BDF8"
              />
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* TAB 2: SCHEDULED REPORTS JOBS                                     */}
        {/* ================================================================= */}
        {activeTab === 'SCHEDULE' && (
          <View>
            <View style={styles.scheduleHeaderRow}>
              <View>
                <Text style={styles.historyMainTitle}>Automated Schedules</Text>
                <Text style={styles.historyMainSubtitle}>
                  Recurring reports delivered via email & cloud
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addScheduleBtn}
                onPress={() => setScheduleModalVisible(true)}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addScheduleBtnText}>New</Text>
              </TouchableOpacity>
            </View>

            {scheduledReports.map((sch) => (
              <View key={sch.id} style={styles.scheduleCard}>
                <View style={styles.scheduleCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleReportName}>{sch.reportName}</Text>
                    <Text style={styles.scheduleWarehouse}>{sch.warehouse}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusTogglePill,
                      sch.status === 'Active'
                        ? styles.statusTogglePillActive
                        : styles.statusTogglePillPaused,
                    ]}
                    onPress={() => handleToggleSchedule(sch.id)}
                  >
                    <Text
                      style={[
                        styles.statusToggleText,
                        sch.status === 'Active'
                          ? styles.statusToggleTextActive
                          : styles.statusToggleTextPaused,
                      ]}
                    >
                      {sch.status}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.scheduleCardBody}>
                  <View style={styles.scheduleDetailRow}>
                    <Ionicons name="repeat" size={14} color="#6D43C0" />
                    <Text style={styles.scheduleDetailText}>
                      Frequency: <Text style={{ fontWeight: '700' }}>{sch.frequency}</Text> at {sch.time}
                    </Text>
                  </View>
                  <View style={styles.scheduleDetailRow}>
                    <Ionicons name="mail-outline" size={14} color="#64748B" />
                    <Text style={styles.scheduleDetailText}>To: {sch.recipients}</Text>
                  </View>
                  <View style={styles.scheduleDetailRow}>
                    <Ionicons name="checkmark-done" size={14} color="#059669" />
                    <Text style={styles.scheduleDetailText}>Format: Excel Spreadsheet (.xlsx)</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL 1: 5 FINALIZED REPORTS SELECTOR PICKER                      */}
      {/* ================================================================= */}
      <Modal
        visible={reportPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Official Report</Text>
              <TouchableOpacity onPress={() => setReportPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#17102F" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={FINAL_REPORT_DEFINITIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedReport.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerOptionRow,
                      isSelected && styles.pickerOptionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedReport(item);
                      setReportPickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerOptionIcon}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={22}
                        color={isSelected ? '#6D43C0' : '#475569'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pickerOptionName,
                          isSelected && styles.pickerOptionNameActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.pickerOptionDesc}>{item.description}</Text>
                      <Text style={styles.pickerColumnsCount}>
                        📊 {item.columns.length} columns in product-level detail
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#6D43C0" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: WAREHOUSE SELECTOR PICKER                                */}
      {/* ================================================================= */}
      <Modal
        visible={warehousePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWarehousePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Warehouse</Text>
              <TouchableOpacity onPress={() => setWarehousePickerVisible(false)}>
                <Ionicons name="close" size={22} color="#17102F" />
              </TouchableOpacity>
            </View>

            {WAREHOUSES.map((wh) => (
              <TouchableOpacity
                key={wh}
                style={[
                  styles.warehouseOptionRow,
                  selectedWarehouse === wh && styles.warehouseOptionRowActive,
                ]}
                onPress={() => {
                  setSelectedWarehouse(wh);
                  setWarehousePickerVisible(false);
                }}
              >
                <Ionicons
                  name="business"
                  size={18}
                  color={selectedWarehouse === wh ? '#6D43C0' : '#64748B'}
                />
                <Text
                  style={[
                    styles.warehouseOptionText,
                    selectedWarehouse === wh && styles.warehouseOptionTextActive,
                  ]}
                >
                  {wh}
                </Text>
                {selectedWarehouse === wh && (
                  <Ionicons name="checkmark" size={18} color="#6D43C0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 3: DATE PRESET & CALENDAR PICKER                             */}
      {/* ================================================================= */}
      <Modal
        visible={datePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickingDateType === 'START' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                <Ionicons name="close" size={22} color="#17102F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.dateModalDesc}>
              Quick range presets or custom timestamp
            </Text>

            <View style={styles.datePresetsGrid}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleSelectDatePreset('TODAY')}
              >
                <Text style={styles.presetChipText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleSelectDatePreset('LAST_7')}
              >
                <Text style={styles.presetChipText}>Last 7 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleSelectDatePreset('LAST_30')}
              >
                <Text style={styles.presetChipText}>Last 30 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleSelectDatePreset('QUARTER')}
              >
                <Text style={styles.presetChipText}>This Quarter (Q3)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>CUSTOM DATE INPUT (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateManualInput}
              value={pickingDateType === 'START' ? startDate : endDate}
              onChangeText={(text) => {
                if (pickingDateType === 'START') setStartDate(text);
                else setEndDate(text);
              }}
              placeholder="2026-10-11"
            />

            <TouchableOpacity
              style={styles.dateConfirmBtn}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.dateConfirmBtnText}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 4: DETAILED PRODUCT-LEVEL REPORT PREVIEW SHEET               */}
      {/* ================================================================= */}
      {activePreviewReport && (
        <Modal
          visible={previewModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPreviewModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{activePreviewReport.reportName}</Text>
                  <Text style={styles.historyMainSubtitle}>
                    {activePreviewReport.warehouse} • Microsoft Excel Export
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#17102F" />
                </TouchableOpacity>
              </View>

              <View style={styles.previewMetaBox}>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Date Range</Text>
                  <Text style={styles.previewMetaVal}>
                    {activePreviewReport.fromDate} to {activePreviewReport.toDate}
                  </Text>
                </View>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Generated By</Text>
                  <Text style={styles.previewMetaVal}>
                    {activePreviewReport.downloadedBy} ({activePreviewReport.generatedTime})
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>PRODUCT-LEVEL ROWS PREVIEW</Text>
              
              {/* Product Rows Horizontal Table with 10-Row Pagination */}
              {(() => {
                const matched = FINAL_REPORT_DEFINITIONS.find((def) =>
                  activePreviewReport.reportName.toLowerCase().includes(def.name.toLowerCase()) ||
                  def.name.toLowerCase().includes(activePreviewReport.reportName.toLowerCase())
                ) || FINAL_REPORT_DEFINITIONS[0];

                const rows = getReportRowsForPreview(matched.name, activePreviewReport.warehouse);
                const PREVIEW_PER_PAGE = 10;
                const paginatedPreviewRows = rows.slice((previewPage - 1) * PREVIEW_PER_PAGE, previewPage * PREVIEW_PER_PAGE);

                return (
                  <View style={{ marginBottom: 14 }}>
                    <ScrollView horizontal={true} style={{ maxHeight: 220 }}>
                      <View style={styles.previewTableBox}>
                        <View>
                          {/* Headers */}
                          <View style={styles.previewTableRowHeader}>
                            {matched.columns.map((col, cIdx) => (
                              <View key={cIdx} style={{ width: 140, paddingHorizontal: 6 }}>
                                <Text style={styles.previewTableHeaderText} numberOfLines={1}>
                                  {col}
                                </Text>
                              </View>
                            ))}
                          </View>
                          {/* Rows */}
                          {paginatedPreviewRows.map((r, rIdx) => {
                            const vals = Object.values(r);
                            return (
                              <View key={rIdx} style={styles.previewTableRow}>
                                {vals.map((v, vIdx) => (
                                  <View key={vIdx} style={{ width: 140, paddingHorizontal: 6 }}>
                                    <Text style={styles.previewTableCellText} numberOfLines={1}>
                                      {String(v)}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </ScrollView>

                    {/* Table Pagination Matching Screenshot */}
                    <TablePagination
                      currentPage={previewPage}
                      totalItems={rows.length}
                      itemsPerPage={PREVIEW_PER_PAGE}
                      onPageChange={setPreviewPage}
                      primaryColor="#38BDF8"
                    />
                  </View>
                );
              })()}

              <TouchableOpacity
                style={styles.previewDownloadBtn}
                onPress={() => {
                  setPreviewModalVisible(false);
                  handleDownloadRow(activePreviewReport);
                }}
              >
                <MaterialCommunityIcons name="file-excel-box" size={18} color="#FFFFFF" />
                <Text style={styles.previewDownloadBtnText}>Download Full Excel File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: NEW SCHEDULE MODAL                                       */}
      {/* ================================================================= */}
      <Modal
        visible={scheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Recurring Report</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Ionicons name="close" size={22} color="#17102F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>REPORT TYPE</Text>
            <View style={styles.formatChipsRow}>
              {FINAL_REPORT_DEFINITIONS.slice(0, 3).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.formatChip,
                    newScheduleReport.id === r.id && styles.formatChipActive,
                  ]}
                  onPress={() => setNewScheduleReport(r)}
                >
                  <Text
                    style={[
                      styles.formatChipText,
                      newScheduleReport.id === r.id && styles.formatChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>FREQUENCY</Text>
            <View style={styles.formatChipsRow}>
              {['Daily', 'Weekly', 'Monthly'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.formatChip,
                    newScheduleFreq === f && styles.formatChipActive,
                  ]}
                  onPress={() => setNewScheduleFreq(f)}
                >
                  <Text
                    style={[
                      styles.formatChipText,
                      newScheduleFreq === f && styles.formatChipTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>DELIVERY TIME</Text>
            <TextInput
              style={styles.dateManualInput}
              value={newScheduleTime}
              onChangeText={setNewScheduleTime}
              placeholder="08:00 AM"
            />

            <Text style={styles.fieldLabel}>RECIPIENT EMAIL</Text>
            <TextInput
              style={styles.dateManualInput}
              value={newScheduleEmail}
              onChangeText={setNewScheduleEmail}
              placeholder="ops@districtstock.com"
            />

            <TouchableOpacity style={styles.dateConfirmBtn} onPress={handleAddSchedule}>
              <Text style={styles.dateConfirmBtnText}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5FB',
  },
  header: {
    backgroundColor: '#1E1435',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  warehousePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  warehouseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EDE9FE',
    marginLeft: 5,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
  },

  // 2 Top Tabs matching video
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#8235F4',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  // Toast Banner
  toastBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIconWrapper: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    lineHeight: 18,
  },
  toastCloseBtn: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBF8',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
  },
  excelNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  excelNoticeText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 8,
  },
  generateBtn: {
    backgroundColor: '#8235F4',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // =========================================================================
  // HORIZONTAL TABLE STYLES (MATCHING USER SCREENSHOT)
  // =========================================================================
  historyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EFEBF8',
    shadowColor: '#17102F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  historyMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  historyMainSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D43C0',
    marginLeft: 4,
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  horizontalScroll: {
    width: '100%',
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  tableFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
  },
  tfCell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  tfInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: '#1E293B',
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableDataRowAlt: {
    backgroundColor: '#FAF9FE',
  },
  tdCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  tdTextSerial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  tdTextReportName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tdTextWarehouse: {
    fontSize: 12,
    color: '#475569',
  },
  tdTextDate: {
    fontSize: 12,
    color: '#64748B',
  },
  tdTextUser: {
    fontSize: 12,
    color: '#334155',
  },
  tdTextTime: {
    fontSize: 12,
    color: '#64748B',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionDownloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableEmptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  tableEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // Schedule Tab Styles
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addScheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEBF8',
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scheduleReportName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  scheduleWarehouse: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTogglePillActive: { backgroundColor: '#DCFCE7' },
  statusTogglePillPaused: { backgroundColor: '#F1F5F9' },
  statusToggleText: { fontSize: 11, fontWeight: '800' },
  statusToggleTextActive: { color: '#15803D' },
  statusToggleTextPaused: { color: '#64748B' },
  scheduleCardBody: {
    paddingTop: 8,
  },
  scheduleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleDetailText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17102F',
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  pickerOptionRowActive: {
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  pickerOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickerOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerOptionNameActive: {
    color: '#6D43C0',
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pickerColumnsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 4,
  },
  warehouseOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  warehouseOptionRowActive: {
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  warehouseOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginLeft: 10,
  },
  warehouseOptionTextActive: {
    color: '#6D43C0',
    fontWeight: '700',
  },

  // Date Modal
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  dateModalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  datePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateManualInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 6,
    marginBottom: 14,
  },
  dateConfirmBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  dateConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Preview Modal
  previewMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  previewMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewMetaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  previewMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  previewTableBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  previewTableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  previewTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  previewTableCellText: {
    fontSize: 11,
    color: '#475569',
  },
  previewDownloadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
  },
  previewDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Chips in Schedule Modal
  formatChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  formatChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formatChipActive: {
    backgroundColor: '#17102F',
    borderColor: '#17102F',
  },
  formatChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  formatChipTextActive: {
    color: '#FFFFFF',
  },
});
