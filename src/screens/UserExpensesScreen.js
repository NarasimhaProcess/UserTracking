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

export default function UserExpensesScreen({ user, userProfile }) {
  // User Expenses State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');
  const [userExpenses, setUserExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showExpenseCalculatorModal, setShowExpenseCalculatorModal] = useState(false);
  const [calculatorTarget, setCalculatorTarget] = useState(null); // To know which field to update

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseType) {
      Alert.alert('Error', 'Amount and Expense Type are required.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }

    let lat = null;
    let lon = null;
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      } else {
        Alert.alert('Permission denied', 'Location permission is required to record expense location.');
      }
    } catch (err) {
      console.error('Error getting location for expense:', err);
      Alert.alert('Error', 'Failed to get location for expense.');
    }

    try {
      const { error } = await supabase.from('user_expenses').insert({
        user_id: user.id,
        amount: parseFloat(expenseAmount),
        expense_type: expenseType,
        remarks: expenseRemarks,
        latitude: lat,
        longitude: lon,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Expense added successfully!');
        setExpenseAmount('');
        setExpenseType('');
        setExpenseRemarks('');
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
        const total = (data || []).reduce((sum, expense) => sum + Number(expense.amount), 0);
        setTotalExpenses(total);
      }
    } catch (error) {
      console.error('Error fetching user expenses:', error);
    }
  };

  // Call fetchUserExpenses on component mount and when user changes
  useEffect(() => {
    fetchUserExpenses();
  }, [user?.id]);

  return (
    <View style={styles.container}>
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
      <TextInput
        value={expenseType}
        onChangeText={setExpenseType}
        placeholder="Expense Type (e.g., Food, Travel)"
        style={styles.input}
      />
      <TextInput
        value={expenseRemarks}
        onChangeText={setExpenseRemarks}
        placeholder="Remarks (Optional)"
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
        <Text style={styles.buttonText}>Add Expense</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Expense List</Text>
      <FlatList
        data={userExpenses}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <Text style={styles.expenseText}>{`Amount: ₹${item.amount}`}</Text>
            <Text style={styles.expenseText}>{`Type: ${item.expense_type}`}</Text>
            <Text style={styles.expenseText}>{`Remarks: ${item.remarks || 'N/A'}`}</Text>
            <Text style={styles.expenseText}>{`Date: ${new Date(item.created_at).toLocaleDateString()}`}</Text>
            <Text style={styles.expenseText}>{`Location: ${item.latitude?.toFixed(4) || 'N/A'}, ${item.longitude?.toFixed(4) || 'N/A'}`}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyListText}>No expenses recorded.</Text>}
        ListFooterComponent={
          <Text style={styles.totalExpensesText}>{`Total Spent: ₹${totalExpenses.toFixed(2)}`}</Text>
        }
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
    </View>
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
  expenseItem: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  expenseText: {
    fontSize: 14,
    marginBottom: 2,
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
});
