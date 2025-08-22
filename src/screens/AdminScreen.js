import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { supabase } from '../services/supabase';
import BankTransactionScreen from './BankTransactionScreen';
import BankAccountsScreen from './BankAccountsScreen';
import LocationSearchBar from '../components/AreaSearchBar';
import LeafletMap from '../components/LeafletMap';

const AdminModal = ({ visible, onClose, title, children, onSave, saveButtonText = 'Save' }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>{saveButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function AdminScreen({ navigation, user, userProfile }) {
  // Tab state
  const [activeTab, setActiveTab] = useState('users');
  const [activeConfigTab, setActiveConfigTab] = useState('repaymentPlans');

  // User management state (existing)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intervals, setIntervals] = useState({});

  // Area management state
  const [areas, setAreas] = useState([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [areaType, setAreaType] = useState('city');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });
  const mapRef = useRef(null);

  // Group management state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false); // New loading state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [groupDescription, setGroupDescription] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);

  // All users and areas for selection in group modal
  const [allUsers, setAllUsers] = useState([]);
  const [allAreas, setAllAreas] = useState([]);

  // Repayment plan management state
  const [repaymentPlans, setRepaymentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    frequency: 'weekly',
    periods: '',
    base_amount: '',
    repayment_per_period: '',
    advance_amount: '',
    late_fee_per_period: '',
    description: '',
  });

  // Customer Type management state
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loadingCustomerTypes, setLoadingCustomerTypes] = useState(false);
  const [showCustomerTypeModal, setShowCustomerTypeModal] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState(null);
  const [customerTypeName, setCustomerTypeName] = useState('');
  const [customerTypeDescription, setCustomerTypeDescription] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'areas') {
      loadAreas();
    } else if (activeTab === 'groups') {
      loadGroups();
      loadGroupUsers();
    } else if (activeTab === 'bankTransactions') {
      // No specific load function for bank transactions yet, will be handled in its own screen
    } else if (activeTab === 'configuration') {
      if (activeConfigTab === 'repaymentPlans') {
        loadRepaymentPlans();
      } else if (activeConfigTab === 'customerTypes') {
        loadCustomerTypes();
      }
    }
  }, [userProfile, activeTab, activeConfigTab]);

  const loadCustomerTypes = async () => {
    setLoadingCustomerTypes(true);
    try {
      const { data, error } = await supabase
        .from('customer_types')
        .select('*')
        .order('status_name', { ascending: true });

      if (error) {
        throw error;
      }
      setCustomerTypes(data || []);
    } catch (error) {
      console.error('Error loading customer types:', error);
      Alert.alert('Error', 'Failed to load customer types');
    } finally {
      setLoadingCustomerTypes(false);
    }
  };

  useEffect(() => {
    // Initialize intervals state when users are loaded
    const initialIntervals = {};
    users.forEach(user => {
      initialIntervals[user.id] = user.location_update_interval?.toString() || '30';
    });
    setIntervals(initialIntervals);
  }, [users]);

  const handleIntervalChange = (userId, value) => {
    setIntervals(prev => ({ ...prev, [userId]: value }));
  };

  const handleIntervalEndEditing = (userId) => {
    const value = parseInt(intervals[userId]) || 30;
    handleUpdateInterval(userId, value);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Only load users if current user is admin or superadmin
      if (userProfile?.user_type !== 'admin' && userProfile?.user_type !== 'superadmin') {
        Alert.alert('Access Denied', 'You do not have permission to view this page');
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('user_type', 'user');
    if (!error) setGroupUsers(data || []);
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'delete':
          Alert.alert(
            'Delete User',
            'Are you sure you want to delete this user?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);

                  if (error) {
                    Alert.alert('Error', 'Failed to delete user');
                    return;
                  }

                  Alert.alert('Success', 'User deleted successfully');
                  loadUsers();
                },
              },
            ]
          );
          break;

        case 'change_role':
          Alert.alert(
            'Change User Role',
            'Select new role:',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'User',
                onPress: async () => {
                  await updateUserRole(userId, 'user');
                },
              },
              {
                text: 'Admin',
                onPress: async () => {
                  await updateUserRole(userId, 'admin');
                },
              },
              {
                text: 'Super Admin',
                onPress: async () => {
                  await updateUserRole(userId, 'superadmin');
                },
              },
              {
                text: 'Customer',
                onPress: async () => {
                  await updateUserRole(userId, 'customer');
                },
              },
            ]
          );
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling user action:', error);
      Alert.alert('Error', 'Failed to perform action');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ user_type: newRole })
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to update user role');
        return;
      }

      Alert.alert('Success', 'User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const handleToggleLocationStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const { error } = await supabase
        .from('users')
        .update({ location_status: newStatus })
        .eq('id', userId);
      if (error) {
        Alert.alert('Error', 'Failed to update location status');
        return;
      }
      Alert.alert('Success', `Location status set to ${newStatus === 1 ? 'Active' : 'Inactive'}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update location status');
    }
  };

  const handleUpdateInterval = async (userId, interval) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ location_update_interval: interval })
        .eq('id', userId);
      if (error) {
        Alert.alert('Error', 'Failed to update location interval');
        return;
      }
      Alert.alert('Success', 'Location update interval set');
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update location interval');
    }
  };

  const renderUserItem = ({ item }) => {
    return (
      <View style={styles.userItemCard}>
        <View style={styles.userItemInfo}>
          <Text style={styles.userName}>{item.name || 'No Name'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={[styles.userRole, { color: getRoleColor(item.user_type) }]}> {item.user_type || 'user'} </Text>
          <Text style={[styles.userStatus, { color: item.location_status === 1 ? '#34C759' : '#FF3B30' }]}> Location: {item.location_status === 1 ? 'Active' : 'Inactive'} </Text>
          <Text style={styles.userDate}> Created: {new Date(item.created_at).toLocaleDateString()} </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>Interval (sec):</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 4, width: 60, textAlign: 'center' }}
              value={intervals[item.id]}
              keyboardType="numeric"
              onChangeText={value => handleIntervalChange(item.id, value)}
              onEndEditing={() => handleIntervalEndEditing(item.id)}
            />
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleUserAction(item.id, 'change_role')}
          >
            <Text style={styles.editButtonText}>Change Role</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleUserAction(item.id, 'delete')}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: item.location_status === 1 ? '#FF3B30' : '#34C759' }]}
            onPress={() => handleToggleLocationStatus(item.id, item.location_status)}
          >
            <Text style={styles.editButtonText}>
              {item.location_status === 1 ? 'Set Inactive' : 'Set Active'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleAddCustomerType = () => {
    setEditingCustomerType(null);
    setCustomerTypeName('');
    setCustomerTypeDescription('');
    setShowCustomerTypeModal(true);
  };

  const handleEditCustomerType = (type) => {
    setEditingCustomerType(type);
    setCustomerTypeName(type.status_name);
    setCustomerTypeDescription(type.description);
    setShowCustomerTypeModal(true);
  };

  const handleDeleteCustomerType = (item) => {
    handleDeleteItem(item, 'customer_types', 'Customer Type', loadCustomerTypes);
  };

  const handleSaveItem = async (itemData, tableName, itemName, editingItem, loadFunction, setShowModal) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
        Alert.alert('Success', `${itemName} updated.`);
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert(itemData);
        if (error) throw error;
        Alert.alert('Success', `${itemName} added.`);
      }
      setShowModal(false);
      loadFunction();
    } catch (error) {
      Alert.alert('Error', `Failed to save ${itemName}.`);
      console.error(`Save ${itemName} error:`, error);
    }
  };

  const handleSaveCustomerType = async () => {
    if (!customerTypeName) {
      Alert.alert('Error', 'Status Name is required.');
      return;
    }
    const newCustomerType = {
      status_name: customerTypeName,
      description: customerTypeDescription,
    };
    handleSaveItem(newCustomerType, 'customer_types', 'Customer type', editingCustomerType, loadCustomerTypes, setShowCustomerTypeModal);
  };

  const handleCancelCustomerTypeEdit = () => {
    setShowCustomerTypeModal(false);
    setEditingCustomerType(null);
    setCustomerTypeName('');
    setCustomerTypeDescription('');
  };

  const loadAreas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('area_master')
        .select('*')
        .order('area_name', { ascending: true });

      if (error) {
        throw error;
      }

      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
      Alert.alert('Error', 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`*, group_areas (area_id, area_master (id, area_name, area_type, pin_code)), user_groups (user_id)`)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    }
  };

  const loadRepaymentPlans = async () => {
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from('repayment_plans')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setRepaymentPlans(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load repayment plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleAddArea = () => {
    setEditingArea(null);
    setAreaName('');
    setAreaType('city');
    setPinCode('');
    setState('');
    setDescription('');
    setSelectedLocation(null); // Reset location
    setShowAreaModal(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setAreaName(area.area_name);
    setAreaType(area.area_type);
    setPinCode(area.pin_code || '');
    setState(area.state || '');
    setDescription(area.description || '');
    if (area.latitude && area.longitude) {
      setSelectedLocation({ latitude: area.latitude, longitude: area.longitude });
      setMapRegion({
        latitude: area.latitude,
        longitude: area.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      setSelectedLocation(null);
    }
    setShowAreaModal(true);
  };

  const handleSaveArea = async () => {
    if (!areaName.trim()) {
      Alert.alert('Error', 'Area name is required');
      return;
    }

    const areaData = {
      area_name: areaName.trim(),
      area_type: areaType,
      pin_code: pinCode.trim() || null,
      state: state.trim() || null,
      description: description.trim() || null,
      latitude: selectedLocation ? selectedLocation.latitude : null,
      longitude: selectedLocation ? selectedLocation.longitude : null,
    };

    handleSaveItem(areaData, 'area_master', 'Area', editingArea, loadAreas, setShowAreaModal);
  };

  const handleDeleteArea = (area) => {
    handleDeleteItem(area, 'area_master', 'Area', loadAreas);
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedAreaIds([]);
    setGroupDescription('');
    setSelectedUserIds([]);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelectedAreaIds((group.group_areas || []).map(ga => ga.area_id));
    setGroupDescription(group.description || '');
    // Pre-select users already assigned to this group
    setSelectedUserIds((group.user_groups || []).map(ug => ug.user_id));
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    if (!selectedAreaIds.length) {
      Alert.alert('Error', 'Please select at least one area');
      return;
    }
    try {
      let groupId;
      if (editingGroup) {
        // Update group
        const { error } = await supabase
          .from('groups')
          .update({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .eq('id', editingGroup.id);
        if (error) throw error;
        groupId = editingGroup.id;
      } else {
        // Create group
        const { data, error } = await supabase
          .from('groups')
          .insert({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        groupId = data.id;
      }
      
      await updateGroupAreas(groupId, selectedAreaIds);
      await updateUserGroups(groupId, selectedUserIds);

      Alert.alert('Success', editingGroup ? 'Group updated successfully' : 'Group created successfully');
      setShowGroupModal(false);
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', 'Failed to save group');
    }
  };

  

  const updateGroupAreas = async (groupId, selectedAreaIds) => {
    // Remove old group_areas
    const { error: deleteAreaError } = await supabase.from('group_areas').delete().eq('group_id', groupId);
    if (deleteAreaError) throw deleteAreaError;

    // Insert new group_areas
    const groupAreaRows = selectedAreaIds.map(areaId => ({ group_id: groupId, area_id: areaId }));
    if (groupAreaRows.length) {
      const { error: insertAreaError } = await supabase.from('group_areas').insert(groupAreaRows);
      if (insertAreaError) throw insertAreaError;
    }
  };

  const updateUserGroups = async (groupId, selectedUserIds) => {
    // Remove old user_groups
    const { error: deleteUserGroupError } = await supabase.from('user_groups').delete().eq('group_id', groupId);
    if (deleteUserGroupError) throw deleteUserGroupError;

    // Insert new user_groups
    const userGroupRows = selectedUserIds.map(userId => ({ user_id: userId, group_id: groupId }));
    if (userGroupRows.length) {
      const { error: insertUserGroupError } = await supabase.from('user_groups').insert(userGroupRows);
      if (insertUserGroupError) throw insertUserGroupError;
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      frequency: 'weekly',
      periods: '',
      base_amount: '',
      repayment_per_period: '',
      advance_amount: '',
      late_fee_per_period: '',
      description: '',
    });
    setShowPlanModal(true);
  };
  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      frequency: plan.frequency,
      periods: plan.periods.toString(),
      base_amount: plan.base_amount.toString(),
      repayment_per_period: plan.repayment_per_period.toString(),
      advance_amount: plan.advance_amount?.toString() || '',
      late_fee_per_period: plan.late_fee_per_period?.toString() || '',
      description: plan.description || '',
    });
    setShowPlanModal(true);
  };
  const handleSavePlan = async () => {
    if (!planForm.name.trim() || !planForm.frequency || !planForm.periods || !planForm.base_amount || !planForm.repayment_per_period) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    const planData = {
      name: planForm.name.trim(),
      frequency: planForm.frequency,
      periods: parseInt(planForm.periods),
      base_amount: parseFloat(planForm.base_amount),
      repayment_per_period: parseFloat(planForm.repayment_per_period),
      advance_amount: planForm.advance_amount ? parseFloat(planForm.advance_amount) : 0,
      late_fee_per_period: planForm.late_fee_per_period ? parseFloat(planForm.late_fee_per_period) : 0,
      description: planForm.description?.trim() || null,
    };
    handleSaveItem(planData, 'repayment_plans', 'Repayment plan', editingPlan, loadRepaymentPlans, setShowPlanModal);
  };
  const handleDeletePlan = (plan) => {
    handleDeleteItem(plan, 'repayment_plans', 'Repayment Plan', loadRepaymentPlans);
  };

  

  const handleCancelGroupEdit = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    setGroupName('');
    setSelectedAreaIds([]);
    setGroupDescription('');
    setSelectedUserIds([]);
    setGroupUsers([]);
  };

  const renderCustomerTypeItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>{item.status_name}</Text>
      <Text style={styles.itemDetail}>{item.description || 'No description'}</Text>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEditCustomerType(item)} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteCustomerType(item)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAreaItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.area_name}</Text>
        <Text style={styles.itemType}>{item.area_type}</Text>
        {item.pin_code && <Text style={styles.itemDetail}>PIN: {item.pin_code}</Text>}
        {item.state && <Text style={styles.itemDetail}>State: {item.state}</Text>}
        {item.description && <Text style={styles.itemDetail}>{item.description}</Text>}
        {item.latitude && item.longitude && <Text style={styles.itemDetail}>Location: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditArea(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteArea(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroupItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>
          Areas: {(item.group_areas || []).map(ga => ga.area_master?.area_name).filter(Boolean).join(', ') || 'None'}
        </Text>
        {item.description && <Text style={styles.itemDetail}>{item.description}</Text>}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditGroup(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteGroup(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const openLocationPicker = async () => {
    let initialLat = 20.5937; // Default to India center
    let initialLon = 78.9629;

    // Try to get current mobile location
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        initialLat = location.coords.latitude;
        initialLon = location.coords.longitude;
      } else {
        Alert.alert('Permission denied', 'Location permission not granted. Using default or area location.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get current location. Using default or area location.');
    }

    // If editing an area and it has lat/lon, prioritize that
    if (editingArea && editingArea.latitude && editingArea.longitude) {
      initialLat = editingArea.latitude;
      initialLon = editingArea.longitude;
    }

    setSelectedLocation({ latitude: initialLat, longitude: initialLon });
    setMapRegion({
      latitude: initialLat,
      longitude: initialLon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    if (mapRef.current) {
      mapRef.current.centerOnLocation({ latitude: initialLat, longitude: initialLon });
    }
    setShowLocationPicker(true);
  };

  const handleMapPress = ({ latitude, longitude }) => {
    setSelectedLocation({ latitude, longitude });
  };

  const confirmLocationSelection = () => {
      setShowLocationPicker(false);
  };

  const renderLocationPickerModal = () => (
    <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Select Location</Text>
            <LocationSearchBar onLocationFound={(coords) => {
              setSelectedLocation(coords);
              setMapRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
              if (mapRef.current) {
                mapRef.current.centerOnLocation(coords);
              }
            }} />
            <View style={{ width: '100%', height: 400, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <LeafletMap
                ref={mapRef}
                onMapPress={handleMapPress}
                initialRegion={mapRegion}
                markerCoordinate={selectedLocation}
              />
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#ccc', borderRadius: 8, paddingVertical: 12, marginRight: 8, alignItems: 'center' }}
                onPress={() => setShowLocationPicker(false)}
              >
                <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 12, marginLeft: 8, alignItems: 'center' }}
                onPress={confirmLocationSelection}
                disabled={!selectedLocation}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  );

  const renderAreaModal = () => (
    <AdminModal
      visible={showAreaModal}
      onClose={() => setShowAreaModal(false)}
      title={editingArea ? 'Edit Area' : 'Add New Area'}
      onSave={handleSaveArea}
    >
      <TextInput
        style={styles.input}
        placeholder="Area Name"
        value={areaName}
        onChangeText={setAreaName}
      />
      
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Area Type:</Text>
        <View style={styles.pickerRow}>
          {['village', 'town', 'city', 'district'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.pickerOption,
                areaType === type && styles.pickerOptionSelected
              ]}
              onPress={() => setAreaType(type)}
            >
              <Text style={[
                styles.pickerOptionText,
                areaType === type && styles.pickerOptionTextSelected
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="PIN Code (optional)"
        value={pinCode}
        onChangeText={setPinCode}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="State (optional)"
        value={state}
        onChangeText={setState}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity style={styles.locationButton} onPress={openLocationPicker}>
        <Text style={styles.locationButtonText}>
            {selectedLocation ? 'Change Location' : 'Select Location'}
        </Text>
      </TouchableOpacity>

        {selectedLocation && (
            <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Selected Location:</Text>
            <Text>Latitude: {selectedLocation.latitude.toFixed(6)}</Text>
            <Text>Longitude: {selectedLocation.longitude.toFixed(6)}</Text>
            </View>
        )}
    </AdminModal>
  );

  const renderGroupModal = () => (
    <AdminModal
      visible={showGroupModal}
      onClose={() => setShowGroupModal(false)}
      title={editingGroup ? 'Edit Group' : 'Add New Group'}
      onSave={handleSaveGroup}
    >
      <TextInput
        style={styles.input}
        placeholder="Group Name"
        value={groupName}
        onChangeText={setGroupName}
      />
      
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Areas:</Text>
        <FlatList
          data={areas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: area }) => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.pickerOption,
                selectedAreaIds.includes(area.id) && styles.pickerOptionSelected
              ]}
              onPress={() => {
                setSelectedAreaIds((prev) =>
                  prev.includes(area.id)
                    ? prev.filter((id) => id !== area.id)
                    : [...prev, area.id]
                );
              }}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  selectedAreaIds.includes(area.id) && styles.pickerOptionTextSelected
                ]}
              >
                {area.area_name} ({area.area_type})
              </Text>
            </TouchableOpacity>
          )}
          style={styles.areaPicker}
        />
      </View>
      
      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={styles.input}
          placeholder="Search Users"
          value={userSearch}
          onChangeText={setUserSearch}
        />
      </View>
      <FlatList
        data={users.filter(
          u =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item: user }) => (
          <TouchableOpacity
            key={user.id}
            style={[
              styles.pickerOption,
              selectedUserIds.includes(user.id) && styles.pickerOptionSelected
            ]}
            onPress={() => {
              setSelectedUserIds(prev =>
                prev.includes(user.id)
                  ? prev.filter(id => id !== user.id)
                  : [...prev, user.id]
              );
            }}
          >
            <Text
              style={[
                styles.pickerOptionText,
                selectedUserIds.includes(user.id) && styles.pickerOptionTextSelected
              ]}
            >
              {user.name} ({user.email})
            </Text>
          </TouchableOpacity>
        )}
        style={styles.userPicker}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={groupDescription}
        onChangeText={setGroupDescription}
        multiline
        numberOfLines={3}
      />
    </AdminModal>
  );

  const renderPlanModal = () => (
    <AdminModal
      visible={showPlanModal}
      onClose={() => setShowPlanModal(false)}
      title={editingPlan ? 'Edit Repayment Plan' : 'Add Repayment Plan'}
      onSave={handleSavePlan}
    >
      <TextInput style={styles.input} placeholder="Plan Name" value={planForm.name} onChangeText={v => setPlanForm(f => ({ ...f, name: v }))} />
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Frequency:</Text>
        <View style={styles.pickerRow}>
          {['daily', 'weekly', 'monthly', 'yearly'].map(freq => (
            <TouchableOpacity key={freq} style={[styles.pickerOption, planForm.frequency === freq && styles.pickerOptionSelected]} onPress={() => setPlanForm(f => ({ ...f, frequency: freq }))}>
              <Text style={[styles.pickerOptionText, planForm.frequency === freq && styles.pickerOptionTextSelected]}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TextInput style={styles.input} placeholder="Number of Periods" value={planForm.periods} onChangeText={v => setPlanForm(f => ({ ...f, periods: v.replace(/[^0-9]/g, '') }))} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Base Amount" value={planForm.base_amount} onChangeText={v => setPlanForm(f => ({ ...f, base_amount: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Repayment Per Period" value={planForm.repayment_per_period} onChangeText={v => setPlanForm(f => ({ ...f, repayment_per_period: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Advance Amount (optional)" value={planForm.advance_amount} onChangeText={v => setPlanForm(f => ({ ...f, advance_amount: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Late Fee Per Period (optional)" value={planForm.late_fee_per_period} onChangeText={v => setPlanForm(f => ({ ...f, late_fee_per_period: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Description (optional)" value={planForm.description} onChangeText={v => setPlanForm(f => ({ ...f, description: v }))} multiline numberOfLines={2} />
    </AdminModal>
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin':
        return '#FF3B30';
      case 'admin':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      

            <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
            onPress={() => setActiveTab('users')}
            onLongPress={() => Alert.alert('Users', 'Manage user accounts and roles')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'users' && styles.activeTabButtonText]}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'areas' && styles.activeTabButton]}
            onPress={() => setActiveTab('areas')}
            onLongPress={() => Alert.alert('Areas', 'Manage geographical areas')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'areas' && styles.activeTabButtonText]}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'groups' && styles.activeTabButton]}
            onPress={() => setActiveTab('groups')}
            onLongPress={() => Alert.alert('Groups', 'Manage user groups and their assigned areas')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'groups' && styles.activeTabButtonText]}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bankTransactions' && styles.activeTabButton]}
            onPress={() => setActiveTab('bankTransactions')}
            onLongPress={() => Alert.alert('Bank Transactions', 'View and manage bank transactions')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'bankTransactions' && styles.tabButtonText]}>💳</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bankAccounts' && styles.activeTabButton]}
            onPress={() => setActiveTab('bankAccounts')}
            onLongPress={() => Alert.alert('Bank Accounts', 'Manage linked bank accounts')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'bankAccounts' && styles.tabButtonText]}>🏦</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'configuration' && styles.activeTabButton]}
            onPress={() => setActiveTab('configuration')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'configuration' && styles.tabButtonText]}>⚙️</Text>
            {/* Consider using a proper icon library (e.g., react-native-vector-icons) for better visual representation. */}
          </TouchableOpacity>
        </View>

      {activeTab === 'users' && (
        <View style={{ flex: 1, padding: 20 }}>
          
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadUsers} />
            }
            contentContainerStyle={styles.listContainer}
          />
        </View>
      )}

      {activeTab === 'areas' && (
        <View style={{ flex: 1, padding: 20 }}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddArea}>
            <Text style={styles.addButtonText}>+ Add Area</Text>
          </TouchableOpacity>
          <FlatList
            data={areas}
            renderItem={renderAreaItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadAreas} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No areas found. Add your first area!</Text>
            }
            contentContainerStyle={styles.listContainer}
          />
          {renderAreaModal()}
          {renderLocationPickerModal()}
        </View>
      )}

      {activeTab === 'groups' && (
        <View style={{ flex: 1, padding: 20 }}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddGroup}>
            <Text style={styles.addButtonText}>+ Add Group</Text>
          </TouchableOpacity>
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadGroups} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No groups found. Add your first group!</Text>
            }
            contentContainerStyle={styles.listContainer}
          />
          {renderGroupModal()}
        </View>
      )}

      {activeTab === 'bankTransactions' && (
        <BankTransactionScreen navigation={navigation} user={user} userProfile={userProfile} />
      )}

      {activeTab === 'bankAccounts' && (
        <BankAccountsScreen navigation={navigation} />
      )}

      {activeTab === 'configuration' && (
        <View style={{ flex: 1 }}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeConfigTab === 'repaymentPlans' && styles.activeTabButton]}
              onPress={() => setActiveConfigTab('repaymentPlans')}
            >
              <Text style={[styles.tabButtonText, activeConfigTab === 'repaymentPlans' && styles.activeTabButtonText]}>Repayment Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeConfigTab === 'customerTypes' && styles.activeTabButton]}
              onPress={() => setActiveConfigTab('customerTypes')}
            >
              <Text style={[styles.tabButtonText, activeConfigTab === 'customerTypes' && styles.activeTabButtonText]}>Customer Types</Text>
            </TouchableOpacity>
          </View>

          {activeConfigTab === 'repaymentPlans' && (
            <View style={{ flex: 1, padding: 20 }}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddPlan}>
                <Text style={styles.addButtonText}>+ Add Repayment Plan</Text>
              </TouchableOpacity>
              <FlatList
                data={repaymentPlans}
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemType}>{item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} - {item.periods} periods</Text>
                      <Text style={styles.itemDetail}>Base Amount: ₹{item.base_amount} | Repayment/Period: ₹{item.repayment_per_period}</Text>
                      {item.advance_amount ? <Text style={styles.itemDetail}>Advance: ₹{item.advance_amount}</Text> : null}
                      {item.late_fee_per_period ? <Text style={styles.itemDetail}>Late Fee/Period: ₹{item.late_fee_per_period}</Text> : null}
                      {item.description ? <Text style={styles.itemDetail}>{item.description}</Text> : null}
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity style={styles.editButton} onPress={() => handleEditPlan(item)}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePlan(item)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={loadingPlans} onRefresh={loadRepaymentPlans} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No repayment plans found. Add your first plan!</Text>}
                contentContainerStyle={styles.listContainer}
              />
              {renderPlanModal()}
            </View>
          )}
          
          {activeConfigTab === 'customerTypes' && (
            <View style={{ flex: 1, padding: 20 }}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddCustomerType}>
                  <Text style={styles.addButtonText}>+ Add Customer Type</Text>
                </TouchableOpacity>
              <FlatList
                data={customerTypes}
                renderItem={renderCustomerTypeItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl refreshing={loadingCustomerTypes} onRefresh={loadCustomerTypes} />
                }
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={styles.emptyListText}>No customer types found.</Text>}
              />

              <AdminModal
                visible={showCustomerTypeModal}
                onClose={handleCancelCustomerTypeEdit}
                title={editingCustomerType ? 'Edit Customer Type' : 'Add Customer Type'}
                onSave={handleSaveCustomerType}
              >
                <Text style={styles.formLabel}>Status Name</Text>
                <TextInput
                  style={styles.input}
                  value={customerTypeName}
                  onChangeText={setCustomerTypeName}
                  placeholder="e.g., VIP, Regular, New"
                />
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={customerTypeDescription}
                  onChangeText={setCustomerTypeDescription}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </AdminModal>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 0, // Explicitly set to 0
    marginTop: 0,  // Explicitly set to 0
  },
  
  
  
  listContainer: {
    padding: 16,
  },
  userItemCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userItemInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    width: '100%', // Added this
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10, // Add some spacing between tabs
    flex: 1, // Added this to make tabs take equal space
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  
  
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  areaPicker: {
    maxHeight: 150,
  },
  userPicker: {
    maxHeight: 150,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 