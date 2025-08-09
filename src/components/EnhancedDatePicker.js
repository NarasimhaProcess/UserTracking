import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const EnhancedDatePicker = ({ date, onDateChange, placeholder, style, showDatePicker, setShowDatePicker }) => {
  const [tempDate, setTempDate] = useState(date ? new Date(date) : new Date());

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    setShowDatePicker(false);
    onDateChange(selectedDate);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
        <Text style={styles.placeholderText}>{date ? date.toLocaleDateString() : placeholder}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
});

export default EnhancedDatePicker;
