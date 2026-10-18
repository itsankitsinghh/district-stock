import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function RoleHeader({
  title,
  subtitle,
  roleName,
  userEmail,
  onLogout,
  onAddPress,
  showAddButton = false,
  showTopMeta = false,
  metrics = null,
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Top Bar: Brand Logo, Role & Logout (Only if showTopMeta is true) */}
      {showTopMeta && (
        <View style={styles.topMetaRow}>
          <View style={styles.brandRoleRow}>
            <Image
              source={require('../../assets/district_stock_clean_wordmark.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <View style={styles.headerDivider} />
            <View style={styles.roleBadgeContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.roleBadgeText} numberOfLines={1}>
                {roleName || 'Admin'}
              </Text>
            </View>
          </View>

          <View style={styles.topRightActions}>
            {onLogout && (
              <TouchableOpacity
                onPress={onLogout}
                style={styles.logoutButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={17} color="#D8B4FE" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Main Title & Action Row */}
      <View style={styles.mainTitleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? (
            <View style={styles.scopeRow}>
              <View style={styles.scopeDot} />
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          ) : null}
        </View>

        {showAddButton ? (
          <TouchableOpacity
            onPress={onAddPress}
            style={styles.addCircleButton}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Metric Chips Row (e.g. TOTAL USERS, ACTIVE, INACTIVE) */}
      {metrics && metrics.length > 0 && (
        <View style={styles.metricsRow}>
          {metrics.map((item, index) => (
            <View key={index} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricValue}>{item.value ?? '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#160D33',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 68,
    height: 28,
  },
  headerDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  roleBadgeText: {
    color: '#E9D5FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  mainTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
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
    color: '#A59EC0',
    fontWeight: '500',
  },
  addCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#12082B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 3,
  },
});
