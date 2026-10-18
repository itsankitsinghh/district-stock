import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format helper for various date string shapes
 */
export function formatCalendarDate(day, monthIndex, year, format = 'ISO') {
  const dd = String(day).padStart(2, '0');
  const mm = String(monthIndex + 1).padStart(2, '0');
  const yyyy = String(year);
  const monName = MONTH_NAMES[monthIndex] || '';

  switch (format) {
    case 'SLASH':
      return `${dd}/${mm}/${yyyy}`;
    case 'SPACED_SLASH':
      return `${dd} / ${mm} / ${yyyy}`;
    case 'PRETTY':
      return `${dd}, ${monName} ${yyyy}`;
    case 'ISO':
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Parses existing date string into { year, monthIndex, day }
 */
export function parseDateInput(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  const clean = dateStr.trim();

  // Check ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const parts = clean.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1,
      day: parseInt(parts[2], 10),
    };
  }

  // Check DD / MM / YYYY or DD/MM/YYYY or DD-MM-YYYY
  const slashParts = clean.split(/[\/\- ]+/).filter(Boolean);
  if (slashParts.length === 3) {
    // If first part is 4 digits, it's YYYY/MM/DD
    if (slashParts[0].length === 4) {
      return {
        year: parseInt(slashParts[0], 10),
        month: parseInt(slashParts[1], 10) - 1,
        day: parseInt(slashParts[2], 10),
      };
    }
    // Else DD/MM/YYYY
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10) - 1;
    const y = parseInt(slashParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return { year: y, month: m, day: d };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

/**
 * Universal Calendar Modal matching exact design:
 * Header: «  ‹    2026 Oct    ›  »
 * Days: Su Mo Tu We Th Fr Sa
 * 42-cell calendar grid
 * Footer: Today (and optional Clear button)
 */
export default function CommonCalendarModal({
  visible = false,
  onClose,
  selectedDate = '',
  onSelectDate,
  format = 'ISO', // 'ISO' | 'SLASH' | 'SPACED_SLASH' | 'PRETTY'
  allowClear = false,
  onClear,
}) {
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(9); // 0-indexed, default Oct

  // Sync state when opened or selectedDate changes
  useEffect(() => {
    if (visible) {
      const parsed = parseDateInput(selectedDate);
      if (parsed && !isNaN(parsed.year) && !isNaN(parsed.month)) {
        setCalendarYear(parsed.year);
        setCalendarMonth(parsed.month);
      }
    }
  }, [visible, selectedDate]);

  const parsedActive = selectedDate ? parseDateInput(selectedDate) : null;

  const handlePrevYear = () => setCalendarYear((y) => y - 1);
  const handleNextYear = () => setCalendarYear((y) => y + 1);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectCell = (cell) => {
    const formatted = formatCalendarDate(cell.day, cell.month, cell.year, format);
    if (onSelectDate) {
      onSelectDate(formatted, {
        day: cell.day,
        month: cell.month,
        year: cell.year,
        iso: formatCalendarDate(cell.day, cell.month, cell.year, 'ISO'),
        slash: formatCalendarDate(cell.day, cell.month, cell.year, 'SLASH'),
        spacedSlash: formatCalendarDate(cell.day, cell.month, cell.year, 'SPACED_SLASH'),
        pretty: formatCalendarDate(cell.day, cell.month, cell.year, 'PRETTY'),
      });
    }
    if (onClose) onClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    const formatted = formatCalendarDate(day, month, year, format);
    if (onSelectDate) {
      onSelectDate(formatted, {
        day,
        month,
        year,
        iso: formatCalendarDate(day, month, year, 'ISO'),
        slash: formatCalendarDate(day, month, year, 'SLASH'),
        spacedSlash: formatCalendarDate(day, month, year, 'SPACED_SLASH'),
        pretty: formatCalendarDate(day, month, year, 'PRETTY'),
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onClear) onClear();
    if (onClose) onClose();
  };

  // Generate 42 cells (6 rows x 7 days)
  const getCalendarCells = (year, month) => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        month,
        year,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete 42 or multiple of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        day: n,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  const calendarCells = getCalendarCells(calendarYear, calendarMonth);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.calModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.calCard}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation && e.stopPropagation()}
        >
          {/* Calendar Top Navigation Header: «  ‹    2026 Oct    ›  » */}
          <View style={styles.calHeaderRow}>
            <View style={styles.calNavArrowGroup}>
              <TouchableOpacity onPress={handlePrevYear} style={styles.calArrowBtn} activeOpacity={0.7}>
                <Text style={styles.calArrowText}>«</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calArrowBtn} activeOpacity={0.7}>
                <Text style={styles.calArrowText}>‹</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.calMonthYearTitle}>
              {calendarYear}  {MONTH_NAMES[calendarMonth]}
            </Text>

            <View style={styles.calNavArrowGroup}>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calArrowBtn} activeOpacity={0.7}>
                <Text style={styles.calArrowText}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextYear} style={styles.calArrowBtn} activeOpacity={0.7}>
                <Text style={styles.calArrowText}>»</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of week row: Su Mo Tu We Th Fr Sa */}
          <View style={styles.calDaysHeaderRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={styles.calDayHeaderCell}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid of days */}
          <View style={styles.calGrid}>
            {calendarCells.map((cell, idx) => {
              const isSelected =
                parsedActive &&
                parsedActive.year === cell.year &&
                parsedActive.month === cell.month &&
                parsedActive.day === cell.day;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calCellBtn,
                    isSelected && styles.calCellBtnSelected,
                  ]}
                  onPress={() => handleSelectCell(cell)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      !cell.isCurrentMonth && styles.calCellTextMuted,
                      isSelected && styles.calCellTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Row: Today link (and optional Clear) */}
          <View style={[styles.calBottomRow, allowClear && styles.calBottomRowSplit]}>
            {allowClear && (
              <TouchableOpacity style={styles.calActionBtn} onPress={handleClear} activeOpacity={0.7}>
                <Text style={styles.calClearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.calTodayBtn} onPress={handleSelectToday} activeOpacity={0.7}>
              <Text style={styles.calTodayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 290,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  calHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calNavArrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calArrowBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calArrowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  calMonthYearTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  calDaysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  calDayHeaderCell: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calCellBtn: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 4,
  },
  calCellBtnSelected: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 4,
  },
  calCellText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '400',
  },
  calCellTextMuted: {
    color: '#CBD5E1',
  },
  calCellTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  calBottomRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calBottomRowSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  calTodayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  calActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  calTodayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
  calClearText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
