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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function QuickTransactionScreen({ navigation, user }) {
  console.log('QuickTransactionScreen: user prop:', user);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [allAreas, setAllAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProofImage, setPaymentProofImage] = useState(null); // New state for payment proof image

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
          console.log('QuickTransactionScreen: Fetched Areas:', areaList);
          console.log('QuickTransactionScreen: Initial selectedAreaId:', areaList.length > 0 ? areaList[0].id : null);
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
          console.log('QuickTransactionScreen: Fetched All Customers:', customersData || []);
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
        (cust.book_no && cust.book_no.toLowerCase().includes(lowerCaseSearchText))
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customersInSelectedArea);
    }
  }, [customerSearchText, customersInSelectedArea]);

  const handleCustomerSelect = (customerId) => {
    const foundCustomer = filteredCustomers.find(cust => cust.id === customerId);
    setSelectedCustomer(foundCustomer);
    if (foundCustomer && foundCustomer.repayment_amount) {
      setAmount(String(foundCustomer.repayment_amount)); // Pre-populate amount
    } else {
      setAmount('');
    }
  };

  const uploadImageToSupabaseStorage = async (uri, userId, mimeType) => {
    try {
      const fileExt = mimeType.split('/')[1];
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const filePath = `payment_proofs/${userId}/${fileName}`;

      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Buffer.from(fileData, 'base64');

      const { data, error } = await supabase.storage
        .from('locationtracker') // Assuming 'locationtracker' is your bucket name
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        Alert.alert('Error', 'Failed to upload image: ' + error.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('locationtracker').getPublicUrl(filePath);
      return urlData?.publicUrl || '';
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image: ' + error.message);
      console.error('Image upload error:', error);
      return null;
    }
  };

  const pickImage = async () => {
    Alert.alert(
      "Select Image",
      "Choose an option to select your payment proof image.",
      [
        {
          text: "Pick from Gallery",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
              });
              // Process result
              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (!user || !user.id) {
                  Alert.alert('Error', 'User not logged in or user ID not available.');
                  return;
                }
                const publicUrl = await uploadImageToSupabaseStorage(asset.uri, user.id, asset.mimeType || 'image/jpeg');
                if (publicUrl) {
                  setPaymentProofImage(publicUrl);
                  Alert.alert('Success', 'Image selected and uploaded!');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to pick image from gallery: ' + error.message);
              console.error('Image picker gallery error:', error);
            }
          },
        },
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
              });
              // Process result
              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (!user || !user.id) {
                  Alert.alert('Error', 'User not logged in or user ID not available.');
                  return;
                }
                const publicUrl = await uploadImageToSupabaseStorage(asset.uri, user.id, asset.mimeType || 'image/jpeg');
                if (publicUrl) {
                  setPaymentProofImage(publicUrl);
                  Alert.alert('Success', 'Image selected and uploaded!');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to take photo: ' + error.message);
              console.error('Image picker camera error:', error);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleAddTransaction = async () => {
    console.log('handleAddTransaction called!');
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
    // New validation for payment type
    if (!paymentType) {
      Alert.alert('Error', 'Please select a Payment Type (Cash or UPI).');
      return;
    }
    // New validation for UPI image
    if (paymentType === 'upi' && !paymentProofImage) {
      Alert.alert('Error', 'Please upload a payment proof image for UPI transactions.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          customer_id: selectedCustomer.id,
          amount: parseFloat(amount),
          remarks: remarks,
          payment_mode: paymentType, // New field with correct name
          upi_image: paymentType === 'upi' ? paymentProofImage : null, // New field with correct name
          user_id: user.id, // Add user_id
          transaction_type: 'repayment', // Add transaction_type
          latitude: user.latitude, // Add latitude
          longitude: user.longitude, // Add longitude
        });

      if (error) {
        console.error('Supabase transaction insert error:', error);
        Alert.alert('Error', 'Failed to add transaction: ' + error.message);
      } else {
        Alert.alert('Success', 'Transaction added successfully!');
        // Clear fields after successful transaction
        setAmount('');
        setRemarks('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction.');
      console.error('Transaction add error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollViewContent}>
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
                      label={`${cust.book_no} - ${cust.name} (${cust.repayment_amount || 'N/A'})`}
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

      {/* Payment Type Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Type:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={paymentType}
            onValueChange={(itemValue) => setPaymentType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Payment Type" value={null} />
            <Picker.Item label="Cash" value="cash" />
            <Picker.Item label="UPI" value="upi" />
          </Picker>
        </View>
      </View>

      {paymentType === 'upi' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Proof (UPI):</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <Text style={styles.imagePickerButtonText}>Pick Image</Text>
          </TouchableOpacity>
          {paymentProofImage && (
            <Image source={{ uri: paymentProofImage }} style={styles.paymentProofImage} />
          )}
        </View>
      )}

     
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
  imagePickerButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentProofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
    marginTop: 10,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});