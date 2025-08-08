import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import { Buffer } from 'buffer';
import LeafletMap from '../components/LeafletMap';
import * as Location from 'expo-location';

// Location Search Bar Component (similar to ProfileScreen)
function LocationSearchBar({ onLocationFound }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debounceTimeout = useRef(null);

  const fetchSuggestions = async (text) => {
    console.log('fetchSuggestions called with text:', text);
    if (!text) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`;
      console.log('Nominatim API URL:', url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DalabHRPORTAL/1.0 (dalab.hrportal@example.com)' // Replace with your app name and contact email
        }
      });
      const textResponse = await response.text(); // Get raw text response
      console.log('Nominatim API raw response:', textResponse);
      try {
        const results = JSON.parse(textResponse); // Attempt to parse as JSON
        console.log('Nominatim API results:', results);
        setSuggestions(results);
      } catch (parseError) {
        console.error('Error parsing Nominatim API response:', parseError);
        Alert.alert('Error', 'Failed to parse location data. Please try again.');
        setSuggestions([]);
      }
      setSuggestions(results);
    } catch (e) {
      console.error('Error fetching suggestions:', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeText = (text) => {
    setQuery(text);
    console.log('Query changed to:', text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const onSuggestionPress = (item) => {
    console.log('Suggestion pressed:', item);
    setQuery(item.display_name);
    setSuggestions([]);
    onLocationFound({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
  };

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

function hexToBase64(hexString) {
  if (!hexString) return '';
  const hex = hexString.startsWith('\\x') ? hexString.slice(2) : hexString;
  // Use Buffer for safe conversion
  return Buffer.from(hex, 'hex').toString('base64');
}

export default function AreaManagementScreen({ navigation, user, userProfile }) {
  const [activeTab, setActiveTab] = useState('repaymentPlans'); // default to new tab
  const [areas, setAreas] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Form states for areas
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
  
  // Form states for groups
  const [groupName, setGroupName] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [groupDescription, setGroupDescription] = useState('');
  // Add user selection state
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [users, setUsers] = useState([]);

  // Repayment Plan Management State
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

  useEffect(() => {
    loadAreas();
    loadGroups();
  }, []);

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

  // Load users with user_type = 'user'
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('user_type', 'user');
    if (!error) setUsers(data || []);
  };
  useEffect(() => { loadUsers(); }, []);

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
  useEffect(() => { if (activeTab === 'repaymentPlans') loadRepaymentPlans(); }, [activeTab]);

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

    try {
      const areaData = {
        area_name: areaName.trim(),
        area_type: areaType,
        pin_code: pinCode.trim() || null,
        state: state.trim() || null,
        description: description.trim() || null,
        latitude: selectedLocation ? selectedLocation.latitude : null,
        longitude: selectedLocation ? selectedLocation.longitude : null,
      };

      if (editingArea) {
        // Update existing area
        const { error } = await supabase
          .from('area_master')
          .update(areaData)
          .eq('id', editingArea.id);

        if (error) throw error;
        Alert.alert('Success', 'Area updated successfully');
      } else {
        // Create new area
        const { error } = await supabase
          .from('area_master')
          .insert(areaData);

        if (error) throw error;
        Alert.alert('Success', 'Area created successfully');
      }

      setShowAreaModal(false);
      loadAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'Failed to save area');
    }
  };

  const handleDeleteArea = (area) => {
    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${area.area_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('area_master')
                .delete()
                .eq('id', area.id);

              if (error) throw error;
              Alert.alert('Success', 'Area deleted successfully');
              loadAreas();
            } catch (error) {
              console.error('Error deleting area:', error);
              Alert.alert('Error', 'Failed to delete area');
            }
          },
        },
      ]
    );
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
      // Remove old group_areas
      await supabase.from('group_areas').delete().eq('group_id', groupId);
      // Insert new group_areas
      const groupAreaRows = selectedAreaIds.map(areaId => ({ group_id: groupId, area_id: areaId }));
      if (groupAreaRows.length) {
        await supabase.from('group_areas').insert(groupAreaRows);
      }
      // After saving group and group_areas:
      await supabase.from('user_groups').delete().eq('group_id', groupId);
      const userGroupRows = selectedUserIds.map(userId => ({ user_id: userId, group_id: groupId }));
      if (userGroupRows.length) {
        await supabase.from('user_groups').insert(userGroupRows);
      }
      Alert.alert('Success', editingGroup ? 'Group updated successfully' : 'Group created successfully');
      setShowGroupModal(false);
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', 'Failed to save group');
    }
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', group.id);

              if (error) throw error;
              Alert.alert('Success', 'Group deleted successfully');
              loadGroups();
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
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
    try {
      if (editingPlan) {
        const { error } = await supabase.from('repayment_plans').update(planData).eq('id', editingPlan.id);
        if (error) throw error;
        Alert.alert('Success', 'Repayment plan updated!');
      } else {
        const { error } = await supabase.from('repayment_plans').insert(planData);
        if (error) throw error;
        Alert.alert('Success', 'Repayment plan created!');
      }
      setShowPlanModal(false);
      loadRepaymentPlans();
    } catch (error) {
      Alert.alert('Error', 'Failed to save repayment plan');
    }
  };
  const handleDeletePlan = (plan) => {
    Alert.alert('Delete Plan', `Are you sure you want to delete "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.from('repayment_plans').delete().eq('id', plan.id);
          if (error) throw error;
          Alert.alert('Success', 'Repayment plan deleted!');
          loadRepaymentPlans();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete repayment plan');
        }
      }},
    ]);
  };

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
    <Modal
      visible={showAreaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAreaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingArea ? 'Edit Area' : 'Add New Area'}
          </Text>
          
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
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAreaModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveArea}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderGroupModal = () => (
    <Modal
      visible={showGroupModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGroupModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingGroup ? 'Edit Group' : 'Add New Group'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Select Areas:</Text>
            <ScrollView style={styles.areaPicker}>
              {areas.map((area) => (
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
              ))}
            </ScrollView>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TextInput
              style={styles.input}
              placeholder="Search Users"
              value={userSearch}
              onChangeText={setUserSearch}
            />
          </View>
          <ScrollView style={styles.userPicker}>
            {users.filter(
              u =>
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase())
            ).map(user => (
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
            ))}
          </ScrollView>
          
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowGroupModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveGroup}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPlanModal = () => (
    <Modal
      visible={showPlanModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPlanModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingPlan ? 'Edit Repayment Plan' : 'Add Repayment Plan'}</Text>
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
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPlanModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Area Management</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'repaymentPlans' && styles.activeTab]}
          onPress={() => setActiveTab('repaymentPlans')}
        >
          <Text style={[styles.tabText, activeTab === 'repaymentPlans' && styles.activeTabText]}>
            Repayment Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'areas' && styles.activeTab]}
          onPress={() => setActiveTab('areas')}
        >
          <Text style={[styles.tabText, activeTab === 'areas' && styles.activeTabText]}>
            Areas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'repaymentPlans' ? (
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
          />
          {renderPlanModal()}
        </View>
      ) : activeTab === 'areas' ? (
          <>
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
            />
          {renderAreaModal()}
          {renderLocationPickerModal()}
          </>
        ) : (
          <>
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
            />
          {renderGroupModal()}
          </>
        )}
      {/* Always render plan modal for edit/add plan */}
      {activeTab !== 'repaymentPlans' && renderPlanModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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