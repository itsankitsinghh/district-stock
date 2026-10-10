import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function MasterTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="Master"
        subtitle="Item catalogs & hub configuration"
        roleName={session?.role || 'Admin'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="database-outline"
          title="Master Data Unconfigured"
          description="Master SKU catalogs, item categories, warehouse zones, and event dispatch terminals will be maintained here in future phases."
          badgeText="System Configuration"
        />
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
});
