import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function RoleBottomNavigation({ tabs, activeTabKey, onTabSelect }) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <View style={styles.navContainer}>
      <View style={styles.navInnerRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey;
          const iconName = isActive ? tab.activeIcon || tab.icon : tab.icon;

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
                  color={isActive ? '#FFFFFF' : '#8E7BB5'}
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
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: '#12082B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.22)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  navInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iconWrapActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E7BB5',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#E9D5FF',
    fontWeight: '700',
  },
});
