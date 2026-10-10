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
import RoleHeader from '../../components/RoleHeader';
import { authService } from '../../services/authService';
import { COLORS } from '../../theme/colors';

// Available roles for selection
const AVAILABLE_ROLES = [
  'Warehouse Ground User',
  'Event Ground User',
  'Event Planner',
  'Operations Manager',
  'Admin',
];

// Available warehouse & event locations
const AVAILABLE_LOCATIONS = [
  'Warehouse A',
  'Warehouse B',
  'Warehouse C',
  'Warehouse D',
  'Event A',
  'Event B',
  'Event C',
  'Central Hub',
];

export default function UserSetupTabScreen({ session, onLogout }) {
  // Main screen state
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: '0', active: '0', inactive: '0' });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Warehouse Ground User');
  const [formLocations, setFormLocations] = useState(['Warehouse A', 'Warehouse B']);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Load users from authService
  const refreshUsersList = () => {
    const list = authService.getUsers();
    setUsers(list);
    const m = authService.getUserMetrics();
    setMetrics(m);
  };

  useEffect(() => {
    refreshUsersList();
  }, []);

  // Filtered users list based on search and active filter tab
  const filteredUsers = users.filter((u) => {
    // 1. Status Filter
    if (activeFilter === 'active' && u.status !== 'active') return false;
    if (activeFilter === 'inactive' && u.status !== 'inactive') return false;

    // 2. Search Query (Name, User ID, Mobile)
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const idMatch = (u.userId || u.id || '').toLowerCase().includes(q);
    const mobileMatch = (u.mobile || '').toLowerCase().includes(q);
    const roleMatch = (u.role || '').toLowerCase().includes(q);

    return nameMatch || idMatch || mobileMatch || roleMatch;
  });

  // Open Add User Modal (Screen 02)
  const handleOpenAddUser = () => {
    setIsEditing(false);
    setFormName('');
    setFormMobile('');
    setFormUserId('');
    setFormEmail('');
    setFormRole('Warehouse Ground User');
    setFormLocations(['Warehouse A', 'Warehouse B']);
    setFormIsActive(true);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user) => {
    setIsEditing(true);
    setFormName(user.name || '');
    setFormMobile(user.mobile || '');
    setFormUserId(user.userId || user.id || '');
    setFormEmail(user.email || '');
    setFormRole(user.role || 'Warehouse Ground User');
    setFormLocations(user.assignedLocations || ['Warehouse A']);
    setFormIsActive(user.status === 'active');
    setFormError('');
    setShowProfileModal(false);
    setShowAddModal(true);
  };

  // Open User Profile View (Screen 03)
  const handleOpenUserProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  // Toggle user activation/deactivation in Profile view
  const handleToggleStatus = (userId) => {
    const res = authService.toggleUserStatus(userId);
    if (res.success) {
      refreshUsersList();
      if (selectedUser) {
        setSelectedUser((prev) => ({
          ...prev,
          status: res.status,
        }));
      }
    }
  };

  // Toggle location assignment in Add/Edit Form
  const handleToggleLocation = (loc) => {
    if (formLocations.includes(loc)) {
      if (formLocations.length > 1) {
        setFormLocations(formLocations.filter((l) => l !== loc));
      } else {
        Alert.alert('Notice', 'At least one warehouse or event must be assigned.');
      }
    } else {
      setFormLocations([...formLocations, loc]);
    }
  };

  // Save User (Add or Edit)
  const handleSaveUser = () => {
    if (!formName.trim()) {
      setFormError('Please enter Full Name.');
      return;
    }
    if (!formMobile.trim()) {
      setFormError('Please enter Mobile Number.');
      return;
    }

    setFormError('');

    if (isEditing && selectedUser) {
      // Update existing
      authService.updateUser(selectedUser.id, {
        name: formName.trim(),
        mobile: formMobile.trim(),
        role: formRole,
        assignedLocations: formLocations,
        status: formIsActive ? 'active' : 'inactive',
      });
      refreshUsersList();
      setShowAddModal(false);
      Alert.alert('Success', 'User profile updated successfully.');
    } else {
      // Add new
      authService.addUser({
        name: formName.trim(),
        mobile: formMobile.trim(),
        userId: formUserId.trim(),
        email: formEmail.trim(),
        role: formRole,
        assignedLocations: formLocations,
        status: formIsActive ? 'active' : 'inactive',
      });
      refreshUsersList();
      setShowAddModal(false);
      Alert.alert('Success', 'New user added successfully and assigned to operations.');
    }
  };

  // Extract initials for circle avatar
  const getInitials = (name) => {
    if (!name) return 'DS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const metricsData = [
    { label: 'TOTAL USERS', value: metrics.total },
    { label: 'ACTIVE', value: metrics.active },
    { label: 'INACTIVE', value: metrics.inactive },
  ];

  return (
    <View style={styles.container}>
      {/* SCREEN 01: Top Navy Header matching Figma */}
      <RoleHeader
        title="User Setup"
        subtitle="Manage users and access"
        roleName={session?.role || 'Admin'}
        onLogout={onLogout}
        showAddButton={true}
        onAddPress={handleOpenAddUser}
        metrics={metricsData}
      />

      {/* Main List Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#8C89A3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, User ID or mobile"
            placeholderTextColor="#807C96"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#8C89A3" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills Row */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'all' && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'all' && styles.filterPillTextActive,
              ]}
            >
              All Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'active' && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter('active')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'active' && styles.filterPillTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'inactive' && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter('inactive')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'inactive' && styles.filterPillTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Users</Text>
          <Text style={styles.userCountBadge}>{filteredUsers.length} shown</Text>
        </View>

        {/* Users List (Figma Cards) */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-search-outline" size={44} color="#A78BFA" />
            <Text style={styles.emptyTitle}>No Matching Users Found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search terms or filter selection.</Text>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const isActive = user.status === 'active';
            const initials = getInitials(user.name);
            const locationText = (user.assignedLocations || []).join(' · ');

            return (
              <TouchableOpacity
                key={user.id || user.userId}
                style={styles.userCard}
                onPress={() => handleOpenUserProfile(user)}
                activeOpacity={0.85}
              >
                {/* Top Row: Avatar, Name, Code, and Status Badge */}
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.avatarCircle,
                      !isActive && styles.avatarCircleInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        !isActive && styles.avatarTextInactive,
                      ]}
                    >
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.cardNameCol}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name}
                    </Text>
                    <Text style={styles.userMeta}>
                      {user.userId || user.id} · {user.mobile || '+91 98XXX 00000'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      !isActive && styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        !isActive && styles.statusBadgeTextInactive,
                      ]}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Bottom Row: Role & Assigned Locations */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.cardBottomCol}>
                    <Text style={styles.userRoleText}>{user.role}</Text>
                    <Text style={styles.userLocationsText} numberOfLines={1}>
                      {locationText || 'Central Warehouse'}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#9995AE" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Primary Purple Add User Action Button */}
        <TouchableOpacity
          style={styles.addBtnWrapper}
          onPress={handleOpenAddUser}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6841E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtnGradient}
          >
            <View style={styles.addBtnCircle}>
              <Ionicons name="add" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.addBtnText}>Add User</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Bottom navigation · existing app tabs unchanged
        </Text>
      </ScrollView>

      {/* ========================================================= */}
      {/* SCREEN 02 MODAL: ADD / EDIT NEW USER FORM                  */}
      {/* ========================================================= */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalRoot}>
          {/* Top Navy Header matching Figma Screen 02 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.modalBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalHeaderTitle}>
                {isEditing ? 'Edit User' : 'Add New User'}
              </Text>
              <Text style={styles.modalHeaderSub}>
                Enter details and assign access
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {formError ? (
              <View style={styles.formErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Section 1: Basic Details */}
            <Text style={styles.formSectionHeader}>Basic Details</Text>

            <Text style={styles.formLabel}>Full Name *</Text>
            <View style={styles.formInputBox}>
              <TextInput
                style={styles.formInput}
                placeholder="Enter full name"
                placeholderTextColor="#807C96"
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            <Text style={styles.formLabel}>Mobile Number *</Text>
            <View style={styles.formInputBox}>
              <Text style={styles.formInputPrefix}>+91 </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#807C96"
                keyboardType="phone-pad"
                value={formMobile}
                onChangeText={setFormMobile}
              />
            </View>

            <Text style={styles.formLabel}>User ID *</Text>
            <View style={styles.formInputBox}>
              <TextInput
                style={styles.formInput}
                placeholder="Auto-generated or enter User ID"
                placeholderTextColor="#807C96"
                value={formUserId}
                onChangeText={setFormUserId}
                editable={!isEditing}
              />
            </View>

            {/* Section 2: Role & Access */}
            <Text style={styles.formSectionHeader}>Role & Access</Text>

            <Text style={styles.formLabel}>User Role *</Text>
            <View style={styles.rolePickerRow}>
              {AVAILABLE_ROLES.map((r) => {
                const isSelected = formRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      isSelected && styles.roleChipSelected,
                    ]}
                    onPress={() => setFormRole(r)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        isSelected && styles.roleChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formLabel}>
              Assign Locations / Warehouses *
            </Text>
            <Text style={styles.formHelpText}>
              Tap to add or remove assignments:
            </Text>

            {/* Selected Location Chips with × */}
            <View style={styles.selectedLocationsRow}>
              {formLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.selectedLocationChip}
                  onPress={() => handleToggleLocation(loc)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectedLocationText}>{loc} ×</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Available to Add */}
            <View style={styles.availableLocationsRow}>
              {AVAILABLE_LOCATIONS.filter((l) => !formLocations.includes(l)).map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.availableLocationChip}
                  onPress={() => handleToggleLocation(loc)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.availableLocationText}>+ {loc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Section 3: Account Status */}
            <Text style={styles.formSectionHeader}>Account Status</Text>
            <View style={styles.statusToggleCard}>
              <View style={styles.statusToggleCol}>
                <Text style={styles.statusToggleTitle}>Account Active</Text>
                <Text style={styles.statusToggleSub}>
                  User can access assigned modules
                </Text>
              </View>
              <Switch
                value={formIsActive}
                onValueChange={setFormIsActive}
                trackColor={{ false: '#E2E8F0', true: '#6D4AFF' }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* Helper Notice matching Figma */}
            <View style={styles.helperNoticeCard}>
              <Ionicons name="checkmark-circle" size={18} color="#6D4AFF" />
              <View style={styles.helperNoticeCol}>
                <Text style={styles.helperNoticeText}>
                  Role and assignments control what this user can access.
                </Text>
              </View>
            </View>

            {/* Modal Bottom Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveUser}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6841E8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnGradient}
                >
                  <Text style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Review & Save'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* SCREEN 03 MODAL: USER PROFILE & ACTIONS                   */}
      {/* ========================================================= */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileModal(false)}
      >
        {selectedUser ? (
          <View style={styles.modalRoot}>
            {/* Top Navy Header matching Figma Screen 03 */}
            <View style={styles.profileHeader}>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={styles.modalBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.profileHeaderContent}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.profileAvatarText}>
                    {getInitials(selectedUser.name)}
                  </Text>
                </View>

                <View style={styles.profileNameCol}>
                  <Text style={styles.profileHeaderName}>{selectedUser.name}</Text>
                  <Text style={styles.profileHeaderId}>
                    {selectedUser.userId || selectedUser.id}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Status Card */}
              <View style={styles.profileStatusCard}>
                <Text style={styles.metaLabel}>ACCOUNT STATUS</Text>
                <View
                  style={[
                    styles.statusBadge,
                    selectedUser.status !== 'active' && styles.statusBadgeInactive,
                    styles.statusBadgeLarge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      selectedUser.status !== 'active' && styles.statusBadgeTextInactive,
                    ]}
                  >
                    {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Personal Information */}
              <Text style={styles.formSectionHeader}>Personal Information</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>FULL NAME</Text>
                  <Text style={styles.detailValue}>{selectedUser.name}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>MOBILE NUMBER</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.mobile || '+91 98XXX 12345'}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>USER ID</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.userId || selectedUser.id}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>EMAIL</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.email || 'user@district.com'}
                  </Text>
                </View>
              </View>

              {/* Role & Assignments */}
              <Text style={styles.formSectionHeader}>Role & Assignments</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ROLE</Text>
                  <Text style={styles.detailValue}>{selectedUser.role}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRowLocations}>
                  <Text style={styles.detailLabel}>ASSIGNED LOCATIONS</Text>
                  <View style={styles.profileLocationsRow}>
                    {(selectedUser.assignedLocations || ['Warehouse A']).map((loc) => (
                      <View key={loc} style={styles.profileLocationChip}>
                        <Text style={styles.profileLocationText}>{loc}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Actions Section matching Figma */}
              <Text style={styles.formSectionHeader}>Actions</Text>

              {/* Action 1: Edit User */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleOpenEditUser(selectedUser)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#6841E8" />
                <Text style={styles.actionCardText}>Edit User Details</Text>
                <Ionicons name="chevron-forward" size={18} color="#9995AE" />
              </TouchableOpacity>

              {/* Action 2: Deactivate / Activate User */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleToggleStatus(selectedUser.id)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={selectedUser.status === 'active' ? 'minus-circle-outline' : 'check-circle-outline'}
                  size={20}
                  color={selectedUser.status === 'active' ? '#B54747' : '#18794E'}
                />
                <Text
                  style={[
                    styles.actionCardText,
                    selectedUser.status === 'active'
                      ? styles.actionDangerText
                      : styles.actionSuccessText,
                  ]}
                >
                  {selectedUser.status === 'active' ? 'Deactivate User' : 'Activate User'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9995AE" />
              </TouchableOpacity>

              {/* Bottom Edit User Button */}
              <TouchableOpacity
                style={styles.addBtnWrapper}
                onPress={() => handleOpenEditUser(selectedUser)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6841E8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addBtnGradient}
                >
                  <Text style={styles.addBtnText}>Edit User</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E8E6F1',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#393550',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#F8F7FC',
  },
  filterPillActive: {
    backgroundColor: '#EEE8FF',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#393550',
  },
  filterPillTextActive: {
    color: '#6841E8',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25223D',
  },
  userCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#858198',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E6F1',
    shadowColor: '#151329',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAE3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarCircleInactive: {
    backgroundColor: '#F0EEF5',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6841E8',
  },
  avatarTextInactive: {
    color: '#77758B',
  },
  cardNameCol: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292641',
  },
  userMeta: {
    fontSize: 11,
    color: '#858198',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E4F8ED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 11,
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F0F5',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#18794E',
  },
  statusBadgeTextInactive: {
    color: '#77758B',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F3FB',
    paddingTop: 10,
  },
  cardBottomCol: {
    flex: 1,
  },
  userRoleText: {
    fontSize: 13,
    color: '#393550',
    fontWeight: '600',
  },
  userLocationsText: {
    fontSize: 11,
    color: '#858198',
    marginTop: 2,
  },
  addBtnWrapper: {
    marginTop: 8,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#6841E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#858198',
    marginTop: 18,
    marginBottom: 10,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E6F1',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#201D38',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#807C96',
    textAlign: 'center',
    marginTop: 4,
  },

  // Modal Styles (Screens 02 and 03)
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    backgroundColor: '#171629',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackBtn: {
    marginRight: 14,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#C8C4E4',
    marginTop: 2,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  formSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25223D',
    marginTop: 16,
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#393550',
    marginBottom: 6,
    marginTop: 8,
  },
  formHelpText: {
    fontSize: 11,
    color: '#807C96',
    marginBottom: 8,
  },
  formInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E5F0',
    height: 44,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  formInputPrefix: {
    fontSize: 13,
    color: '#393550',
    fontWeight: '600',
  },
  formInput: {
    flex: 1,
    fontSize: 13,
    color: '#393550',
    padding: 0,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 10,
    marginBottom: 12,
  },
  formErrorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  roleChip: {
    backgroundColor: '#F8F7FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E5F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipSelected: {
    backgroundColor: '#EEE8FF',
    borderColor: '#8B5CF6',
  },
  roleChipText: {
    fontSize: 12,
    color: '#393550',
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: '#6841E8',
    fontWeight: '700',
  },
  selectedLocationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  selectedLocationChip: {
    backgroundColor: '#EEE8FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6841E8',
  },
  availableLocationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  availableLocationChip: {
    backgroundColor: '#F8F7FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E5F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  availableLocationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  statusToggleCol: {
    flex: 1,
  },
  statusToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#393550',
  },
  statusToggleSub: {
    fontSize: 11,
    color: '#858198',
    marginTop: 2,
  },
  helperNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  helperNoticeCol: {
    flex: 1,
    marginLeft: 8,
  },
  helperNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5035A7',
    lineHeight: 15,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    width: 102,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E0EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#393550',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Screen 03 Profile Styles
  profileHeader: {
    backgroundColor: '#171629',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  profileAvatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EAE3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6841E8',
  },
  profileNameCol: {
    flex: 1,
  },
  profileHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeaderId: {
    fontSize: 12,
    color: '#C8C4E4',
    marginTop: 2,
  },
  profileStatusCard: {
    backgroundColor: '#F8F7FC',
    borderRadius: 13,
    padding: 14,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 10,
    color: '#858198',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEAF3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  detailRow: {
    paddingVertical: 6,
  },
  detailRowLocations: {
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: '#858198',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    color: '#292641',
    fontWeight: '600',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEAF3',
    marginVertical: 4,
  },
  profileLocationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  profileLocationChip: {
    backgroundColor: '#EEE8FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  profileLocationText: {
    fontSize: 11,
    color: '#6841E8',
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E3E0EF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  actionCardText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#393550',
    marginLeft: 10,
  },
  actionDangerText: {
    color: '#B54747',
  },
  actionSuccessText: {
    color: '#18794E',
  },
});
