import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Picker } from '@react-native-picker/picker';

export default function QuickTransactionScreen({ navigation, user }) {
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [allAreas, setAllAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);

  // New states for customer dropdown
  const [allCustomers, setAllCustomers] = useState([]); // Stores all customers
  const [customersInSelectedArea, setCustomersInSelectedArea] = useState([]); // Customers filtered by area
  const [selectedCustomer, setSelectedCustomer] = useState(null); // The actual selected customer object
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]); // Customers filtered by search text within selected area

  // Fetch all areas and all customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch areas based on user groups
        const { data: userGroupsData, error: userGroupsError } = await supabase
          .from('user_groups')
          .select('groups(group_areas(area_master(id, area_name)))')
          .eq('user_id', user?.id); // Assuming 'user' prop is available here

        if (userGroupsError) {
          console.error('Error fetching user groups for areas:', userGroupsError);
          Alert.alert('Error', 'Failed to load areas based on user groups.');
          setAllAreas([]);
        } else {
          const areaList = [];
          const areaIdSet = new Set();
          userGroupsData.forEach(userGroup => {
            userGroup.groups?.group_areas?.forEach(groupArea => {
              const area = groupArea.area_master;
              if (area && !areaIdSet.has(area.id)) {
                areaIdSet.add(area.id);
                areaList.push({ id: area.id, name: area.area_name }); // Standardize to 'name'
              }
            });
          });
          setAllAreas(areaList);
          if (areaList.length > 0) {
            setSelectedAreaId(areaList[0].id); // Select the first area by default
          } else {
            setSelectedAreaId(null);
          }
        }

        // Fetch all customers (this part remains largely the same, but ensure it's not dependent on selectedAreaId yet)
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, book_no, repayment_amount, area_id');

        if (customersError) {
          console.error('Error fetching all customers:', customersError);
          Alert.alert('Error', 'Failed to load customers.');
        } else {
          setAllCustomers(customersData || []);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        Alert.alert('Error', 'Failed to load initial data.');
      } finally {
        setLoading(false);
      }
    };
    // Ensure 'user' prop is passed to QuickTransactionScreen or fetched here if not
    // For now, assuming 'user' is available as a prop.
    fetchData();
  }, [user?.id]); // Add user.id as a dependency

  // Filter customers by selected area whenever selectedAreaId or allCustomers changes
  useEffect(() => {
    if (selectedAreaId && allCustomers.length > 0) {
      const filteredByArea = allCustomers.filter(cust => cust.area_id === selectedAreaId);
      setCustomersInSelectedArea(filteredByArea);
      setFilteredCustomers(filteredByArea); // Reset filteredCustomers when area changes
      setSelectedCustomer(null); // Reset selected customer when area changes
      setAmount(''); // Clear amount when area changes
      setCustomerSearchText(''); // Clear search text when area changes
    } else {
      setCustomersInSelectedArea([]);
      setFilteredCustomers([]);
      setSelectedCustomer(null);
      setAmount('');
      setCustomerSearchText('');
    }
  }, [selectedAreaId, allCustomers]);

  // Filter customers based on search text within the selected area's customers
  useEffect(() => {
    if (customerSearchText) {
      const lowerCaseSearchText = customerSearchText.toLowerCase();
      const filtered = customersInSelectedArea.filter(cust =>
        (cust.name && cust.name.toLowerCase().includes(lowerCaseSearchText)) ||
        (cust.card_number && cust.card_number.toLowerCase().includes(lowerCaseSearchText))
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customersInSelectedArea);
    }
  }, [customerSearchText, customersInSelectedArea]);

  // Handle customer selection from the second dropdown
  const handleCustomerSelect = (customerId) => {
    const foundCustomer = filteredCustomers.find(cust => cust.id === customerId);
    setSelectedCustomer(foundCustomer);
    if (foundCustomer && foundCustomer.repayment_amount) {
      setAmount(String(foundCustomer.repayment_amount)); // Pre-populate amount
    } else {
      setAmount('');
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer.');
      return;
    }
    if (!amount) {
      Alert.alert('Error', 'Please enter an Amount.');
      return;
    }
    if (!selectedAreaId) {
      Alert.alert('Error', 'Please select an Area.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customer_transactions')
        .insert({
          customer_id: selectedCustomer.id,
          amount: parseFloat(amount),
          remarks: remarks,
          area_id: selectedAreaId,
        });

      if (error) {
        Alert.alert('Error', 'Failed to add transaction: ' + error.message);
      } else {
        Alert.alert('Success', 'Transaction added successfully!');
        // Clear fields after successful transaction
        setAmount('');
        setRemarks('');
        setSelectedCustomer(null);
        setCustomerSearchText('');
        // Reset area selection to default or first area
        setSelectedAreaId(allAreas.length > 0 ? allAreas[0].id : null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction.');
      console.error('Transaction add error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="close" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.header}>Quick Transaction</Text>

      {/* Area Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Area:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedAreaId}
            onValueChange={(itemValue) => setSelectedAreaId(itemValue)}
            style={styles.picker}
          >
            {allAreas.length > 0 ? (
              allAreas.map((area) => (
                <Picker.Item key={area.id} label={area.name} value={area.id} />
              ))
            ) : (
              <Picker.Item label="No areas available" value={null} />
            )}
          </Picker>
        </View>
      </View>

      {selectedAreaId && ( // Only show customer selection if an area is selected
        <>
          {/* Customer Search Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Search Customer (Card No / Name):</Text>
            <TextInput
              style={styles.input}
              value={customerSearchText}
              onChangeText={setCustomerSearchText}
              placeholder="Search by Card No or Name"
            />
          </View>

          {/* Customer Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCustomer ? selectedCustomer.id : null}
                onValueChange={(itemValue) => handleCustomerSelect(itemValue)}
                style={styles.picker}
              >
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <Picker.Item
                      key={cust.id}
                      label={`${cust.card_number} - ${cust.name} (${cust.repayment_amount || 'N/A'})`}
                      value={cust.id}
                    />
                  ))
                ) : (
                  <Picker.Item label="No customers found" value={null} />
                )}
              </Picker>
            </View>
          </View>

          {selectedCustomer && (
            <View style={styles.customerInfoCard}>
              <Text style={styles.customerInfoText}>Selected Customer: {selectedCustomer.name}</Text>
              <Text style={styles.customerInfoText}>Card No: {selectedCustomer.card_number}</Text>
              <Text style={styles.customerInfoText}>Repayment Amount: {selectedCustomer.repayment_amount || 'N/A'}</Text>
            </View>
          )}
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount:</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter Amount"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Remarks:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Enter Remarks (Optional)"
          multiline
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction} disabled={loading || !selectedCustomer || !selectedAreaId || !amount}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>Add Transaction</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f2f5',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfoCard: {
    backgroundColor: '#e6f7ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
  },
  customerInfoText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});