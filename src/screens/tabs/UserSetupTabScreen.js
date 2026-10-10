import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';
import { COLORS } from '../../theme/colors';

export default function UserSetupTabScreen({ session, onLogout }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = [
    { label: 'TOTAL USERS', value: '—' },
    { label: 'ACTIVE', value: '—' },
    { label: 'INACTIVE', value: '—' },
  ];

  const handleAddUserPress = () => {
    Alert.alert(
      'User Setup Module',
      'User creation, role assignment, and warehouse access forms will be enabled in Phase 2 as per project specification.',
      [{ text: 'Understood' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Dark Navy Header matching visual reference screenshot */}
      <RoleHeader
        title="User Setup"
        subtitle="Manage users and access"
        roleName={session?.role || 'Admin'}
        onLogout={onLogout}
        showAddButton={true}
        onAddPress={handleAddUserPress}
        metrics={metrics}
      />

      {/* Light Lavender Content Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={19} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, User ID or mobile"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
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
            activeOpacity={0.75}
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
            activeOpacity={0.75}
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
            activeOpacity={0.75}
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
        <Text style={styles.sectionHeader}>Users</Text>

        {/* Phase 1 Clean Blank State */}
        <EmptyStateCard
          icon="account-group-outline"
          title="No Users Available"
          description="The initial Super Admin account is the only active account on this installation. User management will be enabled in Phase 2."
          badgeText="Fresh Installation • Admin Active"
        />

        {/* Vibrant Purple Add User Button matching design reference */}
        <TouchableOpacity
          style={styles.addUserButton}
          onPress={handleAddUserPress}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.white} style={styles.btnIcon} />
          <Text style={styles.addUserButtonText}>Add User</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5FB',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '500',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 52,
    marginTop: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnIcon: {
    marginRight: 8,
  },
  addUserButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
