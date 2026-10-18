import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * TwoPartLocationPicker
 * - Left part: Compact dropdown for 'Event' or 'Warehouse' in small bold text
 * - Right part: Full dropdown showing scrollable list of warehouses/events
 * - 100% scrollable Modal-backed list that never gets stuck in Android ScrollViews
 */
export default function TwoPartLocationPicker({
  label = 'Source',
  required = true,
  type = 'Warehouse', // 'Warehouse' | 'Event'
  onTypeChange,
  value = '',
  onSelect,
  warehouses = [],
  events = [],
  placeholder,
  disabled = false,
  containerStyle,
}) {
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [isListModalVisible, setIsListModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize list based on current active type
  const rawList = useMemo(() => {
    const srcList = type === 'Event' ? events : warehouses;
    return (srcList || []).map((item) => {
      if (typeof item === 'string') {
        return { id: item, name: item, subtitle: '' };
      }
      return {
        id: item.id || item.code || item.name,
        name: item.name || item.code || '',
        code: item.code || '',
        subtitle: item.city || item.address || item.venue || item.code || '',
      };
    });
  }, [type, events, warehouses]);

  // Filtered by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rawList;
    const q = searchQuery.trim().toLowerCase();
    return rawList.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [rawList, searchQuery]);

  const handleSelectType = (newType) => {
    setIsTypeModalVisible(false);
    if (newType !== type) {
      if (onTypeChange) {
        onTypeChange(newType);
      }
      // Clear value if type changes so user picks from new type list
      if (onSelect) {
        onSelect('');
      }
    }
  };

  const handleSelectItem = (item) => {
    setIsListModalVisible(false);
    setSearchQuery('');
    if (onSelect) {
      onSelect(item.name || item.id);
    }
  };

  const defaultPlaceholder =
    placeholder || (type === 'Event' ? 'Select event' : 'Select warehouse');

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* 1. LABEL */}
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}{' '}
            {required && <Text style={{ color: '#E03137', fontWeight: '700' }}>*</Text>}
          </Text>
        </View>
      )}

      {/* 2. TWO-PART CONNECTED BOX */}
      <View
        style={[
          styles.compositeContainer,
          disabled && styles.compositeContainerDisabled,
        ]}
      >
        {/* LEFT 15-25% PART: TYPE PICKER (SMALL BOLD TEXT) */}
        <TouchableOpacity
          style={styles.leftPart}
          activeOpacity={0.7}
          disabled={disabled}
          onPress={() => setIsTypeModalVisible(true)}
        >
          <Text style={styles.typeText} numberOfLines={1}>
            {type === 'Event' ? 'Event' : 'Warehouse'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={11}
            color="#6D43C0"
            style={{ marginLeft: 3 }}
          />
        </TouchableOpacity>

        {/* VERTICAL DIVIDER */}
        <View style={styles.divider} />

        {/* RIGHT PART: LOCATION SELECTION */}
        <TouchableOpacity
          style={styles.rightPart}
          activeOpacity={0.7}
          disabled={disabled}
          onPress={() => {
            setSearchQuery('');
            setIsListModalVisible(true);
          }}
        >
          <Text
            style={[styles.valueText, !value && styles.placeholderText]}
            numberOfLines={1}
          >
            {value || defaultPlaceholder}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* 3. TYPE PICKER MODAL */}
      <Modal
        visible={isTypeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTypeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsTypeModalVisible(false)}
        >
          <View style={styles.typeModalBox}>
            <Text style={styles.typeModalTitle}>Select Location Type</Text>

            {/* Option: Warehouse */}
            <TouchableOpacity
              style={[
                styles.typeOptionRow,
                type === 'Warehouse' && styles.typeOptionRowActive,
              ]}
              onPress={() => handleSelectType('Warehouse')}
            >
              <MaterialCommunityIcons
                name="warehouse"
                size={18}
                color={type === 'Warehouse' ? '#6D43C0' : '#64748B'}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'Warehouse' && styles.typeOptionTextActive,
                ]}
              >
                Warehouse
              </Text>
              {type === 'Warehouse' && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#6D43C0"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>

            {/* Option: Event */}
            <TouchableOpacity
              style={[
                styles.typeOptionRow,
                type === 'Event' && styles.typeOptionRowActive,
                { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectType('Event')}
            >
              <MaterialCommunityIcons
                name="calendar-star"
                size={18}
                color={type === 'Event' ? '#6D43C0' : '#64748B'}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'Event' && styles.typeOptionTextActive,
                ]}
              >
                Event
              </Text>
              {type === 'Event' && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#6D43C0"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 4. SCROLLABLE LOCATION LIST MODAL (100% FLUID SCROLL) */}
      <Modal
        visible={isListModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsListModalVisible(false)}
      >
        <SafeAreaView style={styles.listModalOverlay}>
          <View style={styles.listModalContainer}>
            {/* Modal Header */}
            <View style={styles.listModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name={type === 'Event' ? 'calendar-star' : 'warehouse'}
                  size={20}
                  color="#6D43C0"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.listModalTitle}>
                  Select {type === 'Event' ? 'Event' : 'Warehouse'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsListModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input Filter */}
            <View style={styles.searchBarContainer}>
              <Ionicons
                name="search"
                size={16}
                color="#8B7EA8"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchBarInput}
                placeholder={`Search ${type.toLowerCase()}...`}
                placeholderTextColor="#9AA3B4"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#A0AEC0" />
                </TouchableOpacity>
              )}
            </View>

            {/* Smooth Scrollable Items List */}
            <FlatList
              data={filteredList}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyText}>
                    No {type.toLowerCase()}s found matching &quot;{searchQuery}&quot;
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected =
                  (value || '').trim().toLowerCase() ===
                  (item.name || '').trim().toLowerCase();
                return (
                  <TouchableOpacity
                    style={[
                      styles.listItemRow,
                      isSelected && styles.listItemRowSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectItem(item)}
                  >
                    <View
                      style={[
                        styles.itemIconCircle,
                        isSelected && styles.itemIconCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          type === 'Event'
                            ? 'calendar-outline'
                            : 'business-outline'
                        }
                        size={16}
                        color={isSelected ? '#6D43C0' : '#64748B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.itemNameText,
                          isSelected && styles.itemNameTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.itemSubtitleText} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#6D43C0"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  labelRow: {
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#372064',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compositeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D1E5',
    borderRadius: 8,
    height: 42,
    overflow: 'hidden',
  },
  compositeContainerDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
  },
  leftPart: {
    width: 95,
    height: '100%',
    backgroundColor: '#F5F2FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#492687',
    flex: 1,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#D8D1E5',
  },
  rightPart: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E1B26',
    flex: 1,
    marginRight: 6,
  },
  placeholderText: {
    color: '#9A93A7',
    fontWeight: '400',
  },

  // TYPE PICKER MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  typeModalBox: {
    width: '100%',
    maxWidth: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  typeModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B26',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  typeOptionRowActive: {
    backgroundColor: '#F3EEFB',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  typeOptionTextActive: {
    color: '#6D43C0',
    fontWeight: '700',
  },

  // LIST MODAL
  listModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
    justifyContent: 'flex-end',
  },
  listModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B26',
  },
  closeBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5DFF0',
    paddingHorizontal: 12,
    height: 42,
    marginTop: 12,
    marginBottom: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E1B26',
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    borderRadius: 8,
  },
  listItemRowSelected: {
    backgroundColor: '#F3EEFB',
  },
  itemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconCircleSelected: {
    backgroundColor: '#E8DEF8',
  },
  itemNameText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E1B26',
  },
  itemNameTextSelected: {
    color: '#6D43C0',
    fontWeight: '700',
  },
  itemSubtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
});
