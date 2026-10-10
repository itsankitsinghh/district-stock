import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function DashboardTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="Dashboard"
        subtitle="Operations overview & activity"
        roleName={session?.role || 'Admin'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="view-dashboard-outline"
          title="No Operational Data Available"
          description="Operational workflows, active requisitions, and live inventory transactions will be visualized here as data is recorded."
          badgeText="Clean State • Ready for Phase 2"
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
