import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, ScrollView, Modal, FlatList, Image, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';
import styles from './CustomerStyles';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import * as uuid from 'uuid';
import EnhancedDatePicker from '../components/EnhancedDatePicker';

function LocationSearchBar({ onLocationFound }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debounceTimeout = useRef(null);

  const fetchSuggestions = async (text) => {
    if (!text) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`;
      const response = await fetch(url);
      const results = await response.json();
      setSuggestions(results);
    } catch (e) {
      setSuggestions([]);
    }
    setLoading(false);
  };

  const onChangeText = (text) => {
    setQuery(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const onSuggestionPress = (item) => {
    setQuery(item.display_name);
    setSuggestions([]);
    onLocationFound({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
  };

  // Add this helper function inside LocationSearchBar
  const highlightMatch = (text, query) => {
    if (!query) return <Text>{text}</Text>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <Text key={i} style={{ fontWeight: 'bold', color: '#007AFF' }}>{part}</Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row' }}>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder="Search address"
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }}
        />
        {loading && <ActivityIndicator size="small" style={{ marginLeft: 8 }} />}
      </View>
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id.toString()}
          style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, maxHeight: 150, marginTop: 2 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSuggestionPress(item)} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              {highlightMatch(item.display_name, query)}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

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
  const [areaSearch, setAreaSearch] = useState(''); // <-- new state
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
  // Add transaction date state
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTransactionDatePicker, setShowTransactionDatePicker] = useState(false);

  // Auto-populate repayment amount when transaction type changes
  useEffect(() => {
    if (transactionCustomer && newTransactionType === 'repayment') {
      setNewTransactionAmount(transactionCustomer.repaymentAmount || '');
    }
  }, [newTransactionType, transactionCustomer]);

  // Calculate end date based on start date, frequency, and periods
  const calculateEndDate = (startDate, frequency, periods) => {
    if (!startDate || !frequency || !periods) return '';
    
    const start = new Date(startDate);
    const periodsNum = parseInt(periods);
    
    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() + periodsNum);
        break;
      case 'weekly':
        start.setDate(start.getDate() + (periodsNum * 7));
        break;
      case 'monthly':
        start.setMonth(start.getMonth() + periodsNum);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() + periodsNum);
        break;
      default:
        start.setDate(start.getDate() + periodsNum);
    }
    
    return start.toISOString().split('T')[0];
  };

  // Auto-calculate end date when start date, frequency, or periods change
  useEffect(() => {
    if (startDate && repaymentFrequency && daysToComplete) {
      const calculatedEndDate = calculateEndDate(startDate, repaymentFrequency, daysToComplete);
      setEndDate(calculatedEndDate);
    }
  }, [startDate, repaymentFrequency, daysToComplete]);
  // Add state for expanded transaction
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);
  // Add state for location selection
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  // Add loading state for transaction save
  const [isTransactionSaving, setIsTransactionSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  // Add state for enhanced date picker
  const [showEnhancedDatePicker, setShowEnhancedDatePicker] = useState(false);

  // Add state for repayment plans
  const [repaymentPlans, setRepaymentPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planOptions, setPlanOptions] = useState([]);
  
  // Add state for start/end dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'

  const isImage = (doc) => {
    if (!doc || !doc.file_name) return false;
    // Check for common image file extensions
    return /\.(jpe?g|png|gif)$/i.test(doc.file_name);
  };

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
      const { data, error } = await query;
      let filtered = data || [];
      // Area filter
      if (areaSearch) {
        const areaMatches = areas.filter(a => a.area_name.toLowerCase().includes(areaSearch.toLowerCase())).map(a => a.id);
        filtered = filtered.filter(c => areaMatches.includes(c.area_id));
      }
      // Customer search filter
      if (search) {
        filtered = filtered.filter(c =>
          (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
          (c.mobile && c.mobile.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
        );
      }
      setCustomers(filtered);
      setHasMore(filtered.length === PAGE_SIZE * page);
    }
    if (user?.id) fetchCustomers();
  }, [user, search, areaSearch, page, areas]);

  // Fetch repayment plans on mount
  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase
        .from('repayment_plans')
        .select('*')
        .order('name', { ascending: true });
      if (!error) setRepaymentPlans(data || []);
    }
    fetchPlans();
  }, []);

  // Filter plans by frequency if selected
  useEffect(() => {
    if (repaymentFrequency) {
      setPlanOptions(repaymentPlans.filter(p => p.frequency === repaymentFrequency));
    } else {
      setPlanOptions(repaymentPlans);
    }
    setSelectedPlanId('');
  }, [repaymentFrequency, repaymentPlans]);

  // Auto-calculate repayment/advance/days/late fee when plan or amount changes
  useEffect(() => {
    const plan = planOptions.find(p => p.id === selectedPlanId);
    if (plan && amountGiven) {
      const scale = parseFloat(amountGiven) / parseFloat(plan.base_amount);
      setRepaymentAmount((scale * plan.repayment_per_period).toFixed(2));
      setAdvanceAmount(plan.advance_amount ? (scale * plan.advance_amount).toFixed(2) : '0');
      setDaysToComplete(plan.periods.toString());
      setLateFee(plan.late_fee_per_period ? plan.late_fee_per_period.toString() : '0');
      setRepaymentFrequency(plan.frequency);
    } else {
      setRepaymentAmount('');
      setAdvanceAmount('');
      setDaysToComplete('');
      setLateFee('');
    }
  }, [selectedPlanId, amountGiven, planOptions]);

  // Auto-calculate end date when start date or days to complete changes
  useEffect(() => {
    if (startDate && daysToComplete && repaymentFrequency) {
      const start = new Date(startDate);
      const days = parseInt(daysToComplete);
      let endDateCalculated;
      
      if (repaymentFrequency === 'daily') {
        endDateCalculated = new Date(start.getTime() + (days * 24 * 60 * 60 * 1000));
      } else if (repaymentFrequency === 'weekly') {
        endDateCalculated = new Date(start.getTime() + (days * 7 * 24 * 60 * 60 * 1000));
      } else if (repaymentFrequency === 'monthly') {
        endDateCalculated = new Date(start);
        endDateCalculated.setMonth(endDateCalculated.getMonth() + days);
      } else if (repaymentFrequency === 'yearly') {
        endDateCalculated = new Date(start);
        endDateCalculated.setFullYear(endDateCalculated.getFullYear() + days);
      }
      
      if (endDateCalculated) {
        setEndDate(endDateCalculated.toISOString().split('T')[0]);
      }
    }
  }, [startDate, daysToComplete, repaymentFrequency]);

  // Check if customer has transactions (to prevent editing)
  const checkCustomerTransactions = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      
      if (error) {
        console.error('Error checking transactions:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error in checkCustomerTransactions:', error);
      return false;
    }
  };

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

  // Date picker functions
  const showDatePickerModal = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const showEnhancedDatePickerModal = () => {
    setShowEnhancedDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    
    if (event.type === 'set') {
      const dateString = currentDate.toISOString().split('T')[0];
      if (datePickerMode === 'start') {
        setStartDate(dateString);
      } else {
        setEndDate(dateString);
      }
    }
  };

  const onEnhancedDateSelect = (dates) => {
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
    setShowEnhancedDatePicker(false);
  };

  // Transaction date change alert function
  const handleTransactionDateChange = (selectedDate) => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) {
      Alert.alert(
        "Date Selection",
        "You have selected a different date than current date. Do you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "OK", onPress: () => setTransactionDate(selectedDate) }
        ]
      );
    } else {
      setTransactionDate(selectedDate);
    }
  };

  // Open transaction modal with auto-populated repayment amount
  const openTransactionModal = (customer) => {
    console.log('openTransactionModal called with customer:', customer);
    setTransactionCustomer(customer);
    setNewTransactionAmount(customer.repaymentAmount || ''); // Auto-populate
    setTransactionDate(new Date().toISOString().split('T')[0]); // Reset to current date
    setShowTransactionModal(true);
    fetchTransactions(customer.id);
    fetchCustomerDocs(customer.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // --- END handleCreate unified definition ---


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

    // Prevent multiple submissions
    if (isTransactionSaving) {
      return;
    }

    setIsTransactionSaving(true);

    try {
      let lat = null;
      let lon = null;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required');
          setIsTransactionSaving(false);
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      } catch (err) {
        Alert.alert('Error', 'Failed to get location');
        setIsTransactionSaving(false);
        return;
      }

      const { error } = await supabase.from('transactions').insert({
        customer_id: transactionCustomer.id,
        user_id: user.id,
        amount: newTransactionAmount,
        transaction_type: newTransactionType,
        transaction_date: transactionDate,
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
        Alert.alert('Success', 'Transaction added successfully!');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setIsTransactionSaving(false);
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
    const getTotalCashReceived = () => {
    return transactions
      .filter(t => t.payment_mode === 'cash')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getTotalUpiReceived = () => {
    return transactions
      .filter(t => t.payment_mode === 'upi')
      .reduce((sum, t) => sum + Number(t.amount), 0);
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
    if (!transactionCustomer || !transactions.length) {
      const totalPeriods = Number(transactionCustomer?.days_to_complete || 0);
      return `${totalPeriods} ${getFrequencyUnit(transactionCustomer?.repayment_frequency)}`;
    }
    
    const firstTx = transactions[transactions.length - 1]; // assuming sorted desc
    if (!firstTx) {
      const totalPeriods = Number(transactionCustomer.days_to_complete || 0);
      return `${totalPeriods} ${getFrequencyUnit(transactionCustomer.repayment_frequency)}`;
    }
    
    const firstDate = new Date(firstTx.transaction_date);
    const today = new Date();
    const daysPassed = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
    const totalPeriods = Number(transactionCustomer.days_to_complete || 0);
    const frequency = transactionCustomer.repayment_frequency;
    
    let pendingPeriods;
    switch (frequency) {
      case 'daily':
        pendingPeriods = totalPeriods - daysPassed;
        break;
      case 'weekly':
        const weeksPassed = Math.floor(daysPassed / 7);
        pendingPeriods = totalPeriods - weeksPassed;
        break;
      case 'monthly':
        const monthsPassed = Math.floor(daysPassed / 30); // Approximate
        pendingPeriods = totalPeriods - monthsPassed;
        break;
      case 'yearly':
        const yearsPassed = Math.floor(daysPassed / 365); // Approximate
        pendingPeriods = totalPeriods - yearsPassed;
        break;
      default:
        pendingPeriods = totalPeriods - daysPassed;
    }
    
    return `${Math.max(0, pendingPeriods)} ${getFrequencyUnit(frequency)}`;
  };
  
  // Helper function to get frequency unit label
  const getFrequencyUnit = (frequency) => {
    switch (frequency) {
      case 'daily': return 'days';
      case 'weekly': return 'weeks';
      case 'monthly': return 'months';
      case 'yearly': return 'years';
      default: return 'days';
    }
  };



  const renderCustomerItem = ({ item }) => {
    return (
      <View style={{ borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 12, backgroundColor: '#fff' }}>
        {/* Customer Info Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.cell, { flex: 1.5 }]}>{item.book_no || 'N/A'}</Text>
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
      </View>
    );
  };

  const openCreateCustomerModal = () => {
    if (!repaymentPlans || repaymentPlans.length === 0) {
      Alert.alert('No Repayment Plans', 'No repayment plans are configured. Please contact the administrator to configure repayment plans.');
      return;
    }
    setIsEditMode(false);
    setSelectedCustomer(null);
    setName(''); setMobile(''); setEmail(''); setBookNo(''); setCustomerType(''); setAreaId(null);
    setLatitude(null); setLongitude(null); setRemarks(''); setAmountGiven(''); setDaysToComplete(''); setAdvanceAmount(''); setLateFee('');
    setRepaymentFrequency('');
    setRepaymentAmount('');
    setShowCustomerFormModal(true);
  };

  // First handleSaveCustomer removed - keeping only the unified version with repayment_plan_id

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
    const currentImages = customerDocs.filter(isImage);
    const remainingSlots = 2 - currentImages.length;
    
    if (remainingSlots <= 0) {
      Alert.alert('Upload Limit Reached', 'Maximum 2 images allowed per customer. Please delete some images first.');
      return;
    }
    
    Alert.alert(
      `Upload Image (${currentImages.length}/2)`,
      `You can upload ${remainingSlots} more image${remainingSlots > 1 ? 's' : ''}`,
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
      const currentImages = customerDocs.filter(isImage);
      if (currentImages.length >= 2) {
        Alert.alert('Upload Limit', 'Maximum 2 images allowed per customer. Please delete some images first.');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadFile(result.assets[0].uri, 'image', result.assets[0].mimeType || 'image/jpeg');
        Alert.alert('Success', 'Photo captured and uploaded successfully!');
      } else {
        console.warn('Camera result:', result);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };
  // 3. Pick from Gallery (multiple, compressed):
  const handlePickImages = async () => {
    try {
      const currentImages = customerDocs.filter(isImage);
      if (currentImages.length >= 2) {
        Alert.alert('Upload Limit', 'Maximum 2 images allowed per customer. Please delete some images first.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.3,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const remainingSlots = 2 - currentImages.length;
        const imagesToUpload = result.assets.slice(0, remainingSlots);
        
        // Use Promise.all to upload all selected images
        await Promise.all(
          imagesToUpload.map(asset => 
            uploadFile(asset.uri, 'image', asset.mimeType || 'image/jpeg')
          )
        );

        if (imagesToUpload.length > 0) {
          Alert.alert('Success', `${imagesToUpload.length} image(s) uploaded successfully!`);
        }
        
        if (result.assets.length > remainingSlots) {
          Alert.alert('Upload Limit', `You can only upload a maximum of 2 images. ${remainingSlots > 0 ? `${remainingSlots} slot(s) were available.` : ''}`);
        }
      } else {
        console.warn('Gallery result:', result);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images: ' + error.message);
    }
  };

  // Replace uploadFile with Supabase Storage upload
  const uploadFile = async (uri, fileType, mimeType) => {
    try {
      if (!selectedCustomer?.id) {
        Alert.alert('Error', 'No customer selected');
        return;
      }
      // Debug log for user id
      console.log('Uploading customer document. user_id:', user?.id, 'customer_id:', selectedCustomer.id);
      // Generate a unique file name using timestamp and random number
      const fileExt = mimeType.split('/')[1];
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const filePath = `customers/${selectedCustomer.id}/${fileName}`;
      // Read file as binary
      const fileDataBuffer = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Buffer.from(fileDataBuffer, 'base64');
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('locationtracker')
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (error) {
        console.error('Supabase Storage upload error:', error);
        Alert.alert('Error', 'Failed to upload file: ' + error.message);
        return;
      }
      console.log('Customer image uploaded. File path:', filePath);
      // Get the public URL
      const { data: urlData } = supabase.storage.from('locationtracker').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      console.log('Generated Supabase customer image URL:', publicUrl);

      // Store file path and URL in customer_documents table
      const { error: insertError } = await supabase.from('customer_documents').insert({
        customer_id: selectedCustomer.id,
        file_name: fileName,
        file_data: publicUrl, // Save the public URL in file_data
      });

      if (insertError) {
        console.error('Error inserting customer document:', insertError);
        Alert.alert('Database Error', 'Failed to save document details: ' + insertError.message);
        return;
      }

      fetchCustomerDocs(selectedCustomer.id);
    } catch (error) {
      console.error('Error in uploadFile:', error);
      Alert.alert('Error', 'Failed to upload file: ' + error.message);
    }
  };

  // This useEffect and the customerImageUrls state are no longer needed
  // as we will use file_data directly.
  /*
  useEffect(() => {
    let isMounted = true;
    async function fetchUrls() {
      setLoadingImages(true);
      const urls = {};
      for (const doc of customerDocs.filter(isImage)) {
        // Use the stored file_data directly
        urls[doc.id] = doc.file_data;
      }
      if (isMounted) setCustomerImageUrls(urls);
      setLoadingImages(false);
    }
    if (showCustomerFormModal && isEditMode) fetchUrls();
    return () => { isMounted = false; };
  }, [customerDocs, showCustomerFormModal, isEditMode]);
  */

  // Location picker functions
  const openLocationPicker = (customer) => {
    setSelectedCustomer(customer);
    setSelectedLocation({
      latitude: customer.latitude || 37.78825,
      longitude: customer.longitude || -122.4324,
    });
    setMapRegion({
      latitude: customer.latitude || 37.78825,
      longitude: customer.longitude || -122.4324,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setShowLocationPicker(true);
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const confirmLocationSelection = async () => {
    if (!selectedLocation || !selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        })
        .eq('id', selectedCustomer.id);

      if (error) {
        Alert.alert('Error', 'Failed to update location: ' + error.message);
      } else {
        Alert.alert('Success', 'Location updated successfully!');
        setShowLocationPicker(false);
        setSelectedLocation(null);
        
        // Refresh customer list
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      setMapRegion({
        ...newLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get current location');
    }
  };

  // Add this helper for transaction UPI image upload
  const uploadTransactionImage = async (uri, transactionId, mimeType) => {
    try {
      const fileExt = mimeType.split('/')[1];
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const filePath = `transactions/${transactionId}/${fileName}`;
      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Buffer.from(fileData, 'base64');
      const { data, error } = await supabase.storage
        .from('locationtracker')
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (error) {
        Alert.alert('Error', 'Failed to upload UPI image: ' + error.message);
        return null;
      }
      console.log('Transaction image uploaded. File path:', filePath);
      const { data: urlData } = supabase.storage.from('locationtracker').getPublicUrl(filePath);
      console.log('Generated Supabase transaction image URL:', urlData?.publicUrl);
      return urlData?.publicUrl; // Return the full URL
    } catch (error) {
      Alert.alert('Error', 'Failed to upload UPI image: ' + error.message);
      return null;
    }
  };

  const getTransactionImageUrl = (filePath) => {
    const { data } = supabase.storage.from('locationtracker').getPublicUrl(filePath);
    console.log('Display transaction image. File path:', filePath, 'URL:', data?.publicUrl);
    return data?.publicUrl || '';
  };

  // Update handleUploadUPIImage to use Supabase Storage
  const handleUploadUPIImage = async () => {
    Alert.alert(
      'Select UPI Image',
      'Choose how you want to add the UPI image',
      [
        {
          text: 'Camera',
          onPress: async () => {
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
                const imageUrl = await uploadTransactionImage(result.assets[0].uri, transactionCustomer.id, result.assets[0].mimeType || 'image/jpeg');
                if (imageUrl) {
                  setNewTransactionUPIImageUrl(imageUrl);
                  Alert.alert('Success', 'UPI image captured and uploaded successfully!');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to capture UPI image');
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission needed', 'Gallery permission is required to select UPI images.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
              });
              if (!result.canceled && result.assets[0]) {
                const imageUrl = await uploadTransactionImage(result.assets[0].uri, transactionCustomer.id, result.assets[0].mimeType || 'image/jpeg');
                if (imageUrl) {
                  setNewTransactionUPIImageUrl(imageUrl);
                  Alert.alert('Success', 'UPI image selected and uploaded successfully!');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to select UPI image');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleEditCustomer = async (item) => {
    if (!repaymentPlans || repaymentPlans.length === 0) {
      Alert.alert('No Repayment Plans', 'No repayment plans are configured. Please contact the administrator to configure repayment plans.');
      return;
    }
    
    // Check if customer has any transactions
    const hasTransactions = await checkCustomerTransactions(item.id);
    if (hasTransactions) {
      Alert.alert(
        'Cannot Edit Customer',
        'This customer has existing transactions and cannot be edited. Please contact administrator if changes are needed.',
        [{ text: 'OK' }]
      );
      return;
    }
    
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
    setSelectedPlanId(item.repayment_plan_id ? String(item.repayment_plan_id) : '');
    
    // Set start and end dates if they exist
    setStartDate(item.start_date || '');
    setEndDate(item.end_date || '');
    
    fetchCustomerDocs(item.id);
    setShowCustomerFormModal(true);
  };

  const handleCreate = async () => {
  // Check for missing required fields
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!customerType) missingFields.push('customerType');
  if (!areaId) missingFields.push('areaId');
  if (!amountGiven) missingFields.push('amountGiven');
  if (!daysToComplete) missingFields.push('daysToComplete');
  if (!repaymentFrequency) missingFields.push('repaymentFrequency');
  if (!repaymentAmount) missingFields.push('repaymentAmount');
  if (!advanceAmount) missingFields.push('advanceAmount');

  if (missingFields.length > 0) {
    setMissingFields(missingFields);
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  // Clear missing fields if validation passes
  setMissingFields([]);

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
    name,
    mobile,
    email,
    book_no: bookNo,
    customer_type: customerType,
    area_id: areaId,
    latitude: lat,
    longitude: lon,
    remarks,
    amount_given: Number(amountGiven),
    repayment_frequency: repaymentFrequency,
    repayment_plan_id: selectedPlanId,
    repayment_amount: Number(repaymentAmount),
    days_to_complete: Number(daysToComplete),
    advance_amount: Number(advanceAmount),
    late_fee_per_day: Number(lateFee),
    start_date: startDate || null,
    end_date: endDate || null,
    user_id: user.id,
  };

  try {
    const { error } = await supabase.from('customers').insert([customerData]);
    if (error) {
      Alert.alert('Error', 'Failed to create customer: ' + error.message);
    } else {
      Alert.alert('Success', 'Customer created successfully!');
      setShowCustomerFormModal(false);
      // Refresh customer list
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCustomers(data || []);
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    Alert.alert('Error', 'Failed to create customer');
  }
};

  const handleSaveCustomer = async () => {
    const customerData = {
      name,
      mobile,
      email,
      book_no: bookNo,
      customer_type: customerType,
      area_id: areaId,
      latitude,
      longitude,
      remarks,
      amount_given: Number(amountGiven),
      repayment_frequency: repaymentFrequency,
      repayment_plan_id: selectedPlanId,
      repayment_amount: Number(repaymentAmount),
      days_to_complete: Number(daysToComplete),
      advance_amount: Number(advanceAmount),
      late_fee_per_day: Number(lateFee),
      start_date: startDate || null,
      end_date: endDate || null,
    };

    try {
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', selectedCustomer.id);
      if (error) {
        Alert.alert('Error', 'Failed to update customer: ' + error.message);
      } else {
        Alert.alert('Success', 'Customer updated successfully!');
        setShowCustomerFormModal(false);
        // Refresh customer list
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert('Error', 'Failed to update customer');
    }
  };

  // Helper function for dynamic frequency labels
  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'daily': return 'Days to Complete';
      case 'weekly': return 'Weeks to Complete';
      case 'monthly': return 'Months to Complete';
      case 'yearly': return 'Years to Complete';
      default: return 'Days to Complete';
    }
  };

  // Filter customers based on search criteria with comma-separated support
  const filteredCustomers = customers.filter(customer => {
    if (!search) return true;
    
    // Split search terms by comma and trim whitespace
    const searchTerms = search.split(',').map(term => term.trim().toLowerCase()).filter(term => term);
    
    // Check if any search term matches any customer field
    return searchTerms.some(term => 
      customer.name?.toLowerCase().includes(term) ||
      customer.mobile?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term) ||
      customer.book_no?.toLowerCase().includes(term) ||
      customer.area_name?.toLowerCase().includes(term)
    );
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, mobile, email, card no, area (use comma to search multiple)"
              style={styles.searchInput}
            />
            <View style={{ flexDirection: 'row', backgroundColor: '#E3E6F0', borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 8 }}>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Card No</Text>
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
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Customer' : 'Add Customer'}</Text>
              {isEditMode && (
                <>
                  <TouchableOpacity style={styles.uploadButton} onPress={handleUploadMenu}>
                    <Text style={styles.uploadButtonText}>
                      Upload Photo(s) ({customerDocs.filter(isImage).length}/2)
                    </Text>
                  </TouchableOpacity>
                  {loadingImages ? (
                    <ActivityIndicator size="small" style={{ margin: 8 }} />
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
                      {customerDocs.filter(isImage).map(doc => (
                        <TouchableOpacity key={doc.id} style={{ marginRight: 8, marginBottom: 8 }} onPress={() => { setDocModalUri(doc.file_data); setShowDocModal(true); }}>
                          {doc.file_data ? (
                            <Image
                              source={{ uri: doc.file_data }}
                              style={{
                                width: 50,
                                height: 50,
                                borderRadius: 0,
                                borderWidth: 1,
                                borderColor: '#ddd'
                              }}
                              onError={e => console.error('Thumbnail image load error:', { url: doc.file_data, error: e.nativeEvent })}
                            />
                          ) : (
                            <View style={{ width: 50, height: 50, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ color: '#aaa', fontSize: 10 }}>No Image</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              <Text style={styles.sectionHeader}>Basic Info</Text>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} />
              <Text style={styles.formLabel}>Mobile</Text>
              <TextInput value={mobile} onChangeText={setMobile} style={styles.input} keyboardType="phone-pad" />
              <Text style={styles.formLabel}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
              <Text style={styles.formLabel}>Card No</Text>
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
              <Picker selectedValue={repaymentFrequency} onValueChange={setRepaymentFrequency} style={styles.formPicker}>
                <Picker.Item label="Select Frequency" value="" />
                {REPAYMENT_FREQUENCIES.map(freq => <Picker.Item key={freq} label={freq.charAt(0).toUpperCase() + freq.slice(1)} value={freq} />)}
              </Picker>
              <Text style={styles.formLabel}>Repayment Plan</Text>
              <Picker selectedValue={selectedPlanId} onValueChange={setSelectedPlanId} style={styles.formPicker} enabled={!!repaymentFrequency}>
                <Picker.Item label="Select Plan" value="" />
                {planOptions.map(plan => <Picker.Item key={plan.id} label={plan.name} value={plan.id} />)}
              </Picker>
              <Text style={styles.formLabel}>Amount Given</Text>
              <TextInput value={amountGiven} onChangeText={setAmountGiven} style={styles.input} keyboardType="numeric" />
              <Text style={styles.formLabel}>Repayment Amount (auto-calculated)</Text>
              <TextInput value={repaymentAmount} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
              <Text style={styles.formLabel}>Advance Amount (auto-calculated)</Text>
              <TextInput value={advanceAmount} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
              <Text style={styles.formLabel}>{getFrequencyLabel(repaymentFrequency)} (auto-filled)</Text>
              <TextInput value={daysToComplete} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
              <Text style={styles.formLabel}>Late Fee Per Period (auto-filled)</Text>
              <TextInput value={lateFee} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
              
              <Text style={styles.sectionHeader}>Repayment Dates</Text>
              <Text style={styles.formLabel}>Date Range Selection</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center', paddingVertical: 12, backgroundColor: startDate && endDate ? '#e8f5e8' : '#f8f9fa' }]} 
                onPress={() => setShowEnhancedDatePicker(true)}
              >
                <Text style={{ color: startDate && endDate ? '#2e7d32' : '#666', textAlign: 'center', fontSize: 16 }}>
                  {startDate && endDate 
                    ? `${formatDate(startDate)} 📅 ${formatDate(endDate)}`
                    : 'Select Date Range'
                  }
                </Text>
              </TouchableOpacity>
              
              <EnhancedDatePicker
                visible={showEnhancedDatePicker}
                onClose={() => setShowEnhancedDatePicker(false)}
                onDateSelect={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  setShowEnhancedDatePicker(false);
                }}
                startDate={startDate}
                endDate={endDate}
                repaymentFrequency={repaymentFrequency}
                daysToComplete={daysToComplete}
              />
              <Text style={styles.sectionHeader}>Other</Text>
              <Text style={styles.formLabel}>Area</Text>
              <Picker selectedValue={areaId} onValueChange={setAreaId} style={styles.formPicker}>
                <Picker.Item label="Select Area" value={null} />
                {areas.map(area => <Picker.Item key={area.id} label={area.area_name} value={area.id} />)}
              </Picker>
              <Text style={styles.formLabel}>Remarks</Text>
              <TextInput value={remarks} onChangeText={setRemarks} style={styles.input} multiline numberOfLines={3} />
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
                <Text style={styles.modalDetail}>Card No: {selectedCustomer.book_no}</Text>
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
                {customerDocs.filter(isImage).length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {customerDocs.filter(isImage).map(doc => (
                      <TouchableOpacity key={doc.id} onPress={() => { setDocModalUri(doc.file_data); setShowDocModal(true); }}>
                        <Image source={{ uri: doc.file_data }} style={{ width: 60, height: 60, borderRadius: 0, marginRight: 8, borderWidth: 1, borderColor: '#ccc' }} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {customerDocs.filter(doc => !isImage(doc)).map(doc => (
                  <View key={doc.id} style={styles.documentItem}>
                    <TouchableOpacity onPress={() => Linking.openURL(doc.file_data || '')}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={styles.modalTitle}>Edit Customer</Text>
                  <TouchableOpacity onPress={() => openLocationPicker(selectedCustomer)} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 24 }}>📍</Text>
                  </TouchableOpacity>
                </View>
                {isEditMode && (
                  <>
                    <TouchableOpacity style={styles.uploadButton} onPress={handleUploadMenu}>
                      <Text style={styles.uploadButtonText}>
                        Upload Photo(s) ({customerDocs.filter(isImage).length}/2)
                      </Text>
                    </TouchableOpacity>
                    {loadingImages ? (
                      <ActivityIndicator size="small" style={{ margin: 8 }} />
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
                        {customerDocs.filter(isImage).map(doc => (
                          <TouchableOpacity key={doc.id} style={{ marginRight: 8, marginBottom: 8 }} onPress={() => { setDocModalUri(doc.file_data); setShowDocModal(true); }}>
                            <Image source={{ uri: doc.file_data }} style={{ width: 50, height: 50, borderRadius: 0, borderWidth: 1, borderColor: '#ddd' }} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.formLabel}>Name</Text>
                <TextInput 
                  value={selectedCustomer.name} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, name: val })} 
                  style={isMissing('name') ? styles.formInputError : styles.formInput} 
                />
                <Text style={styles.formLabel}>Mobile</Text>
                <TextInput 
                  value={selectedCustomer.mobile} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, mobile: val })} 
                  style={isMissing('mobile') ? styles.formInputError : styles.formInput} 
                  keyboardType="phone-pad" 
                />
                <Text style={styles.formLabel}>Email</Text>
                <TextInput 
                  value={selectedCustomer.email} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, email: val })} 
                  style={isMissing('email') ? styles.formInputError : styles.formInput} 
                  keyboardType="email-address" 
                />
                <Text style={styles.formLabel}>Card No</Text>
                <TextInput 
                  value={selectedCustomer.book_no} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, book_no: val })} 
                  style={isMissing('book_no') ? styles.formInputError : styles.formInput} 
                />
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
                
                {/* Location Picker Section */}
                <Text style={styles.sectionHeader}>Location</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1, fontSize: 14, color: '#666' }}>
                    Current: {selectedCustomer.latitude?.toFixed(6)}, {selectedCustomer.longitude?.toFixed(6)}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.uploadButton, { marginLeft: 8 }]} 
                    onPress={() => openLocationPicker(selectedCustomer)}
                  >
                    <Text style={styles.uploadButtonText}>Change Location</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Uploaded Photos Section - Moved to top */}
                <Text style={styles.sectionHeader}>Uploaded Photos</Text>
                {isEditMode && customerDocs.filter(isImage).length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {loadingImages ? (
                      <ActivityIndicator size="small" style={{ margin: 8 }} />
                    ) : (
                      customerDocs.filter(isImage).map(doc => (
                        <View key={doc.id} style={{ alignItems: 'center', marginRight: 12 }}>
                          <TouchableOpacity onPress={() => { setDocModalUri(doc.file_data); setShowDocModal(true); }}>
                            <Image source={{ uri: doc.file_data }} style={{ width: 60, height: 60, borderRadius: 0, borderWidth: 1, borderColor: '#ccc' }} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={async () => {
                            Alert.alert('Delete', 'Are you sure you want to delete this image?', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: async () => {
                                await supabase.from('customer_documents').delete().eq('id', doc.id);
                                await fetchCustomerDocs(selectedCustomer.id);
                                Alert.alert('Image Deleted', 'The image has been deleted.', [
                                  { text: 'OK', onPress: () => {
                                    // If less than 2 images, prompt to re-upload
                                    const currentImages = customerDocs.filter(isImage).length - 1;
                                    if (currentImages < 2) {
                                      Alert.alert('Upload', 'You can upload a new image now.', [
                                        { text: 'Upload', onPress: handleUploadMenu },
                                        { text: 'Cancel', style: 'cancel' }
                                      ]);
                                    }
                                  }}
                                ]);
                              }}
                            ]);
                          }}>
                            <Text style={{ color: 'red', marginTop: 4, fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}
                
                <Text style={styles.formLabel}>Remarks</Text>
                <TextInput value={selectedCustomer.remarks} onChangeText={val => setSelectedCustomer({ ...selectedCustomer, remarks: val })} style={styles.formInput} multiline numberOfLines={3} />
                <Text style={styles.formLabel}>Amount Given</Text>
                <TextInput 
                  value={selectedCustomer.amount_given} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, amount_given: val })} 
                  style={isMissing('amount_given') ? styles.formInputError : styles.formInput} 
                  keyboardType="numeric" 
                />
                <Text style={styles.formLabel}>Days to Complete Repayment</Text>
                <TextInput 
                  value={selectedCustomer.days_to_complete} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, days_to_complete: val })} 
                  style={isMissing('days_to_complete') ? styles.formInputError : styles.formInput} 
                  keyboardType="numeric" 
                />
                <Text style={styles.formLabel}>Advance Amount Taken</Text>
                <TextInput 
                  value={selectedCustomer.advance_amount} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, advance_amount: val })} 
                  style={isMissing('advance_amount') ? styles.formInputError : styles.formInput} 
                  keyboardType="numeric" 
                />
                <Text style={styles.formLabel}>Late Payment Fee Per Day</Text>
                <TextInput 
                  value={selectedCustomer.late_fee_per_day} 
                  onChangeText={val => setSelectedCustomer({ ...selectedCustomer, late_fee_per_day: val })} 
                  style={isMissing('late_fee_per_day') ? styles.formInputError : styles.formInput} 
                  keyboardType="numeric" 
                />
                <Text style={styles.formLabel}>Repayment Frequency</Text>
                <Picker selectedValue={selectedCustomer.repayment_frequency} onValueChange={val => {
                  setSelectedCustomer({ ...selectedCustomer, repayment_frequency: val });
                  // Reset plan and calculated fields
                  setSelectedCustomer({ ...selectedCustomer, repayment_frequency: val, repayment_plan_id: '', repayment_amount: '', advance_amount: '', days_to_complete: '', late_fee_per_day: '' });
                }} style={styles.formPicker}>
                  <Picker.Item label="Select Frequency" value="" />
                  {['daily','weekly','monthly','yearly'].map(freq => <Picker.Item key={freq} label={freq.charAt(0).toUpperCase()+freq.slice(1)} value={freq} />)}
                </Picker>
                <Text style={styles.formLabel}>Repayment Plan</Text>
                <Picker selectedValue={selectedCustomer.repayment_plan_id} onValueChange={val => {
                  setSelectedCustomer({ ...selectedCustomer, repayment_plan_id: val });
                  // Recalculate fields below
                  const plan = repaymentPlans.find(p => p.id === val);
                  if (plan && selectedCustomer.amount_given) {
                    const scale = parseFloat(selectedCustomer.amount_given) / parseFloat(plan.base_amount);
                    setSelectedCustomer({
                      ...selectedCustomer,
                      repayment_plan_id: val,
                      repayment_frequency: plan.frequency,
                      repayment_amount: (scale * plan.repayment_per_period).toFixed(2),
                      advance_amount: plan.advance_amount ? (scale * plan.advance_amount).toFixed(2) : '0',
                      days_to_complete: plan.periods.toString(),
                      late_fee_per_day: plan.late_fee_per_period ? plan.late_fee_per_period.toString() : '0',
                    });
                  }
                }} style={styles.formPicker} enabled={!!selectedCustomer.repayment_frequency}>
                  <Picker.Item label="Select Plan" value="" />
                  {repaymentPlans.filter(p => p.frequency === selectedCustomer.repayment_frequency).map(plan => <Picker.Item key={plan.id} label={plan.name} value={plan.id} />)}
                </Picker>
                <Text style={styles.formLabel}>Amount Given</Text>
                <TextInput value={selectedCustomer.amount_given} onChangeText={val => {
                  setSelectedCustomer({ ...selectedCustomer, amount_given: val });
                  // Recalculate if plan is selected
                  const plan = repaymentPlans.find(p => p.id === selectedCustomer.repayment_plan_id);
                  if (plan && val) {
                    const scale = parseFloat(val) / parseFloat(plan.base_amount);
                    setSelectedCustomer({
                      ...selectedCustomer,
                      amount_given: val,
                      repayment_amount: (scale * plan.repayment_per_period).toFixed(2),
                      advance_amount: plan.advance_amount ? (scale * plan.advance_amount).toFixed(2) : '0',
                      days_to_complete: plan.periods.toString(),
                      late_fee_per_day: plan.late_fee_per_period ? plan.late_fee_per_period.toString() : '0',
                    });
                  }
                }} style={styles.input} keyboardType="numeric" />
                <Text style={styles.formLabel}>Repayment Amount (auto-calculated)</Text>
                <TextInput value={selectedCustomer.repayment_amount} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
                <Text style={styles.formLabel}>Advance Amount (auto-calculated)</Text>
                <TextInput value={selectedCustomer.advance_amount} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
                <Text style={styles.formLabel}>
                  {selectedCustomer.repayment_frequency === 'weekly' ? 'Weeks to Complete (auto-filled)' :
                   selectedCustomer.repayment_frequency === 'monthly' ? 'Months to Complete (auto-filled)' :
                   selectedCustomer.repayment_frequency === 'yearly' ? 'Years to Complete (auto-filled)' :
                   'Days to Complete (auto-filled)'}
                </Text>
                <TextInput value={selectedCustomer.days_to_complete} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
                <Text style={styles.formLabel}>Late Fee Per Period (auto-filled)</Text>
                <TextInput value={selectedCustomer.late_fee_per_day} editable={false} style={[styles.input, { backgroundColor: '#eee' }]} />
                
                <Text style={styles.sectionHeader}>Repayment Dates</Text>
                
                {/* Enhanced Date Range Picker Button */}
                <Text style={styles.formLabel}>Select Date Range (Start - End)</Text>
                <TouchableOpacity 
                  style={[
                    styles.input, 
                    { 
                      justifyContent: 'center', 
                      paddingVertical: 16, 
                      backgroundColor: startDate && endDate ? '#E8F5E8' : '#F0F8FF',
                      borderColor: startDate && endDate ? '#4CAF50' : '#007AFF',
                      borderWidth: 2
                    }
                  ]} 
                  onPress={showEnhancedDatePickerModal}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: 'bold', 
                      color: startDate && endDate ? '#2E7D32' : '#007AFF',
                      marginBottom: 4
                    }}>
                      📅 {startDate && endDate ? 'Date Range Selected' : 'Select Date Range'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 14, 
                        color: startDate ? '#333' : '#999',
                        fontWeight: startDate ? 'bold' : 'normal'
                      }}>
                        {startDate ? formatDate(startDate) : 'Start Date'}
                      </Text>
                      <Text style={{ marginHorizontal: 8, fontSize: 16, color: '#666' }}>✈️</Text>
                      <Text style={{ 
                        fontSize: 14, 
                        color: endDate ? '#333' : '#999',
                        fontWeight: endDate ? 'bold' : 'normal'
                      }}>
                        {endDate ? formatDate(endDate) : 'End Date'}
                      </Text>
                    </View>
                    {repaymentFrequency && (
                      <Text style={{ 
                        fontSize: 12, 
                        color: '#666', 
                        marginTop: 4,
                        fontStyle: 'italic'
                      }}>
                        Repayment: {repaymentFrequency} | Highlights: {repaymentFrequency === 'daily' ? daysToComplete + ' day intervals' : repaymentFrequency + ' intervals'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <View style={{ maxHeight: 120 }}>
                  <ScrollView>
                    {customerDocs
                      .filter(doc => !isImage(doc))
                      .map(doc => (
                        <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <TouchableOpacity onPress={() => Linking.openURL(doc.file_data || '')} style={{ flex: 1 }}>
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
                    area_id: selectedCustomer.area_id,
                    start_date: startDate,
                    end_date: endDate
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
                <FlatList
                  data={transactions}
                  renderItem={({ item }) => (
                    <>
                      <TouchableOpacity onPress={() => setExpandedTransactionId(expandedTransactionId === item.id ? null : item.id)}>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          borderBottomWidth: 1, 
                          borderColor: '#eee', 
                          paddingVertical: 6,
                          backgroundColor: item.payment_mode === 'upi' && item.upi_image ? '#F0F8FF' : 'transparent'
                        }}>
                          <Text style={[styles.cell, { flex: 1 }]}>{item.transaction_type}</Text>
                          <Text style={[styles.cell, { flex: 1 }]}>₹{item.amount}</Text>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.cell}>{item.payment_mode || 'Cash'}</Text>
                            {item.payment_mode === 'upi' && item.upi_image && (
                              <Text style={{ color: '#4A90E2', fontSize: 12, marginLeft: 4 }}>📷</Text>
                            )}
                          </View>
                          <Text style={[styles.cell, { flex: 1 }]}>{new Date(item.transaction_date).toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                      {expandedTransactionId === item.id && (
                        <View style={{ backgroundColor: '#F7F9FC', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Transaction Details:</Text>
                          <Text>Type: {item.transaction_type}</Text>
                          <Text>Amount: ₹{item.amount}</Text>
                          <Text>Payment Mode: {item.payment_mode || 'Cash'}</Text>
                          <Text>Date: {new Date(item.transaction_date).toLocaleString()}</Text>
                          <Text>Remarks: {item.remarks || 'No remarks'}</Text>
                          {item.payment_mode === 'upi' && item.upi_image && (
                            <View style={{ alignItems: 'center', marginTop: 12 }}>
                              <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#4A90E2' }}>UPI Payment Receipt</Text>
                              <TouchableOpacity onPress={() => { setDocModalUri(item.upi_image); setShowDocModal(true); }}>
                                <Image
                                  source={{ uri: item.upi_image }}
                                  style={{ width: 120, height: 120, borderRadius: 0, borderWidth: 2, borderColor: '#4A90E2', marginBottom: 8 }}
                                />
                              </TouchableOpacity>
                              <Text style={{ color: '#888', fontSize: 12 }}>Tap to view full image</Text>
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
                      {/* Customer Info and Date Range Display */}
                      <View style={{ backgroundColor: '#E8F4FD', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#2E5BBA', marginBottom: 6 }}>Customer: {transactionCustomer.name}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>📅 Start Date:</Text>
                          <Text style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>{formatDate(transactionCustomer.start_date)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>📅 End Date:</Text>
                          <Text style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>{formatDate(transactionCustomer.end_date)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>💰 Repayment:</Text>
                          <Text style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>₹{transactionCustomer.repayment_amount} ({transactionCustomer.repayment_frequency})</Text>
                        </View>
                      </View>

                      {/* Financial Summary - Moved to Top */}
                      <View style={{ backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E9ECEF' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#495057', marginBottom: 8, textAlign: 'center' }}>💼 Financial Summary</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontWeight: 'bold', color: '#DC3545', fontSize: 15 }}>⏳ Pending Amount:</Text>
                          <Text style={{ fontWeight: 'bold', color: '#DC3545', fontSize: 15 }}>₹{getPendingAmount()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontWeight: 'bold', color: '#FD7E14', fontSize: 15 }}>📅 Pending Days:</Text>
                          <Text style={{ fontWeight: 'bold', color: '#FD7E14', fontSize: 15 }}>{getPendingDays()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontWeight: 'bold', color: '#28A745', fontSize: 15 }}>💵 Cash Received:</Text>
                          <Text style={{ fontWeight: 'bold', color: '#28A745', fontSize: 15 }}>₹{getTotalCashReceived()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontWeight: 'bold', color: '#007BFF', fontSize: 15 }}>📱 UPI Received:</Text>
                          <Text style={{ fontWeight: 'bold', color: '#007BFF', fontSize: 15 }}>₹{getTotalUpiReceived()}</Text>
                        </View>
                      </View>

                      {/* Add Transaction form */}
                      <View style={{ backgroundColor: '#F7F9FC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <Text style={styles.modalTitle}>Add Transaction</Text>
                        
                        {/* Transaction Date Picker */}
                        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>Transaction Date:</Text>
                        <TouchableOpacity 
                          style={[
                            styles.formInput, 
                            { 
                              justifyContent: 'center', 
                              backgroundColor: transactionDate !== new Date().toISOString().split('T')[0] ? '#FFF3CD' : '#fff',
                              borderColor: transactionDate !== new Date().toISOString().split('T')[0] ? '#856404' : '#ccc'
                            }
                          ]}
                          onPress={() => setShowTransactionDatePicker(true)}
                        >
                          <Text style={{ 
                            color: transactionDate !== new Date().toISOString().split('T')[0] ? '#856404' : '#333',
                            fontWeight: transactionDate !== new Date().toISOString().split('T')[0] ? 'bold' : 'normal'
                          }}>
                            {formatDate(transactionDate)} {transactionDate === new Date().toISOString().split('T')[0] ? '(Today)' : '(Custom Date)'}
                          </Text>
                        </TouchableOpacity>
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
                            <Text style={styles.uploadButtonText}>📷 Add UPI Receipt</Text>
                          </TouchableOpacity>
                        )}
                        <TextInput value={newTransactionRemarks} onChangeText={setNewTransactionRemarks} placeholder="Remarks" style={styles.formInput} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                          <TouchableOpacity onPress={() => setShowTransactionModal(false)} style={{ flex: 1, backgroundColor: '#ccc', borderRadius: 8, paddingVertical: 12, marginRight: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={handleAddTransaction} 
                            disabled={isTransactionSaving}
                            style={{ 
                              flex: 1, 
                              backgroundColor: isTransactionSaving ? '#ccc' : '#4A90E2', 
                              borderRadius: 8, 
                              paddingVertical: 12, 
                              marginLeft: 8, 
                              alignItems: 'center' 
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                              {isTransactionSaving ? 'Saving...' : 'Add Transaction'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Transaction grid header row */}
                      <View style={{ flexDirection: 'row', backgroundColor: '#E3E6F0', borderRadius: 6, paddingVertical: 6, marginBottom: 4 }}>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Type</Text>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Amount</Text>
                        <Text style={[styles.headerCell, { flex: 1 }]}>Payment</Text>
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
            <Image source={{ uri: docModalUri }} style={{ width: 320, height: 320, borderRadius: 0, borderWidth: 3, borderColor: '#4A90E2', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6, resizeMode: 'contain' }} />
            <TouchableOpacity style={styles.docModalCloseButton} onPress={() => setShowDocModal(false)}>
              <Text style={styles.docModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationPickerContainer}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' }}>
              Tap on the map to select a location, or use your current location
            </Text>
            
            <LocationSearchBar onLocationFound={(coords) => {
              setSelectedLocation(coords);
              setMapRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            }} />

            <View style={styles.locationPickerMap}>
              {MapView && (
                <MapView
                  style={{ width: '100%', height: '100%' }}
                  region={mapRegion}
                  onPress={handleMapPress}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected Location"
                      description="Tap to select this location"
                      pinColor="red"
                    />
                  )}
                </MapView>
              )}
            </View>
            
            {selectedLocation && (
              <View style={{ backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Selected Location:</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  Latitude: {selectedLocation.latitude.toFixed(6)}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  Longitude: {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}
            
            <View style={styles.locationPickerActions}>
              <TouchableOpacity 
                style={[styles.locationPickerButton, { backgroundColor: '#007AFF' }]} 
                onPress={getCurrentLocation}
              >
                <Text style={[styles.locationPickerButtonText, { color: '#fff' }]}>Use Current Location</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationPickerActions}>
              <TouchableOpacity 
                style={[styles.locationPickerButton, { backgroundColor: '#ccc' }]} 
                onPress={() => setShowLocationPicker(false)}
              >
                <Text style={[styles.locationPickerButtonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.locationPickerButton, { backgroundColor: '#4CAF50' }]} 
                onPress={confirmLocationSelection}
                disabled={!selectedLocation}
              >
                <Text style={[styles.locationPickerButtonText, { color: '#fff' }]}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Enhanced Date Picker Modal */}
      <EnhancedDatePicker
        visible={showEnhancedDatePicker}
        onClose={() => setShowEnhancedDatePicker(false)}
        onDateSelect={onEnhancedDateSelect}
        startDate={startDate}
        endDate={endDate}
        repaymentFrequency={repaymentFrequency}
        daysToComplete={daysToComplete}
      />

      {/* Transaction Date Picker Modal */}
      {showTransactionDatePicker && (
        <DateTimePicker
          value={new Date(transactionDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={transactionCustomer?.start_date ? new Date(transactionCustomer.start_date) : undefined}
          maximumDate={transactionCustomer?.end_date ? new Date(transactionCustomer.end_date) : undefined}
          onChange={(event, selectedDate) => {
            setShowTransactionDatePicker(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) {
              const dateString = selectedDate.toISOString().split('T')[0];
              // Check if selected date is within customer range
              const customerStart = transactionCustomer?.start_date;
              const customerEnd = transactionCustomer?.end_date;
              
              if (customerStart && dateString < customerStart) {
                Alert.alert('Invalid Date', 'Selected date is before customer start date.');
                return;
              }
              if (customerEnd && dateString > customerEnd) {
                Alert.alert('Invalid Date', 'Selected date is after customer end date.');
                return;
              }
              
              handleTransactionDateChange(dateString);
            }
          }}
        />
      )}
    </View>
  );
} 