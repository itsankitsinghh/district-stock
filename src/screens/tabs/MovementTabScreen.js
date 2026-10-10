import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function MovementTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="Movement"
        subtitle="Inbound & outbound stock transfers"
        roleName={session?.role || 'Ground User'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="truck-fast-outline"
          title="No Stock Movements"
          description="Inbound deliveries, transfer dispatches, and warehouse-to-event vehicle movements will appear here during live operations."
          badgeText="Transit Queue Clear"
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
