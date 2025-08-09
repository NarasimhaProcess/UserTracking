import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import CalculatorModal from '../components/CalculatorModal';
import EnhancedDatePicker from '../components/EnhancedDatePicker';

import { Picker } from '@react-native-picker/picker';

export default function UserExpensesScreen({ user, userProfile }) {
  // User Expenses State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [otherExpenseType, setOtherExpenseType] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');
  const [userExpenses, setUserExpenses] = useState([]);
  const [filteredUserExpenses, setFilteredUserExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showExpenseCalculatorModal, setShowExpenseCalculatorModal] = useState(false);
  const [calculatorTarget, setCalculatorTarget] = useState(null); // To know which field to update
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);

  const handleAddExpense = async () => {
    const finalExpenseType = expenseType === 'Other' ? otherExpenseType : expenseType;

    if (!expenseAmount || !finalExpenseType) {
      Alert.alert('Error', 'Amount and Expense Type are required.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }

    try {
      const { error } = await supabase.from('user_expenses').insert({
        user_id: user.id,
        amount: parseFloat(expenseAmount),
        expense_type: finalExpenseType, // Use the potentially combined type
        remarks: expenseRemarks,
        created_at: expenseDate.toISOString(),
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Expense added successfully!');
        setExpenseAmount('');
        setExpenseType('');
        setOtherExpenseType(''); // Clear the other field as well
        setExpenseRemarks('');
        setExpenseDate(new Date());
        fetchUserExpenses(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense.');
    }
  };

  const fetchUserExpenses = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user expenses:', error);
      } else {
        setUserExpenses(data || []);
        setFilteredUserExpenses(data || []);
        const total = (data || []).reduce((sum, expense) => sum + Number(expense.amount), 0);
        setTotalExpenses(total);
      }
    } catch (error) {
      console.error('Error fetching user expenses:', error);
    }
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      Alert.alert('Please select both start and end dates.');
      return;
    }

    const filtered = userExpenses.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    setFilteredUserExpenses(filtered);
    const total = filtered.reduce((sum, expense) => sum + Number(expense.amount), 0);
    setTotalExpenses(total);
  };

  // Call fetchUserExpenses on component mount and when user changes
  useEffect(() => {
    fetchUserExpenses();
  }, [user?.id]);

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={styles.amountContainer}>
        <Text style={styles.rowText}>{`₹${item.amount}`}</Text>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.rowText}>{item.expense_type}</Text>
      <Text style={styles.rowText}>{item.remarks || 'N/A'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionHeader}>Add New Expense</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <TextInput
          value={expenseAmount}
          onChangeText={setExpenseAmount}
          placeholder="Amount"
          keyboardType="numeric"
          style={[styles.input, { flex: 1, marginRight: 10 }]} 
        />
        <TouchableOpacity
          style={{ backgroundColor: '#4A90E2', padding: 10, borderRadius: 8 }}
          onPress={() => { setShowExpenseCalculatorModal(true); setCalculatorTarget('expenseAmount'); }}
        >
          <MaterialIcons name="calculate" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={expenseType}
          onValueChange={(itemValue) => setExpenseType(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select Expense Type" value="" />
          <Picker.Item label="Food" value="Food" />
          <Picker.Item label="Travel" value="Travel" />
          <Picker.Item label="Hotel" value="Hotel" />
          <Picker.Item label="Mobile Recharge" value="Mobile Recharge" />
          <Picker.Item label="Petrol" value="Petrol" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>
      {expenseType === 'Other' && (
        <TextInput
          value={otherExpenseType}
          onChangeText={setOtherExpenseType}
          placeholder="Please specify other expense type"
          style={styles.input}
        />
      )}
      <TextInput
        value={expenseRemarks}
        onChangeText={setExpenseRemarks}
        placeholder="Remarks (Optional)"
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
        multiline
      />
      <EnhancedDatePicker
        date={expenseDate}
        onDateChange={(date) => { setExpenseDate(date); setShowExpenseDatePicker(false); }}
        showDatePicker={showExpenseDatePicker}
        setShowDatePicker={setShowExpenseDatePicker}
        placeholder="Select Expense Date"
        style={styles.datePicker}
      />
      <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
        <Text style={styles.buttonText}>Add Expense</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Expense List</Text>
      <Text style={styles.totalExpensesText}>{`Total Spent: ₹${totalExpenses.toFixed(2)}`}</Text>
      <View style={styles.filterContainer}>
        <EnhancedDatePicker
          date={startDate}
          onDateChange={(date) => { setStartDate(date); setShowStartDatePicker(false); }}
          showDatePicker={showStartDatePicker}
          setShowDatePicker={setShowStartDatePicker}
          placeholder="Start Date"
          style={styles.datePicker}
        />
        <EnhancedDatePicker
          date={endDate}
          onDateChange={(date) => { setEndDate(date); setShowEndDatePicker(false); }}
          showDatePicker={showEndDatePicker}
          setShowDatePicker={setShowEndDatePicker}
          placeholder="End Date"
          style={styles.datePicker}
        />
        <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
          <Text style={styles.buttonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.expenseHeader}>
        <Text style={styles.headerText}>Amount</Text>
        <Text style={styles.headerText}>Type</Text>
        <Text style={styles.headerText}>Remarks</Text>
      </View>
      <FlatList
        data={filteredUserExpenses}
        keyExtractor={item => item.id.toString()}
        renderItem={renderExpenseItem}
        ListEmptyComponent={<Text style={styles.emptyListText}>No expenses recorded.</Text>}
      />

      <CalculatorModal
        isVisible={showExpenseCalculatorModal}
        onClose={() => setShowExpenseCalculatorModal(false)}
        onResult={(result) => {
          if (calculatorTarget === 'expenseAmount') {
            setExpenseAmount(String(result));
          }
          setShowExpenseCalculatorModal(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  totalExpensesText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'right',
    color: '#007AFF',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  datePicker: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
});
