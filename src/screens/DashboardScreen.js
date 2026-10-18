
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function DashboardScreen({ session, onLogout }) {
  const stockMetrics = [
    { label: 'Active Event SKUs', value: '1,420', icon: 'cube-outline', color: '#A855F7' },
    { label: 'Low Stock Alerts', value: '12 Items', icon: 'alert-circle-outline', color: '#EF4444' },
    { label: 'In-Transit Cargo', value: '8 Trucks', icon: 'truck-fast-outline', color: '#10B981' },
    { label: 'Operational Hubs', value: '24 Stalls', icon: 'storefront-outline', color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Operations Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <View style={styles.hubBadgeRow}>
              <View style={styles.statusDot} />
              <Text style={styles.hubBadgeText}>
                {session?.hub || 'Central Warehouse - Terminal 01'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>District Operations</Text>
          </View>

          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.textLilac} />
          </TouchableOpacity>
        </View>

        <View style={styles.sessionMetaCard}>
          <MaterialCommunityIcons name="shield-account" size={16} color={COLORS.textLilac} />
          <Text style={styles.crewIdText}>
            Logged as: <Text style={styles.crewHighlight}>{session?.user || 'DST-CREW-8942'}</Text>
          </Text>
        </View>
      </View>

      {/* Scrollable Overview Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionHeading}>Live Stock Analytics</Text>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {stockMetrics.map((item, idx) => (
            <View key={idx} style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: item.color + '1A' }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <Text style={styles.sectionHeading}>Quick Station Actions</Text>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
          <LinearGradient
            colors={['#7E1DF0', '#5B0EBF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionIconBadge}
          >
            <MaterialCommunityIcons name="barcode-scan" size={24} color={COLORS.white} />
          </LinearGradient>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Scan Inbound Cargo</Text>
            <Text style={styles.actionDesc}>Verify logistics shipment & scan QR seals</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
          <View style={[styles.actionIconBadge, { backgroundColor: '#1E153D' }]}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color={COLORS.textLilac} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Dispatch to Venue Counters</Text>
            <Text style={styles.actionDesc}>Transfer drinks, food stock & merchandise</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingHorizontal: 22,
    paddingBottom: 20,
    backgroundColor: '#120D26',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderCard,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hubBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.onlineGreen,
    marginRight: 6,
  },
  hubBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textLilac,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.4,
  },
  logoutButton: {
    backgroundColor: 'rgba(123, 28, 240, 0.2)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(123, 28, 240, 0.35)',
  },
  sessionMetaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 14,
  },
  crewIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  crewHighlight: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.2,
    marginBottom: 14,
    marginTop: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
  },
  metricIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.white,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
    marginBottom: 12,
  },
  actionIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
