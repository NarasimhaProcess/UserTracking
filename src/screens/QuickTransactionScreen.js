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
  Linking, // Added Linking
  Platform, // Added Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { NetInfoService } from '../services/NetInfoService';
import { OfflineStorageService } from '../services/OfflineStorageService';
import { v4 as uuidv4 } from 'uuid';
import AreaSearchBar from '../components/AreaSearchBar';

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

export default function QuickTransactionScreen({ navigation, user, route }) {
  // console.log('QuickTransactionScreen: user prop:', user);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [allAreas, setAllAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [areaSearchText, setAreaSearchText] = useState(''); // New state for area search
  const [filteredAreas, setFilteredAreas] = useState([]); // New state for filtered areas
  const [showAreaDropdown, setShowAreaDropdown] = useState(false); // New state to control visibility of area dropdown
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProofImage, setPaymentProofImage] = useState(null); // New state for payment proof image
  const [transactions, setTransactions] = useState([]); // State to store transactions for display

  // New states for customer dropdown
  const [allCustomers, setAllCustomers] = useState([]); // Stores all customers
  let fetchedCustomers = [];
  const [customersInSelectedArea, setCustomersInSelectedArea] = useState([]); // Customers filtered by area
  const [selectedCustomer, setSelectedCustomer] = useState(null); // The actual selected customer object
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]); // Customers filtered by search text within selected area

  // Handle customer passed from dashboard
  useEffect(() => {
    if (route.params?.customer && allAreas.length > 0) {
      // Set the selected area based on the customer's area_id
      const customerArea = allAreas.find(area => area.id === route.params.customer.area_id);
      if (customerArea) {
        setSelectedAreaId(customerArea.id);
        setAreaSearchText(customerArea.area_name);
      }
      // Directly call handleCustomerSelect with the customer's ID
      // This will trigger fetching of transactions and other details
      handleCustomerSelect(route.params.customer.id);
    }
  }, [route.params?.customer, allAreas]); // Add allAreas to dependency array

  useEffect(() => {
    const fetchAreas = async () => {
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
    };

    fetchAreas();
  }, [user]); // Removed areaSearchText from dependencies

  // Filter areas based on search text
  useEffect(() => {
    if (areaSearchText) {
      const lowerCaseSearchText = areaSearchText.toLowerCase();
      const filtered = allAreas.filter(area =>
        area.area_name.toLowerCase().includes(lowerCaseSearchText)
      );
      setFilteredAreas(filtered);
    } else {
      setFilteredAreas(allAreas); // Show all areas if search text is empty
    }
  }, [areaSearchText, allAreas]);

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
                // console.error('Failed to upload offline UPI image for transaction:', transaction.id);
                // Skip this transaction for now, it will be retried next time
                continue;
              }
            }
          }

          // Remove the temporary id used for offline storage before syncing to Supabase
          const { id, upi_image, book_no, ...transactionToSync } = transaction;
          const { error } = await supabase.from('transactions').insert({
            ...transactionToSync,
            upi_image: finalUpiImage,
            book_no: book_no, // Include book_no
          });
          if (error) {
            throw error;
          }
        } catch (error) {
          // console.error('Error syncing offline quick transaction:', error);
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
    // if (!user?.id) return; // Removed user ID check

    let fetchedOnlineTransactions = [];
    if (await NetInfoService.isNetworkAvailable()) {
      try {
        let query = supabase
          .from('transactions')
          .select('*, customers(name, book_no)'); // Removed .eq('user_id', user.id)

        if (customerId) { // Filter by customerId if provided
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          // console.error('Error fetching online transactions:', error);
        } else {
          fetchedOnlineTransactions = data || [];
        }
      } catch (error) {
        // console.error('Error fetching online transactions:', error);
      }
    }

    const offlineTransactions = await OfflineStorageService.getOfflineQuickTransactions();
    let filteredOfflineTransactions = offlineTransactions.map(t => ({...t, isOffline: true}));

    if (customerId) { // Filter offline transactions by customerId if provided
      filteredOfflineTransactions = filteredOfflineTransactions.filter(t => t.customer_id === customerId);
    }

    // For offline transactions, we need to manually get customer names if possible
    // This assumes allCustomers state is populated.
    const offlineTransactionsWithNames = filteredOfflineTransactions.map(t => {
      const customer = allCustomers.find(c => c.id === t.customer_id);
      return {
        ...t,
        customers: {
          name: customer ? customer.name : 'Unknown',
          book_no: customer ? customer.book_no : 'N/A'
        }
      };
    });

    const allTransactions = [...fetchedOnlineTransactions, ...offlineTransactionsWithNames];
    setTransactions(allTransactions);
  };

  // Fetch customers for the selected area
  useEffect(() => {
    if (selectedAreaId) {
      fetchCustomersForArea(selectedAreaId);
    }
  }, [selectedAreaId]);

  const fetchCustomersForArea = async (areaId) => {
    setLoading(true);
    const isConnected = await NetInfoService.isNetworkAvailable();
    let fetchedCustomers = [];

    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, book_no, repayment_amount, area_id, days_to_complete, start_date, end_date, mobile, latitude, longitude, landmark, address')
          .eq('area_id', areaId);

        if (error) {
          Alert.alert('Error', 'Failed to load customers for the selected area.');
        } else {
          fetchedCustomers = data || [];
          console.log('Fetched customers (online):', fetchedCustomers); // Debug log
          await OfflineStorageService.saveOfflineCustomers(fetchedCustomers);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load customers online.');
      }
    } else {
      fetchedCustomers = await OfflineStorageService.getOfflineCustomers();
      fetchedCustomers = fetchedCustomers.filter(c => c.area_id === areaId);
      console.log('Fetched customers (offline):', fetchedCustomers); // Debug log
      Alert.alert('Offline Mode', 'Loading customers for the selected area from offline storage.');
    }

    setCustomersInSelectedArea(fetchedCustomers);
    setFilteredCustomers(fetchedCustomers);
    setLoading(false);
  };


  // Filter customers based on search text within the selected area's customers
  useEffect(() => {
    if (customerSearchText) {
      const lowerCaseSearchText = customerSearchText.toLowerCase();
      const filtered = customersInSelectedArea.filter(cust =>
        (cust.name && cust.name.toLowerCase().includes(lowerCaseSearchText)) ||
        (cust.book_no && cust.book_no.toLowerCase().includes(lowerCaseSearchText)) ||
        (cust.id && cust.id.toString().includes(customerSearchText)) // Search by ID
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customersInSelectedArea);
    }
  }, [customerSearchText, customersInSelectedArea]);

  // Fetch transactions based on selected customer
  useEffect(() => {
    if (selectedCustomer) { // Only fetch transactions if a customer is selected
      fetchTransactions(selectedCustomer.id);
    } else {
      setTransactions([]); // Clear transactions if no customer is selected
    }
  }, [selectedCustomer]);

  const handleCustomerSelect = async (customerId) => {
    const foundCustomer = filteredCustomers.find(cust => cust.id === customerId);
    console.log('handleCustomerSelect: foundCustomer initially:', foundCustomer); // Debug log

    if (foundCustomer) {
      let customerDetails = { ...foundCustomer };
      console.log('handleCustomerSelect: customerDetails before fetching additional data:', customerDetails); // Debug log
      const isConnected = await NetInfoService.isNetworkAvailable();

      if (isConnected) {
        try {
          // Fetch Total Paid Amount (totalAmountReceived in dashboard logic)
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('customer_id', customerId)
            .eq('transaction_type', 'repayment'); // Assuming 'repayment' is the type for paid amounts

          let totalAmountReceived = 0;
          if (transactionsError) {
            console.error('Error fetching transactions for paid amount:', transactionsError);
            Alert.alert('Error', 'Failed to fetch paid amount for customer.');
          } else {
            totalAmountReceived = transactionsData.reduce((sum, transaction) => sum + transaction.amount, 0);
            customerDetails.totalPaidAmount = totalAmountReceived; // Keep for display consistency
          }

          // Apply dashboard's calculation logic for periods
          const expectedRepaymentAmount = foundCustomer.repayment_amount || 0;
          const daysToComplete = foundCustomer.days_to_complete || 0;

          const totalAmountToPay = expectedRepaymentAmount * daysToComplete;

          let calculatedRepaymentPeriod = 0;
          if (expectedRepaymentAmount !== 0) {
            calculatedRepaymentPeriod = (totalAmountToPay - totalAmountReceived) / expectedRepaymentAmount;
          }

          const remainingPeriods = daysToComplete - calculatedRepaymentPeriod;
          const paidPeriods = daysToComplete - remainingPeriods; // Derived paid periods

          customerDetails.totalAmountToPay = totalAmountToPay;
          customerDetails.paidPeriods = remainingPeriods; // Corrected: This should be the actual paid periods
          customerDetails.totalPendingPeriods = paidPeriods; // Corrected: This should be the actual pending periods
          customerDetails.totalAmountPending = totalAmountToPay - totalAmountReceived; // New calculation

        } catch (error) {
          console.error("Error in handleCustomerSelect while fetching additional data:", error);
          Alert.alert('Error', 'Failed to load full customer details online.');
        }
      } else {
        // Handle offline scenario: For now, set to N/A or 0
        customerDetails.totalPaidAmount = 'N/A (Offline)';
        customerDetails.totalAmountToPay = 'N/A (Offline)';
        customerDetails.paidPeriods = 'N/A (Offline)';
        customerDetails.totalPendingPeriods = 'N/A (Offline)';
        Alert.alert('Offline Mode', 'Additional customer details not available offline.');
      }

      console.log('handleCustomerSelect: customerDetails after all processing:', customerDetails); // Debug log
      setSelectedCustomer(customerDetails);

      if (foundCustomer.repayment_amount) {
        setAmount(String(foundCustomer.repayment_amount));
      } else {
        setAmount('');
      }
    } else {
      setSelectedCustomer(null);
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
      // console.error('Image upload error:', error);
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
              // console.error('Image picker gallery error:', error);
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
              // console.error('Image picker camera error:', error);
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
    // console.log('handleAddTransaction called!');
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
    // UPI image upload is now optional

    setLoading(true);
    const transaction = {
      id: uuidv4(),
      customer_id: selectedCustomer.id,
      amount: parseFloat(amount),
      remarks: remarks,
      payment_mode: paymentType,
      upi_image: paymentType === 'upi' ? paymentProofImage : null,
      user_id: user.id,
      area_id: selectedAreaId,
      transaction_type: 'repayment',
      latitude: user.latitude,
      longitude: user.longitude,
      created_at: new Date().toISOString(),
    };

    if (!await NetInfoService.isNetworkAvailable()) {
      await OfflineStorageService.saveOfflineQuickTransaction(transaction);
      Alert.alert('Offline', 'Transaction saved locally and will be synced when you are back online.');
      setAmount('');
      setRemarks('');
      setPaymentProofImage(null); // Clear image for next transaction
      setLoading(false);
      fetchTransactions(selectedCustomer.id);
      handleCustomerSelect(selectedCustomer.id);
    } else {
      try {
        const { id, ...transactionToSync } = transaction;
        const { error } = await supabase
          .from('transactions')
          .insert(transactionToSync);

        if (error) {
          Alert.alert('Error', 'Failed to add transaction: ' + error.message);
        } else {
          Alert.alert('Success', 'Transaction added successfully!');
          setAmount('');
          setRemarks('');
          setPaymentProofImage(null); // Clear image for next transaction
          fetchTransactions(selectedCustomer.id);
          handleCustomerSelect(selectedCustomer.id);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to add transaction.');
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
      <Text style={styles.rowText}>{item.customers?.name || item.customer_name || 'N/A'}</Text>
      <Text style={styles.rowText}>{item.customers?.book_no || item.book_no || 'N/A'}</Text>
      <Text style={styles.rowText}>{item.remarks || 'N/A'}</Text>
      {item.isOffline && <MaterialIcons name="cloud-off" size={24} color="gray" />}
    </View>
  );

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Error', 'Phone number not available.');
    }
  };

  const handleSMS = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`sms:${phoneNumber}`);
    } else {
      Alert.alert('Error', 'Phone number not available.');
    }
  };

  const handleWhatsAppCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=Hi`); // WhatsApp call link is usually part of chat
      // For direct call, it's more complex and often not directly supported by Linking.
      // This will open chat, user can initiate call from there.
    } else {
      Alert.alert('Error', 'Phone number not available.');
    }
  };

  const handleWhatsAppSMS = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=Hi`);
    } else {
      Alert.alert('Error', 'Phone number not available.');
    }
  };

  const handleGetDirections = (latitude, longitude) => {
    if (latitude && longitude) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${latitude},${longitude}`;
      const label = 'Customer Location';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Customer location not available.');
    }
  };

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Area:</Text>
            <AreaSearchBar
              areas={filteredAreas}
              onChangeText={setAreaSearchText}
              onAreaSelect={(id, name) => {
                setSelectedAreaId(id);
                setAreaSearchText(name);
              }}
              selectedAreaName={areaSearchText}
            />
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
                  <View style={styles.customerDetailsContainer}>
                    {/* Basic Customer Info - similar to CustomerListItem's initial display */}
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Customer Name:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.name}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Card No:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.book_no}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Mobile:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.mobile || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Landmark:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.landmark || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Address:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.address || 'N/A'}</Text>
                    </View>

                    {/* Detailed Info - matching CustomerListItem's expanded view order */}
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Total Amount to Pay:</Text>
                      <Text style={styles.customerDetailValue}>
                        {selectedCustomer.totalAmountToPay !== undefined ? `₹${selectedCustomer.totalAmountToPay.toFixed(2)}` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Total Periods:</Text>
                      <Text style={styles.customerDetailValue}>
                        {selectedCustomer.days_to_complete !== undefined ? selectedCustomer.days_to_complete : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Repayment Amount:</Text>
                      <Text style={styles.customerDetailValue}>₹{selectedCustomer.repayment_amount || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Pending Repayment Period:</Text>
                      <Text style={[styles.customerDetailValue, styles.customerDetailPendingText]}>
                        {selectedCustomer.totalPendingPeriods !== undefined ? selectedCustomer.totalPendingPeriods.toFixed(2) : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Paid Repayment Period:</Text>
                      <Text style={[styles.customerDetailValue, styles.customerDetailPaidText]}>
                        {selectedCustomer.paidPeriods !== undefined ? selectedCustomer.paidPeriods.toFixed(2) : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Total Amount Received:</Text>
                      <Text style={[styles.customerDetailValue, styles.customerDetailHighlightText]}>
                        {selectedCustomer.totalPaidAmount !== undefined ? `₹${selectedCustomer.totalPaidAmount.toFixed(2)}` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Total Amount Pending:</Text>
                      <Text style={[styles.customerDetailValue, styles.customerDetailPendingText]}>
                        {selectedCustomer.totalAmountPending !== undefined ? `₹${selectedCustomer.totalAmountPending.toFixed(2)}` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>Start Date:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.start_date || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Text style={styles.customerDetailLabel}>End Date:</Text>
                      <Text style={styles.customerDetailValue}>{selectedCustomer.end_date || 'N/A'}</Text>
                    </View>
                    {/* Communication Actions */}
                    {selectedCustomer.mobile && (
                      <View style={styles.communicationActionsContainer}>
                        <TouchableOpacity onPress={() => handleCall(selectedCustomer.mobile)} style={styles.communicationButton}>
                          <MaterialIcons name="call" size={24} color="#007AFF" />
                          <Text style={styles.communicationButtonText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleSMS(selectedCustomer.mobile)} style={styles.communicationButton}>
                          <MaterialIcons name="sms" size={24} color="#007AFF" />
                          <Text style={styles.communicationButtonText}>SMS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleWhatsAppCall(selectedCustomer.mobile)} style={styles.communicationButton}>
                          <MaterialIcons name="logo-whatsapp" size={24} color="#25D366" />
                          <Text style={styles.communicationButtonText}>WA Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleWhatsAppSMS(selectedCustomer.mobile)} style={styles.communicationButton}>
                          <MaterialIcons name="chat" size={24} color="#25D366" />
                          <Text style={styles.communicationButtonText}>WA Chat</Text>
                        </TouchableOpacity>
                        {selectedCustomer.latitude && selectedCustomer.longitude && (
                          <TouchableOpacity onPress={() => handleGetDirections(selectedCustomer.latitude, selectedCustomer.longitude)} style={styles.communicationButton}>
                            <MaterialIcons name="directions" size={24} color="#007AFF" />
                            <Text style={styles.communicationButtonText}>Map</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
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
          <View style={styles.transactionHeaderRow}>
            <Text style={styles.headerCell}>Amount</Text>
            <Text style={styles.headerCell}>Customer Name</Text>
            <Text style={styles.headerCell}>Card No</Text>
            <Text style={styles.headerCell}>Remarks</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
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
  transactionHeaderRow: { // New style for header row
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: { // New style for header cells
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
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
  // Styles from CustomerListItem for consistency
  customerDetailsCard: { // Renamed from customerItemContainer for clarity
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0, // Adjust margin as needed for QuickTransactionScreen layout
    paddingHorizontal: 20,
    borderRadius: 8, // Assuming customerInfoCard already has this
    marginBottom: 20, // Assuming customerInfoCard already has this
    borderLeftWidth: 5, // Assuming customerInfoCard already has this
    borderLeftColor: '#007AFF', // Assuming customerInfoCard already has this
  },
  customerDetailRow: { // Renamed from customerItem for clarity
    flexDirection: 'row',
    justifyContent: 'space-between', // Changed from flex-start to space-between for label-value pairs
    paddingVertical: 4, // Adjusted for detail lines
  },
  customerDetailLabel: { // New style for labels
    fontSize: 14,
    color: '#8E8E93', // Similar to customerBookNo/Mobile in CustomerListItem
    textAlign: 'left',
    flex: 1,
  },
  customerDetailValue: { // New style for values
    fontSize: 14,
    color: '#1C1C1E', // Similar to customerName in CustomerListItem
    textAlign: 'right',
    flex: 1,
  },
  customerDetailPendingText: { // Renamed from pendingText
    color: 'red',
  },
  customerDetailPaidText: { // New style for paid text
    color: 'green',
  },
  customerDetailHighlightText: { // New style for highlighted text (e.g., Total Amount Received)
    color: 'blue',
  },
  communicationActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  communicationButton: {
    alignItems: 'center',
    padding: 5,
  },
  communicationButtonText: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
});