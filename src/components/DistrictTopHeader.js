import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DistrictTopHeader({
  session,
  onLogout,
  title = 'Dashboard',
  subtitle = null,
  scopeLabel = 'Global access',
  showTitle = true,
  roundedBottom = false,
}) {
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  // Normalize role display text smartly so it fits without truncation or overflow across all roles
  const getDisplayRole = (role) => {
    if (!role) return 'ADMIN';
    const r = role.toLowerCase().trim();
    if (r.includes('super')) return 'SUPER ADMIN';
    if (r.includes('warehouse') && r.includes('ground')) return 'WH GROUND';
    if (r.includes('event') && r.includes('ground')) return 'EVENT GROUND';
    if (r.includes('ground')) return 'GROUND USER';
    if (r.includes('operations')) return 'OPS MANAGER';
    if (r.includes('planner')) return 'EVENT PLANNER';
    if (r.includes('admin')) return 'ADMIN';
    return role.toUpperCase().trim();
  };

  const getCleanUserName = (name) => {
    if (!name) return 'User';
    // Remove parenthesized IDs like (WHG-4821) or (EVG-1002) for clean header fit
    const cleaned = name.replace(/\s*\([^)]*\)/, '').trim();
    return cleaned || name;
  };

  const roleUpper = (session?.role || 'Admin').toUpperCase().trim();
  const displayRole = getDisplayRole(session?.role);
  const userName = session?.name || 'Ankit Singh';
  const displayUserName = getCleanUserName(session?.name);

  // Subtitle locations text
  const locationsText = session?.assignedLocations?.length
    ? ` · ${session.assignedLocations.join(' · ')}`
    : '';

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out from District Stock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            setProfileModalVisible(false);
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.headerContainer, roundedBottom && styles.roundedBottomContainer]}>
      {/* 1. TOP BRAND & ACTION BAR */}
      <View style={styles.topBarRow}>
        {/* LEFT: District Logo (Role & User name removed so space is blank) */}
        <View style={styles.leftSection}>
          <Image
            source={require('../../assets/district_stock_clean_wordmark.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* RIGHT: 3 Rounded Action Buttons (Notification · Ticket · Profile) */}
        <View style={styles.rightSection}>
          {/* 1. Notification Button */}
          <TouchableOpacity
            style={styles.actionBtnWrapper}
            activeOpacity={0.75}
            onPress={() => setNotificationModalVisible(true)}
          >
            <View style={styles.iconBox}>
              <Ionicons name="notifications-outline" size={17} color="#FFFFFF" />
              {notificationCount > 0 && (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{notificationCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.btnLabel}>Notification</Text>
          </TouchableOpacity>

          {/* 2. Ticket Button */}
          <TouchableOpacity
            style={styles.actionBtnWrapper}
            activeOpacity={0.75}
            onPress={() => setTicketModalVisible(true)}
          >
            <View style={styles.iconBox}>
              <Ionicons name="ticket-outline" size={17} color="#FFFFFF" />
            </View>
            <Text style={styles.btnLabel}>Ticket</Text>
          </TouchableOpacity>

          {/* 3. Profile Button */}
          <TouchableOpacity
            style={styles.actionBtnWrapper}
            activeOpacity={0.75}
            onPress={() => setProfileModalVisible(true)}
          >
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={17} color="#FFFFFF" />
            </View>
            <Text style={styles.btnLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. TITLE & SCOPE (OPTIONAL DASHBOARD HEADING) */}
      {showTitle && (
        <View style={styles.titleScopeSection}>
          <Text style={styles.screenTitle}>{title}</Text>
          <View style={styles.scopeRow}>
            <View style={styles.scopeLiveDot} />
            <Text style={styles.scopeText} numberOfLines={1}>
              {subtitle || `${scopeLabel}${locationsText}`}
            </Text>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: NOTIFICATIONS CENTER                             */}
      {/* ========================================================= */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={18} color="#C084FC" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Notifications</Text>
                {notificationCount > 0 && (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{notificationCount} New</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={20} color="#948EA5" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              <View style={styles.noticeItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle}>End-to-End Test Mode Active</Text>
                  <Text style={styles.noticeSub}>Clean slate loaded. You can create and test workflows manually.</Text>
                </View>
              </View>

              <View style={styles.noticeItem}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#8235F4" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle}>Super Admin Session</Text>
                  <Text style={styles.noticeSub}>Logged in as {session?.email || 'super.admin@district.com'}</Text>
                </View>
              </View>

              <View style={styles.noticeItem}>
                <Ionicons name="hardware-chip-outline" size={18} color="#0284C7" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle}>WMS Core Engine Online</Text>
                  <Text style={styles.noticeSub}>Inventory, Requisition, and Movement modules ready.</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setNotificationCount(0)}
              >
                <Text style={styles.modalSecondaryBtnText}>Mark as Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setNotificationModalVisible(false)}
              >
                <Text style={styles.modalPrimaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: TICKET / SUPPORT                                 */}
      {/* ========================================================= */}
      <Modal
        visible={ticketModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="ticket" size={18} color="#38BDF8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Support Ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setTicketModalVisible(false)}>
                <Ionicons name="close" size={20} color="#948EA5" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <Text style={styles.ticketDesc}>
                Log internal operational inquiries, discrepancy reports, or assistance requests:
              </Text>

              <View style={styles.ticketFieldBox}>
                <Text style={styles.ticketFieldLabel}>User / Raised By</Text>
                <Text style={styles.ticketFieldValue}>{userName} ({roleUpper})</Text>
              </View>

              <View style={styles.ticketFieldBox}>
                <Text style={styles.ticketFieldLabel}>Operational Hub</Text>
                <Text style={styles.ticketFieldValue}>{session?.assignedLocations?.[0] || 'Central Warehouse / All Hubs'}</Text>
              </View>

              <View style={styles.ticketFieldBox}>
                <Text style={styles.ticketFieldLabel}>Priority Level</Text>
                <Text style={[styles.ticketFieldValue, { color: '#F59E0B' }]}>Normal Operations</Text>
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setTicketModalVisible(false);
                  Alert.alert('Ticket System', 'Quick ticket feature active. Ready for manual support tracking.');
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: USER PROFILE & LOGOUT                            */}
      {/* ========================================================= */}
      <Modal
        visible={profileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle" size={20} color="#C084FC" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>User Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={20} color="#948EA5" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileHeroRow}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AS'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileEmail}>{session?.email || 'super.admin@district.com'}</Text>
                <View style={[styles.roleBadge, { marginTop: 4, alignSelf: 'flex-start' }]}>
                  <Text style={styles.roleBadgeText}>{roleUpper}</Text>
                </View>
              </View>
            </View>

            <View style={styles.profileDetailList}>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Account Status</Text>
                <Text style={[styles.profileDetailValue, { color: '#10B981' }]}>Active · Verified</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Authorized Locations</Text>
                <Text style={styles.profileDetailValue}>
                  {session?.assignedLocations?.length ? session.assignedLocations.join(', ') : 'All Hubs & Warehouses'}
                </Text>
              </View>
            </View>

            {onLogout && (
              <TouchableOpacity
                style={styles.logoutFullBtn}
                activeOpacity={0.8}
                onPress={handleLogoutPress}
              >
                <Ionicons name="log-out-outline" size={17} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.logoutFullBtnText}>Logout from District Stock</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#160D33',
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  roundedBottomContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 14,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // --- LEFT SECTION ---
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
  },
  logoImage: {
    width: 78,
    height: 30,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 7,
  },
  userCol: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  roleBadge: {
    backgroundColor: 'rgba(130, 53, 244, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(130, 53, 244, 0.6)',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  roleBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#D8B4FE',
    letterSpacing: 0.3,
  },
  userNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1.5,
    letterSpacing: -0.2,
  },

  // --- RIGHT SECTION ---
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#160D33',
  },
  redBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnLabel: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#A59EC0',
    marginTop: 2,
    textAlign: 'center',
  },

  // --- TITLE & SCOPE SECTION ---
  titleScopeSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scopeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  scopeText: {
    fontSize: 11,
    color: '#BDB6D3',
    fontWeight: '500',
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E143E',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(130, 53, 244, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countPill: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C084FC',
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noticeSub: {
    fontSize: 11,
    color: '#A59EC0',
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 8,
  },
  modalSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSecondaryBtnText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#8235F4',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Ticket Modal Content
  ticketDesc: {
    fontSize: 12,
    color: '#BDB6D3',
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketFieldBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ticketFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A59EC0',
    textTransform: 'uppercase',
  },
  ticketFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // Profile Modal Content
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8235F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 11.5,
    color: '#A59EC0',
    marginTop: 1,
  },
  profileDetailList: {
    paddingVertical: 10,
  },
  profileDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  profileDetailLabel: {
    fontSize: 11.5,
    color: '#9E97B4',
  },
  profileDetailValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: '55%',
    textAlign: 'right',
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  logoutFullBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
});
