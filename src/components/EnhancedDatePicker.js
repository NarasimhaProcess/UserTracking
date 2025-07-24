import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const EnhancedDatePicker = ({ 
  visible, 
  onClose, 
  onDateSelect, 
  startDate, 
  endDate, 
  repaymentFrequency, 
  daysToComplete 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(startDate ? new Date(startDate) : null);
  const [selectedEndDate, setSelectedEndDate] = useState(endDate ? new Date(endDate) : null);
  const [highlightedDates, setHighlightedDates] = useState([]);

  useEffect(() => {
    if (selectedStartDate && selectedEndDate && repaymentFrequency) {
      calculateHighlightedDates();
    }
  }, [selectedStartDate, selectedEndDate, repaymentFrequency, daysToComplete]);

  const calculateHighlightedDates = () => {
    if (!selectedStartDate || !selectedEndDate) return;

    const dates = [];
    const start = new Date(selectedStartDate);
    const end = new Date(selectedEndDate);
    
    switch (repaymentFrequency) {
      case 'daily':
        const dayInterval = parseInt(daysToComplete) || 1;
        let currentDate = new Date(start);
        while (currentDate <= end) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + dayInterval);
        }
        break;
        
      case 'weekly':
        let weeklyDate = new Date(start);
        // Ensure we start from the exact start date
        weeklyDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        
        while (weeklyDate <= endDate) {
          dates.push(new Date(weeklyDate));
          // Add exactly 7 days for weekly frequency
          weeklyDate = new Date(weeklyDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        }
        break;
        
      case 'monthly':
        let monthlyDate = new Date(start);
        while (monthlyDate <= end) {
          dates.push(new Date(monthlyDate));
          monthlyDate.setMonth(monthlyDate.getMonth() + 1);
        }
        break;
        
      case 'yearly':
        let yearlyDate = new Date(start);
        while (yearlyDate <= end) {
          dates.push(new Date(yearlyDate));
          yearlyDate.setFullYear(yearlyDate.getFullYear() + 1);
        }
        break;
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
    return highlightedDates.some(highlightedDate => 
      highlightedDate.toDateString() === date.toDateString()
    );
  };

  const isDateSelected = (date) => {
    const dateStr = date.toDateString();
    return (selectedStartDate && selectedStartDate.toDateString() === dateStr) ||
           (selectedEndDate && selectedEndDate.toDateString() === dateStr);
  };

  const isDateInRange = (date) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const handleDatePress = (date) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    } else if (date >= selectedStartDate) {
      setSelectedEndDate(date);
    } else {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
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

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && styles.selectedDay,
            isHighlighted && styles.highlightedDay,
            isInRange && !isHighlighted && styles.rangeDay
          ]}
          onPress={() => handleDatePress(date)}
        >
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedDayText,
            isHighlighted && styles.highlightedDayText
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
    if (selectedStartDate && selectedEndDate) {
      onDateSelect({
        startDate: selectedStartDate.toISOString().split('T')[0],
        endDate: selectedEndDate.toISOString().split('T')[0]
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
              style={[styles.confirmButton, (!selectedStartDate || !selectedEndDate) && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={!selectedStartDate || !selectedEndDate}
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
});

export default EnhancedDatePicker;
