import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  RefreshControl,
  Image,
} from 'react-native';
import { supabase } from '../services/supabase';
import { locationTracker } from '../services/locationTracker';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native';
import { Buffer } from 'buffer';

// Utility function to convert BYTEA hex to base64
function hexToBase64(hexString) {
  if (!hexString) return '';
  // Remove all leading backslashes and 'x'
  const hex = hexString.replace(/^\\*x/, '');
  return Buffer.from(hex, 'hex').toString('base64');
}

export default function DashboardScreen({ user, userProfile }) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationCount, setLocationCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [lastLocation, setLastLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupAreas, setGroupAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [areaDetails, setAreaDetails] = useState(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');

  // Debug logging
  console.log('📱 DashboardScreen received props:', { user, userProfile });
  console.log('📧 User email:', user?.email);
  console.log('👤 UserProfile name:', userProfile?.name);
  console.log('📧 UserProfile email:', userProfile?.email);

  useEffect(() => {
    loadLocationStats();
    
    // Check tracking status
    setIsTracking(locationTracker.getTrackingStatus());
    setOfflineCount(locationTracker.getOfflineLocationsCount());
  }, []);

  useEffect(() => {
    console.log('🔄 userProfile changed:', userProfile);
    if (userProfile) {
      // Set tracking status based on user profile
      setIsTracking(userProfile.location_status === 1);
    }
  }, [userProfile]);

  // Fetch groups on mount or when userProfile changes
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.user_type === 'admin' || userProfile.user_type === 'superadmin') {
      // Admin: fetch all groups
      supabase
        .from('groups')
        .select('id, name')
        .then(({ data }) => setAllGroups(data || []));
    } else if (userProfile.user_type === 'user') {
      // User: fetch assigned groups
      supabase
        .from('user_groups')
        .select('group_id, groups (id, name)')
        .eq('user_id', userProfile.id)
        .then(({ data }) => setUserGroups((data || []).map(g => g.groups)));
    }
  }, [userProfile]);
  // Fetch areas for selected group
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupAreas([]);
      setSelectedAreaId(null);
      setAreaDetails(null);
      return;
    }
    supabase
      .from('group_areas')
      .select('area_id, area_master (id, area_name, area_type, pin_code, state, country, description)')
      .eq('group_id', selectedGroupId)
      .then(({ data }) => setGroupAreas((data || []).map(a => a.area_master)));
  }, [selectedGroupId]);
  // Fetch area details when selected
  useEffect(() => {
    if (!selectedAreaId) {
      setAreaDetails(null);
      return;
    }
    const area = groupAreas.find(a => a.id === selectedAreaId);
    setAreaDetails(area || null);
  }, [selectedAreaId, groupAreas]);

  const loadLocationStats = async () => {
    try {
      if (user) {
        const { count } = await supabase
          .from('location_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setLocationCount(count || 0);

        // Get last location
        const { data: lastLocationData } = await supabase
          .from('location_history')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (lastLocationData && lastLocationData.length > 0) {
          setLastLocation(lastLocationData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading location stats:', error);
    }
  };

  const handleTrackingToggle = async () => {
    console.log('🔄 Tracking toggle pressed. Current status:', isTracking);
    
    if (!user) {
      console.log('❌ No user found');
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (isTracking) {
      console.log('🛑 Stopping location tracking...');
      // Stop tracking
      await locationTracker.stopTracking();
      setIsTracking(false);
      
      // Update user's location_status to 0 (inactive)
      console.log('📝 Updating user location_status to inactive...');
      await supabase
        .from('users')
        .update({ location_status: 0 })
        .eq('id', user.id);
      
      console.log('✅ Location tracking stopped');
      Alert.alert('Success', 'Location tracking stopped');
    } else {
      console.log('▶️ Starting location tracking...');
      // Start tracking
      try {
        const success = await locationTracker.startTracking(user.id, user.email);
        console.log('📍 Location tracking start result:', success);
        
        if (success) {
          setIsTracking(true);
          
          // Update user's location_status to 1 (active)
          console.log('📝 Updating user location_status to active...');
          await supabase
            .from('users')
            .update({ location_status: 1 })
            .eq('id', user.id);
          
          console.log('✅ Location tracking started successfully');
          Alert.alert('Success', 'Location tracking started');
        } else {
          console.log('❌ Failed to start location tracking');
          Alert.alert('Error', 'Failed to start location tracking. Please check your location permissions.');
        }
      } catch (error) {
        console.error('❌ Tracking error:', error);
        Alert.alert(
          'Location Permission Required', 
          'Please enable location permissions in your device settings to use location tracking.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // This would open device settings in a real app
              console.log('Should open device settings');
            }}
          ]
        );
      }
    }
  };

  const handleSyncOffline = async () => {
    try {
      await locationTracker.syncOfflineLocations();
      setOfflineCount(0);
      Alert.alert('Success', 'Offline locations synced');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync offline locations');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await locationTracker.stopTracking();
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  const handleCreateProfile = async () => {
    try {
      console.log('🔄 Manually creating user profile...');
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email, // Include email from auth user
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          user_type: user.user_metadata?.user_type || 'user',
          location_status: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user profile:', error);
        Alert.alert('Error', 'Failed to create user profile: ' + error.message);
      } else {
        console.log('✅ User profile created successfully:', data);
        Alert.alert('Success', 'User profile created successfully!');
        // Reload the page or refresh user data
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reload user profile or dashboard data here
    await loadLocationStats(); // Assuming loadLocationStats is the correct function to refresh
    setRefreshing(false);
  };

  // Filtered groups and areas for search
  const filteredGroups = (userProfile?.user_type === 'admin' || userProfile?.user_type === 'superadmin' ? allGroups : userGroups)
    .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const filteredAreas = groupAreas.filter(a => a.area_name.toLowerCase().includes(areaSearch.toLowerCase()));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Information</Text>
        
        {/* Show warning if user profile is missing */}
        {!userProfile && user && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>⚠️ User profile not found</Text>
            <Text style={styles.warningSubtext}>Click below to create your profile</Text>
            <TouchableOpacity
              style={styles.createProfileButton}
              onPress={handleCreateProfile}
            >
              <Text style={styles.createProfileButtonText}>Create User Profile</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {userProfile?.profile_photo_data && (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${userProfile.profile_photo_data}` }}
              style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }}
            />
          </View>
        )}

        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Name:</Text>
          <Text style={styles.userValue}>{userProfile?.name || 'Not set'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Email:</Text>
          <Text style={styles.userValue}>{userProfile?.email || user?.email || 'Loading...'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>User Type:</Text>
          <Text style={styles.userValue}>{userProfile?.user_type || 'user'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Location Status:</Text>
          <Text style={[styles.userValue, { color: userProfile?.location_status === 1 ? '#34C759' : '#FF3B30' }]}>
            {userProfile?.location_status === 1 ? 'Active' : 'Inactive'}
          </Text>
        </View>
        
        {/* Manual Profile Creation Button */}
        {!userProfile && user && (
          <TouchableOpacity
            style={styles.createProfileButton}
            onPress={handleCreateProfile}
          >
            <Text style={styles.createProfileButtonText}>Create User Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tracking Control */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Tracking</Text>
        <View style={styles.trackingControl}>
          <Text style={styles.trackingLabel}>
            {userProfile?.location_status === 1 ? 'Tracking Active' : 'Tracking Inactive'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncOffline}
          disabled={offlineCount === 0}
        >
          <Text style={styles.syncButtonText}>
            Sync Offline Data ({offlineCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{locationCount}</Text>
            <Text style={styles.statLabel}>Total Locations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{offlineCount}</Text>
            <Text style={styles.statLabel}>Offline Data</Text>
          </View>
        </View>
      </View>

      {/* Last Location */}
      {lastLocation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Known Location</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Coordinates:</Text>
            <Text style={styles.locationValue}>
              {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
            </Text>
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Accuracy:</Text>
            <Text style={styles.locationValue}>
              {lastLocation.accuracy ? `${Math.round(lastLocation.accuracy)}m` : 'N/A'}
            </Text>
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Time:</Text>
            <Text style={styles.locationValue}>
              {new Date(lastLocation.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {(userProfile?.user_type === 'user' || userProfile?.user_type === 'admin' || userProfile?.user_type === 'superadmin') && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Select Group</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 8, marginBottom: 8 }}
            placeholder="Search Groups"
            value={groupSearch}
            onChangeText={setGroupSearch}
          />
          <Picker
            selectedValue={selectedGroupId}
            onValueChange={setSelectedGroupId}
            style={{ marginBottom: 16 }}
          >
            <Picker.Item label="Select Group" value={null} />
            {filteredGroups.map(group => (
              <Picker.Item key={group.id} label={group.name} value={group.id} />
            ))}
          </Picker>
          {selectedGroupId && (
            <>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Select Area</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 8, marginBottom: 8 }}
                placeholder="Search Areas"
                value={areaSearch}
                onChangeText={setAreaSearch}
              />
              <Picker
                selectedValue={selectedAreaId}
                onValueChange={setSelectedAreaId}
                style={{ marginBottom: 16 }}
              >
                <Picker.Item label="Select Area" value={null} />
                {filteredAreas.map(area => (
                  <Picker.Item key={area.id} label={area.area_name} value={area.id} />
                ))}
              </Picker>
            </>
          )}
          {areaDetails && (
            <View style={{ backgroundColor: '#F2F2F7', borderRadius: 8, padding: 12, marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Area Details</Text>
              <Text>Name: {areaDetails.area_name}</Text>
              <Text>Type: {areaDetails.area_type}</Text>
              <Text>PIN: {areaDetails.pin_code}</Text>
              <Text>State: {areaDetails.state}</Text>
              <Text>Country: {areaDetails.country}</Text>
              {areaDetails.description && <Text>Description: {areaDetails.description}</Text>}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  userValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  trackingControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackingLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  locationInfo: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  locationValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  createProfileButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 