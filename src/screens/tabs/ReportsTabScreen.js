import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import RoleHeader from '../../components/RoleHeader';
import EmptyStateCard from '../../components/EmptyStateCard';

export default function ReportsTabScreen({ session, onLogout }) {
  return (
    <View style={styles.container}>
      <RoleHeader
        title="Reports"
        subtitle="Stock movement & audit summaries"
        roleName={session?.role || 'Admin'}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EmptyStateCard
          icon="chart-box-outline"
          title="No Reports Generated"
          description="Logistical audit summaries, item dispatch logs, and stock variance reports will be generated here."
          badgeText="Reports Ready"
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
