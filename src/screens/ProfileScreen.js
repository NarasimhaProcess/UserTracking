import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../services/supabase';
import { locationTracker } from '../services/locationTracker';
import { Buffer } from 'buffer';

// Utility function to convert BYTEA hex to base64
function hexToBase64(hexString) {
  if (!hexString) return '';
  // Remove all leading backslashes and 'x'
  const hex = hexString.replace(/^\\*x/, '');
  return Buffer.from(hex, 'hex').toString('base64');
}

export default function ProfileScreen({ navigation, user, userProfile, reloadUserProfile }) {
  const [profileImage, setProfileImage] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    backgroundTracking: true,
    highAccuracy: true,
  });
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (userProfile?.profile_photo_data) {
      console.log('profile_photo_data (first 100):', userProfile.profile_photo_data.slice(0, 100));
      const imgUri = `data:image/jpeg;base64,${userProfile.profile_photo_data}`;
      console.log('Profile image URI (first 100):', imgUri.slice(0, 100));
      setProfileImage(imgUri);
    } else {
      setProfileImage(null);
    }
  }, [userProfile]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // setUser(user); // This line is removed as user is now a prop
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      // setUserProfile(data); // This line is removed as userProfile is now a prop
      if (data.profile_photo_data) {
        const base64 = hexToBase64(data.profile_photo_data);
        setProfileImage(`data:image/jpeg;base64,${base64}`);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3, // Lower quality for smaller file
        base64: true, // Get base64 directly
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const uploadImage = async (base64) => {
    try {
      // Update user profile with base64 image data
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_data: base64 })
        .eq('id', user.id);
      if (updateError) {
        throw updateError;
      }
      setProfileImage(`data:image/jpeg;base64,${base64}`); // Use base64 for display
      // Do NOT call reloadUserProfile here to avoid infinite loop
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
      console.error('Upload error:', error);
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
            // The auth state change listener in App.js will handle the navigation
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await locationTracker.stopTracking();
              
              // Delete user data from Supabase
              const { error } = await supabase.auth.admin.deleteUser(user.id);
              
              if (error) {
                Alert.alert('Error', 'Failed to delete account');
                return;
              }

              Alert.alert('Success', 'Account deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
              console.error('Delete account error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSettingToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSyncData = async () => {
    try {
      await locationTracker.syncOfflineLocations();
      Alert.alert('Success', 'Data synced successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data');
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Data',
      'Are you sure you want to clear all location data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('location_history')
                .delete()
                .eq('user_id', user.id);

              if (error) {
                Alert.alert('Error', 'Failed to clear data');
                return;
              }

              Alert.alert('Success', 'Data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Image Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <View style={styles.profileImageContainer}>
          {profileImage && (
            <TouchableOpacity onPress={() => setShowImageModal(true)}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          )}
          {!profileImage && (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>👤</Text>
            </View>
          )}
          <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
            <Text style={styles.changeImageText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <View style={styles.userInfoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{userProfile?.name || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userProfile?.email || user?.email || 'Loading...'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User Type:</Text>
            <Text style={styles.infoValue}>{userProfile?.user_type || 'user'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location Status:</Text>
            <Text style={[styles.infoValue, { color: userProfile?.location_status === 1 ? '#34C759' : '#FF3B30' }]}>
              {userProfile?.location_status === 1 ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{userProfile?.id || user?.id || 'Loading...'}</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={settings.notifications}
              onValueChange={() => handleSettingToggle('notifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={settings.notifications ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Background Tracking</Text>
            <Switch
              value={settings.backgroundTracking}
              onValueChange={() => handleSettingToggle('backgroundTracking')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={settings.backgroundTracking ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>High Accuracy</Text>
            <Switch
              value={settings.highAccuracy}
              onValueChange={() => handleSettingToggle('highAccuracy')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={settings.highAccuracy ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSyncData}>
            <Text style={styles.actionButtonText}>Sync Offline Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleClearData}>
            <Text style={styles.actionButtonText}>Clear Location Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add a modal for large image preview */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPressOut={() => setShowImageModal(false)}
        >
          <Image
            source={{ uri: profileImage }}
            style={{ width: 300, height: 300, borderRadius: 12, resizeMode: 'contain' }}
          />
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: '#fff', padding: 10, borderRadius: 8 }}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImageText: {
    fontSize: 40,
  },
  changeImageButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF9500',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 