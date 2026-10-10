import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function RaiseRequestsTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="Raise Requests"
        subtitle="Request equipment, stock & supplies"
        roleName={session?.role || 'Event Planner'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="plus-box-outline"
          title="No Active Requests Form"
          description="Material demand forms and logistics requisition tickets for upcoming event setups will be created here."
          badgeText="Requisitions Ready"
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
