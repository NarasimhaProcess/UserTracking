import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import { NetInfoService } from './NetInfoService';
import { OfflineStorageService } from './OfflineStorageService';
import NetInfo from '@react-native-community/netinfo';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define the background task - Only for Native
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }
    if (data) {
      const { locations } = data;
      const latestLocation = locations[0];
      console.log('📍 Background location update received:', latestLocation.coords);

      // Retrieve user info from storage for background updates
      const userId = await OfflineStorageService.getUserId();
      const userEmail = await OfflineStorageService.getUserEmail();

      if (!userId || !userEmail) {
        console.warn('User ID or Email not found in background task. Cannot save location.');
        return;
      }

      const { coords, timestamp } = latestLocation;
      const deviceName = Device.deviceName || 'MobileApp';
      const deviceId = Application.androidId || 'unknownid';
      const deviceInfo = `${deviceName}_${deviceId}`;

      const locationData = {
        user_id: userId,
        user_email: userEmail,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: new Date(timestamp).toISOString(),
        device_name: deviceInfo,
      };

      const isNetworkAvailable = await NetInfoService.isNetworkAvailable();

      if (isNetworkAvailable) {
        try {
          const { error: insertError } = await supabase
            .from('location_history')
            .insert([locationData]);

          if (insertError) {
            console.error('❌ Background: Error inserting into location_history:', insertError);
            await OfflineStorageService.saveOfflineLocation(locationData); // Save if online insert fails
          } else {
            console.log('✅ Background: Location successfully stored in location_history table.');
          }
        } catch (e) {
          console.error('❌ Background: Exception during Supabase insert:', e);
          await OfflineStorageService.saveOfflineLocation(locationData); // Save if exception occurs
        }
      } else {
        await OfflineStorageService.saveOfflineLocation(locationData);
        console.log('💾 Background: Storing location offline due to no network.');
      }
    }
  });
}

class LocationTracker {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.currentUser = null;
    this.currentUserEmail = null;
    this.lastLocation = null;

    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncOfflineLocations();
      }
    });
  }

  async init() {
    console.log('Initializing LocationTracker...');
    // Ensure the background task is registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      console.log('Registering background location task...');
      // TaskManager.defineTask is called outside the class, so we just need to ensure it's registered.
      // No explicit registration call needed here beyond defining it globally.
    }
    console.log('LocationTracker initialized.');
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
    
    // Store user info for background task access
    await OfflineStorageService.saveUserId(userId);
    await OfflineStorageService.saveUserEmail(userEmail);

    // Fetch location_update_interval from users table
    let interval = 30; // default
    if (!await NetInfoService.isNetworkAvailable()) {
        console.warn('Could not fetch location_update_interval, using default 30s');
    } else {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('location_update_interval')
            .eq('id', userId)
            .maybeSingle();
          if (!error && data && data.location_update_interval) {
            interval = data.location_update_interval;
          }
        } catch (e) {
          console.warn('Could not fetch location_update_interval, using default 30s');
        }
    }

    try {
      // Check and request permissions first
      console.log('🔐 Checking location permissions...');
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      let backgroundStatus = 'granted'; // Default for web
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        backgroundStatus = status;
      }
      
      console.log('📱 Permission status - Foreground:', foregroundStatus, 'Background:', backgroundStatus);
      
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission not granted');
        throw new Error('Foreground location permission not granted');
      }
      
      if (Platform.OS !== 'web' && backgroundStatus !== 'granted') {
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
      if (await NetInfoService.isNetworkAvailable()) {
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

      // Start background tracking only on native
      if (Platform.OS !== 'web') {
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
      }

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
      // Stop foreground tracking
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      // Stop background tracking only on native
      if (Platform.OS !== 'web') {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      this.isTracking = false;
      
      // Update users table with latest lat/lon and updated_at, but do NOT set location_status
      if (this.currentUser && this.currentUserEmail && this.lastLocation && await NetInfoService.isNetworkAvailable()) {
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

    const isNetworkAvailable = await NetInfoService.isNetworkAvailable();
    console.log('🌐 Network status:', isNetworkAvailable);

    if (isNetworkAvailable) {
      try {
        console.log('📡 Sending location data to Supabase...');
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
        await OfflineStorageService.saveOfflineLocation(locationData);
      }
    } else {
      // Store offline for later sync
      console.log('💾 Storing location offline for later sync...');
      await OfflineStorageService.saveOfflineLocation(locationData);
    }
    this.lastLocation = location;
  }

  async syncOfflineLocations() {
    const offlineLocations = await OfflineStorageService.getOfflineLocations();
    if (offlineLocations.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from('location_history')
        .insert(offlineLocations);

      if (error) {
        throw error;
      }

      // Clear offline locations
      await OfflineStorageService.clearOfflineLocations();
      
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
}

export const locationTracker = new LocationTracker();