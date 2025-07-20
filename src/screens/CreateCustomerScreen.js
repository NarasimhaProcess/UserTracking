import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, ScrollView, Modal, FlatList, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';
import styles from './CustomerStyles';
import * as ImagePicker from 'expo-image-picker';

const CUSTOMER_TYPES = ['food', 'others', 'grocery', 'cloth', 'metals', 'fashion'];
const REPAYMENT_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export default function CreateCustomerScreen({ user, userProfile }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [bookNo, setBookNo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [areaId, setAreaId] = useState(null);
  const [areas, setAreas] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [daysToComplete, setDaysToComplete] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionCustomer, setTransactionCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionType, setNewTransactionType] = useState('repayment');
  const [newTransactionRemarks, setNewTransactionRemarks] = useState('');
  const [customerDocs, setCustomerDocs] = useState([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docModalUri, setDocModalUri] = useState('');
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [repaymentFrequency, setRepaymentFrequency] = useState('');
  const [newTransactionPaymentType, setNewTransactionPaymentType] = useState('');
  const [newTransactionUPIImageUrl, setNewTransactionUPIImageUrl] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const isMissing = field => missingFields.includes(field);
  // Add state for expanded transaction
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  useEffect(() => {
    // Fetch areas for user's groups
    async function fetchAreas() {
      const { data, error } = await supabase
        .from('user_groups')
        .select('group_id, groups (group_areas (area_master (id, area_name)))')
        .eq('user_id', user.id);
      const areaList = [];
      (data || []).forEach(g => {
        (g.groups?.group_areas || []).forEach(ga => {
          if (ga.area_master && !areaList.find(a => a.id === ga.area_master.id)) {
            areaList.push(ga.area_master);
          }
        });
      });
      setAreas(areaList);
    }
    if (user?.id) fetchAreas();
  }, [user]);

  // Update fetchCustomers to support search and pagination
  useEffect(() => {
    async function fetchCustomers() {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE * page - 1);
      if (search) {
        // Simple client-side filter after fetch (for demo)
        const { data, error } = await query;
        const filtered = (data || []).filter(c =>
          (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
          (c.mobile && c.mobile.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
        );
        setCustomers(filtered);
        setHasMore(filtered.length === PAGE_SIZE * page);
      } else {
        const { data, error } = await query;
        setCustomers(data || []);
        setHasMore((data || []).length === PAGE_SIZE * page);
      }
    }
    if (user?.id) fetchCustomers();
  }, [user, search, page]);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setLatitude(location.coords.latitude);
    setLongitude(location.coords.longitude);
  };

  const handleCreate = async () => {
    if (!name || !customerType || !areaId || !amountGiven || !daysToComplete || !repaymentFrequency) {
      Alert.alert('Error', 'Name, Customer Type, Area, Amount Given, Days to Complete, and Repayment Frequency are required');
      return;
    }
    if (!amountGiven || !repaymentFrequency || !repaymentAmount || !daysToComplete || !advanceAmount) {
      Alert.alert('Error', 'All financial fields are required');
      return;
    }
    let lat = latitude;
    let lon = longitude;
    if (!lat || !lon) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      lat = location.coords.latitude;
      lon = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);
    }
    const lateFeeValue = lateFee === '' ? '0' : lateFee;
    const customerData = {
      name, mobile, email, book_no: bookNo,
      latitude: lat, longitude: lon,
      area_id: areaId,
      user_id: user.id,
      customer_type: customerType,
      remarks,
      amount_given: amountGiven,
      repayment_frequency: repaymentFrequency,
      repayment_amount: repaymentAmount,
      days_to_complete: daysToComplete,
      advance_amount: advanceAmount === '' ? '0' : advanceAmount,
      late_fee_per_day: lateFeeValue,
    };
    const { error } = await supabase.from('customers').insert(customerData);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Customer created!');
      setName(''); setMobile(''); setEmail(''); setBookNo(''); setCustomerType(''); setAreaId(null);
      setLatitude(null); setLongitude(null); setRemarks(''); setAmountGiven(''); setDaysToComplete(''); setAdvanceAmount(''); setLateFee('');
      // Refresh customer list
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCustomers(data || []);
    }
  };

  const fetchTransactions = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false });
      if (error) {
        console.error('fetchTransactions error:', error);
      }
      setTransactions(data || []);
      console.log('Fetched transactions:', data);
    } catch (err) {
      console.error('fetchTransactions exception:', err);
    }
  };

  const fetchCustomerDocs = async (customerId) => {
    const { data, error } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('uploaded_at', { ascending: false });
    setCustomerDocs(data || []);
  };

  const handleAddTransaction = async () => {
    if (!newTransactionAmount) {
      Alert.alert('Error', 'Amount is required');
      return;
    }
    let lat = null;
    let lon = null;
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      lat = location.coords.latitude;
      lon = location.coords.longitude;
    } catch (err) {
      Alert.alert('Error', 'Failed to get location');
      return;
    }
    const { error } = await supabase.from('transactions').insert({
      customer_id: transactionCustomer.id,
      user_id: user.id,
      amount: newTransactionAmount,
      transaction_type: newTransactionType,
      remarks: newTransactionRemarks,
      latitude: lat,
      longitude: lon,
      payment_mode: newTransactionPaymentType,
      upi_image: newTransactionUPIImageUrl
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewTransactionAmount('');
      setNewTransactionType('repayment');
      setNewTransactionRemarks('');
      setNewTransactionPaymentType('');
      setNewTransactionUPIImageUrl('');
      fetchTransactions(transactionCustomer.id);
    }
  };

  const handleAddCustomerDoc = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled) {
      for (const file of (result.assets || [result])) {
        let base64 = '';
        if (file.uri && file.mimeType && file.mimeType.startsWith('image/')) {
          base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        }
        await supabase.from('customer_documents').insert({
          customer_id: selectedCustomer.id,
          file_name: file.name,
          file_data: base64,
        });
      }
      fetchCustomerDocs(selectedCustomer.id);
    }
  };

  // Calculation helpers
  const getTotalRepaid = () => {
    return transactions
      .filter(t => t.transaction_type === 'repayment')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };
  const getRemainingAmount = () => {
    if (!transactionCustomer) return 0;
    return Number(transactionCustomer.amount_given || 0) - getTotalRepaid();
  };
  const getDaysLeft = () => {
    if (!transactionCustomer) return 0;
    const created = new Date(transactionCustomer.created_at);
    const now = new Date();
    const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Number(transactionCustomer.days_to_complete || 0) - daysPassed;
  };
  const getLateFee = () => {
    const daysLeft = getDaysLeft();
    if (daysLeft >= 0) return 0;
    const overdueDays = Math.abs(daysLeft);
    return overdueDays * Number(transactionCustomer.late_fee_per_day || 0);
  };

  // 1. Add calculation for Pending Amount and Pending Days at the top of the transaction modal:
  // Helper functions
  const getPendingAmount = () => {
    if (!transactionCustomer) return 0;
    const totalRepaid = transactions
      .filter(t => t.transaction_type === 'repayment')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return Number(transactionCustomer.amount_given || 0) - totalRepaid;
  };
  const getPendingDays = () => {
    if (!transactionCustomer || !transactions.length) return transactionCustomer?.days_to_complete || 0;
    const firstTx = transactions[transactions.length - 1]; // assuming sorted desc
    if (!firstTx) return transactionCustomer.days_to_complete;
    const firstDate = new Date(firstTx.transaction_date);
    const today = new Date();
    const daysPassed = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
    return Number(transactionCustomer.days_to_complete || 0) - daysPassed;
  };

  const openTransactionModal = (customer) => {
    console.log('openTransactionModal called with customer:', customer);
    setTransactionCustomer(customer);
    setShowTransactionModal(true);
    fetchTransactions(customer.id);
    fetchCustomerDocs(customer.id);
  };

  const renderCustomerItem = ({ item }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 8, backgroundColor: '#fff' }}>
      <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{item.mobile}</Text>
      <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'center' }}>
        <TouchableOpacity style={styles.editButton} onPress={() => {
          setIsEditMode(true);
          setSelectedCustomer(item);
          setName(item.name);
          setMobile(item.mobile);
          setEmail(item.email);
          setBookNo(item.book_no);
          setCustomerType(item.customer_type);
          setAreaId(item.area_id);
          setLatitude(item.latitude);
          setLongitude(item.longitude);
          setRemarks(item.remarks);
          setAmountGiven(item.amount_given ? String(item.amount_given) : '');
          setRepaymentFrequency(item.repayment_frequency || '');
          setRepaymentAmount(item.repayment_amount ? String(item.repayment_amount) : '');
          setDaysToComplete(item.days_to_complete ? String(item.days_to_complete) : '');
          setAdvanceAmount(item.advance_amount ? String(item.advance_amount) : '0');
          setLateFee(item.late_fee_per_day ? String(item.late_fee_per_day) : '');
          fetchCustomerDocs(item.id);
          setShowCustomerFormModal(true);
        }}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.transactionButton} onPress={() => openTransactionModal(item)}>
          <Text style={styles.transactionButtonText}>Tx</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const openCreateCustomerModal = () => {
    setIsEditMode(false);
    setSelectedCustomer(null);
    setName(''); setMobile(''); setEmail(''); setBookNo(''); setCustomerType(''); setAreaId(null);
    setLatitude(null); setLongitude(null); setRemarks(''); setAmountGiven(''); setDaysToComplete(''); setAdvanceAmount(''); setLateFee('');
    setRepaymentFrequency('');
    setRepaymentAmount('');
    setShowCustomerFormModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!name || !customerType || !areaId || !amountGiven || !daysToComplete || !repaymentFrequency) {
      Alert.alert('Error', 'Name, Customer Type, Area, Amount Given, Days to Complete, and Repayment Frequency are required');
      return;
    }
    if (!amountGiven || !repaymentFrequency || !repaymentAmount || !daysToComplete || !advanceAmount) {
      Alert.alert('Error', 'All financial fields are required');
      return;
    }
    let lat = latitude;
    let lon = longitude;
    if (!lat || !lon) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      lat = location.coords.latitude;
      lon = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);
    }
    const lateFeeValue = lateFee === '' ? '0' : lateFee;
    const customerData = {
      name, mobile, email, book_no: bookNo,
      latitude: lat, longitude: lon,
      area_id: areaId,
      user_id: user.id,
      customer_type: customerType,
      remarks,
      amount_given: amountGiven,
      repayment_frequency: repaymentFrequency,
      repayment_amount: repaymentAmount,
      days_to_complete: daysToComplete,
      advance_amount: advanceAmount === '' ? '0' : advanceAmount,
      late_fee_per_day: lateFeeValue,
    };
    let error;
    if (isEditMode && selectedCustomer) {
      ({ error } = await supabase.from('customers').update({
        name: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        email: selectedCustomer.email,
        book_no: selectedCustomer.book_no,
        customer_type: selectedCustomer.customer_type,
        remarks: selectedCustomer.remarks,
        amount_given: selectedCustomer.amount_given,
        days_to_complete: selectedCustomer.days_to_complete,
        advance_amount: selectedCustomer.advance_amount,
        late_fee_per_day: selectedCustomer.late_fee_per_day,
        repayment_frequency: selectedCustomer.repayment_frequency,
        repayment_amount: selectedCustomer.repayment_amount,
        area_id: selectedCustomer.area_id
      }).eq('id', selectedCustomer.id));
    } else {
      ({ error } = await supabase.from('customers').insert(customerData));
    }
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', isEditMode ? 'Customer updated!' : 'Customer created!');
      setShowCustomerFormModal(false);
      setIsEditMode(false);
      setSelectedCustomer(null);
      setName(''); setMobile(''); setEmail(''); setBookNo(''); setCustomerType(''); setAreaId(null);
      setLatitude(null); setLongitude(null); setRemarks(''); setAmountGiven(''); setDaysToComplete(''); setAdvanceAmount(''); setLateFee('');
      setRepaymentFrequency('');
      setRepaymentAmount('');
      // Refresh customer list
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCustomers(data || []);
    }
  };

  const handleUploadCustomerDoc = (customer) => {
    // To be implemented: open file/image picker and upload logic
    Alert.alert('Upload', 'Upload logic to be implemented');
  };

  const handleViewCustomerDocs = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerDocs(customer.id);
    setShowDocModal(true);
  };

  // 1. Add upload menu function:
  const handleUploadMenu = () => {
    Alert.alert(
      'Upload Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Pick from Gallery', onPress: handlePickImages },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  // 2. Take Photo (single, compressed):
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        // Use MediaTypeOptions.Images for older expo-image-picker versions
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3,
      });
      console.log('Camera result:', result);
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadFile(result.assets[0].uri, 'image', result.assets[0].mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };
  // 3. Pick from Gallery (multiple, compressed):
  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // Use MediaTypeOptions.Images for older expo-image-picker versions
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.3,
      });
      console.log('Gallery result:', result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          await uploadFile(asset.uri, 'image', asset.mimeType || 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images: ' + error.message);
    }
  };

  const uploadFile = async (uri, fileType, mimeType) => {
    try {
      console.log('Uploading file:', { uri, fileType, mimeType });
      let base64 = '';
      let file_name = uri.split('/').pop();
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      console.log('Base64 length:', base64.length);
      const { data, error } = await supabase
        .from('customer_documents')
        .insert({
          customer_id: selectedCustomer.id,
          file_name: file_name,
          file_type: mimeType,
          file_data: base64,
          user_id: user.id,
        });
      if (error) {
        console.error('Supabase upload error:', error);
        Alert.alert('Error', 'Failed to upload file: ' + error.message);
        return;
      }
      console.log('Upload success:', data);
      fetchCustomerDocs(selectedCustomer.id);
    } catch (error) {
      console.error('Error in uploadFile:', error);
      Alert.alert('Error', 'Failed to upload file: ' + error.message);
    }
  };

  const handleUploadUPIImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take UPI photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        // Convert to base64 for storage
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Store in transaction's upi_image field
        setNewTransactionUPIImageUrl(base64);
        Alert.alert('Success', 'UPI image captured successfully!');
      }
    } catch (error) {
      console.error('Error capturing UPI image:', error);
      Alert.alert('Error', 'Failed to capture UPI image');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Customers</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, mobile, or email"
              style={styles.searchInput}
            />
            <View style={{ flexDirection: 'row', backgroundColor: '#E3E6F0', borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 8 }}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Mobile</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Actions</Text>
            </View>
          </View>
        }
        style={styles.customerList}
        ListEmptyComponent={<Text style={styles.emptyListText}>No customers found.</Text>}
      />
      {hasMore && (
        <TouchableOpacity onPress={() => setPage(page + 1)} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreButtonText}>Load More</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 12 }}>
        <TouchableOpacity onPress={openCreateCustomerModal} style={{ backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3, alignSelf: 'flex-end' }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showCustomerFormModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerFormModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!isEditMode && <Text style={styles.modalTitle}>Add Customer</Text>}
              <Text style={styles.sectionHeader}>Basic Info</Text>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} />
              <Text style={styles.formLabel}>Mobile</Text>
              <TextInput value={mobile} onChangeText={setMobile} style={styles.input} keyboardType="phone-pad" />
              <Text style={styles.formLabel}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
              <Text style={styles.formLabel}>Book No</Text>
              <TextInput value={bookNo} onChangeText={setBookNo} style={styles.input} />
              <Text style={styles.formLabel}>Customer Type</Text>
              <Picker selectedValue={customerType} onValueChange={setCustomerType} style={styles.formPicker}>
                <Picker.Item label="Select Type" value="" />
                {CUSTOMER_TYPES.map(type => <Picker.Item key={type} label={type} value={type} />)}
              </Picker>
              <Text style={styles.sectionHeader}>Financials</Text>
              <Text style={styles.formLabel}>Amount Given</Text>
              <TextInput value={amountGiven} onChangeText={setAmountGiven} style={[styles.input, isMissing('amountGiven') && { borderColor: 'red', borderWidth: 2 }]} keyboardType="numeric" />
              <Text style={styles.formLabel}>Repayment Frequency</Text>
              <Picker selectedValue={repaymentFrequency} onValueChange={setRepaymentFrequency} style={[styles.formPicker, isMissing('repaymentFrequency') && { borderColor: 'red', borderWidth: 2 }]}>
                <Picker.Item label="Select Frequency" value="" />
                {REPAYMENT_FREQUENCIES.map(freq => <Picker.Item key={freq} label={freq.charAt(0).toUpperCase() + freq.slice(1)} value={freq} />)}
              </Picker>
              <Text style={styles.formLabel}>Repayment Amount</Text>
              <TextInput value={repaymentAmount} onChangeText={setRepaymentAmount} style={[styles.input, isMissing('repaymentAmount') && { borderColor: 'red', borderWidth: 2 }]} keyboardType="numeric" />
              <Text style={styles.formLabel}>Days to Complete</Text>
              <TextInput value={daysToComplete} onChangeText={setDaysToComplete} style={[styles.input, isMissing('daysToComplete') && { borderColor: 'red', borderWidth: 2 }]} keyboardType="numeric" />
              <Text style={styles.formLabel}>Advance Amount</Text>
              <TextInput value={advanceAmount} onChangeText={setAdvanceAmount} style={[styles.input, isMissing('advanceAmount') && { borderColor: 'red', borderWidth: 2 }]} keyboardType="numeric" />
              <Text style={styles.formLabel}>Late Fee Per Day</Text>
              <TextInput value={lateFee} onChangeText={setLateFee} style={[styles.input, isMissing('lateFee') && { borderColor: 'red', borderWidth: 2 }]} keyboardType="numeric" placeholder="0" />
              <Text style={styles.sectionHeader}>Other</Text>
              <Text style={styles.formLabel}>Area</Text>
              <Picker selectedValue={areaId} onValueChange={setAreaId} style={styles.formPicker}>
                <Picker.Item label="Select Area" value={null} />
                {areas.map(area => <Picker.Item key={area.id} label={area.area_name} value={area.id} />)}
              </Picker>
              <Text style={styles.formLabel}>Remarks</Text>
              <TextInput value={remarks} onChangeText={setRemarks} style={styles.input} multiline numberOfLines={3} />
              {isEditMode && (
                <>
                  <TouchableOpacity style={styles.uploadButton} onPress={handleUploadMenu}>
                    <Text style={styles.uploadButtonText}>Upload Photo(s)</Text>
                  </TouchableOpacity>
                  {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                      {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).map(doc => (
                        <TouchableOpacity key={doc.id} onPress={() => { setDocModalUri(`data:${doc.file_type};base64,${doc.file_data}`); setShowDocModal(true); }}>
                          <Image source={{ uri: `data:${doc.file_type};base64,${doc.file_data}` }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 8, borderWidth: 1, borderColor: '#ccc' }} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}
              {missingFields.length > 0 && (
                <Text style={{ color: 'red', marginBottom: 8 }}>All financial fields are mandatory. Please fill the highlighted fields.</Text>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#ccc', borderRadius: 8, paddingVertical: 12, marginRight: 8, alignItems: 'center' }} onPress={() => setShowCustomerFormModal(false)}>
                  <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, marginLeft: 8, alignItems: 'center' }} onPress={handleSaveCustomer}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{isEditMode ? 'Save' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCustomer && !isEditing && (
              <>
                <Text style={styles.modalTitle}>{selectedCustomer.name}</Text>
                <Text style={styles.modalDetail}>Mobile: {selectedCustomer.mobile}</Text>
                <Text style={styles.modalDetail}>Email: {selectedCustomer.email}</Text>
                <Text style={styles.modalDetail}>Book No: {selectedCustomer.book_no}</Text>
                <Text style={styles.modalDetail}>Type: {selectedCustomer.customer_type}</Text>
                <Text style={styles.modalDetail}>Area ID: {selectedCustomer.area_id}</Text>
                <Text style={styles.modalDetail}>Latitude: {selectedCustomer.latitude}</Text>
                <Text style={styles.modalDetail}>Longitude: {selectedCustomer.longitude}</Text>
                <Text style={styles.modalDetail}>Remarks: {selectedCustomer.remarks}</Text>
                <Text style={styles.modalDetail}>Amount Given: {selectedCustomer.amount_given}</Text>
                <Text style={styles.modalDetail}>Days to Complete: {selectedCustomer.days_to_complete}</Text>
                <Text style={styles.modalDetail}>Advance Amount: {selectedCustomer.advance_amount}</Text>
                <Text style={styles.modalDetail}>Late Fee Per Day: {selectedCustomer.late_fee_per_day}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                    Alert.alert('Delete Customer', 'Are you sure you want to delete this customer?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: async () => {
                        await supabase.from('customers').delete().eq('id', selectedCustomer.id);
                        setShowCustomerModal(false);
                        setIsEditing(false);
                        setSelectedCustomer(null);
                        // Refresh customer list
                        const { data } = await supabase
                          .from('customers')
                          .select('*')
                          .eq('user_id', user.id)
                          .order('created_at', { ascending: false });
                        setCustomers(data || []);
                      }}
                    ]);
                  }} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => { setShowCustomerModal(false); setIsEditing(false); }} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Documents</Text>
                {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).map(doc => (
                      <TouchableOpacity key={doc.id} onPress={() => { setDocModalUri(`data:${doc.file_type};base64,${doc.file_data}`); setShowDocModal(true); }}>
                        <Image source={{ uri: `data:${doc.file_type};base64,${doc.file_data}` }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 8, borderWidth: 1, borderColor: '#ccc' }} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {customerDocs.filter(doc => !doc.file_type || !doc.file_type.startsWith('image')).map(doc => (
                  <View key={doc.id} style={styles.documentItem}>
                    <TouchableOpacity onPress={() => Linking.openURL(doc.file_url || '')}>
                      <Text style={styles.documentLink}>{doc.file_name} [Download]</Text>
                    </TouchableOpacity>
                    <Text style={styles.documentName}>{doc.file_name}</Text>
                  </View>
                ))}
                <TouchableOpacity onPress={handleAddCustomerDoc} style={styles.addDocumentButton}>
                  <Text style={styles.addDocumentButtonText}>Add Document</Text>
                </TouchableOpacity>
              </>
            )}
            {selectedCustomer && isEditing && (
              <ScrollView>
                <Text style={styles.modalTitle}>Edit Customer</Text>
                {isEditMode && (
                  <>
                    <TouchableOpacity style={styles.uploadButton} onPress={handleUploadMenu}>
                      <Text style={styles.uploadButtonText}>Upload Photo(s)</Text>
                    </TouchableOpacity>
                    {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                        {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).map(doc => (
                          <View key={doc.id} style={{ alignItems: 'center', marginRight: 12 }}>
                            <TouchableOpacity onPress={() => { setDocModalUri(`data:${doc.file_type};base64,${doc.file_data}`); setShowDocModal(true); }}>
                              <Image source={{ uri: `data:${doc.file_type};base64,${doc.file_data}` }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: '#ccc' }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async () => {
                              Alert.alert('Delete', 'Are you sure you want to delete this image?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: async () => {
                                  await supabase.from('customer_documents').delete().eq('id', doc.id);
                                  fetchCustomerDocs(selectedCustomer.id);
                                }}
                              ]);
                            }}>
                              <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
                <Text style={styles.formLabel}>Name</Text>
                <TextInput value={selectedCustomer.name} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, name: val })} style={styles.formInput} />
                <Text style={styles.formLabel}>Mobile</Text>
                <TextInput value={selectedCustomer.mobile} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, mobile: val })} style={styles.formInput} keyboardType="phone-pad" />
                <Text style={styles.formLabel}>Email</Text>
                <TextInput value={selectedCustomer.email} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, email: val })} style={styles.formInput} keyboardType="email-address" />
                <Text style={styles.formLabel}>Book No</Text>
                <TextInput value={selectedCustomer.book_no} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, book_no: val })} style={styles.formInput} />
                <Text style={styles.formLabel}>Customer Type</Text>
                <Picker selectedValue={selectedCustomer.customer_type} onValueChange={val => setSelectedCustomer({ ...selectedCustomer, customer_type: val })} style={styles.formPicker}>
                  <Picker.Item label="Select Type" value="" />
                  {CUSTOMER_TYPES.map(type => <Picker.Item key={type} label={type} value={type} />)}
                </Picker>
                <Text style={styles.formLabel}>Area ID</Text>
                <Picker selectedValue={selectedCustomer.area_id} onValueChange={val => setSelectedCustomer({ ...selectedCustomer, area_id: val })} style={styles.formPicker}>
                  <Picker.Item label="Select Area" value={null} />
                  {areas.map(area => <Picker.Item key={area.id} label={area.area_name} value={area.id} />)}
                </Picker>
                <Text style={styles.formLabel}>Remarks</Text>
                <TextInput value={selectedCustomer.remarks} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, remarks: val })} style={styles.formInput} multiline numberOfLines={3} />
                <Text style={styles.formLabel}>Amount Given</Text>
                <TextInput value={selectedCustomer.amount_given} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, amount_given: val })} style={styles.formInput} keyboardType="numeric" />
                <Text style={styles.formLabel}>Days to Complete Repayment</Text>
                <TextInput value={selectedCustomer.days_to_complete} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, days_to_complete: val })} style={styles.formInput} keyboardType="numeric" />
                <Text style={styles.formLabel}>Advance Amount Taken</Text>
                <TextInput value={selectedCustomer.advance_amount} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, advance_amount: val })} style={styles.formInput} keyboardType="numeric" />
                <Text style={styles.formLabel}>Late Payment Fee Per Day</Text>
                <TextInput value={selectedCustomer.late_fee_per_day} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, late_fee_per_day: val })} style={styles.formInput} keyboardType="numeric" />
                <Text style={styles.formLabel}>Repayment Frequency</Text>
                <Picker selectedValue={selectedCustomer.repayment_frequency} onValueChange={val => setSelectedCustomer({ ...selectedCustomer, repayment_frequency: val })} style={styles.formPicker}>
                  <Picker.Item label="Select Frequency" value="" />
                  {REPAYMENT_FREQUENCIES.map(freq => <Picker.Item key={freq} label={freq.charAt(0).toUpperCase() + freq.slice(1)} value={freq} />)}
                </Picker>
                <Text style={styles.sectionHeader}>Uploaded Photos</Text>
                {isEditMode && customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {customerDocs.filter(doc => doc.file_type && doc.file_type.startsWith('image')).map(doc => (
                      <View key={doc.id} style={{ alignItems: 'center', marginRight: 12 }}>
                        <TouchableOpacity onPress={() => { setDocModalUri(`data:${doc.file_type};base64,${doc.file_data}`); setShowDocModal(true); }}>
                          <Image source={{ uri: `data:${doc.file_type};base64,${doc.file_data}` }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: '#ccc' }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async () => {
                          Alert.alert('Delete', 'Are you sure you want to delete this image?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: async () => {
                              await supabase.from('customer_documents').delete().eq('id', doc.id);
                              fetchCustomerDocs(selectedCustomer.id);
                            }}
                          ]);
                        }}>
                          <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={{ maxHeight: 120 }}>
                  <ScrollView>
                    {customerDocs
                      .filter(doc => !doc.file_type || !doc.file_type.startsWith('image'))
                      .map(doc => (
                        <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <TouchableOpacity onPress={() => Linking.openURL(doc.file_url || '')} style={{ flex: 1 }}>
                            <Text style={styles.documentLink}>{doc.file_name} [Download]</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={async () => {
                            Alert.alert('Delete', 'Are you sure you want to delete this document?', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: async () => {
                                await supabase.from('customer_documents').delete().eq('id', doc.id);
                                fetchCustomerDocs(selectedCustomer.id);
                              }}
                            ]);
                          }}>
                            <Text style={{ color: 'red', marginLeft: 8 }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </ScrollView>
                </View>
                <TouchableOpacity onPress={async () => {
                  // Save edits
                  const { error } = await supabase.from('customers').update({
                    name: selectedCustomer.name,
                    mobile: selectedCustomer.mobile,
                    email: selectedCustomer.email,
                    book_no: selectedCustomer.book_no,
                    customer_type: selectedCustomer.customer_type,
                    remarks: selectedCustomer.remarks,
                    amount_given: selectedCustomer.amount_given,
                    days_to_complete: selectedCustomer.days_to_complete,
                    advance_amount: selectedCustomer.advance_amount,
                    late_fee_per_day: selectedCustomer.late_fee_per_day,
                    repayment_frequency: selectedCustomer.repayment_frequency,
                    repayment_amount: selectedCustomer.repayment_amount,
                    area_id: selectedCustomer.area_id
                  }).eq('id', selectedCustomer.id);
                  if (error) {
                    Alert.alert('Error', error.message);
                  } else {
                    Alert.alert('Success', 'Customer updated!');
                    setIsEditing(false);
                    setShowCustomerModal(false);
                    setSelectedCustomer(null);
                    // Refresh customer list
                    const { data } = await supabase
                      .from('customers')
                      .select('*')
                      .eq('user_id', user.id)
                      .order('created_at', { ascending: false });
                    setCustomers(data || []);
                  }
                }} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setIsEditing(false); }} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={showTransactionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransactionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 16, borderRadius: 12, backgroundColor: '#fff' }]}> 
            {transactionCustomer && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>Pending Amount: {getPendingAmount()}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>Pending Days: {getPendingDays()}</Text>
                </View>
                <FlatList
                  data={transactions}
                  renderItem={({ item }) => (
                    <>
                      <TouchableOpacity onPress={() => setExpandedTransactionId(expandedTransactionId === item.id ? null : item.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 6 }}>
                          <Text style={[styles.cell, { flex: 1 }]}>{item.transaction_type}</Text>
                          <Text style={[styles.cell, { flex: 1 }]}>{item.amount}</Text>
                          <Text style={[styles.cell, { flex: 1 }]}>{new Date(item.transaction_date).toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                      {expandedTransactionId === item.id && (
                        <View style={{ backgroundColor: '#F7F9FC', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                          <Text>Type: {item.transaction_type}</Text>
                          <Text>Amount: {item.amount}</Text>
                          <Text>Date: {new Date(item.transaction_date).toLocaleString()}</Text>
                          <Text>Remarks: {item.remarks}</Text>
                          {item.payment_mode === 'UPI' && item.upi_image && (
                            <View style={{ alignItems: 'center', marginTop: 12 }}>
                              <TouchableOpacity onPress={() => { setDocModalUri(`data:image/jpeg;base64,${item.upi_image}`); setShowDocModal(true); }}>
                                <Image
                                  source={{ uri: `data:image/jpeg;base64,${item.upi_image}` }}
                                  style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#4A90E2', marginBottom: 8 }}
                                />
                              </TouchableOpacity>
                              <Text style={{ color: '#888', fontSize: 12 }}>UPI Payment Image</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}
                  keyExtractor={item => item.id?.toString() || Math.random().toString()}
                  style={{ backgroundColor: '#fff', minHeight: 100 }}
                  ListEmptyComponent={<Text style={styles.transactionEmpty}>No transactions found.</Text>}
                  ListHeaderComponent={
                    <View>
                      {/* Add Transaction form */}
                      <View style={{ backgroundColor: '#F7F9FC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <Text style={styles.modalTitle}>Add Transaction</Text>
                        <TextInput value={newTransactionAmount} onChangeText={setNewTransactionAmount} placeholder="Amount" keyboardType="numeric" style={styles.formInput} />
                        <Picker selectedValue={newTransactionType} onValueChange={setNewTransactionType} style={styles.formPicker}>
                          <Picker.Item label="Repayment" value="repayment" />
                          <Picker.Item label="Advance" value="advance" />
                          <Picker.Item label="Late Fee" value="late_fee" />
                          <Picker.Item label="Given" value="given" />
                        </Picker>
                        <Picker selectedValue={newTransactionPaymentType} onValueChange={setNewTransactionPaymentType} style={styles.formPicker}>
                          <Picker.Item label="Select Payment Type" value="" />
                          <Picker.Item label="Cash" value="cash" />
                          <Picker.Item label="UPI" value="upi" />
                        </Picker>
                        {newTransactionPaymentType === 'upi' && (
                          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadUPIImage}>
                            <Text style={styles.uploadButtonText}>Upload UPI Photo</Text>
                          </TouchableOpacity>
                        )}
                        <TextInput value={newTransactionRemarks} onChangeText={setNewTransactionRemarks} placeholder="Remarks" style={styles.formInput} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                          <TouchableOpacity onPress={() => setShowTransactionModal(false)} style={{ flex: 1, backgroundColor: '#ccc', borderRadius: 8, paddingVertical: 12, marginRight: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleAddTransaction} style={{ flex: 1, backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, marginLeft: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Add Transaction</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Transaction grid header row */}
                      <View style={{ flexDirection: 'row', backgroundColor: '#E3E6F0', borderRadius: 6, paddingVertical: 6, marginBottom: 4 }}>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Type</Text>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Amount</Text>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Date</Text>
                      </View>
                    </View>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={showDocModal} transparent={true} animationType="fade" onRequestClose={() => setShowDocModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPressOut={() => setShowDocModal(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image source={{ uri: docModalUri }} style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 3, borderColor: '#4A90E2' }} />
            <TouchableOpacity style={styles.docModalCloseButton} onPress={() => setShowDocModal(false)}>
              <Text style={styles.docModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
} 