import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../services/authService';
import { masterService } from '../../services/masterService';
import { COLORS } from '../../theme/colors';

export default function UserSetupTabScreen({ session, onLogout }) {
  // State for user list & stats
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: '0', active: '0', inactive: '0' });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');

  // Determine current logged-in user role
  const currentRole = (
    session?.role ||
    authService.getCurrentSession?.()?.role ||
    authService.getCurrentUser?.()?.role ||
    ''
  ).toLowerCase().trim();
  const isOperationManager = currentRole.includes('operation');

  // Screen flow navigation modals
  // 1: List (main screen)
  // 2: Screen 02 (Select Role)
  // 3: Screen 03 (Standard User Form)
  // 4: Screen 04 (Ground User Form)
  // 5: Screen 05 (Three-Dot Actions Sheet)
  const [activeModal, setActiveModal] = useState(null); // 'selectRole' | 'standardForm' | 'groundForm' | 'actionsMenu' | null
  const [selectedRole, setSelectedRole] = useState(isOperationManager ? 'Warehouse User' : 'Operation Manager');
  const [groundType, setGroundType] = useState('Warehouse Ground'); // 'Warehouse Ground' | 'Event Ground'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState('DS');
  const [accessId, setAccessId] = useState('');
  const [isEditingAccessId, setIsEditingAccessId] = useState(false);
  const [assignedWarehouses, setAssignedWarehouses] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState(null); // 'warehouse' | 'event' | null
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [isAccountActive, setIsAccountActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Load and refresh user records
  const refreshUsers = async () => {
    await authService.init();
    const list = authService.getUsers();
    setUsers(list);
    const m = authService.getUserMetrics();
    setMetrics(m);
  };

  const [, setMasterRevision] = useState(0);

  useEffect(() => {
    refreshUsers();
    let unsubMaster = () => {};
    if (masterService?.subscribe) {
      unsubMaster = masterService.subscribe(() => {
        setMasterRevision((r) => r + 1);
      });
    }
    let unsubscribe = () => {};
    if (authService.subscribe) {
      unsubscribe = authService.subscribe(() => {
        refreshUsers();
      });
    }
    return () => {
      unsubMaster();
      unsubscribe();
    };
  }, []);

  // Filtered users list (search + status filter)
  const filteredUsers = users.filter((u) => {
    if (activeFilter === 'active' && u.status !== 'active') return false;
    if (activeFilter === 'inactive' && u.status !== 'inactive') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.userId || u.id || '').toLowerCase().includes(q) ||
      (u.mobile || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  // Open Screen 02: Select Role
  const handleStartCreateUser = () => {
    setIsEditMode(false);
    setFormError('');
    setIsWarehouseDropdownOpen(false);
    setIsEventDropdownOpen(false);
    if (isOperationManager) {
      setSelectedRole('Warehouse User');
    }
    setActiveModal('selectRole');
  };

  // Select Role and advance to Screen 03 (Standard User Form)
  const handleSelectRole = (role) => {
    const finalRole = isOperationManager ? 'Warehouse User' : role;
    setSelectedRole(finalRole);
    setFormError('');
    setFullName('');
    setPhoneNumber('');
    setEmailId('');
    setPassword('');
    setAccessCode('DS');
    setIsWarehouseDropdownOpen(false);
    setIsEventDropdownOpen(false);
    if (finalRole === 'Admin') {
      const activeWhs = masterService
        .getWarehouses()
        .filter((w) => (w.status || 'active').toLowerCase() === 'active')
        .map((w) => w.name);
      setAssignedWarehouses(activeWhs);
      setAssignedEvents([]);
    } else if (finalRole === 'Event Planner') {
      const activeEvs = masterService
        .getEvents()
        .filter((e) => (e.status || 'active').toLowerCase() === 'active')
        .map((e) => e.name);
      setAssignedEvents(activeEvs);
      setAssignedWarehouses([]);
    } else {
      setAssignedWarehouses([]);
      setAssignedEvents([]);
    }
    setIsAccountActive(true);
    setActiveModal('standardForm');
  };

  // Open Screen 05: Three-Dot Actions Sheet
  const handleOpenActionMenu = (user) => {
    setSelectedUser(user);
    setActiveModal('actionsMenu');
  };

  // Helper to check if user is Super Admin
  const isSelectedUserSuperAdmin = (u) => {
    if (!u) return false;
    const email = (u.email || '').toLowerCase().trim();
    const id = (u.id || '').toUpperCase().trim();
    const userId = (u.userId || '').toUpperCase().trim();
    const role = (u.role || '').toLowerCase().trim();
    return (
      email === 'super.admin@district.com' ||
      id === 'USR-001' ||
      userId === 'ADM-001' ||
      role === 'admin' ||
      role === 'super admin'
    );
  };

  // Open Edit flow from Action Menu
  const handleEditFromActionMenu = () => {
    if (!selectedUser) return;
    const userToEdit = selectedUser;
    setActiveModal(null);
    setIsEditMode(true);
    setFormError('');

    let role = userToEdit.role || 'Warehouse User';
    if (role === 'Operations Manager') role = 'Operation Manager';
    if (role === 'Warehouse Ground User' || role === 'Ground User — Warehouse' || role === 'Warehouse Ground') role = 'Warehouse User';
    if (role === 'Event Ground User' || role === 'Ground User — Event' || role === 'Event Ground') role = 'Event User';
    setSelectedRole(role);
    setFullName(userToEdit.name || '');
    setPhoneNumber(userToEdit.mobile ? userToEdit.mobile.replace('+91 ', '') : '');
    setEmailId(userToEdit.email || '');

    // Separate locations into warehouses and events (strictly active ones from masterService)
    const rawLocs = userToEdit.assignedLocations || [];
    const allWhs = masterService
      .getWarehouses()
      .filter((w) => (w.status || 'active').toLowerCase() === 'active');
    const allEvs = masterService
      .getEvents()
      .filter((e) => (e.status || 'active').toLowerCase() === 'active');
    const whs = [];
    const evs = [];

    rawLocs.forEach((loc) => {
      const locStr = String(loc || '').trim();
      if (!locStr) return;
      const matchedWh = allWhs.find(
        (w) => (w.name || w.code || String(w.id)).toLowerCase() === locStr.toLowerCase()
      );
      const matchedEv = allEvs.find(
        (e) => (e.name || e.code || String(e.id)).toLowerCase() === locStr.toLowerCase()
      );
      if (matchedWh) {
        whs.push(matchedWh.name);
      } else if (matchedEv) {
        evs.push(matchedEv.name);
      }
    });

    if (role === 'Admin') {
      const activeWhNames = allWhs.map((w) => w.name);
      setAssignedWarehouses(Array.from(new Set([...whs, ...activeWhNames])));
      setAssignedEvents([]);
    } else if (role === 'Event Planner') {
      const activeEvNames = allEvs.map((e) => e.name);
      setAssignedEvents(Array.from(new Set([...evs, ...activeEvNames])));
      setAssignedWarehouses([]);
    } else if (role === 'Event User') {
      setAssignedEvents(Array.from(new Set(evs)));
      setAssignedWarehouses([]);
    } else {
      setAssignedWarehouses(Array.from(new Set(whs)));
      setAssignedEvents([]);
    }

    setIsAccountActive(userToEdit.status === 'active');
    setPassword('');
    if (role === 'Warehouse User' || role === 'Event User') {
      const code = (userToEdit.accessCode || userToEdit.userId || '').trim().toUpperCase();
      if (code.startsWith('DS')) {
        setAccessCode(code.slice(0, 5));
      } else if (code) {
        setAccessCode('DS' + code.replace(/[^0-9]/g, '').slice(0, 3));
      } else {
        setAccessCode('DS');
      }
    } else {
      setAccessCode('DS');
    }
    setIsWarehouseDropdownOpen(false);
    setIsEventDropdownOpen(false);
    setActiveModal('standardForm');
  };

  // Toggle user activation/deactivation with short confirmation popup
  const handleToggleActiveStatusWithConfirm = (u) => {
    const targetUser = u || selectedUser;
    if (!targetUser) return;
    setActiveModal(null);
    const isActivating = targetUser.status !== 'active';
    const actionWord = isActivating ? 'Activate' : 'Deactivate';

    Alert.alert(
      `${actionWord} User`,
      `Are you sure you want to ${actionWord.toLowerCase()} ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionWord,
          style: isActivating ? 'default' : 'destructive',
          onPress: () => {
            const res = authService.toggleUserStatus(targetUser.id);
            if (res.success) {
              refreshUsers();
            }
          },
        },
      ]
    );
  };

  // Delete User with short confirmation popup
  const handleDeleteUserWithConfirm = (u) => {
    const targetUser = u || selectedUser;
    if (!targetUser) return;
    setActiveModal(null);
    if (isSelectedUserSuperAdmin(targetUser)) {
      Alert.alert('Restricted', 'Super Admin cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${targetUser.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const res = authService.deleteUser(targetUser.id);
            if (res.success) {
              refreshUsers();
            }
          },
        },
      ]
    );
  };

  const handleToggleActiveStatus = (u) => handleToggleActiveStatusWithConfirm(u || selectedUser);
  const handleDeleteUser = (u) => handleDeleteUserWithConfirm(u || selectedUser);

  // Get full list of available warehouses (ONLY active ones created from masterService)
  const getAvailableWarehouses = () => {
    return masterService
      .getWarehouses()
      .filter((w) => (w.status || 'active').toLowerCase() === 'active')
      .map((w) => ({
        id: String(w.id || w.code || w.name),
        name: w.name || w.code || String(w.id),
        code: w.code || '',
        city: w.city || '',
        type: 'Warehouse',
      }));
  };

  // Get full list of available events (ONLY active ones created from masterService)
  const getAvailableEvents = () => {
    return masterService
      .getEvents()
      .filter((e) => (e.status || 'active').toLowerCase() === 'active')
      .map((e) => ({
        id: String(e.id || e.code || e.name),
        name: e.name || e.code || String(e.id),
        code: e.code || '',
        city: e.city || e.venue || '',
        type: 'Event',
      }));
  };

  // Toggle single warehouse selection (must exist in master to add; always removable)
  const handleToggleWarehouse = (whName) => {
    if (assignedWarehouses.includes(whName)) {
      setAssignedWarehouses(assignedWarehouses.filter((w) => w !== whName));
      return;
    }
    const allWhs = masterService.getWarehouses();
    const exists = allWhs.some(
      (w) => (w.name || w.code || String(w.id)).toLowerCase() === String(whName).toLowerCase()
    );
    if (!exists && allWhs.length > 0) return;
    setAssignedWarehouses([...assignedWarehouses, whName]);
  };

  // Toggle single event selection (must exist in master to add; always removable)
  const handleToggleEvent = (evName) => {
    if (assignedEvents.includes(evName)) {
      setAssignedEvents(assignedEvents.filter((e) => e !== evName));
      return;
    }
    const allEvs = masterService.getEvents();
    const exists = allEvs.some(
      (e) => (e.name || e.code || String(e.id)).toLowerCase() === String(evName).toLowerCase()
    );
    if (!exists && allEvs.length > 0) return;
    setAssignedEvents([...assignedEvents, evName]);
  };

  // Save Standard User (Screen 03)
  // Save Standard User (Screen 03)
  const handleSaveStandardUser = async () => {
    const isGroundRole = selectedRole === 'Warehouse User' || selectedRole === 'Event User';

    if (!fullName.trim()) {
      setFormError('Please enter Full Name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Please enter Phone Number.');
      return;
    }

    let finalAccessCode = '';
    if (isGroundRole) {
      const digits = (accessCode || '').replace(/^DS/i, '').replace(/[^0-9]/g, '');
      if (digits.length !== 3) {
        setFormError('Please enter a 3-digit number after DS (e.g. DS101).');
        return;
      }
      finalAccessCode = `DS${digits}`;
      const targetUserId = isEditMode && selectedUser ? (selectedUser.id || selectedUser.userId) : null;
      if (authService.isAccessCodeTaken(finalAccessCode, targetUserId)) {
        setFormError(`Access Code ${finalAccessCode} already exists! Please enter a different 3-digit number.`);
        return;
      }
    } else {
      if (!emailId.trim()) {
        setFormError('Please enter Email ID.');
        return;
      }
      if (!isEditMode && !password.trim()) {
        setFormError('Please enter a Password.');
        return;
      }
    }

    setFormError('');
    const isWarehouseScoped =
      selectedRole === 'Admin' ||
      selectedRole === 'Operation Manager' ||
      selectedRole === 'Operations Manager' ||
      selectedRole === 'Warehouse User';

    let finalLocations = isWarehouseScoped
      ? Array.from(new Set(assignedWarehouses))
      : Array.from(new Set(assignedEvents));

    // Admin accounts always include all active warehouses created in Master tab
    if (selectedRole === 'Admin') {
      const activeWhNames = masterService
        .getWarehouses()
        .filter((w) => (w.status || 'active').toLowerCase() === 'active')
        .map((w) => w.name);
      finalLocations = Array.from(new Set([...finalLocations, ...activeWhNames]));
    }

    // Event Planner accounts always include all active events created in Master tab
    if (selectedRole === 'Event Planner') {
      const activeEvNames = masterService
        .getEvents()
        .filter((e) => (e.status || 'active').toLowerCase() === 'active')
        .map((e) => e.name);
      finalLocations = Array.from(new Set([...finalLocations, ...activeEvNames]));
    }

    const targetUserId = selectedUser?.id || selectedUser?.userId || selectedUser?.email;

    const userPayload = isGroundRole
      ? {
          name: fullName.trim(),
          mobile: `+91 ${phoneNumber.trim()}`,
          userId: finalAccessCode,
          accessCode: finalAccessCode,
          email: `${finalAccessCode.toLowerCase()}@district.com`,
          role: selectedRole,
          assignedLocations: finalLocations,
          status: isAccountActive ? 'active' : 'inactive',
        }
      : {
          name: fullName.trim(),
          mobile: `+91 ${phoneNumber.trim()}`,
          email: emailId.trim(),
          role: selectedRole,
          assignedLocations: finalLocations,
          status: isAccountActive ? 'active' : 'inactive',
          ...(password ? { password: password.trim() } : {}),
        };

    if (isEditMode && targetUserId) {
      const res = await authService.updateUser(targetUserId, userPayload);
      if (!res.success) {
        setFormError(res.error || 'Failed to update user.');
        return;
      }
      await refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', 'User profile updated successfully.');
    } else {
      const res = await authService.addUser(userPayload);
      if (!res.success) {
        setFormError(res.error || 'Failed to create user.');
        return;
      }
      await refreshUsers();
      setActiveModal(null);
      Alert.alert(
        'Success',
        isGroundRole
          ? `${selectedRole} created successfully with Access Code: ${finalAccessCode}`
          : `${selectedRole} account created successfully.`
      );
    }
  };

  // Save Ground User (Screen 04)
  const handleSaveGroundUser = async () => {
    if (!fullName.trim()) {
      setFormError('Please enter Full Name.');
      return;
    }

    setFormError('');
    const finalRole = groundType === 'Warehouse Ground' ? 'Warehouse User' : 'Event User';
    const combinedLocations = Array.from(new Set([...assignedWarehouses, ...assignedEvents]));
    const targetUserId = selectedUser?.id || selectedUser?.userId || selectedUser?.email;

    if (isEditMode && targetUserId) {
      await authService.updateUser(targetUserId, {
        name: fullName.trim(),
        userId: accessId.trim(),
        accessCode: accessId.trim(),
        role: finalRole,
        assignedLocations: combinedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      await refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', 'Ground user updated successfully.');
    } else {
      await authService.addUser({
        name: fullName.trim(),
        userId: accessId.trim(),
        accessCode: accessId.trim(),
        role: finalRole,
        assignedLocations: combinedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      await refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', `Ground User created with Access ID: ${accessId}`);
    }
  };

  // Dropdown Location Selector matching the user's reference format:
  // Red asterisk: * Storage Warehouse / * Event Location
  // Dropdown input box with placeholder and caret icon
  // Multi-select dropdown list with checkbox next to each real Master location name
  // ZERO mock data; dynamic from masterService
  const renderDropdownLocationSelector = (type) => {
    const isWh = type === 'warehouse';
    const isOpen = isWh ? isWarehouseDropdownOpen : isEventDropdownOpen;
    const setIsOpen = isWh ? setIsWarehouseDropdownOpen : setIsEventDropdownOpen;
    const title = isWh ? 'Storage Warehouse' : 'Event Location';
    const placeholder = isWh ? 'Storage Warehouse' : 'Event Location';
    const available = isWh ? getAvailableWarehouses() : getAvailableEvents();
    const selected = isWh ? assignedWarehouses : assignedEvents;

    const handleToggle = (name) => {
      if (isWh) {
        handleToggleWarehouse(name);
      } else {
        handleToggleEvent(name);
      }
    };

    const handleSelectAll = () => {
      const allNames = available.map((a) => a.name);
      if (isWh) {
        setAssignedWarehouses(allNames);
      } else {
        setAssignedEvents(allNames);
      }
    };

    const handleClearAll = () => {
      if (isWh) {
        setAssignedWarehouses([]);
      } else {
        setAssignedEvents([]);
      }
    };

    let displayText = '';
    if (selected.length === 0) {
      displayText = placeholder;
    } else if (selected.length === 1) {
      displayText = selected[0];
    } else {
      displayText = `${selected.length} Selected (${selected.join(', ')})`;
    }

    return (
      <View style={styles.locDropdownWrapper}>
        {/* Label: * Storage Warehouse (Red asterisk like user screenshot) */}
        <View style={styles.locDropdownLabelRow}>
          <Text style={styles.locDropdownRequiredStar}>* </Text>
          <Text style={styles.locDropdownLabelText}>{title}</Text>
          {selected.length > 0 && (
            <View style={styles.locDropdownCountPill}>
              <Text style={styles.locDropdownCountPillText}>
                {selected.length} Selected
              </Text>
            </View>
          )}
        </View>

        {/* Input Trigger Box */}
        <TouchableOpacity
          style={[
            styles.locDropdownTriggerBox,
            isOpen && styles.locDropdownTriggerBoxOpen,
          ]}
          onPress={() => setIsOpen(!isOpen)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.locDropdownTriggerText,
              selected.length === 0 && styles.locDropdownPlaceholderText,
            ]}
            numberOfLines={1}
          >
            {displayText}
          </Text>
          <Ionicons
            name={isOpen ? 'caret-up' : 'caret-down'}
            size={14}
            color={isOpen ? '#2563EB' : '#6B7280'}
          />
        </TouchableOpacity>

        {/* Dropdown Menu Card (Only visible when isOpen is true) */}
        {isOpen && (
          <View style={styles.locDropdownMenuCard}>
            {/* Quick Actions Header */}
            {available.length > 0 && (
              <View style={styles.locDropdownCardHeader}>
                <Text style={styles.locDropdownAvailableCount}>
                  {available.length} available in Master
                </Text>
                <View style={styles.locDropdownHeaderActions}>
                  {selected.length < available.length && (
                    <TouchableOpacity onPress={handleSelectAll} style={styles.locQuickBtn}>
                      <Text style={styles.locQuickBtnText}>Select All</Text>
                    </TouchableOpacity>
                  )}
                  {selected.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={[styles.locQuickBtn, { marginLeft: 8 }]}>
                      <Text style={[styles.locQuickBtnText, { color: '#EF4444' }]}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Scrollable List with Checkboxes */}
            <ScrollView
              style={styles.locDropdownScroll}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {available.length === 0 ? (
                <View style={styles.locDropdownEmptyBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.locDropdownEmptyText}>
                    No {isWh ? 'warehouses' : 'events'} found in Master. Create one in Master tab first.
                  </Text>
                </View>
              ) : (
                available.map((item) => {
                  const isChecked = selected.includes(item.name);
                  return (
                    <TouchableOpacity
                      key={item.id || item.name}
                      style={[
                        styles.locDropdownItemRow,
                        isChecked && styles.locDropdownItemRowActive,
                      ]}
                      onPress={() => handleToggle(item.name)}
                      activeOpacity={0.7}
                    >
                      {/* Checkbox box with checkmark */}
                      <View style={[styles.locCheckbox, isChecked && styles.locCheckboxChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>

                      {/* Name of Warehouse / Event */}
                      <Text
                        style={[
                          styles.locDropdownItemName,
                          isChecked && styles.locDropdownItemNameChecked,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      {/* Optional location info (City/Code) */}
                      {item.city ? (
                        <Text style={styles.locDropdownItemCity} numberOfLines={1}>
                          {item.city}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderCompactLocationSelector = renderDropdownLocationSelector;

  // Helper for initial avatar letter
  const getInitial = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* 1. USER SETUP SUB-HEADER BANNER (ON WHITE PART UNDER TOP BLUE HEADER - EXACT SAME AS DASHBOARD) */}
      <View style={styles.whiteDashboardHeader}>
        <Text style={styles.headerUserSetupTitle}>User Setup</Text>
        <View style={styles.scopeRow}>
          <View style={styles.scopeDot} />
          <Text style={styles.scopeSubText}>
            Manage team access & warehouse permissions
          </Text>
        </View>
      </View>

      {/* Main List Area (Clean White Page directly under Top Header) */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#9AA3B4" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, User ID or mobile"
            placeholderTextColor="#858198"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#9AA3B4" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills: All Users, Active, Inactive */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              All Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'active' && styles.filterPillActive]}
            onPress={() => setActiveFilter('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'active' && styles.filterPillTextActive]}>
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'inactive' && styles.filterPillActive]}
            onPress={() => setActiveFilter('inactive')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'inactive' && styles.filterPillTextActive]}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <View style={styles.sectRow}>
          <Text style={styles.sectTitle}>Users</Text>
          <Text style={styles.sectCount}>{filteredUsers.length} total</Text>
        </View>

        {/* Empty State or User Cards */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="account-group-outline" size={32} color="#8244EF" />
            </View>
            <Text style={styles.emptyTitle}>No Users Available</Text>
            <Text style={styles.emptySubtitle}>No additional accounts match your search or filter.</Text>
            <Text style={styles.emptySubtitle}>Add a user to get started.</Text>
            <View style={styles.superAdminBadge}>
              <View style={styles.grayDot} />
              <Text style={styles.superAdminText}>Super Admin active · Fresh installation</Text>
            </View>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const isActive = user.status === 'active';
            const initial = getInitial(user.name);
            const displayId = user.userId || user.id || 'WHG-0001';
            const displayRole = user.role || 'Warehouse User';

            return (
              <View key={user.id || user.userId} style={styles.userCard}>
                <View style={styles.userCardInner}>
                  {/* Avatar circle */}
                  <View style={[styles.cardAvatar, !isActive && styles.cardAvatarInactive]}>
                    <Text style={[styles.cardAvatarText, !isActive && styles.cardAvatarTextInactive]}>
                      {initial}
                    </Text>
                  </View>

                  {/* Details column */}
                  <View style={styles.cardDetailsCol}>
                    <Text style={styles.cardName}>{user.name}</Text>
                    <Text style={styles.cardMeta}>{displayRole} · {displayId}</Text>
                    <View style={styles.cardStatusRow}>
                      <View style={[styles.statusBadge, !isActive && styles.statusBadgeInactive]}>
                        <View style={[styles.statusDot, !isActive && styles.statusDotInactive]} />
                        <Text style={[styles.statusText, !isActive && styles.statusTextInactive]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Three-Dot Menu ⋮ Action Button (Screen 05 Trigger) */}
                  <TouchableOpacity
                    style={styles.threeDotBtn}
                    onPress={() => handleOpenActionMenu(user)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#77758B" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button (+ Add User) matching SVG Screen 01 */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fabBtn} onPress={handleStartCreateUser} activeOpacity={0.88}>
          <LinearGradient
            colors={['#9148F7', '#7138E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <View style={styles.fabIconCircle}>
              <Ionicons name="add" size={17} color="#FFFFFF" />
            </View>
            <Text style={styles.fabText}>Add User</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* SCREEN 02: SELECT ROLE MODAL                              */}
      {/* ========================================================= */}
      <Modal visible={activeModal === 'selectRole'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          {/* Header */}
          <View style={styles.subNavyHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.subHeaderTitle}>Add User</Text>
              <Text style={styles.subHeaderSubtitle}>Choose a role to continue</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.roleSelectionTitle}>Select user role</Text>
            <Text style={styles.roleSelectionSub}>
              {isOperationManager
                ? 'Only Warehouse User role is authorized for creation.'
                : 'Form fields change based on the selected role.'}
            </Text>

            {/* 1. Admin */}
            {!isOperationManager && (
              <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Admin')} activeOpacity={0.8}>
                <View style={[styles.roleAvatar, { backgroundColor: '#F0E8FF' }]}>
                  <Text style={[styles.roleAvatarLetter, { color: '#8244EF' }]}>A</Text>
                </View>
                <View style={styles.roleCardTextCol}>
                  <Text style={styles.roleCardName}>Admin</Text>
                  <Text style={styles.roleCardDesc}>Global access & full system administration</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
              </TouchableOpacity>
            )}

            {/* 2. Operation Manager */}
            {!isOperationManager && (
              <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Operation Manager')} activeOpacity={0.8}>
                <View style={[styles.roleAvatar, { backgroundColor: '#F0E8FF' }]}>
                  <Text style={[styles.roleAvatarLetter, { color: '#8244EF' }]}>O</Text>
                </View>
                <View style={styles.roleCardTextCol}>
                  <Text style={styles.roleCardName}>Operation Manager</Text>
                  <Text style={styles.roleCardDesc}>Authorized warehouse operations & setup</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
              </TouchableOpacity>
            )}

            {/* 3. Warehouse User */}
            <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Warehouse User')} activeOpacity={0.8}>
              <View style={[styles.roleAvatar, { backgroundColor: '#E5FAF3' }]}>
                <Text style={[styles.roleAvatarLetter, { color: '#159A79' }]}>W</Text>
              </View>
              <View style={styles.roleCardTextCol}>
                <Text style={styles.roleCardName}>Warehouse User</Text>
                <Text style={styles.roleCardDesc}>Warehouse inventory & stock movement</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
            </TouchableOpacity>

            {/* 4. Event User */}
            {!isOperationManager && (
              <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Event User')} activeOpacity={0.8}>
                <View style={[styles.roleAvatar, { backgroundColor: '#E5FAF3' }]}>
                  <Text style={[styles.roleAvatarLetter, { color: '#159A79' }]}>E</Text>
                </View>
                <View style={styles.roleCardTextCol}>
                  <Text style={styles.roleCardName}>Event User</Text>
                  <Text style={styles.roleCardDesc}>Event site inventory & stock movement</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
              </TouchableOpacity>
            )}

            {/* 5. Event Planner */}
            {!isOperationManager && (
              <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Event Planner')} activeOpacity={0.8}>
                <View style={[styles.roleAvatar, { backgroundColor: '#FFF0D9' }]}>
                  <Text style={[styles.roleAvatarLetter, { color: '#D28A22' }]}>P</Text>
                </View>
                <View style={styles.roleCardTextCol}>
                  <Text style={styles.roleCardName}>Event Planner</Text>
                  <Text style={styles.roleCardDesc}>Assigned event scope & requisitions</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* SCREEN 03: STANDARD USER FORM MODAL                       */}
      {/* ========================================================= */}
      <Modal visible={activeModal === 'standardForm'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          <View style={styles.subNavyHeader}>
            <TouchableOpacity onPress={() => setActiveModal(isEditMode ? null : 'selectRole')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.subHeaderTitle}>{isEditMode ? 'Edit User' : 'Create User'}</Text>
              <Text style={styles.subHeaderSubtitle}>Account details and assignments</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.formSectHeader}>Personal & login details</Text>

            <Text style={styles.formInputLabel}>
              Full Name <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Enter full name" placeholderTextColor="#9AA3B4" value={fullName} onChangeText={setFullName} />
            </View>

            <Text style={styles.formInputLabel}>
              Phone Number <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>+91 </Text>
              <TextInput style={styles.textInput} placeholder="Enter mobile number" placeholderTextColor="#9AA3B4" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
            </View>

            {selectedRole === 'Warehouse User' || selectedRole === 'Event User' ? (
              <>
                <Text style={styles.formInputLabel}>
                  Access Code <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                </Text>
                <View style={styles.accessCodeFieldWrapper}>
                  <View style={styles.accessCodePrefixPill}>
                    <Text style={styles.accessCodePrefixPillText}>DS</Text>
                  </View>
                  <TextInput
                    style={styles.accessCodeNumberInput}
                    placeholder="101"
                    placeholderTextColor="#9AA3B4"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={accessCode.replace(/^DS/i, '')}
                    onChangeText={(val) => {
                      const digits = val.replace(/[^0-9]/g, '').slice(0, 3);
                      setAccessCode('DS' + digits);
                      setFormError('');
                    }}
                  />
                  <View style={styles.accessCodeTagPill}>
                    <Text style={styles.accessCodeTagPillText}>3 Digits</Text>
                  </View>
                </View>
                <Text style={styles.accessCodeHelperText}>
                  Enter a unique 3-digit number after DS (e.g. DS101, DS002)
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.formInputLabel}>
                  Email ID <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@company.com"
                    placeholderTextColor="#9AA3B4"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={emailId}
                    onChangeText={setEmailId}
                  />
                </View>

                {!isEditMode && (
                  <>
                    <Text style={styles.formInputLabel}>
                      Password <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Set a secure password"
                        placeholderTextColor="#9AA3B4"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9AA3B4" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            <Text style={styles.formSectHeader}>Location assignments</Text>
            {/* Show Warehouse Assignment for Admin, Operation Manager, and Warehouse User */}
            {(selectedRole === 'Admin' ||
              selectedRole === 'Operation Manager' ||
              selectedRole === 'Operations Manager' ||
              selectedRole === 'Warehouse User') && (
              renderCompactLocationSelector('warehouse')
            )}

            {/* Show Event Assignment for Event User and Event Planner */}
            {(selectedRole === 'Event User' ||
              selectedRole === 'Event Planner') && (
              renderCompactLocationSelector('event')
            )}

            <Text style={styles.formInputLabel}>Account Status</Text>
            <View style={styles.statusToggleRow}>
              <Text style={styles.statusToggleLabel}>{isAccountActive ? 'Active' : 'Inactive'}</Text>
              <Switch value={isAccountActive} onValueChange={setIsAccountActive} trackColor={{ false: '#E2E8F0', true: '#7138E8' }} thumbColor="#FFFFFF" />
            </View>

            {/* Actions */}
            <View style={styles.formButtonsRow}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSaveStandardUser}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.formSubmitGradient}>
                  <Text style={styles.formSubmitBtnText}>{isEditMode ? 'Save Changes' : 'Review & Save'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.formFootnote}>Only permitted assignments are selectable</Text>
            <Text style={styles.formFootnote}>Password stored securely by authentication service</Text>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* SCREEN 04: GROUND USER FORM MODAL                         */}
      {/* ========================================================= */}
      <Modal visible={activeModal === 'groundForm'} animationType="slide" transparent={false}>
        <View style={styles.modalRoot}>
          <View style={styles.subNavyHeader}>
            <TouchableOpacity onPress={() => setActiveModal(isEditMode ? null : 'selectRole')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.subHeaderTitle}>{isEditMode ? 'Edit Ground User' : 'Create Ground User'}</Text>
              <Text style={styles.subHeaderSubtitle}>Ground account setup</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            {/* Ground User Type Selector */}
            <Text style={styles.formSectHeader}>Ground user type</Text>
            <View style={styles.groundTypeSelector}>
              <TouchableOpacity
                style={[styles.groundTypeCard, groundType === 'Warehouse Ground' && styles.groundTypeCardActive]}
                onPress={() => setGroundType('Warehouse Ground')}
              >
                <View style={[styles.radioCircle, groundType === 'Warehouse Ground' && styles.radioCircleActive]} />
                <View>
                  <Text style={[styles.groundTypeTitle, groundType === 'Warehouse Ground' && styles.groundTypeTitleActive]}>Warehouse Ground</Text>
                  <Text style={styles.groundTypeSub}>Warehouse task access</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.groundTypeCard, groundType === 'Event Ground' && styles.groundTypeCardActive]}
                onPress={() => setGroundType('Event Ground')}
              >
                <View style={[styles.radioCircle, groundType === 'Event Ground' && styles.radioCircleActive]} />
                <View>
                  <Text style={[styles.groundTypeTitle, groundType === 'Event Ground' && styles.groundTypeTitleActive]}>Event Ground</Text>
                  <Text style={styles.groundTypeSub}>Event task access</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.formSectHeader}>User details</Text>

            <Text style={styles.formInputLabel}>
              Full Name <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Enter full name" placeholderTextColor="#9AA3B4" value={fullName} onChangeText={setFullName} />
            </View>

            <Text style={styles.formInputLabel}>
              Access ID <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={accessId}
                onChangeText={setAccessId}
                editable={isEditingAccessId}
              />
              <TouchableOpacity
                style={styles.editIdBtn}
                onPress={() => setIsEditingAccessId(!isEditingAccessId)}
              >
                <Text style={styles.editIdBtnText}>{isEditingAccessId ? 'Done' : 'Edit ID'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldHint}>Generated automatically; editable by authorized creator.</Text>

            <Text style={styles.formSectHeader}>Location assignments</Text>
            {groundType === 'Warehouse Ground' && renderCompactLocationSelector('warehouse')}
            {groundType === 'Event Ground' && renderCompactLocationSelector('event')}

            <Text style={styles.formInputLabel}>Account Status</Text>
            <View style={styles.statusToggleRow}>
              <Text style={styles.statusToggleLabel}>{isAccountActive ? 'Active' : 'Inactive'}</Text>
              <Switch value={isAccountActive} onValueChange={setIsAccountActive} trackColor={{ false: '#E2E8F0', true: '#7138E8' }} thumbColor="#FFFFFF" />
            </View>

            {/* Actions */}
            <View style={styles.formButtonsRow}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSaveGroundUser}>
                <LinearGradient colors={['#9148F7', '#7138E8']} style={styles.formSubmitGradient}>
                  <Text style={styles.formSubmitBtnText}>{isEditMode ? 'Save Changes' : 'Review & Save'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.formFootnote}>Ground login method configured separately</Text>
            <Text style={styles.formFootnote}>No email/password fields in this form</Text>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* THREE-DOT SHORT ACTIONS POPUP                             */}
      {/* ========================================================= */}
      <Modal
        visible={activeModal === 'actionsMenu'}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.compactActionsBackdrop}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View
            style={styles.compactActionsCard}
            onStartShouldSetResponder={() => true}
          >
            {selectedUser && (
              <>
                {/* Header: User Name, Role & Close Button */}
                <View style={styles.compactMenuHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.compactMenuUserName} numberOfLines={1}>
                      {selectedUser.name}
                    </Text>
                    <Text style={styles.compactMenuUserRole} numberOfLines={1}>
                      {selectedUser.role?.replace(' User', '')} · {selectedUser.userId || selectedUser.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveModal(null)}
                    style={styles.compactCloseBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.compactMenuDivider} />

                {/* Option 1: Edit */}
                <TouchableOpacity
                  style={styles.compactMenuItem}
                  onPress={handleEditFromActionMenu}
                  activeOpacity={0.7}
                >
                  <View style={[styles.compactMenuIconBox, { backgroundColor: '#F3EEFF' }]}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#8235F4" />
                  </View>
                  <Text style={styles.compactMenuItemText}>Edit</Text>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Option 2: Deactivate / Activate */}
                <TouchableOpacity
                  style={styles.compactMenuItem}
                  onPress={() => handleToggleActiveStatusWithConfirm(selectedUser)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.compactMenuIconBox,
                      {
                        backgroundColor:
                          selectedUser.status === 'active' ? '#FEF2F2' : '#ECFDF5',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedUser.status === 'active'
                          ? 'pause-circle-outline'
                          : 'checkmark-circle-outline'
                      }
                      size={18}
                      color={
                        selectedUser.status === 'active' ? '#EF4444' : '#10B981'
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.compactMenuItemText,
                      selectedUser.status !== 'active' && { color: '#059669' },
                    ]}
                  >
                    {selectedUser.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Option 3: Delete (Super Admin cannot be deleted) */}
                {!isSelectedUserSuperAdmin(selectedUser) && (
                  <TouchableOpacity
                    style={styles.compactMenuItem}
                    onPress={() => handleDeleteUserWithConfirm(selectedUser)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.compactMenuIconBox, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                    </View>
                    <Text style={[styles.compactMenuItemText, { color: '#DC2626', fontWeight: '700' }]}>
                      Delete
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
                  </TouchableOpacity>
                )}

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.compactCancelBtn}
                  onPress={() => setActiveModal(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.compactCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* SMART SEARCHABLE MULTI-SELECT LOCATION PICKER MODAL       */}
      {/* Handles 500+ Warehouses or Events efficiently             */}
      {/* ========================================================= */}
      <Modal
        visible={locationPickerType !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setLocationPickerType(null)}
      >
        {(() => {
          const isWh = locationPickerType === 'warehouse';
          const title = isWh ? 'Assign Warehouses' : 'Assign Events';
          const available = isWh ? getAvailableWarehouses() : getAvailableEvents();
          const selected = isWh ? assignedWarehouses : assignedEvents;
          const themeGradient = isWh ? ['#8235F4', '#5E22BF'] : ['#0D9488', '#0F766E'];
          const themeColor = isWh ? '#8235F4' : '#0D9488';
          const themeBg = isWh ? '#F4F0FF' : '#E6F8F6';
          const themeBorder = isWh ? '#E5DCFC' : '#CEF0EB';
          const iconName = isWh ? 'warehouse' : 'calendar-star';

          const filtered = available.filter((item) => {
            if (!pickerSearchQuery.trim()) return true;
            const q = pickerSearchQuery.toLowerCase().trim();
            return (
              (item.name || '').toLowerCase().includes(q) ||
              (item.code || '').toLowerCase().includes(q) ||
              (item.city || '').toLowerCase().includes(q)
            );
          });

          const handleSelectAllFiltered = () => {
            const namesToSelect = filtered.map((item) => item.name);
            if (isWh) {
              setAssignedWarehouses(Array.from(new Set([...assignedWarehouses, ...namesToSelect])));
            } else {
              setAssignedEvents(Array.from(new Set([...assignedEvents, ...namesToSelect])));
            }
          };

          const handleClearAll = () => {
            if (isWh) {
              setAssignedWarehouses([]);
            } else {
              setAssignedEvents([]);
            }
          };

          return (
            <View style={styles.locModalRoot}>
              {/* Header */}
              <LinearGradient colors={themeGradient} style={styles.locModalHeader}>
                <View style={styles.locModalHeaderLeft}>
                  <TouchableOpacity
                    onPress={() => setLocationPickerType(null)}
                    style={styles.locModalBackBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locModalTitle}>{title}</Text>
                    <Text style={styles.locModalSub}>
                      {selected.length} selected · {available.length} in Master
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.locModalHeaderDoneBtn}
                  onPress={() => setLocationPickerType(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.locModalHeaderDoneText, { color: themeColor }]}>Done</Text>
                </TouchableOpacity>
              </LinearGradient>

              {/* Instant Search Bar (Only shown if Master has locations) */}
              {available.length > 0 && (
                <View style={styles.locSearchContainer}>
                  <View style={styles.locSearchBar}>
                    <Ionicons name="search-outline" size={17} color="#9CA3AF" />
                    <TextInput
                      style={styles.locSearchInput}
                      placeholder={`Search ${available.length} ${isWh ? 'warehouses' : 'events'} in Master...`}
                      placeholderTextColor="#9CA3AF"
                      value={pickerSearchQuery}
                      onChangeText={setPickerSearchQuery}
                    />
                    {pickerSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setPickerSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Filter Stats & Batch Action Row */}
              <View style={styles.locFilterStatsBar}>
                <Text style={styles.locFilterCountText}>
                  {available.length === 0
                    ? `0 ${isWh ? 'warehouses' : 'events'} created in Master`
                    : `Showing ${filtered.length} of ${available.length} in Master`}
                </Text>
                {available.length > 0 && (
                  <View style={styles.locBatchActions}>
                    {filtered.length > 0 && (
                      <TouchableOpacity style={styles.locBatchBtn} onPress={handleSelectAllFiltered}>
                        <Text style={[styles.locBatchBtnText, { color: themeColor }]}>Select All</Text>
                      </TouchableOpacity>
                    )}
                    {selected.length > 0 && (
                      <TouchableOpacity style={styles.locBatchBtn} onPress={handleClearAll}>
                        <Text style={[styles.locBatchBtnText, { color: '#EF4444' }]}>Clear All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Scrollable checklist of Master items */}
              <FlatList
                data={filtered}
                keyExtractor={(item, index) => item.id || item.name || String(index)}
                style={styles.locList}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={25}
                windowSize={10}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item }) => {
                  const isChecked = selected.includes(item.name);
                  return (
                    <TouchableOpacity
                      style={[styles.locItemRow, isChecked && styles.locItemRowSelected]}
                      onPress={() => (isWh ? handleToggleWarehouse(item.name) : handleToggleEvent(item.name))}
                      activeOpacity={0.65}
                    >
                      <View style={styles.locItemCheckbox}>
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? themeColor : '#9CA3AF'}
                        />
                      </View>
                      <View style={styles.locItemContent}>
                        <Text style={[styles.locItemName, isChecked && { color: themeColor }]}>
                          {item.name}
                        </Text>
                        {(item.code || item.city) ? (
                          <Text style={styles.locItemSub}>
                            {[item.code, item.city].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      {isChecked && (
                        <View style={[styles.compactCountBadge, { backgroundColor: themeBg, borderColor: themeBorder, borderWidth: 1 }]}>
                          <Text style={[styles.compactCountText, { color: themeColor }]}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.locEmptyState}>
                    <MaterialCommunityIcons name={iconName} size={44} color="#D1D5DB" />
                    <Text style={styles.locEmptyText}>
                      {available.length === 0
                        ? `No ${isWh ? 'Warehouses' : 'Events'} in Master`
                        : `No matching ${isWh ? 'warehouses' : 'events'}`}
                    </Text>
                    <Text style={styles.locEmptyHint}>
                      {available.length === 0
                        ? `Only ${isWh ? 'warehouses' : 'events'} created in Master can be assigned. Please create ${isWh ? 'warehouses' : 'events'} in Master tab first.`
                        : `No ${isWh ? 'warehouses' : 'events'} match "${pickerSearchQuery}".`}
                    </Text>
                  </View>
                }
              />

              {/* Sticky Bottom Apply Bar */}
              <View style={styles.locBottomStickyBar}>
                <View>
                  <Text style={styles.locBottomSummaryText}>
                    {selected.length} {isWh ? 'Warehouse(s)' : 'Event(s)'} assigned
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>
                    {selected.length === 0 ? 'User will have no location access' : 'Ready to save'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.locApplyBtn}
                  onPress={() => setLocationPickerType(null)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={themeGradient} style={styles.locApplyBtnGradient}>
                    <Text style={styles.locApplyBtnText}>Apply Selection</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  whiteDashboardHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F5',
  },
  headerUserSetupTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1435',
    letterSpacing: -0.3,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scopeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20C997',
    marginRight: 6,
  },
  scopeSubText: {
    fontSize: 11,
    color: '#706984',
    fontWeight: '500',
  },
  navyHeader: {
    backgroundColor: '#160D33',
    paddingTop: 8,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#352051',
    borderWidth: 1,
    borderColor: '#54318A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 13,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#20C997',
    marginRight: 6,
  },
  adminBadgeText: {
    color: '#E9DFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#C9B9F0',
    marginTop: 2,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#120B28',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#35215B',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BDA0FF',
    letterSpacing: 0.3,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E2EF',
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#35304D',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E1EB',
    borderRadius: 16,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#EEE8FF',
    borderColor: '#C8B8FF',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#35304D',
  },
  filterPillTextActive: {
    color: '#7138E8',
    fontWeight: '700',
  },
  sectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#27213F',
  },
  sectCount: {
    fontSize: 11,
    color: '#858198',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E2EF',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F4F0FF',
    borderWidth: 1.5,
    borderColor: '#DED3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#282044',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#858198',
    textAlign: 'center',
    lineHeight: 16,
  },
  superAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E4EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 18,
  },
  grayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9AA4B6',
    marginRight: 6,
  },
  superAdminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#596579',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E2EF',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#241442',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  userCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#39215C',
    borderWidth: 1.5,
    borderColor: '#8A46F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardAvatarInactive: {
    backgroundColor: '#2E2A3C',
    borderColor: '#625E73',
  },
  cardAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#C49AFF',
  },
  cardAvatarTextInactive: {
    color: '#9E9AA9',
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#20183C',
  },
  cardMeta: {
    fontSize: 11.5,
    color: '#858198',
    marginTop: 2,
  },
  cardStatusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D3B31',
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F0F5',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C993',
    marginRight: 5,
  },
  statusDotInactive: {
    backgroundColor: '#858198',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6FE0BB',
  },
  statusTextInactive: {
    color: '#858198',
  },
  cardLocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginLeft: 6,
  },
  cardLocBadgeNull: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardLocBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  cardLocBadgeTextNull: {
    color: '#DC2626',
  },
  threeDotBtn: {
    padding: 6,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fabBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#7138E8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  fabIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Sub-Header Styles
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  subNavyHeader: {
    backgroundColor: '#160F2F',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 14,
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subHeaderSubtitle: {
    fontSize: 12,
    color: '#C9B9F0',
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  // Role Selection Styles (Screen 02)
  roleSelectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#27213F',
  },
  roleSelectionSub: {
    fontSize: 11.5,
    color: '#858198',
    marginTop: 2,
    marginBottom: 16,
  },
  roleSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E2EF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },
  roleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleAvatarLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  roleCardTextCol: {
    flex: 1,
  },
  roleCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#282044',
  },
  roleCardDesc: {
    fontSize: 11,
    color: '#858198',
    marginTop: 2,
  },
  groundSelectCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E2EF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },
  groundSelectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groundSubOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  groundSubBtn: {
    flex: 1,
    backgroundColor: '#F3EEFF',
    borderWidth: 1,
    borderColor: '#D8C8FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  groundSubBtnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7138E8',
  },
  groundSubBtnSub: {
    fontSize: 9.5,
    color: '#77718F',
    marginTop: 2,
  },

  // Form Fields (Screens 03 and 04)
  formSectHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#27213F',
    marginTop: 8,
    marginBottom: 10,
  },
  formInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B3555',
    marginBottom: 6,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E1ED',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B3555',
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#35304D',
    padding: 0,
  },
  lockedRoleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#35304D',
  },
  fieldHint: {
    fontSize: 10,
    color: '#858198',
    marginBottom: 10,
  },
  editIdBtn: {
    backgroundColor: '#EEE8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editIdBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7138E8',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  locationChip: {
    backgroundColor: '#EEE8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  locationChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7138E8',
  },
  addLocationChip: {
    backgroundColor: '#F8F6FD',
    borderWidth: 1,
    borderColor: '#E4E1ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addLocationChipText: {
    fontSize: 10.5,
    color: '#77718F',
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F6FD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  statusToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#35304D',
  },
  formButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formCancelBtn: {
    width: 95,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DEED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#35304D',
  },
  formSubmitBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    overflow: 'hidden',
  },
  formSubmitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formFootnote: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#858198',
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 6,
  },

  // Ground Type Selector in Screen 04
  groundTypeSelector: {
    gap: 8,
    marginBottom: 12,
  },
  groundTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E1ED',
    borderRadius: 11,
    padding: 12,
  },
  groundTypeCardActive: {
    backgroundColor: '#F0E9FF',
    borderColor: '#C8B8FF',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#9AA3B4',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#7138E8',
    backgroundColor: '#7138E8',
  },
  groundTypeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B3555',
  },
  groundTypeTitleActive: {
    color: '#7138E8',
  },
  groundTypeSub: {
    fontSize: 10.5,
    color: '#858198',
    marginTop: 1,
  },

  // Compact Three-Dot Action Popup Styles
  compactActionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  compactActionsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  compactMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  compactMenuUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  compactMenuUserRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  compactCloseBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  compactMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  compactMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8F9FD',
  },
  compactMenuItemLast: {
    marginBottom: 12,
  },
  compactMenuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactMenuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  compactCancelBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
  compactCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  // Compact Location Selector on Forms
  compactAssignBox: {
    marginBottom: 12,
  },
  compactAssignHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactAssignTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAssignIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  compactAssignTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#282044',
  },
  compactCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  compactCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  compactManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compactManageBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    marginRight: 2,
  },
  compactEmptyHintBar: {
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#ECE8F5',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactEmptyHintText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  compactChipsScroll: {
    maxHeight: 34,
  },
  compactChipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 6,
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactChipText: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 140,
  },

  // Searchable Multi-Select Modal for 500+ Items
  locModalRoot: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  locModalHeader: {
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locModalBackBtn: {
    marginRight: 12,
  },
  locModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locModalSub: {
    fontSize: 11.5,
    color: '#E0E7FF',
    marginTop: 2,
  },
  locModalHeaderDoneBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locModalHeaderDoneText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  locSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
    marginLeft: 8,
  },
  locQuickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  locQuickAddInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    fontSize: 12,
    color: '#1F2937',
  },
  locQuickAddBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locQuickAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  locFilterStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locFilterCountText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  locBatchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locBatchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  locBatchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  locList: {
    flex: 1,
  },
  locItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locItemRowSelected: {
    backgroundColor: '#F8F5FF',
  },
  locItemCheckbox: {
    marginRight: 12,
  },
  locItemContent: {
    flex: 1,
  },
  locItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  locItemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  locEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  locEmptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  locEmptyHint: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  locBottomStickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  locBottomSummaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
  },
  locApplyBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  locApplyBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  accessCodeFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#7138E8',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 48,
    marginBottom: 4,
    shadowColor: '#7138E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  accessCodePrefixPill: {
    backgroundColor: '#F0E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D8C6FA',
  },
  accessCodePrefixPillText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#7138E8',
    letterSpacing: 1,
  },
  accessCodeNumberInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 2,
    paddingVertical: 4,
  },
  accessCodeTagPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  accessCodeTagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  accessCodeHelperText: {
    fontSize: 11,
    color: '#7138E8',
    fontWeight: '600',
    marginBottom: 14,
    marginLeft: 2,
  },
  locDropdownWrapper: {
    marginBottom: 16,
  },
  locDropdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locDropdownRequiredStar: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  locDropdownLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  locDropdownCountPill: {
    marginLeft: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  locDropdownCountPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  locDropdownTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  locDropdownTriggerBoxOpen: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  locDropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginRight: 8,
  },
  locDropdownPlaceholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  locDropdownMenuCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 100,
  },
  locDropdownCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locDropdownAvailableCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  locDropdownHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locQuickBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locQuickBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  locDropdownScroll: {
    maxHeight: 210,
  },
  locDropdownEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  locDropdownEmptyText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  locDropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locDropdownItemRowActive: {
    backgroundColor: '#F8FAFC',
  },
  locCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locCheckboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  locDropdownItemName: {
    flex: 1,
    fontSize: 13.5,
    color: '#1F2937',
    fontWeight: '500',
  },
  locDropdownItemNameChecked: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  locDropdownItemCity: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
});
