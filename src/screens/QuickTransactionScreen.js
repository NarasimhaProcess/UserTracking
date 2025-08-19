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
  FlatList, // Added FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { NetInfoService } from '../services/NetInfoService';
import { OfflineStorageService } from '../services/OfflineStorageService';
import { v4 as uuidv4 } from 'uuid';

export default function QuickTransactionScreen({ navigation, user }) {
  console.log('QuickTransactionScreen: user prop:', user);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [allAreas, setAllAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProofImage, setPaymentProofImage] = useState(null); // New state for payment proof image
  const [transactions, setTransactions] = useState([]); // State to store transactions for display

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
      const isConnected = await NetInfoService.isNetworkAvailable();

      let fetchedAreas = [];
      let fetchedCustomers = [];

      if (isConnected) {
        try {
          // Fetch areas based on user groups
          const { data: userGroupsData, error: userGroupsError } = await supabase
            .from('user_groups')
            .select('groups(group_areas(area_master(id, area_name)))')
            .eq('user_id', user?.id);

          if (userGroupsError) {
            console.error('Error fetching user groups for areas:', userGroupsError);
            Alert.alert('Error', 'Failed to load areas based on user groups.');
          } else {
            const areaList = [];
            const areaIdSet = new Set();
            userGroupsData.forEach(userGroup => {
              userGroup.groups?.group_areas?.forEach(groupArea => {
                const area = groupArea.area_master;
                if (area && !areaIdSet.has(area.id)) {
                  areaIdSet.add(area.id);
                  areaList.push({ id: area.id, name: area.area_name });
                }
              });
            });
            fetchedAreas = areaList;
            await OfflineStorageService.saveOfflineAreas(areaList); // Save to offline storage
            console.log('QuickTransactionScreen: Fetched Areas (Online):', areaList);
          }

          // Fetch all customers
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, name, book_no, repayment_amount, area_id');

          if (customersError) {
            console.error('Error fetching all customers:', customersError);
            Alert.alert('Error', 'Failed to load customers.');
          } else {
            fetchedCustomers = customersData || [];
            await OfflineStorageService.saveOfflineCustomers(fetchedCustomers); // Save to offline storage
            console.log('QuickTransactionScreen: Fetched All Customers (Online):', fetchedCustomers);
          }
        } catch (error) {
          console.error('Error fetching initial data online:', error);
          Alert.alert('Error', 'Failed to load initial data online.');
        }
      } else {
        // Offline: Load from local storage
        fetchedAreas = await OfflineStorageService.getOfflineAreas();
        fetchedCustomers = await OfflineStorageService.getOfflineCustomers();
        Alert.alert('Offline Mode', 'Loading areas and customers from offline storage.');
        console.log('QuickTransactionScreen: Loaded Areas (Offline):', fetchedAreas);
        console.log('QuickTransactionScreen: Loaded Customers (Offline):', fetchedCustomers);
      }

      setAllAreas(fetchedAreas);
      if (fetchedAreas.length > 0) {
        setSelectedAreaId(fetchedAreas[0].id);
      } else {
        setSelectedAreaId(null);
      }
      setAllCustomers(fetchedCustomers);
      setLoading(false);
    };

    fetchData();
    fetchTransactions();
  }, [user?.id]);

  useEffect(() => {
    syncOfflineQuickTransactions();
  }, [user?.id]);

  const syncOfflineQuickTransactions = async () => {
    const offlineTransactions = await OfflineStorageService.getOfflineQuickTransactions();
    if (offlineTransactions.length > 0 && await NetInfoService.isNetworkAvailable()) {
      Alert.alert('Syncing', 'Syncing offline quick transactions...');
      for (const transaction of offlineTransactions) {
        try {
          let finalUpiImage = transaction.upi_image;
          // If upi_image is a local ID, upload the image first
          if (transaction.payment_mode === 'upi' && transaction.upi_image && transaction.upi_image.length === 36) { // Assuming UUID length
            const imageData = await OfflineStorageService.getOfflineImage(transaction.upi_image);
            if (imageData) {
              const publicUrl = await uploadImageToSupabaseStorage(imageData.uri, imageData.userId, imageData.mimeType);
              if (publicUrl) {
                finalUpiImage = publicUrl;
                await OfflineStorageService.clearOfflineImage(imageData.id); // Clear local image after upload
              } else {
                console.error('Failed to upload offline UPI image for transaction:', transaction.id);
                // Skip this transaction for now, it will be retried next time
                continue;
              }
            }
          }

          // Remove the temporary id used for offline storage before syncing to Supabase
          const { id, upi_image, ...transactionToSync } = transaction;
          const { error } = await supabase.from('transactions').insert({
            ...transactionToSync,
            upi_image: finalUpiImage,
          });
          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error syncing offline quick transaction:', error);
          Alert.alert('Error', 'Failed to sync some quick transactions. Please try again later.');
          return; // Stop syncing if there is an error
        }
      }
      await OfflineStorageService.clearOfflineQuickTransactions();
      Alert.alert('Success', 'Offline quick transactions synced successfully!');
      fetchTransactions(); // Refresh the list after syncing
    }
  };

  const fetchTransactions = async (customerId = null) => { // Added customerId parameter
    if (!user?.id) return;

    let fetchedOnlineTransactions = [];
    if (await NetInfoService.isNetworkAvailable()) {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);

        if (customerId) { // Filter by customerId if provided
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching online transactions:', error);
        } else {
          fetchedOnlineTransactions = data || [];
        }
      } catch (error) {
        console.error('Error fetching online transactions:', error);
      }
    }

    const offlineTransactions = await OfflineStorageService.getOfflineQuickTransactions();
    let filteredOfflineTransactions = offlineTransactions.map(t => ({...t, isOffline: true}));

    if (customerId) { // Filter offline transactions by customerId if provided
      filteredOfflineTransactions = filteredOfflineTransactions.filter(t => t.customer_id === customerId);
    }

    const allTransactions = [...fetchedOnlineTransactions, ...filteredOfflineTransactions];
    setTransactions(allTransactions);
  };

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

  // Fetch transactions based on selected customer
  useEffect(() => {
    fetchTransactions(selectedCustomer?.id);
  }, [selectedCustomer]);

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
                const isConnected = await NetInfoService.isNetworkAvailable();
                if (isConnected) {
                  const publicUrl = await uploadImageToSupabaseStorage(asset.uri, user.id, asset.mimeType || 'image/jpeg');
                  if (publicUrl) {
                    setPaymentProofImage(publicUrl);
                    Alert.alert('Success', 'Image selected and uploaded!');
                  }
                } else {
                  // Save image data locally for offline use
                  const imageId = uuidv4();
                  await OfflineStorageService.saveOfflineImage({
                    id: imageId,
                    uri: asset.uri,
                    mimeType: asset.mimeType || 'image/jpeg',
                    userId: user.id,
                  });
                  setPaymentProofImage(imageId); // Store the local image ID
                  Alert.alert('Offline', 'Image saved locally and will be uploaded when you are back online.');
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
                const isConnected = await NetInfoService.isNetworkAvailable();
                if (isConnected) {
                  const publicUrl = await uploadImageToSupabaseStorage(asset.uri, user.id, asset.mimeType || 'image/jpeg');
                  if (publicUrl) {
                    setPaymentProofImage(publicUrl);
                    Alert.alert('Success', 'Image selected and uploaded!');
                  }
                } else {
                  // Save image data locally for offline use
                  const imageId = uuidv4();
                  await OfflineStorageService.saveOfflineImage({
                    id: imageId,
                    uri: asset.uri,
                    mimeType: asset.mimeType || 'image/jpeg',
                    userId: user.id,
                  });
                  setPaymentProofImage(imageId); // Store the local image ID
                  Alert.alert('Offline', 'Image saved locally and will be uploaded when you are back online.');
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
    const transaction = {
      id: uuidv4(), // Generate a unique ID for offline storage
      customer_id: selectedCustomer.id,
      amount: parseFloat(amount),
      remarks: remarks,
      payment_mode: paymentType,
      upi_image: paymentType === 'upi' ? paymentProofImage : null,
      user_id: user.id,
      transaction_type: 'repayment',
      latitude: user.latitude,
      longitude: user.longitude,
      created_at: new Date().toISOString(), // Add created_at for offline transactions
    };

    if (!await NetInfoService.isNetworkAvailable()) {
      await OfflineStorageService.saveOfflineQuickTransaction(transaction);
      Alert.alert('Offline', 'Transaction saved locally and will be synced when you are back online.');
      setAmount('');
      setRemarks('');
      setLoading(false); // Stop loading here as no network operation
      fetchTransactions(); // Refresh the list after saving offline
    } else {
      try {
        // Remove the temporary id before sending to Supabase
        const { id, ...transactionToSync } = transaction;
        const { error } = await supabase
          .from('transactions')
          .insert(transactionToSync);

        if (error) {
          console.error('Supabase transaction insert error:', error);
          Alert.alert('Error', 'Failed to add transaction: ' + error.message);
        } else {
          Alert.alert('Success', 'Transaction added successfully!');
          setAmount('');
          setRemarks('');
          fetchTransactions(); // Refresh the list after saving online
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to add transaction.');
        console.error('Transaction add error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderTransactionItem = ({ item }) => (
    <View style={[styles.transactionRow, item.isOffline && styles.offlineRow]}>
      <View style={styles.amountContainer}>
        <Text style={styles.rowText}>{`₹${item.amount}`}</Text>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.rowText}>{item.customer_id}</Text>
      <Text style={styles.rowText}>{item.remarks || 'N/A'}</Text>
      {item.isOffline && <MaterialIcons name="cloud-off" size={24} color="gray" />}
    </View>
  );

  return (
    <FlatList
      data={transactions}
      keyExtractor={item => item.id ? item.id.toString() : item.created_at}
      renderItem={renderTransactionItem}
      ListEmptyComponent={<Text style={styles.emptyListText}>No transactions recorded.</Text>}
      ListHeaderComponent={
        <View style={styles.container}>
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

          <Text style={styles.sectionHeader}>Recent Transactions</Text>
        </View>
      }
    />
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'left',
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  offlineRow: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  amountContainer: {
    flex: 1,
    alignItems: 'center',
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
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
});