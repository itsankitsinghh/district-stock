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
import CommonCalendarModal from '../../components/CommonCalendarModal';



const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatDateToDisplay = (isoStr) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return isoStr;
};

const formatDateToISO = (day, month, year) => {
  const d = String(day).padStart(2, '0');
  const m = String(month + 1).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

import {
  getUserAccessibleWarehouses,
  getAnalyticsDropdownOptions,
} from '../../services/locationScopeHelper';

export default function ReportsTabScreen({ session, onLogout }) {
  // Main Tab: 'ON_DEMAND' | 'SCHEDULE'
  const [activeTab, setActiveTab] = useState('ON_DEMAND');

  // Reports data
  const [reportsHistory, setReportsHistory] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);

  // Form State (Defaulting to blank as requested by user)
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-10-11');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);

  // Filter 5 existing finalized reports dynamically based on user search query
  const filteredReportList = FINAL_REPORT_DEFINITIONS.filter((r) =>
    r.name.toLowerCase().includes((reportSearchQuery || '').toLowerCase().trim())
  );
  const displayReportList =
    reportSearchQuery.trim().length > 0 && filteredReportList.length > 0
      ? filteredReportList
      : FINAL_REPORT_DEFINITIONS;

  // Warehouse Search & Select State (Single: only that warehouse; Multi: All + single-single)
  const accessibleMasterWarehouses = getUserAccessibleWarehouses(session);
  const WAREHOUSES = getAnalyticsDropdownOptions(accessibleMasterWarehouses, 'Warehouse');
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);

  // Filter existing warehouses dynamically based on user search query
  const filteredWarehouseList = WAREHOUSES.filter((w) =>
    w.toLowerCase().includes((warehouseSearchQuery || '').toLowerCase().trim())
  );
  const displayWarehouseList =
    warehouseSearchQuery.trim().length > 0 && filteredWarehouseList.length > 0
      ? filteredWarehouseList
      : WAREHOUSES;

  // Calendar Picker State (Interactive Month Calendar matching screenshot)
  const [activeCalendarType, setActiveCalendarType] = useState(null); // 'START' | 'END' | null
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(9); // 9 = October (0-indexed)

  const openCalendarPicker = (type) => {
    setIsReportDropdownOpen(false);
    setIsWarehouseDropdownOpen(false);
    const currentDate = type === 'START' ? startDate : endDate;
    if (currentDate) {
      const parts = currentDate.split('-');
      if (parts.length === 3) {
        setCalendarYear(parseInt(parts[0], 10));
        setCalendarMonth(parseInt(parts[1], 10) - 1);
      }
    }
    setActiveCalendarType(type);
  };

  const handlePrevYear = () => setCalendarYear((y) => y - 1);
  const handleNextYear = () => setCalendarYear((y) => y + 1);
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectCellDate = (cell) => {
    const iso = formatDateToISO(cell.day, cell.month, cell.year);
    if (activeCalendarType === 'START') {
      setStartDate(iso);
    } else {
      setEndDate(iso);
    }
    setActiveCalendarType(null);
  };

  const handleSelectToday = () => {
    const todayYear = 2026;
    const todayMonth = 9; // Oct
    const todayDay = 16;
    const iso = formatDateToISO(todayDay, todayMonth, todayYear);
    if (activeCalendarType === 'START') {
      setStartDate(iso);
    } else {
      setEndDate(iso);
    }
    setActiveCalendarType(null);
  };

  const getCalendarCells = (year, month) => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    // Previous month padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }
    // Next month padding days to complete grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        day: n,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }
    return cells;
  };

  const getActiveDateParts = () => {
    const dStr = activeCalendarType === 'START' ? startDate : endDate;
    if (!dStr) return { year: -1, month: -1, day: -1 };
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1,
        day: parseInt(parts[2], 10),
      };
    }
    return { year: -1, month: -1, day: -1 };
  };

  const calendarCells = getCalendarCells(calendarYear, calendarMonth);
  const activeDateParts = getActiveDateParts();

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

  // Schedule Form State (clean & blank by default)
  const [newScheduleReport, setNewScheduleReport] = useState(null);
  const [newScheduleFreq, setNewScheduleFreq] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [scheduleEmails, setScheduleEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');

  // Dropdown states in Schedule Modal
  const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false);
  const [frequencyDropdownOpen, setFrequencyDropdownOpen] = useState(false);

  // Time Picker Modal State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState('08');
  const [pickerMinute, setPickerMinute] = useState('00');
  const [pickerPeriod, setPickerPeriod] = useState('AM');
  const [pickerActiveMode, setPickerActiveMode] = useState('HOUR'); // 'HOUR' | 'MINUTE'

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
    if (!selectedReport) {
      Alert.alert('Select Report', 'Please search or select a report to proceed.');
      return;
    }
    if (!selectedWarehouse) {
      Alert.alert('Select Warehouse', 'Please search or select a warehouse to proceed.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Select Date Range', 'Please select both start date and end date to proceed.');
      return;
    }

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
    let finalEmails = [...scheduleEmails];
    if (emailInput.trim() && !finalEmails.includes(emailInput.trim().toLowerCase())) {
      finalEmails.push(emailInput.trim().toLowerCase());
    }
    if (finalEmails.length === 0) {
      Alert.alert('Recipient Email Required', 'Please add at least one recipient email address.');
      return;
    }
    if (!newScheduleReport) {
      Alert.alert('Report Type Required', 'Please select a report type.');
      return;
    }
    if (!newScheduleFreq) {
      Alert.alert('Frequency Required', 'Please select a frequency.');
      return;
    }
    if (!newScheduleTime) {
      Alert.alert('Delivery Time Required', 'Please select a delivery time.');
      return;
    }

    if (masterService && typeof masterService.addScheduledReport === 'function') {
      masterService.addScheduledReport(
        newScheduleReport.name,
        selectedWarehouse || 'All Warehouses',
        newScheduleFreq,
        newScheduleTime,
        finalEmails.join(', ')
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
      {/* 1. REPORTS SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greetingText}>Reports</Text>
            <View style={styles.scopeRow}>
              <View style={styles.scopeDot} />
              <Text style={styles.headerScopeSubtitle}>
                Operational audit & analytics
              </Text>
            </View>
          </View>
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
              color={activeTab === 'ON_DEMAND' ? '#FFFFFF' : '#706584'}
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
              color={activeTab === 'SCHEDULE' ? '#FFFFFF' : '#706584'}
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
        keyboardShouldPersistTaps="handled"
      >
        {/* ================================================================= */}
        {/* TAB 1: ON DEMAND REPORT GENERATOR                                 */}
        {/* ================================================================= */}
        {activeTab === 'ON_DEMAND' && (
          <View>
            {/* Generate Report Form Card */}
            <View style={styles.formCard}>
              {/* 1. SEARCH OR SELECT REPORT Dropdown (Clean, Simple, Text-Only Dropdown matching reference) */}
              <View style={styles.searchSelectWrapper}>
                <Text style={styles.fieldLabel}>SEARCH OR SELECT REPORT</Text>
                <TouchableOpacity
                  style={[
                    styles.reportSearchInputBox,
                    isReportDropdownOpen && styles.reportSearchInputBoxFocused,
                  ]}
                  onPress={() => {
                    setIsWarehouseDropdownOpen(false);
                    setIsReportDropdownOpen(!isReportDropdownOpen);
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.reportSearchInputText,
                      !selectedReport && styles.reportSearchInputPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedReport ? selectedReport.name : 'Search or Select a report to download'}
                  </Text>
                  <Ionicons
                    name={isReportDropdownOpen ? 'chevron-up' : 'search-outline'}
                    size={18}
                    color={isReportDropdownOpen ? '#8235F4' : '#94A3B8'}
                  />
                </TouchableOpacity>

                {/* Dropdown Options (Simple text lines matching screenshot) */}
                {isReportDropdownOpen && (
                  <View style={styles.simpleReportDropdownMenu}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      style={styles.simpleReportDropdownScroll}
                      keyboardShouldPersistTaps="always"
                    >
                      {FINAL_REPORT_DEFINITIONS.map((item, idx) => {
                        const isSelected = selectedReport?.id === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.simpleReportDropdownItem,
                              isSelected && styles.simpleReportDropdownItemActive,
                              idx === FINAL_REPORT_DEFINITIONS.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setSelectedReport(item);
                              setReportSearchQuery(item.name);
                              setIsReportDropdownOpen(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.simpleReportDropdownText,
                                isSelected && styles.simpleReportDropdownTextActive,
                              ]}
                            >
                              {item.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 2. SEARCH OR SELECT WAREHOUSE Dropdown */}
              <View style={styles.searchSelectWrapper}>
                <Text style={styles.fieldLabel}>WAREHOUSE</Text>
                <TouchableOpacity
                  style={[
                    styles.reportSearchInputBox,
                    isWarehouseDropdownOpen && styles.reportSearchInputBoxFocused,
                  ]}
                  onPress={() => {
                    setIsReportDropdownOpen(false);
                    setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen);
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.reportSearchInputText,
                      !selectedWarehouse && styles.reportSearchInputPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedWarehouse ? selectedWarehouse : 'Search or Select a warehouse'}
                  </Text>
                  <Ionicons
                    name={isWarehouseDropdownOpen ? 'chevron-up' : 'search-outline'}
                    size={18}
                    color={isWarehouseDropdownOpen ? '#8235F4' : '#94A3B8'}
                  />
                </TouchableOpacity>

                {/* Dropdown Options (Simple text lines, NO logos, NO descriptions) */}
                {isWarehouseDropdownOpen && (
                  <View style={styles.simpleReportDropdownMenu}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      style={styles.simpleReportDropdownScroll}
                      keyboardShouldPersistTaps="always"
                    >
                      {WAREHOUSES.map((whName, idx) => {
                        const isSelected = selectedWarehouse === whName;
                        return (
                          <TouchableOpacity
                            key={whName}
                            style={[
                              styles.simpleReportDropdownItem,
                              isSelected && styles.simpleReportDropdownItemActive,
                              idx === WAREHOUSES.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setSelectedWarehouse(whName);
                              setWarehouseSearchQuery(whName);
                              setIsWarehouseDropdownOpen(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.simpleReportDropdownText,
                                isSelected && styles.simpleReportDropdownTextActive,
                              ]}
                            >
                              {whName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. DATE RANGE SELECTORS (Matching Screenshot DD/MM/YYYY Box Format) */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>START DATE</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInputBox,
                      activeCalendarType === 'START' && styles.dateInputBoxFocused,
                    ]}
                    onPress={() => openCalendarPicker('START')}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dateInputText,
                        !startDate && styles.dateInputPlaceholder,
                      ]}
                    >
                      {formatDateToDisplay(startDate) || 'DD/MM/YYYY'}
                    </Text>
                    <Ionicons name="calendar-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>END DATE</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInputBox,
                      activeCalendarType === 'END' && styles.dateInputBoxFocused,
                    ]}
                    onPress={() => openCalendarPicker('END')}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dateInputText,
                        !endDate && styles.dateInputPlaceholder,
                      ]}
                    >
                      {formatDateToDisplay(endDate) || 'DD/MM/YYYY'}
                    </Text>
                    <Ionicons name="calendar-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
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
                onPress={() => {
                  setNewScheduleReport(null);
                  setNewScheduleFreq('');
                  setNewScheduleTime('');
                  setScheduleEmails([]);
                  setEmailInput('');
                  setReportTypeDropdownOpen(false);
                  setFrequencyDropdownOpen(false);
                  setScheduleModalVisible(true);
                }}
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
                const isSelected = selectedReport?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerOptionRow,
                      isSelected && styles.pickerOptionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedReport(item);
                      setReportSearchQuery(item.name);
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
                  setWarehouseSearchQuery(wh);
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
      {/* CALENDAR PICKER POPOVER MODAL MATCHING USER SCREENSHOT             */}
      {/* ================================================================= */}
      <CommonCalendarModal
        visible={activeCalendarType !== null}
        onClose={() => setActiveCalendarType(null)}
        selectedDate={activeCalendarType === 'START' ? startDate : endDate}
        onSelectDate={(val) => {
          if (activeCalendarType === 'START') {
            setStartDate(val);
          } else {
            setEndDate(val);
          }
        }}
        format="ISO"
      />

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
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Recurring Report</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Ionicons name="close" size={22} color="#17102F" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. REPORT TYPE DROPDOWN */}
              <Text style={styles.fieldLabel}>REPORT TYPE</Text>
              <TouchableOpacity
                style={[
                  styles.scheduleDropdownTrigger,
                  reportTypeDropdownOpen && styles.scheduleDropdownTriggerActive,
                ]}
                onPress={() => {
                  setReportTypeDropdownOpen(!reportTypeDropdownOpen);
                  setFrequencyDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownTriggerLeft}>
                  <MaterialCommunityIcons
                    name={newScheduleReport?.icon || 'file-document-outline'}
                    size={18}
                    color={newScheduleReport ? '#6D43C0' : '#94A3B8'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !newScheduleReport && styles.dropdownTriggerPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {newScheduleReport?.name || 'Select Report Type'}
                  </Text>
                </View>
                <Feather
                  name={reportTypeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {reportTypeDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {FINAL_REPORT_DEFINITIONS.map((r) => {
                    const isSelected = newScheduleReport?.id === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.dropdownItemRow,
                          isSelected && styles.dropdownItemRowSelected,
                        ]}
                        onPress={() => {
                          setNewScheduleReport(r);
                          setReportTypeDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            isSelected && styles.dropdownItemTitleSelected,
                            { flex: 1 },
                          ]}
                        >
                          {r.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#6D43C0" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* 2. FREQUENCY DROPDOWN */}
              <Text style={styles.fieldLabel}>FREQUENCY</Text>
              <TouchableOpacity
                style={[
                  styles.scheduleDropdownTrigger,
                  frequencyDropdownOpen && styles.scheduleDropdownTriggerActive,
                ]}
                onPress={() => {
                  setFrequencyDropdownOpen(!frequencyDropdownOpen);
                  setReportTypeDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownTriggerLeft}>
                  <Ionicons
                    name="repeat-outline"
                    size={18}
                    color={newScheduleFreq ? '#6D43C0' : '#94A3B8'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !newScheduleFreq && styles.dropdownTriggerPlaceholder,
                    ]}
                  >
                    {newScheduleFreq || 'Select Frequency'}
                  </Text>
                </View>
                <Feather
                  name={frequencyDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {frequencyDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {['Daily', 'Weekly', 'Monthly'].map((f) => {
                    const isSelected = newScheduleFreq === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[
                          styles.dropdownItemRow,
                          isSelected && styles.dropdownItemRowSelected,
                        ]}
                        onPress={() => {
                          setNewScheduleFreq(f);
                          setFrequencyDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            isSelected && styles.dropdownItemTitleSelected,
                          ]}
                        >
                          {f}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#6D43C0" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* 3. DELIVERY TIME FIELD (OPENS TIME PICKER POPUP) */}
              <Text style={styles.fieldLabel}>DELIVERY TIME</Text>
              <TouchableOpacity
                style={styles.scheduleTimeInputBox}
                onPress={() => {
                  if (newScheduleTime) {
                    const match = newScheduleTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
                    if (match) {
                      setPickerHour(match[1].padStart(2, '0'));
                      setPickerMinute(match[2].padStart(2, '0'));
                      setPickerPeriod(match[3] ? match[3].toUpperCase() : 'AM');
                    }
                  } else {
                    setPickerHour('08');
                    setPickerMinute('00');
                    setPickerPeriod('AM');
                  }
                  setPickerActiveMode('HOUR');
                  setTimePickerVisible(true);
                }}
              >
                <View style={styles.scheduleTimeInputLeft}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={newScheduleTime ? '#6D43C0' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.scheduleTimeInputVal,
                      !newScheduleTime && styles.scheduleTimeInputPlaceholder,
                    ]}
                  >
                    {newScheduleTime || 'Select Delivery Time'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* 4. RECIPIENT EMAIL (MULTI-EMAIL INPUT & CHIPS) */}
              <Text style={styles.fieldLabel}>RECIPIENT EMAIL</Text>
              <View style={styles.emailAddContainer}>
                <View style={styles.emailInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.emailInputField}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="Enter email address..."
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onSubmitEditing={() => {
                      if (emailInput.trim()) {
                        const email = emailInput.trim().toLowerCase();
                        if (!scheduleEmails.includes(email)) {
                          setScheduleEmails([...scheduleEmails, email]);
                        }
                        setEmailInput('');
                      }
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.emailAddBtn}
                  onPress={() => {
                    if (emailInput.trim()) {
                      const email = emailInput.trim().toLowerCase();
                      if (!scheduleEmails.includes(email)) {
                        setScheduleEmails([...scheduleEmails, email]);
                      }
                      setEmailInput('');
                    }
                  }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emailAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Email Chips */}
              {scheduleEmails.length > 0 && (
                <View style={styles.emailChipsWrapper}>
                  {scheduleEmails.map((email, idx) => (
                    <View key={idx} style={styles.emailChip}>
                      <Ionicons name="mail" size={12} color="#6D43C0" style={{ marginRight: 6 }} />
                      <Text style={styles.emailChipText}>{email}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setScheduleEmails(scheduleEmails.filter((_, i) => i !== idx));
                        }}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* 5. PROMINENT SAVE SCHEDULE BUTTON */}
              <TouchableOpacity
                style={styles.saveScheduleBtn}
                onPress={handleAddSchedule}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveScheduleBtnText}>Save Schedule</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* CLOCK TIME PICKER POPUP MODAL (MATCHING USER REFERENCE IMAGE)     */}
      {/* ================================================================= */}
      <Modal
        visible={timePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerCard}>
            <Text style={styles.timePickerTitle}>Select time</Text>

            {/* Time Display Header */}
            <View style={styles.timePickerDisplayRow}>
              <TouchableOpacity
                style={[
                  styles.timeDigitBox,
                  pickerActiveMode === 'HOUR' && styles.timeDigitBoxActive,
                ]}
                onPress={() => setPickerActiveMode('HOUR')}
              >
                <Text
                  style={[
                    styles.timeDigitText,
                    pickerActiveMode === 'HOUR' && styles.timeDigitTextActive,
                  ]}
                >
                  {String(pickerHour).padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              <Text style={styles.timeColon}>:</Text>

              <TouchableOpacity
                style={[
                  styles.timeDigitBox,
                  pickerActiveMode === 'MINUTE' && styles.timeDigitBoxActive,
                ]}
                onPress={() => setPickerActiveMode('MINUTE')}
              >
                <Text
                  style={[
                    styles.timeDigitText,
                    pickerActiveMode === 'MINUTE' && styles.timeDigitTextActive,
                  ]}
                >
                  {String(pickerMinute).padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              {/* AM / PM Toggle */}
              <View style={styles.timePeriodContainer}>
                <TouchableOpacity
                  style={[
                    styles.timePeriodBtn,
                    pickerPeriod === 'AM' && styles.timePeriodBtnActive,
                  ]}
                  onPress={() => setPickerPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      pickerPeriod === 'AM' && styles.timePeriodTextActive,
                    ]}
                  >
                    a.m.
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timePeriodBtn,
                    pickerPeriod === 'PM' && styles.timePeriodBtnActive,
                  ]}
                  onPress={() => setPickerPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      pickerPeriod === 'PM' && styles.timePeriodTextActive,
                    ]}
                  >
                    p.m.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clock Face Dial */}
            <View style={styles.clockDial}>
              {/* Center Pivot Dot */}
              <View style={styles.clockCenterDot} />

              {/* Hours / Minutes circular nodes */}
              {pickerActiveMode === 'HOUR'
                ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourNum) => {
                    const angle = ((hourNum % 12) * 30 - 90) * (Math.PI / 180);
                    const r = 88;
                    const cx = 115;
                    const cy = 115;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const isSelected = parseInt(pickerHour, 10) === hourNum;

                    return (
                      <TouchableOpacity
                        key={hourNum}
                        style={[
                          styles.clockNumBadge,
                          { left: x - 18, top: y - 18 },
                          isSelected && styles.clockNumBadgeActive,
                        ]}
                        onPress={() => {
                          setPickerHour(String(hourNum).padStart(2, '0'));
                          setPickerActiveMode('MINUTE');
                        }}
                      >
                        <Text
                          style={[
                            styles.clockNumText,
                            isSelected && styles.clockNumTextActive,
                          ]}
                        >
                          {hourNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minNum) => {
                    const angle = (minNum * 6 - 90) * (Math.PI / 180);
                    const r = 88;
                    const cx = 115;
                    const cy = 115;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const isSelected = parseInt(pickerMinute, 10) === minNum;

                    return (
                      <TouchableOpacity
                        key={minNum}
                        style={[
                          styles.clockNumBadge,
                          { left: x - 18, top: y - 18 },
                          isSelected && styles.clockNumBadgeActive,
                        ]}
                        onPress={() => {
                          setPickerMinute(String(minNum).padStart(2, '0'));
                        }}
                      >
                        <Text
                          style={[
                            styles.clockNumText,
                            isSelected && styles.clockNumTextActive,
                          ]}
                        >
                          {String(minNum).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
            </View>

            {/* Bottom Actions */}
            <View style={styles.timePickerActionRow}>
              <TouchableOpacity
                onPress={() => {
                  const curMin = parseInt(pickerMinute, 10) || 0;
                  const nextMin = (curMin + 15) % 60;
                  setPickerMinute(String(nextMin).padStart(2, '0'));
                }}
                style={styles.timePickerKeypadBtn}
              >
                <MaterialCommunityIcons name="keyboard-outline" size={22} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.timePickerBtnGroup}>
                <TouchableOpacity
                  style={styles.timePickerTextBtn}
                  onPress={() => setTimePickerVisible(false)}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timePickerTextBtn}
                  onPress={() => {
                    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')} ${pickerPeriod}`;
                    setNewScheduleTime(formatted);
                    setTimePickerVisible(false);
                  }}
                >
                  <Text style={styles.timePickerOkText}>OK</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#F6F5FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  greetingText: {
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
  headerScopeSubtitle: {
    fontSize: 11,
    color: '#706984',
    fontWeight: '500',
  },
  warehouseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8235F4',
    marginLeft: 5,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
  },

  // 2 Top Tabs matching video
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E6DEFC',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#8235F4',
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#706584',
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
  searchSelectWrapper: {
    position: 'relative',
    zIndex: 50,
    marginBottom: 4,
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '800',
  },
  reportSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  reportSearchInputBoxFocused: {
    borderColor: '#8235F4',
    shadowColor: '#8235F4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reportSearchInputText: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E1435',
    fontWeight: '600',
    marginRight: 8,
  },
  reportSearchInputPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  reportSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E1435',
    fontWeight: '500',
    height: '100%',
  },
  reportSearchIconBtn: {
    padding: 4,
  },
  simpleReportDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  simpleReportDropdownScroll: {
    maxHeight: 220,
  },
  simpleReportDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  simpleReportDropdownItemActive: {
    backgroundColor: '#F3EEFF',
  },
  simpleReportDropdownText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  simpleReportDropdownTextActive: {
    color: '#7C24E8',
    fontWeight: '700',
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

  // Date Range Box & Calendar Popover Matching Reference
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  dateInputBoxFocused: {
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  dateInputText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  dateInputPlaceholder: {
    color: '#94A3B8',
  },
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 290,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  calHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calNavArrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calArrowBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calArrowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  calMonthYearTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  calDaysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  calDayHeaderCell: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calCellBtn: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 4,
  },
  calCellBtnSelected: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 4,
  },
  calCellText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '400',
  },
  calCellTextMuted: {
    color: '#CBD5E1',
  },
  calCellTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  calTodayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calTodayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
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

  // Schedule Modal Dropdowns & Inputs
  scheduleDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  scheduleDropdownTriggerActive: {
    borderColor: '#6D43C0',
    backgroundColor: '#FAF5FF',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownTriggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemRowSelected: {
    backgroundColor: '#F5F3FF',
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownItemTitleSelected: {
    color: '#6D43C0',
    fontWeight: '700',
  },
  dropdownItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Delivery Time Box
  scheduleTimeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
  },
  scheduleTimeInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTimeInputVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 10,
  },
  scheduleTimeInputPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
    fontSize: 14,
  },

  // Recipient Emails
  emailAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emailInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  emailInputField: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  emailAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D43C0',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
  },
  emailAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  emailChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  emailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  noEmailHint: {
    fontSize: 12,
    color: '#EF4444',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Save Schedule Button
  saveScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D43C0',
    borderRadius: 12,
    height: 50,
    marginTop: 10,
    shadowColor: '#6D43C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveScheduleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginLeft: 8,
  },

  // Time Picker Popup Modal (matching user reference screenshot)
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerCard: {
    width: 310,
    backgroundColor: '#27272A',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  timePickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  timePickerDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  timeDigitBox: {
    width: 80,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDigitBoxActive: {
    backgroundColor: '#E4E4E7',
  },
  timeDigitText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  timeDigitTextActive: {
    color: '#18181B',
  },
  timeColon: {
    fontSize: 34,
    fontWeight: '700',
    color: '#D4D4D8',
    marginHorizontal: 8,
  },
  timePeriodContainer: {
    borderWidth: 1,
    borderColor: '#52525B',
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 12,
  },
  timePeriodBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  timePeriodBtnActive: {
    backgroundColor: '#52525B',
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  timePeriodTextActive: {
    color: '#FFFFFF',
  },
  clockDial: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#1E1E22',
    alignSelf: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  clockCenterDot: {
    position: 'absolute',
    left: 112,
    top: 112,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  clockNumBadge: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  clockNumBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  clockNumText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  clockNumTextActive: {
    color: '#18181B',
    fontWeight: '800',
  },
  timePickerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
  },
  timePickerKeypadBtn: {
    padding: 6,
  },
  timePickerBtnGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  timePickerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  timePickerCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  timePickerOkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4D4D8',
  },
});
