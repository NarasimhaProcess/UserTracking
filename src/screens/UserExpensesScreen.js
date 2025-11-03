import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import CalculatorModal from '../components/CalculatorModal';
import { Picker } from '@react-native-picker/picker';
import NetInfo from '@react-native-community/netinfo';
import { NetInfoService } from '../services/NetInfoService';
import { OfflineStorageService } from '../services/OfflineStorageService';
import { v4 as uuidv4 } from 'uuid';
import AreaSearchBar from '../components/AreaSearchBar';
import { debounce } from 'lodash';

const getDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date();
  return days[d.getDay()];
};

const getCurrentTime = () => {
  const d = new Date();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function UserExpensesScreen({ navigation, user, userProfile }) {
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dates, setDates] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const filtered = userExpenses.filter(expense =>
      expense.expense_type.toLowerCase().includes(searchText.toLowerCase()) ||
      (expense.remarks && expense.remarks.toLowerCase().includes(searchText.toLowerCase())) ||
      (expense.amount && expense.amount.toString().toLowerCase().includes(searchText.toLowerCase())) ||
      (expense.area_master && expense.area_master.area_name.toLowerCase().includes(searchText.toLowerCase()))
    );
    setFilteredUserExpenses(filtered);
  }, [searchText, userExpenses]);

  // New states for Area Search
  const [allAreas, setAllAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [areaSearchText, setAreaSearchText] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  const fetchAreas = useCallback(async () => {
    // Fetch all areas initially, regardless of search text
    if (allAreas.length === 0) {
      setLoading(true);
      const isConnected = await NetInfoService.isNetworkAvailable();
      let fetchedAreas = [];

      if (isConnected) {
        try {
          let areaList = [];
          if (user?.user_type?.toLowerCase() === 'superadmin' || user?.user_type?.toLowerCase() === 'admin') {
            const { data, error } = await supabase
              .from('area_master')
              .select('id, area_name, enable_day, day_of_week, start_time_filter, end_time_filter')
              .order('area_name', { ascending: true });
            if (error) {
              Alert.alert('Error', 'Failed to load all areas for superadmin.');
            } else {
              areaList = data || [];
            }
          } else {
            const currentDayName = getDayName();
            const currentTime = getCurrentTime();

            const { data: userGroupsData, error: userGroupsError } = await supabase
              .from('user_groups')
              .select('groups(group_areas(area_master(id, area_name, enable_day, day_of_week, start_time_filter, end_time_filter)))')
              .eq('user_id', user?.id);

            if (userGroupsError) {
              Alert.alert('Error', 'Failed to load areas based on user groups.');
            } else {
              const areaIdSet = new Set();
              const areas = userGroupsData
                .flatMap(userGroup => userGroup.groups?.group_areas || [])
                .map(groupArea => groupArea.area_master)
                .filter(Boolean);

              areas.forEach(area => {
                if (area && !areaIdSet.has(area.id)) {
                  if (user?.user_type === 'user') {
                    const areaStartTime = area.start_time_filter ? area.start_time_filter.substring(0, 5) : '';
                    const areaEndTime = area.end_time_filter ? area.end_time_filter.substring(0, 5) : '';

                    const isTimeFiltered = (
                      !area.enable_day ||
                      (area.enable_day &&
                      area.day_of_week === currentDayName &&
                      (
                        (areaStartTime === '00:00' && areaEndTime === '00:00') ||
                        (areaStartTime <= areaEndTime && currentTime >= areaStartTime && currentTime <= areaEndTime) ||
                        (areaStartTime > areaEndTime && (currentTime >= areaStartTime || currentTime <= areaEndTime))
                      ))
                    );

                    if (isTimeFiltered) {
                      areaIdSet.add(area.id);
                      areaList.push(area);
                    }
                  } else {
                    areaIdSet.add(area.id);
                    areaList.push(area);
                  }
                }
              });
            }
          }
          fetchedAreas = areaList;
          await OfflineStorageService.saveOfflineAreas(areaList);
        } catch (error) {
          Alert.alert('Error', 'Failed to load initial data online.');
        }
      } else {
        fetchedAreas = await OfflineStorageService.getOfflineAreas();
        Alert.alert('Offline Mode', 'Loading areas from offline storage.');
      }

      setAllAreas(fetchedAreas);
      setLoading(false);
    }
  }, [user, allAreas.length, userProfile]); // Add allAreas.length to dependencies

  useEffect(() => {
    const today = new Date();
    const pastThreeDays = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
    const dates = [];
    for (let dt = pastThreeDays; dt <= today; dt.setDate(dt.getDate() + 1)) {
      dates.push(new Date(dt));
    }
    setDates(dates);
    setSelectedDate(new Date()); // Keep defaulting to today
    fetchAreas(); // Fetch areas on component mount
  }, [fetchAreas]); // Add fetchAreas to dependency array

    useEffect(() => {

      console.log('useEffect fetchUserExpenses trigger: user.id:', user?.id, 'selectedAreaId:', selectedAreaId, 'allAreas count:', allAreas.length);

      fetchUserExpenses(allAreas);

      syncOfflineExpenses();

    }, [user?.id, selectedAreaId, allAreas]);

  

    const syncOfflineExpenses = async () => {

      const offlineExpenses = await OfflineStorageService.getOfflineExpenses();

      if (offlineExpenses.length > 0 && await NetInfoService.isNetworkAvailable()) {

        Alert.alert('Syncing', 'Syncing offline expenses...');

        for (const expense of offlineExpenses) {

          try {

            const { error } = await supabase.from('user_expenses').insert(expense);

            if (error) {

              throw error;

            }

          } catch (error) {

            console.error('Error syncing offline expense:', error);

            Alert.alert('Error', 'Failed to sync some expenses. Please try again later.');

            return; // Stop syncing if there is an error

          }

        }

        await OfflineStorageService.clearOfflineExpenses();

        Alert.alert('Success', 'Offline expenses synced successfully!');

        fetchUserExpenses();

      }

    };

  

    const handleAddExpense = async () => {

      const finalExpenseType = expenseType === 'Other' ? otherExpenseType : expenseType;

  

      if (!expenseAmount || !finalExpenseType) {

        Alert.alert('Error', 'Amount and Expense Type are required.');

        return;

      }

  

      if (!selectedAreaId) {

        Alert.alert('Error', 'Please select an Area.');

        return;

      }

  

      if (!user?.id) {

        Alert.alert('Error', 'User not logged in.');

        return;

      }

  

      const expense = {

        id: uuidv4(),

        user_id: user.id,

        area_id: selectedAreaId, // Add area_id here

        amount: parseFloat(expenseAmount),

        expense_type: finalExpenseType,

        remarks: expenseRemarks,

        created_at: selectedDate.toISOString(),

      };

  

      if (!await NetInfoService.isNetworkAvailable()) {

        await OfflineStorageService.saveOfflineExpense(expense);

        Alert.alert('Offline', 'Expense saved locally and will be synced when you are back online.');

        setExpenseAmount('');

        setExpenseType('');

        setOtherExpenseType('');

        setExpenseRemarks('');

        fetchUserExpenses();

      } else {

        try {

          const { error } = await supabase.from('user_expenses').insert(expense);

  

          if (error) {

            Alert.alert('Error', error.message);

          } else {

            Alert.alert('Success', 'Expense added successfully!');

            setExpenseAmount('');

            setExpenseType('');

            setOtherExpenseType(''); // Clear the other field as well

            setExpenseRemarks('');

            fetchUserExpenses(); // Refresh the list

          }

        } catch (error) {

          console.error('Error adding expense:', error);

          Alert.alert('Error', 'Failed to add expense.');

        }

      }

    };

  

    const fetchUserExpenses = async (accessibleAreas) => {

      console.log('fetchUserExpenses called with user.id:', user?.id, 'selectedAreaId:', selectedAreaId, 'accessibleAreas count:', accessibleAreas.length);

      if (!user?.id) return;

  

      const accessibleAreaIds = accessibleAreas.map(area => area.id);

  

      if (!await NetInfoService.isNetworkAvailable()) {

        const offlineExpenses = await OfflineStorageService.getOfflineExpenses();

        let allExpenses = [...offlineExpenses.map(e => ({...e, isOffline: true}))];

  

        // Filter by accessible areas for regular users

        if (userProfile?.user_type !== 'superadmin' && accessibleAreaIds.length > 0) {

          allExpenses = allExpenses.filter(expense => accessibleAreaIds.includes(expense.area_id));

        }

  

        if (selectedAreaId) {

          allExpenses = allExpenses.filter(expense => expense.area_id === selectedAreaId);

        }

        console.log('fetchUserExpenses (offline): allExpenses after filtering:', allExpenses);

        setUserExpenses(allExpenses);

        setFilteredUserExpenses(allExpenses);

        const total = allExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

        setTotalExpenses(total);

      } else {

        try {

                  let query = supabase

                    .from('user_expenses')

                    .select('*, area_master(area_name)'); // Removed .eq('user_id', user.id);

  

          // Filter by accessible areas for regular users

          if (userProfile?.user_type !== 'superadmin' && accessibleAreaIds.length > 0) {

            query = query.in('area_id', accessibleAreaIds);

          }

  

          if (selectedAreaId) {

            query = query.eq('area_id', selectedAreaId);

          }

          console.log('fetchUserExpenses (online): Supabase query built.');

          const { data, error } = await query.order('created_at', { ascending: false });

  

          if (error) {

            console.error('Error fetching user expenses:', error);

          }

          console.log('fetchUserExpenses (online): Data from Supabase:', data);

          const offlineExpenses = await OfflineStorageService.getOfflineExpenses();

          let allExpenses = [...(data || []), ...offlineExpenses.map(e => ({...e, isOffline: true}))];

  

          // Filter offline expenses by accessible areas for regular users

          if (userProfile?.user_type !== 'superadmin' && accessibleAreaIds.length > 0) {

            allExpenses = allExpenses.filter(expense => accessibleAreaIds.includes(expense.area_id));

          }

  

          if (selectedAreaId) {

            allExpenses = allExpenses.filter(expense => expense.area_id === selectedAreaId);

          }

          console.log('fetchUserExpenses (online): allExpenses after filtering:', allExpenses);

          setUserExpenses(allExpenses);

          setFilteredUserExpenses(allExpenses);

          const total = allExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

          setTotalExpenses(total);

        } catch (error) {

          console.error('Error fetching user expenses:', error);

        }

      }

    };

  

    const renderExpenseItem = ({ item }) => (
    <View style={[styles.expenseRow, item.isOffline && styles.offlineRow]}>
      <View style={styles.amountContainer}>
        <Text style={styles.rowText}>{`₹${item.amount}`}</Text>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.rowText}>{item.expense_type}</Text>
      <Text style={styles.rowText}>{item.area_master?.area_name || 'N/A'}</Text>
      <Text style={styles.rowText}>{item.remarks || 'N/A'}</Text>
      {item.isOffline && <MaterialIcons name="cloud-off" size={24} color="gray" />}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredUserExpenses}
        keyExtractor={item => item.id ? item.id.toString() : item.created_at}
        renderItem={renderExpenseItem}
        ListEmptyComponent={<Text style={styles.emptyListText}>No expenses recorded.</Text>}
        ListHeaderComponent={
          <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.sectionHeader}>Add New Expense</Text>

            <Text style={styles.inputLabel}>Area:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <AreaSearchBar
                style={{ flex: 1 }}
                areas={allAreas}
                onAreaSelect={(id, name) => {
                  setSelectedAreaId(id);
                  setAreaSearchText(name);
                }}
                selectedAreaName={areaSearchText}
              />
            </View>

            <Text style={styles.inputLabel}>Expense Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="Enter Amount" 
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
            
            <Text style={styles.inputLabel}>Expense Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={expenseType}
                onValueChange={(itemValue) => setExpenseType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Expense Type" value="" />
                <Picker.Item label="Food" value="Food" />
                <Picker.Item label="Travel" value="Travel" />
                <Picker.Item label="Fuel" value="Fuel" />
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
            
            <Text style={styles.inputLabel}>Remarks</Text>
            <TextInput
              value={expenseRemarks}
              onChangeText={setExpenseRemarks}
              placeholder="Enter remarks (optional)"
              style={styles.input}
            />
            
                     <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
              <Text style={styles.buttonText}>Add Expense</Text>
            </TouchableOpacity>
            <Text style={styles.sectionHeader}>Expense List</Text>
            <TextInput
              style={styles.input}
              placeholder="Search Expenses..."
              onChangeText={text => setSearchText(text)}
            />
            <Text style={styles.totalExpensesText}>{`Total Spent: ₹${totalExpenses.toFixed(2)}`}</Text>
            <View style={styles.expenseHeader}>
              <Text style={styles.headerText}>Amount</Text>
              <Text style={styles.headerText}>Type</Text>
              <Text style={styles.headerText}>Area</Text>
              <Text style={styles.headerText}>Remarks</Text>
            </View>
          </View>
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
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  amountContainer: {
    flex: 1,
    alignItems: 'center',
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
  offlineRow: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  rowText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
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
  dropdownContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: '#fff',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
});
