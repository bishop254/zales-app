import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal } from '@/components/app/app-modal';
import { palette, radius, spacing, typography } from '@/constants/app-theme';

type DatePickerDayState = {
  disabled?: boolean;
  muted?: boolean;
};

type DatePickerModalProps = {
  title: string;
  visible: boolean;
  month: Date;
  selectedDate?: string | null;
  onClose: () => void;
  onMonthChange: (nextMonth: Date) => void;
  onSelectDate: (dateIso: string) => void;
  getDateState?: (date: Date, dateIso: string) => DatePickerDayState;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePickerModal({
  title,
  visible,
  month,
  selectedDate,
  onClose,
  onMonthChange,
  onSelectDate,
  getDateState,
}: DatePickerModalProps) {
  return (
    <AppModal
      footer={
        <View style={styles.modalFooter}>
          <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={onClose}>
            <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
          </Pressable>
        </View>
      }
      frameStyle={styles.dateModalFrame}
      title={title}
      visible={visible}
      onClose={onClose}>
      <View style={styles.calendarHeader}>
        <Pressable
          style={styles.calendarNavButton}
          onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <MaterialIcons color={palette.primary} name="chevron-left" size={22} />
        </Pressable>
        <Text style={styles.calendarTitle}>
          {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          style={styles.calendarNavButton}
          onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <MaterialIcons color={palette.primary} name="chevron-right" size={22} />
        </Pressable>
      </View>

      <View style={styles.calendarWeekdays}>
        {WEEKDAY_LABELS.map((day) => (
          <Text key={day} style={styles.calendarWeekday}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {buildCalendarDays(month).map((day, index) => {
          const dateIso = day ? formatDateIso(day) : null;
          const dateState = day && dateIso ? getDateState?.(day, dateIso) ?? {} : { disabled: true };
          const isDisabled = !day || Boolean(dateState.disabled);
          const isMuted = Boolean(dateState.muted);
          const selected = dateIso === selectedDate;

          return (
            <Pressable
              key={dateIso ?? `empty-${index}`}
              disabled={isDisabled}
              style={[
                styles.calendarDay,
                !day ? styles.calendarDayEmpty : null,
                isMuted ? styles.calendarDayMuted : null,
                selected ? styles.calendarDaySelected : null,
              ]}
              onPress={() => {
                if (!dateIso) {
                  return;
                }

                onSelectDate(dateIso);
              }}>
              <Text
                style={[
                  styles.calendarDayText,
                  !day ? styles.calendarDayTextEmpty : null,
                  isMuted ? styles.calendarDayTextMuted : null,
                  selected ? styles.calendarDayTextSelected : null,
                ]}>
                {day ? day.getDate() : 0}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AppModal>
  );
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatDateIso(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    width: '14.2857%',
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDayMuted: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: palette.primary,
  },
  calendarDayText: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
  calendarDayTextMuted: {
    color: palette.onSurfaceVariant,
  },
  calendarDayTextSelected: {
    color: palette.onPrimary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  calendarWeekday: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
    width: '14.2857%',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  dateModalFrame: {
    maxHeight: '56%',
    maxWidth: 420,
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  },
  modalButtonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  modalButtonTextOutline: {
    color: palette.onSurface,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
