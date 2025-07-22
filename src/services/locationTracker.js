import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let Storage;
if (Platform.OS === 'web') {
  Storage = {
    getItem: async (key) => window.localStorage.getItem(key),
    setItem: async (key, value) => window.localStorage.setItem(key, value),
    removeItem: async (key) => window.localStorage.removeItem(key),
  };
} else {
  Storage = require('@react-native-async-storage/async-storage').default;
}

const BACKGROUND_LOCATION_TASK = 'background-location-tracking';
const OFFLINE_LOCATIONS_KEY = 'offline_locations';

class LocationTracker {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.currentUser = null;
    this.currentUserEmail = null;
    this.offlineLocations = [];
    this.lastLocation = null;
  }

  async init() {
    console.log('🔧 Initializing location tracker...');
    
    // Request permissions
    console.log('🔐 Requesting location permissions...');
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    console.log('📱 Initial permission status - Foreground:', foregroundStatus, 'Background:', backgroundStatus);
    
    if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
      console.log('⚠️ Location permissions not granted - Foreground:', foregroundStatus, 'Background:', backgroundStatus);
      return false;
    }

    // Setup background task
    console.log('🔧 Setting up background task...');
    this.setupBackgroundTask();
    
    // Setup notifications (optional for Expo Go)
    try {
      console.log('🔔 Setting up notifications...');
      await this.setupNotifications();
    } catch (error) {
      console.log('⚠️ Notifications setup skipped:', error.message);
    }
    
    // Load offline locations
    console.log('📦 Loading offline locations...');
    await this.loadOfflineLocations();
    
    console.log('✅ Location tracker initialization complete');
    return true;
  }

  setupBackgroundTask() {
    console.log('🔧 Setting up background location task...');
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      console.log('🔄 Background task triggered:', new Date().toISOString());
      
      if (error) {
        console.error('❌ Background location task error:', error);
        return;
      }
      
      if (data) {
        console.log('📍 Background task data received:', data);
        const { locations } = data;
        if (locations && locations.length > 0) {
          // Always load user info from Storage
          const userId = await Storage.getItem('user_id');
          const userEmail = await Storage.getItem('user_email');
          if (userId && userEmail) {
            locationTracker.handleLocationUpdateWithUser(locations[0], userId, userEmail);
          } else {
            console.warn('No user info found in Storage for background location update');
          }
        } else {
          console.log('⚠️ No locations in background task data');
        }
      } else {
        console.log('⚠️ No data in background task');
      }
    });
    console.log('✅ Background task setup complete');
  }

  async setupNotifications() {
    // Notifications are not supported in Expo Go with SDK 53
    console.log('Notifications disabled for Expo Go compatibility');
  }

  async startTracking(userId, userEmail) {
    console.log('🚀 Starting location tracking for user:', userId);
    
    if (this.isTracking) {
      console.log('⚠️ Location tracking already active');
      return true;
    }

    this.currentUser = userId;
    this.currentUserEmail = userEmail;
    // Persist user info for background task
    await Storage.setItem('user_id', String(userId));
    await Storage.setItem('user_email', String(userEmail));
    
    // Fetch location_update_interval from users table
    let interval = 30; // default
    try {
      const { data, error } = await supabase
        .from('users')
        .select('location_update_interval')
        .eq('id', userId)
        .single();
      if (!error && data && data.location_update_interval) {
        interval = data.location_update_interval;
      }
    } catch (e) {
      console.warn('Could not fetch location_update_interval, using default 30s');
    }

    try {
      // Check and request permissions first
      console.log('🔐 Checking location permissions...');
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      console.log('📱 Permission status - Foreground:', foregroundStatus, 'Background:', backgroundStatus);
      
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission not granted');
        throw new Error('Foreground location permission not granted');
      }
      
      if (backgroundStatus !== 'granted') {
        console.error('❌ Background location permission not granted');
        throw new Error('Background location permission not granted');
      }

      // Check if location services are enabled
      console.log('📍 Checking if location services are enabled...');
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log('📍 Location services enabled:', isEnabled);
      
      if (!isEnabled) {
        console.error('❌ Location services are disabled');
        throw new Error('Location services are disabled. Please enable location services in your device settings.');
      }

      // Update users table with location_status = 1 (active)
      console.log('📝 Updating users table - setting location_status to active...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ location_status: 1 })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating users table:', updateError);
      } else {
        console.log('✅ Users table updated - location_status set to active');
      }

      // Start foreground tracking with custom interval
      console.log('🎯 Starting foreground location tracking...');
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: interval * 1000, // use custom interval
          distanceInterval: 10, // 10 meters
          showsBackgroundLocationIndicator: true,
        },
        this.handleLocationUpdate.bind(this)
      );
      console.log('✅ Foreground tracking started');

      // Start background tracking with custom interval
      console.log('🎯 Starting background location tracking...');
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: interval * 1000, // use custom interval
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: "Location Tracking",
          notificationBody: `Tracking your location every ${interval} seconds`,
          notificationColor: "#007AFF",
        },
        activityType: Location.ActivityType.FITNESS,
        showsBackgroundLocationIndicator: true,
      });
      console.log('✅ Background tracking started');

      this.isTracking = true;
      console.log(`🎉 Location tracking started - recording every ${interval} seconds`);
      
      // Send notification
      await this.sendNotification('Location tracking started', `Your location is now being tracked every ${interval} seconds`);
      
      return true;
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      return false;
    }
  }

  async stopTracking() {
    if (!this.isTracking) {
      console.log('Location tracking not active');
      return;
    }

    try {
      // Update users table with latest lat/lon and updated_at, but do NOT set location_status
      if (this.currentUser && this.lastLocation) {
        const { coords, timestamp } = this.lastLocation;
        const deviceName = Device.deviceName || 'MobileApp';
        const deviceId = Application.androidId || 'unknownid';
        const deviceInfo = `${deviceName}_${deviceId}`;
        console.log('📝 Updating users table with last known location on stopTracking...');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            latitude: coords.latitude,
            longitude: coords.longitude,
            device_name: deviceInfo,
            updated_at: new Date(timestamp).toISOString(),
          })
          .eq('email', this.currentUserEmail);
        if (updateError) {
          console.error('❌ Error updating users table:', updateError);
        } else {
          console.log('✅ Users table updated with last known location');
        }
      }

      // Stop foreground tracking
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      // Stop background tracking
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

      this.isTracking = false;
      this.currentUser = null;
      this.currentUserEmail = null;
      this.lastLocation = null;
      console.log('Location tracking stopped');
      // Send notification
      await this.sendNotification('Location tracking stopped', 'Your location is no longer being tracked');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  async handleLocationUpdate(location) {
    console.log('📍 Location update received:', new Date().toISOString());
    const { coords, timestamp } = location;
    
    const deviceName = Device.deviceName || 'MobileApp';
    const deviceId = Application.androidId || 'unknownid';
    const deviceInfo = `${deviceName}_${deviceId}`;
    
    const locationData = {
      user_id: this.currentUser,
      user_email: this.currentUserEmail,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(timestamp).toISOString(),
      device_name: deviceInfo,
      // location_status removed
    };

    console.log('📍 Processing location data:', {
      user_id: locationData.user_id,
      user_email: locationData.user_email,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy,
      timestamp: locationData.timestamp
    });

    if (!this.currentUser || !this.currentUserEmail) {
      console.error('User or user email is missing, cannot insert location history');
      return;
    }

    try {
      // Insert into location_history table
      const { error } = await supabase
        .from('location_history')
        .insert([
          {
            user_id: this.currentUser,
            user_email: this.currentUserEmail,
            latitude: coords.latitude,
            longitude: coords.longitude,
            device_name: deviceInfo,
            accuracy: coords.accuracy,
            timestamp: new Date(timestamp).toISOString(),
          }
        ]);

      if (error) {
        console.error('❌ Error inserting into location_history:', error);
        throw error;
      }

      console.log('✅ Location successfully stored in location_history table:', new Date().toISOString());
      
      // Also update the users table with current location (match HTML logic)
      if (this.currentUser) {
        console.log('📝 Updating users table with current location...');
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            latitude: coords.latitude,
            longitude: coords.longitude,
            device_name: deviceInfo,
            updated_at: new Date(timestamp).toISOString(),
            location_status: 1,
          })
          .eq('email', this.currentUserEmail);

        if (userUpdateError) {
          console.error('❌ Error updating users table:', userUpdateError);
        } else {
          console.log('✅ Users table updated with current location');
        }
      }
      
    } catch (error) {
      console.error('❌ Error sending location to Supabase:', error);
      
      // Store offline for later sync
      console.log('💾 Storing location offline for later sync...');
      await this.storeOfflineLocation(locationData);
    }
    this.lastLocation = location;
  }

  async storeOfflineLocation(locationData) {
    this.offlineLocations.push(locationData);
    await Storage.setItem(OFFLINE_LOCATIONS_KEY, JSON.stringify(this.offlineLocations));
    console.log('Location stored offline');
  }

  async loadOfflineLocations() {
    try {
      const stored = await Storage.getItem(OFFLINE_LOCATIONS_KEY);
      if (stored) {
        this.offlineLocations = JSON.parse(stored);
        console.log('Loaded offline locations:', this.offlineLocations.length);
      }
    } catch (error) {
      console.error('Error loading offline locations:', error);
    }
  }

  async syncOfflineLocations() {
    if (this.offlineLocations.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from('location_history')
        .insert(this.offlineLocations);

      if (error) {
        throw error;
      }

      // Clear offline locations
      this.offlineLocations = [];
      await Storage.removeItem(OFFLINE_LOCATIONS_KEY);
      
      console.log('Offline locations synced successfully');
      
    } catch (error) {
      console.error('Error syncing offline locations:', error);
    }
  }

  async sendNotification(title, body) {
    // Notifications are not supported in Expo Go with SDK 53
    console.log('Notification would be sent:', title, body);
  }

  getTrackingStatus() {
    return this.isTracking;
  }

  getOfflineLocationsCount() {
    return this.offlineLocations.length;
  }

  handleLocationUpdateWithUser(location, userId, userEmail) {
    this.currentUser = userId;
    this.currentUserEmail = userEmail;
    this.handleLocationUpdate(location);
  }
}

export const locationTracker = new LocationTracker(); 