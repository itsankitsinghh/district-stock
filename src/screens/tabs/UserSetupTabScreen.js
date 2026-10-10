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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../services/authService';
import { COLORS } from '../../theme/colors';

// Warehouses & Events catalog
const WAREHOUSE_LIST = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Warehouse D'];
const EVENT_LIST = ['Event A', 'Event B', 'Event C', 'Main Arena Hub'];

export default function UserSetupTabScreen({ session, onLogout }) {
  // State for user list & stats
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: '0', active: '0', inactive: '0' });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');

  // Screen flow navigation modals
  // 1: List (main screen)
  // 2: Screen 02 (Select Role)
  // 3: Screen 03 (Standard User Form)
  // 4: Screen 04 (Ground User Form)
  // 5: Screen 05 (Three-Dot Actions Sheet)
  const [activeModal, setActiveModal] = useState(null); // 'selectRole' | 'standardForm' | 'groundForm' | 'actionsMenu' | null
  const [selectedRole, setSelectedRole] = useState('Operations Manager');
  const [groundType, setGroundType] = useState('Warehouse Ground'); // 'Warehouse Ground' | 'Event Ground'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accessId, setAccessId] = useState('');
  const [isEditingAccessId, setIsEditingAccessId] = useState(false);
  const [assignedLocations, setAssignedLocations] = useState(['Warehouse A']);
  const [isAccountActive, setIsAccountActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Load and refresh user records
  const refreshUsers = () => {
    const list = authService.getUsers();
    setUsers(list);
    const m = authService.getUserMetrics();
    setMetrics(m);
  };

  useEffect(() => {
    refreshUsers();
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
    setActiveModal('selectRole');
  };

  // Select Role and advance to Screen 03 or Screen 04
  const handleSelectRole = (role, groundSubtype = null) => {
    setSelectedRole(role);
    setFormError('');

    if (role === 'Ground User' || role === 'Warehouse Ground User' || role === 'Event Ground User') {
      const gType = groundSubtype || (role === 'Event Ground User' ? 'Event Ground' : 'Warehouse Ground');
      setGroundType(gType);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = gType === 'Warehouse Ground' ? `WHG-${randomNum}` : `EVG-${randomNum}`;
      setAccessId(generatedCode);
      setIsEditingAccessId(false);
      setFullName('');
      setAssignedLocations(gType === 'Warehouse Ground' ? ['Warehouse A'] : ['Event A']);
      setIsAccountActive(true);
      setActiveModal('groundForm');
    } else {
      setFullName('');
      setPhoneNumber('');
      setEmailId('');
      setPassword('');
      setAssignedLocations(role === 'Event Planner' ? ['Event A'] : ['Warehouse A', 'Warehouse B']);
      setIsAccountActive(true);
      setActiveModal('standardForm');
    }
  };

  // Open Screen 05: Three-Dot Actions Sheet
  const handleOpenActionMenu = (user) => {
    setSelectedUser(user);
    setActiveModal('actionsMenu');
  };

  // Open Edit flow from Action Menu
  const handleEditFromActionMenu = () => {
    if (!selectedUser) return;
    setIsEditMode(true);
    setFormError('');

    const role = selectedUser.role || 'Warehouse Ground User';
    setSelectedRole(role);
    setFullName(selectedUser.name || '');
    setPhoneNumber(selectedUser.mobile ? selectedUser.mobile.replace('+91 ', '') : '');
    setEmailId(selectedUser.email || '');
    setAssignedLocations(selectedUser.assignedLocations || ['Warehouse A']);
    setIsAccountActive(selectedUser.status === 'active');

    if (role.includes('Ground')) {
      const gType = role.includes('Event') ? 'Event Ground' : 'Warehouse Ground';
      setGroundType(gType);
      setAccessId(selectedUser.userId || selectedUser.id || 'WHG-0001');
      setIsEditingAccessId(false);
      setActiveModal('groundForm');
    } else {
      setPassword('');
      setActiveModal('standardForm');
    }
  };

  // Toggle user activation/deactivation
  const handleToggleActiveStatus = () => {
    if (!selectedUser) return;
    const res = authService.toggleUserStatus(selectedUser.id);
    if (res.success) {
      refreshUsers();
      setSelectedUser((prev) => ({ ...prev, status: res.status }));
      Alert.alert(
        'Status Updated',
        `Account has been ${res.status === 'active' ? 'Activated' : 'Deactivated'} successfully.`
      );
    }
  };

  // Delete User with safeguard
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    if (selectedUser.id === 'USR-001' || selectedUser.userId === 'ADM-001') {
      Alert.alert('Restricted Action', 'Never allow deletion of the last Super Admin.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedUser.name}? This action will permanently remove account access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete User',
          style: 'destructive',
          onPress: () => {
            const res = authService.deleteUser(selectedUser.id);
            if (res.success) {
              refreshUsers();
              setActiveModal(null);
              Alert.alert('Deleted', 'User account removed from system.');
            }
          },
        },
      ]
    );
  };

  // Toggle location assignment chip
  const handleToggleLocation = (loc) => {
    if (assignedLocations.includes(loc)) {
      if (assignedLocations.length > 1) {
        setAssignedLocations(assignedLocations.filter((l) => l !== loc));
      } else {
        Alert.alert('Notice', 'At least one location must remain assigned.');
      }
    } else {
      setAssignedLocations([...assignedLocations, loc]);
    }
  };

  // Save Standard User (Screen 03)
  const handleSaveStandardUser = () => {
    if (!fullName.trim()) {
      setFormError('Please enter Full Name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Please enter Phone Number.');
      return;
    }
    if (!emailId.trim()) {
      setFormError('Please enter Email ID.');
      return;
    }

    setFormError('');

    if (isEditMode && selectedUser) {
      authService.updateUser(selectedUser.id, {
        name: fullName.trim(),
        mobile: `+91 ${phoneNumber.trim()}`,
        email: emailId.trim(),
        role: selectedRole,
        assignedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', 'User profile updated successfully.');
    } else {
      authService.addUser({
        name: fullName.trim(),
        mobile: `+91 ${phoneNumber.trim()}`,
        email: emailId.trim(),
        role: selectedRole,
        assignedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', `${selectedRole} account created successfully.`);
    }
  };

  // Save Ground User (Screen 04)
  const handleSaveGroundUser = () => {
    if (!fullName.trim()) {
      setFormError('Please enter Full Name.');
      return;
    }

    setFormError('');
    const finalRole = groundType === 'Warehouse Ground' ? 'Warehouse Ground User' : 'Event Ground User';

    if (isEditMode && selectedUser) {
      authService.updateUser(selectedUser.id, {
        name: fullName.trim(),
        userId: accessId.trim(),
        role: finalRole,
        assignedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', 'Ground user updated successfully.');
    } else {
      authService.addUser({
        name: fullName.trim(),
        userId: accessId.trim(),
        role: finalRole,
        assignedLocations,
        status: isAccountActive ? 'active' : 'inactive',
      });
      refreshUsers();
      setActiveModal(null);
      Alert.alert('Success', `Ground User created with Access ID: ${accessId}`);
    }
  };

  // Helper for initial avatar letter
  const getInitial = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* SCREEN 01: USER LIST (MAIN SCREEN)                        */}
      {/* ========================================================= */}
      {/* Top Navy Gradient Header matching Figma SVG Screen 01 */}
      <View style={styles.navyHeader}>
        {/* Admin Role Badge & Logout */}
        <View style={styles.headerTopRow}>
          <View style={styles.adminBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={15} color="#D8B4FE" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.headerTitle}>User Setup</Text>
        <Text style={styles.headerSubtitle}>Manage users and access</Text>

        {/* 3 Metrics Cards (TOTAL USERS, ACTIVE, INACTIVE) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL USERS</Text>
            <Text style={styles.metricVal}>{metrics.total}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE</Text>
            <Text style={styles.metricVal}>{metrics.active}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>INACTIVE</Text>
            <Text style={styles.metricVal}>{metrics.inactive}</Text>
          </View>
        </View>
      </View>

      {/* Main List Area */}
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
            const roleShort = user.role.replace(' User', '');

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
                    <Text style={styles.cardMeta}>{roleShort} · {displayId}</Text>
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
            <Text style={styles.roleSelectionSub}>Form fields change based on the selected role.</Text>

            {/* 1. Admin */}
            <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Admin')} activeOpacity={0.8}>
              <View style={[styles.roleAvatar, { backgroundColor: '#F0E8FF' }]}>
                <Text style={[styles.roleAvatarLetter, { color: '#8244EF' }]}>A</Text>
              </View>
              <View style={styles.roleCardTextCol}>
                <Text style={styles.roleCardName}>Admin</Text>
                <Text style={styles.roleCardDesc}>Global access</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
            </TouchableOpacity>

            {/* 2. Operations Manager */}
            <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Operations Manager')} activeOpacity={0.8}>
              <View style={[styles.roleAvatar, { backgroundColor: '#F0E8FF' }]}>
                <Text style={[styles.roleAvatarLetter, { color: '#8244EF' }]}>O</Text>
              </View>
              <View style={styles.roleCardTextCol}>
                <Text style={styles.roleCardName}>Operations Manager</Text>
                <Text style={styles.roleCardDesc}>Authorized warehouse scope</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
            </TouchableOpacity>

            {/* 3. Event Planner */}
            <TouchableOpacity style={styles.roleSelectCard} onPress={() => handleSelectRole('Event Planner')} activeOpacity={0.8}>
              <View style={[styles.roleAvatar, { backgroundColor: '#FFF0D9' }]}>
                <Text style={[styles.roleAvatarLetter, { color: '#D28A22' }]}>E</Text>
              </View>
              <View style={styles.roleCardTextCol}>
                <Text style={styles.roleCardName}>Event Planner</Text>
                <Text style={styles.roleCardDesc}>Assigned event scope</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9B96AE" />
            </TouchableOpacity>

            {/* 4. Ground User (Split sub-options) */}
            <View style={styles.groundSelectCard}>
              <View style={styles.groundSelectTopRow}>
                <View style={[styles.roleAvatar, { backgroundColor: '#E5FAF3' }]}>
                  <Text style={[styles.roleAvatarLetter, { color: '#159A79' }]}>G</Text>
                </View>
                <View style={styles.roleCardTextCol}>
                  <Text style={styles.roleCardName}>Ground User</Text>
                  <Text style={styles.roleCardDesc}>Choose ground user type</Text>
                </View>
              </View>

              <View style={styles.groundSubOptionsRow}>
                <TouchableOpacity
                  style={styles.groundSubBtn}
                  onPress={() => handleSelectRole('Ground User', 'Warehouse Ground')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.groundSubBtnTitle}>Warehouse Ground</Text>
                  <Text style={styles.groundSubBtnSub}>Warehouse assignment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.groundSubBtn}
                  onPress={() => handleSelectRole('Ground User', 'Event Ground')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.groundSubBtnTitle}>Event Ground</Text>
                  <Text style={styles.groundSubBtnSub}>Event assignment</Text>
                </TouchableOpacity>
              </View>
            </View>
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

            <Text style={styles.formInputLabel}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Enter full name" placeholderTextColor="#9AA3B4" value={fullName} onChangeText={setFullName} />
            </View>

            <Text style={styles.formInputLabel}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>+91 </Text>
              <TextInput style={styles.textInput} placeholder="Enter mobile number" placeholderTextColor="#9AA3B4" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
            </View>

            <Text style={styles.formInputLabel}>Email ID *</Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="name@company.com" placeholderTextColor="#9AA3B4" keyboardType="email-address" autoCapitalize="none" value={emailId} onChangeText={setEmailId} />
            </View>

            {!isEditMode && (
              <>
                <Text style={styles.formInputLabel}>Password *</Text>
                <View style={styles.inputContainer}>
                  <TextInput style={styles.textInput} placeholder="Set a secure password" placeholderTextColor="#9AA3B4" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9AA3B4" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.formSectHeader}>Role & assignments</Text>

            <Text style={styles.formInputLabel}>User Role *</Text>
            <View style={[styles.inputContainer, { backgroundColor: '#F8F6FD' }]}>
              <Text style={styles.lockedRoleText}>{selectedRole}</Text>
            </View>

            <Text style={styles.formInputLabel}>
              {selectedRole === 'Event Planner' ? 'Assign Event(s) *' : 'Assign Warehouse(s) *'}
            </Text>

            {/* Selected Chips with × */}
            <View style={styles.chipsRow}>
              {assignedLocations.map((loc) => (
                <TouchableOpacity key={loc} style={styles.locationChip} onPress={() => handleToggleLocation(loc)}>
                  <Text style={styles.locationChipText}>{loc} ×</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add More Locations */}
            <View style={styles.chipsRow}>
              {(selectedRole === 'Event Planner' ? EVENT_LIST : WAREHOUSE_LIST)
                .filter((l) => !assignedLocations.includes(l))
                .map((loc) => (
                  <TouchableOpacity key={loc} style={styles.addLocationChip} onPress={() => handleToggleLocation(loc)}>
                    <Text style={styles.addLocationChipText}>+ {loc}</Text>
                  </TouchableOpacity>
                ))}
            </View>

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
                onPress={() => {
                  setGroundType('Warehouse Ground');
                  setAssignedLocations(['Warehouse A']);
                }}
              >
                <View style={[styles.radioCircle, groundType === 'Warehouse Ground' && styles.radioCircleActive]} />
                <View>
                  <Text style={[styles.groundTypeTitle, groundType === 'Warehouse Ground' && styles.groundTypeTitleActive]}>Warehouse Ground</Text>
                  <Text style={styles.groundTypeSub}>Warehouse task access</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.groundTypeCard, groundType === 'Event Ground' && styles.groundTypeCardActive]}
                onPress={() => {
                  setGroundType('Event Ground');
                  setAssignedLocations(['Event A']);
                }}
              >
                <View style={[styles.radioCircle, groundType === 'Event Ground' && styles.radioCircleActive]} />
                <View>
                  <Text style={[styles.groundTypeTitle, groundType === 'Event Ground' && styles.groundTypeTitleActive]}>Event Ground</Text>
                  <Text style={styles.groundTypeSub}>Event task access</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.formSectHeader}>User details</Text>

            <Text style={styles.formInputLabel}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Enter full name" placeholderTextColor="#9AA3B4" value={fullName} onChangeText={setFullName} />
            </View>

            <Text style={styles.formInputLabel}>Access ID *</Text>
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

            <Text style={styles.formInputLabel}>
              {groundType === 'Warehouse Ground' ? 'Assign Warehouse(s) *' : 'Assign Event(s) *'}
            </Text>

            {/* Location Chips */}
            <View style={styles.chipsRow}>
              {assignedLocations.map((loc) => (
                <TouchableOpacity key={loc} style={styles.locationChip} onPress={() => handleToggleLocation(loc)}>
                  <Text style={styles.locationChipText}>{loc} ×</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chipsRow}>
              {(groundType === 'Warehouse Ground' ? WAREHOUSE_LIST : EVENT_LIST)
                .filter((l) => !assignedLocations.includes(l))
                .map((loc) => (
                  <TouchableOpacity key={loc} style={styles.addLocationChip} onPress={() => handleToggleLocation(loc)}>
                    <Text style={styles.addLocationChipText}>+ {loc}</Text>
                  </TouchableOpacity>
                ))}
            </View>

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
      {/* SCREEN 05: THREE-DOT MENU ACTIONS SHEET                   */}
      {/* ========================================================= */}
      <Modal visible={activeModal === 'actionsMenu'} animationType="fade" transparent={true}>
        <View style={styles.actionsBackdrop}>
          <View style={styles.actionsSheetCard}>
            {selectedUser && (
              <>
                {/* User Card Summary matching SVG Screen 05 */}
                <View style={styles.actionUserPreview}>
                  <View style={styles.actionAvatar}>
                    <Text style={styles.actionAvatarLetter}>{getInitial(selectedUser.name)}</Text>
                  </View>
                  <View style={styles.actionUserMeta}>
                    <Text style={styles.actionUserName}>{selectedUser.name}</Text>
                    <Text style={styles.actionUserRole}>
                      {selectedUser.role.replace(' User', '')} · {selectedUser.userId || selectedUser.id}
                    </Text>
                    <View style={[styles.statusBadgeSmall, selectedUser.status !== 'active' && styles.statusBadgeSmallInactive]}>
                      <View style={[styles.statusDot, selectedUser.status !== 'active' && styles.statusDotInactive]} />
                      <Text style={[styles.statusTextSmall, selectedUser.status !== 'active' && styles.statusTextSmallInactive]}>
                        {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.menuLabel}>THREE-DOT MENU · USER ACTIONS</Text>

                {/* 1. Edit User */}
                <TouchableOpacity style={styles.menuActionItem} onPress={handleEditFromActionMenu}>
                  <View style={[styles.menuActionIconCircle, { backgroundColor: '#F0E8FF' }]}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#8244EF" />
                  </View>
                  <View style={styles.menuActionTextCol}>
                    <Text style={styles.menuActionTitle}>Edit User</Text>
                    <Text style={styles.menuActionSub}>Update details and assignments</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Activate / Deactivate */}
                <TouchableOpacity style={styles.menuActionItem} onPress={handleToggleActiveStatus}>
                  <View style={[styles.menuActionIconCircle, { backgroundColor: selectedUser.status === 'active' ? '#FFE8EC' : '#E5FAF3' }]}>
                    <Ionicons
                      name={selectedUser.status === 'active' ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color={selectedUser.status === 'active' ? '#D9485F' : '#159A79'}
                    />
                  </View>
                  <View style={styles.menuActionTextCol}>
                    <Text style={styles.menuActionTitle}>
                      {selectedUser.status === 'active' ? 'Deactivate User' : 'Activate User'}
                    </Text>
                    <Text style={styles.menuActionSub}>One status action; label changes with current status</Text>
                  </View>
                </TouchableOpacity>

                {/* 3. Delete User */}
                <TouchableOpacity style={styles.menuActionItem} onPress={handleDeleteUser}>
                  <View style={[styles.menuActionIconCircle, { backgroundColor: '#FFE8EC' }]}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#D9485F" />
                  </View>
                  <View style={styles.menuActionTextCol}>
                    <Text style={[styles.menuActionTitle, { color: '#C43E52' }]}>Delete User</Text>
                    <Text style={styles.menuActionSub}>Confirm first; preserve audit/transaction history</Text>
                  </View>
                </TouchableOpacity>

                {/* Market Standard Safeguards Card matching SVG Screen 05 */}
                <View style={styles.safeguardsCard}>
                  <Text style={styles.safeguardsTitle}>Market-standard safeguards</Text>
                  <Text style={styles.safeguardsBullet}>• Never allow deletion of the last Super Admin.</Text>
                  <Text style={styles.safeguardsBullet}>• Preserve inventory and audit history.</Text>
                  <Text style={styles.safeguardsBullet}>• Deactivate accounts with transaction history.</Text>
                  <Text style={styles.safeguardsBullet}>• Confirm destructive actions in a dialog.</Text>
                </View>
              </>
            )}
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
  navyHeader: {
    backgroundColor: '#160F2F',
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
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
    paddingTop: 16,
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

  // Action Menu Sheet (Screen 05)
  actionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  actionsSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  actionUserPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1233',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  actionAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#39215C',
    borderWidth: 1.5,
    borderColor: '#8A46F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionAvatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C49AFF',
  },
  actionUserMeta: {
    flex: 1,
  },
  actionUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionUserRole: {
    fontSize: 11.5,
    color: '#B9ADC9',
    marginTop: 2,
    marginBottom: 5,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0D3B31',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeSmallInactive: {
    backgroundColor: '#2E2A3C',
  },
  statusTextSmall: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6FE0BB',
  },
  statusTextSmallInactive: {
    color: '#9E9AA9',
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#858198',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  menuActionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuActionTextCol: {
    flex: 1,
  },
  menuActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#282044',
  },
  menuActionSub: {
    fontSize: 10.5,
    color: '#858198',
    marginTop: 2,
  },
  safeguardsCard: {
    backgroundColor: '#F8F6FD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0F0',
    padding: 14,
    marginTop: 6,
  },
  safeguardsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#282044',
    marginBottom: 6,
  },
  safeguardsBullet: {
    fontSize: 10.5,
    color: '#35304D',
    lineHeight: 16,
  },
});
