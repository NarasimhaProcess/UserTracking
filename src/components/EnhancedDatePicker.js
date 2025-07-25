import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const EnhancedDatePicker = ({ 
  visible, 
  onClose, 
  onDateSelect, 
  startDate, 
  endDate, // Add endDate prop
  repaymentFrequency, 
  daysToComplete 
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date; // Return null if date is invalid
    }
    return null; // Default to null if no startDate
  });
  const [calculatedEndDate, setCalculatedEndDate] = useState(() => {
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date; // Return null if date is invalid
    }
    return null; // Default to null if no endDate
  });
  const [highlightedDates, setHighlightedDates] = useState([]);

  // Update selectedStartDate and calculatedEndDate when props change
  useEffect(() => {
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        setSelectedStartDate(date);
      }
    }
    
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        setCalculatedEndDate(date);
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (selectedStartDate && repaymentFrequency && daysToComplete) {
      calculateEndDateAndHighlights();
    } else if (!selectedStartDate) {
      // If selectedStartDate becomes null, clear calculatedEndDate and highlightedDates
      setCalculatedEndDate(null);
      setHighlightedDates([]);
    }
  }, [selectedStartDate, repaymentFrequency, daysToComplete]);

  const calculateEndDateAndHighlights = () => {
    if (!selectedStartDate || !repaymentFrequency || !daysToComplete) {
      setCalculatedEndDate(null);
      setHighlightedDates([]);
      return;
    }

    const start = new Date(selectedStartDate);
    let endDate = new Date(start);
    
    // Calculate end date based on frequency and daysToComplete
    switch (repaymentFrequency) {
      case 'daily':
        endDate.setDate(start.getDate() + parseInt(daysToComplete));
        break;
      case 'weekly':
        endDate.setDate(start.getDate() + (parseInt(daysToComplete) * 7));
        break;
      case 'monthly':
        endDate.setMonth(start.getMonth() + parseInt(daysToComplete));
        break;
      case 'yearly':
        endDate.setFullYear(start.getFullYear() + parseInt(daysToComplete));
        break;
    }
    
    setCalculatedEndDate(endDate);
    calculateHighlightedDates(start, endDate);
  };

  const calculateHighlightedDates = (start, end) => {
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      setHighlightedDates([]);
      return;
    }

    const dates = [];
    const periodsNum = parseInt(daysToComplete);
    const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    // Always add the start date as a highlighted date
    dates.push(new Date(normalizedStart));

    for (let i = 1; i < periodsNum; i++) { // Start from 1 because the first date is already added
      let nextDate = new Date(normalizedStart);
      switch (repaymentFrequency) {
        case 'daily':
          nextDate.setDate(normalizedStart.getDate() + i);
          break;
        case 'weekly':
          nextDate.setDate(normalizedStart.getDate() + (i * 7));
          break;
        case 'monthly':
          nextDate.setMonth(normalizedStart.getMonth() + i);
          break;
        case 'yearly':
          nextDate.setFullYear(normalizedStart.getFullYear() + i);
          break;
      }
      // Ensure the calculated date is within the overall repayment range (start to calculatedEndDate)
      // This check is important if daysToComplete is large and calculatedEndDate is limited by some other factor
      if (nextDate <= end) {
        dates.push(new Date(nextDate));
      } else {
        // If the next calculated repayment date exceeds the overall end date, stop.
        break;
      }
    }
    setHighlightedDates(dates);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateHighlighted = (date) => {
    // Ensure the selected start date is not also marked as a general highlighted date
    if (isDateSelected(date)) return false;
    return highlightedDates.some(highlightedDate => 
      highlightedDate.toDateString() === date.toDateString()
    );
  };

  const isDateSelected = (date) => {
    const dateStr = date.toDateString();
    return selectedStartDate && selectedStartDate.toDateString() === dateStr;
  };

  const isDateInRange = (date) => {
    if (!selectedStartDate || !calculatedEndDate) return false;
    return date >= selectedStartDate && date <= calculatedEndDate;
  };

  const handleDatePress = (date) => {
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastWeek = new Date(todayNormalized);
    lastWeek.setDate(lastWeek.getDate() - 7); // Allow dates from last week
    
    if (date < lastWeek) {
      Alert.alert('Invalid Date', 'Cannot select a date more than a week ago.');
      return;
    }
    
    // Set the selected start date
    setSelectedStartDate(date);
    
    // Immediately calculate the end date based on the new start date
    if (repaymentFrequency && daysToComplete) {
      const start = new Date(date);
      let end = new Date(start);
      
      // Calculate end date based on frequency and daysToComplete
      switch (repaymentFrequency) {
        case 'daily':
          end.setDate(start.getDate() + parseInt(daysToComplete));
          break;
        case 'weekly':
          end.setDate(start.getDate() + (parseInt(daysToComplete) * 7));
          break;
        case 'monthly':
          end.setMonth(start.getMonth() + parseInt(daysToComplete));
          break;
        case 'yearly':
          end.setFullYear(start.getFullYear() + parseInt(daysToComplete));
          break;
      }
      
      setCalculatedEndDate(end);
      calculateHighlightedDates(start, end);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isHighlighted = isDateHighlighted(date);
      const isSelected = isDateSelected(date);
      const isInRange = isDateInRange(date);
      const isToday = date.toDateString() === today.toDateString();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isHighlighted && styles.highlightedDay,
            isInRange && !isHighlighted && styles.rangeDay,
            isToday && styles.todayCircle,
            isSelected && styles.selectedDay,
          ]}
          onPress={() => handleDatePress(date)}
        >
          <Text style={[
            styles.dayText,
            isHighlighted && styles.highlightedDayText,
            isToday && styles.todayText,
            isSelected && styles.selectedDayText,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const handleConfirm = () => {
    if (selectedStartDate && calculatedEndDate) {
      // Ensure dates are formatted without timezone issues for display/storage
      const start = new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
      const end = new Date(calculatedEndDate.getFullYear(), calculatedEndDate.getMonth(), calculatedEndDate.getDate());
      
      // Format dates as YYYY-MM-DD
      const formattedStartDate = start.toISOString().split('T')[0];
      const formattedEndDate = end.toISOString().split('T')[0];
      
      console.log('Selected dates:', { startDate: formattedStartDate, endDate: formattedEndDate });
      
      onDateSelect({
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigateMonth(-1)}>
              <Text style={styles.navButton}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth(1)}>
              <Text style={styles.navButton}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          <ScrollView style={styles.calendarContainer}>
            <View style={styles.calendar}>
              {renderCalendar()}
            </View>
          </ScrollView>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.selectedDay]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.highlightedDay]} />
              <Text style={styles.legendText}>Repayment Dates</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.rangeDay]} />
              <Text style={styles.legendText}>Date Range</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, (!selectedStartDate || !calculatedEndDate) && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={!selectedStartDate || !calculatedEndDate}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    paddingHorizontal: 15,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarContainer: {
    maxHeight: 300,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  dayText: {
    fontSize: 16,
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  highlightedDay: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  highlightedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rangeDay: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginLeft: 10,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  todayCircle: {
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 20,
  },
  todayText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default EnhancedDatePicker;
