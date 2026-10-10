import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function MyRequisitionsTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="My Requisitions"
        subtitle="Track status of submitted orders"
        roleName={session?.role || 'Event Planner'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="format-list-checks"
          title="No Requisitions Submitted"
          description="Material requests and stock allocations submitted for your assigned event zones will be tracked here in real-time."
          badgeText="Orders Tracker Ready"
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
