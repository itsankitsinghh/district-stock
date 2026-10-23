import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavTabItem } from '../navigation/roleTabsConfig';

interface RoleBottomNavigationProps {
  tabs: NavTabItem[];
  activeTabKey: string;
  onTabSelect: (key: string) => void;
}

export const RoleBottomNavigation: React.FC<RoleBottomNavigationProps> = ({
  tabs,
  activeTabKey,
  onTabSelect,
}) => {
  if (!tabs || tabs.length === 0) return null;

  return (
    <View style={styles.navContainer}>
      <View style={styles.navInnerRow}>
        {tabs.map((tab) => {
          const isActive =
            tab.key === activeTabKey ||
            (tab.key === 'user-setup' && activeTabKey === 'userSetup') ||
            (tab.key === 'userSetup' && activeTabKey === 'user-setup');
          const iconName = (isActive ? tab.activeIcon || tab.icon : tab.icon) as any;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabSelect(tab.key)}
              style={styles.tabItem}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && styles.iconWrapActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={iconName}
                  size={22}
                  color={isActive ? '#FFFFFF' : '#8A81A5'}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default RoleBottomNavigation;

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: '#160D33',
    borderTopWidth: 1,
    borderTopColor: '#281E48',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  navInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 60,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: '#8235F4',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A81A5',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
