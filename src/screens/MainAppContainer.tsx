import React, { useState } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTabsForRole } from '../navigation/roleTabsConfig';
import RoleBottomNavigation from '../components/RoleBottomNavigation';
import DistrictTopHeader from '../components/DistrictTopHeader';
import { useUIStore } from '../store/zustand/useUIStore';

// Role Tab Screens
import DashboardTabScreen from './tabs/DashboardTabScreen';
import RequestsTabScreen from './tabs/RequestsTabScreen';
import ReportsTabScreen from './tabs/ReportsTabScreen';
import MasterTabScreen from './tabs/MasterTabScreen';
import UserSetupTabScreen from './tabs/UserSetupTabScreen';
import MovementTabScreen from './tabs/MovementTabScreen';
import StockTabScreen from './tabs/StockTabScreen';
import RaiseRequestsTabScreen from './tabs/RaiseRequestsTabScreen';
import MyRequisitionsTabScreen from './tabs/MyRequisitionsTabScreen';

interface MainAppContainerProps {
  session: any;
  onLogout: () => void;
}

export const MainAppContainer: React.FC<MainAppContainerProps> = ({ session, onLogout }) => {
  const role = session?.role || 'Admin';
  const roleTabs = getTabsForRole(role);

  // Sync with Zustand UI Store
  const { activeTab, setActiveTab } = useUIStore();
  const [activeTabKey, setActiveTabKey] = useState<string>(
    activeTab && roleTabs.some((t: any) => t.key === activeTab) ? activeTab : roleTabs[0]?.key || 'dashboard'
  );
  const [selectedDashboardWarehouse, setSelectedDashboardWarehouse] = useState<string>('');

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    setActiveTab(key);
  };

  // Verify that activeTabKey is actually authorized for the user's role
  const isAuthorizedTab = roleTabs.some((t: any) => t.key === activeTabKey);
  const currentKey = isAuthorizedTab ? activeTabKey : roleTabs[0]?.key || 'dashboard';

  const renderActiveScreen = () => {
    switch (currentKey) {
      case 'dashboard':
        return (
          <DashboardTabScreen
            session={session}
            onLogout={onLogout}
            onNavigateTab={handleTabChange}
            onSelectWarehouse={setSelectedDashboardWarehouse}
          />
        );
      case 'requests':
        return <RequestsTabScreen session={session} onLogout={onLogout} />;
      case 'reports':
        return <ReportsTabScreen session={session} onLogout={onLogout} />;
      case 'master':
        return <MasterTabScreen session={session} onLogout={onLogout} />;
      case 'user-setup':
      case 'userSetup':
        return <UserSetupTabScreen session={session} onLogout={onLogout} />;
      case 'movement':
        return (
          <MovementTabScreen
            session={session}
            onLogout={onLogout}
            selectedDashboardWarehouse={selectedDashboardWarehouse}
          />
        );
      case 'stock':
        return <StockTabScreen session={session} onLogout={onLogout} />;
      case 'raise-requests':
        return <RaiseRequestsTabScreen session={session} onLogout={onLogout} onNavigateTab={handleTabChange} />;
      case 'my-requisitions':
        return <MyRequisitionsTabScreen session={session} onLogout={onLogout} onNavigateTab={handleTabChange} />;
      default:
        return (
          <DashboardTabScreen
            session={session}
            onLogout={onLogout}
            onNavigateTab={handleTabChange}
            onSelectWarehouse={setSelectedDashboardWarehouse}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#160D33" />
      <View style={styles.container}>
        {/* Universal District Top Header across EVERY role & EVERY tab */}
        <DistrictTopHeader
          session={session}
          onLogout={onLogout}
          showTitle={false}
          roundedBottom={true}
        />

        {/* Active Tab Screen Area */}
        <View style={styles.screenWrapper}>
          {renderActiveScreen()}
        </View>

        {/* Role-Specific Bottom Navigation Bar */}
        <RoleBottomNavigation
          tabs={roleTabs}
          activeTabKey={currentKey}
          onTabSelect={handleTabChange}
        />
      </View>
    </SafeAreaView>
  );
};

export default MainAppContainer;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#160D33',
  },
  container: {
    flex: 1,
    backgroundColor: '#F6F5FB',
  },
  screenWrapper: {
    flex: 1,
  },
});
