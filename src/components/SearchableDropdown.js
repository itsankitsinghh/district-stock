import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SearchableDropdown Component
 * Matches the user reference design:
 * - Active text input box with light-blue highlight border
 * - Circular clear (x) icon on the right
 * - Attached dropdown panel with clean text list
 * - Scroll track on right with up caret, thumb capsule, and down caret
 * - Real-time filtering as user types
 * - Preserves existing underlying selection & scoping logic
 */
export default function SearchableDropdown({
  label,
  value = '',
  options = [],
  placeholder = 'Select location',
  onSelect,
  onChangeText,
  badgeText,
  required = false,
  disabled = false,
  containerStyle,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const inputRef = useRef(null);

  // Sync internal query when value prop updates externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Filter options based on typed query (or show all if empty/matching full value)
  const filteredOptions = options.filter((opt) => {
    if (!query || !query.trim()) return true;
    if (query.trim().toLowerCase() === (value || '').trim().toLowerCase()) return true;
    return (opt || '').toLowerCase().includes(query.trim().toLowerCase());
  });

  const handleSelect = (option) => {
    setQuery(option);
    setIsOpen(false);
    if (onSelect) {
      onSelect(option);
    }
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
    if (onSelect) {
      onSelect('');
    }
    if (onChangeText) {
      onChangeText('');
    }
    inputRef.current?.focus();
  };

  const handleTextChange = (text) => {
    setQuery(text);
    setIsOpen(true);
    if (onChangeText) {
      onChangeText(text);
    }
    // If text exactly matches an option, trigger onSelect
    const exactMatch = options.find((o) => o.toLowerCase() === text.trim().toLowerCase());
    if (exactMatch && onSelect) {
      onSelect(exactMatch);
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        { zIndex: isOpen ? 9999 : 1 },
        containerStyle,
      ]}
    >
      {/* Label Row */}
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>
            {label} {required && <Text style={styles.reqStar}>*</Text>}
          </Text>
          {badgeText && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
      )}

      {/* Input Box matching reference image */}
      <View
        style={[
          styles.inputContainer,
          isOpen && styles.inputContainerActive,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={query}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="words"
        />

        {/* Right Action Icons: Circular clear 'x' button when text exists */}
        {query.length > 0 && !disabled ? (
          <TouchableOpacity
            style={styles.clearBtn}
            activeOpacity={0.6}
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color="#A0AEC0" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.chevronBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) inputRef.current?.focus();
              }
            }}
          >
            <Ionicons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748B"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Attached Dropdown List matching reference screenshot */}
      {isOpen && !disabled && (
        <View style={styles.dropdownPanel}>
          <View style={styles.dropdownBody}>
            {/* Options List */}
            <ScrollView
              style={styles.optionsScrollView}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching locations</Text>
                </View>
              ) : (
                filteredOptions.map((option, idx) => {
                  const isSelected =
                    (value || '').trim().toLowerCase() === (option || '').trim().toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`${option}-${idx}`}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        idx === filteredOptions.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Custom scroll track matching user's reference image:
                - Up caret at top
                - Vertical scroll track with dark-grey capsule thumb
                - Down caret at bottom */}
            {filteredOptions.length > 4 && (
              <View style={styles.scrollTrack}>
                <Ionicons name="caret-up" size={10} color="#64748B" />
                <View style={styles.scrollTrackLine}>
                  <View style={styles.scrollThumb} />
                </View>
                <Ionicons name="caret-down" size={10} color="#64748B" />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#625A72',
    fontWeight: '500',
  },
  reqStar: {
    color: '#E03137',
    fontWeight: '700',
  },
  badgeContainer: {
    backgroundColor: '#F0ECFA',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6D43C0',
  },

  // Input Box matching screenshot
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D9D4E3',
    borderRadius: 4,
    paddingHorizontal: 10,
  },
  inputContainerActive: {
    borderColor: '#3884F6', // Reference image cyan/blue active highlight border
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputContainerDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Attached Dropdown Panel matching screenshot
  dropdownPanel: {
    position: 'absolute',
    top: 56, // Sits directly below the label & input box
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3884F6', // Matches input container border
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    maxHeight: 220,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 25,
      },
    }),
  },
  dropdownBody: {
    flexDirection: 'row',
    maxHeight: 218,
  },
  optionsScrollView: {
    flex: 1,
    maxHeight: 218,
  },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    justifyContent: 'center',
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '400',
  },
  optionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Scrollbar track on right matching screenshot
  scrollTrack: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  scrollTrackLine: {
    flex: 1,
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  scrollThumb: {
    width: 8,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#64748B', // Grey pill thumb matching screenshot
  },
});
