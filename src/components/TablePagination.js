import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Standard District Stock Table Pagination Footer
 * Matches exact UI: "1 to 10 of 405   |<  <  Page 1 of 27  >  >|"
 */
export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  primaryColor = '#38BDF8', // screenshot cyan or district purple
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, validPage * itemsPerPage);

  const canGoPrev = validPage > 1;
  const canGoNext = validPage < totalPages;

  return (
    <View style={styles.container}>
      {/* Left: Range text */}
      <View style={styles.leftContainer}>
        <Text style={styles.rangeText}>
          <Text style={styles.boldText}>{startItem}</Text> to{' '}
          <Text style={styles.boldText}>{endItem}</Text> of{' '}
          <Text style={styles.boldText}>{totalItems}</Text>
        </Text>
      </View>

      {/* Right: Pagination Controls */}
      <View style={styles.rightControls}>
        {/* First Page |< */}
        <TouchableOpacity
          disabled={!canGoPrev}
          onPress={() => onPageChange && onPageChange(1)}
          style={[styles.arrowBtn, !canGoPrev && styles.arrowBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <Feather
            name="chevrons-left"
            size={18}
            color={canGoPrev ? primaryColor : '#CBD5E1'}
          />
        </TouchableOpacity>

        {/* Prev Page < */}
        <TouchableOpacity
          disabled={!canGoPrev}
          onPress={() => onPageChange && onPageChange(validPage - 1)}
          style={[styles.arrowBtn, !canGoPrev && styles.arrowBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <Feather
            name="chevron-left"
            size={18}
            color={canGoPrev ? primaryColor : '#CBD5E1'}
          />
        </TouchableOpacity>

        {/* Page status: Page 1 of 27 */}
        <Text style={styles.pageStatusText}>
          Page <Text style={styles.boldText}>{validPage}</Text> of {totalPages}
        </Text>

        {/* Next Page > */}
        <TouchableOpacity
          disabled={!canGoNext}
          onPress={() => onPageChange && onPageChange(validPage + 1)}
          style={[styles.arrowBtn, !canGoNext && styles.arrowBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={canGoNext ? primaryColor : '#CBD5E1'}
          />
        </TouchableOpacity>

        {/* Last Page >| */}
        <TouchableOpacity
          disabled={!canGoNext}
          onPress={() => onPageChange && onPageChange(totalPages)}
          style={[styles.arrowBtn, !canGoNext && styles.arrowBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <Feather
            name="chevrons-right"
            size={18}
            color={canGoNext ? primaryColor : '#CBD5E1'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '400',
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.45,
  },
  pageStatusText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '400',
    marginHorizontal: 4,
  },
});
