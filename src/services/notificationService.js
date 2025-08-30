import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

// Sets how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(user) { // Added user parameter
  let token;
  console.log('Notification Service: registerForPushNotificationsAsync called.'); // NEW LOG

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    console.log('Notification Service: Checking device permissions.'); // NEW LOG
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('Notification Service: Requesting permissions.'); // NEW LOG
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      console.log('Notification permissions not granted. Final status:', finalStatus); // Added log
      return;
    }
    console.log('Notification Service: Permissions granted. Final status:', finalStatus); // NEW LOG

    // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS project ID is automatically configured in eas.json
    const projectId = Constants.expoConfig.extra.eas.projectId;
    console.log(
      'Using projectId for push token:',
      projectId,
      'from Constants.expoConfig.extra.eas.projectId'
    ); // Added log, clarified source
    
    try { // Added try-catch around token retrieval
      const expoTokenObject = await Notifications.getExpoPushTokenAsync({ projectId });
      token = expoTokenObject.data; // Keep Expo token for logging if needed
      const rawDeviceToken = expoTokenObject.devicePushToken; // Get raw device token
      console.log('Expo Push Token obtained:', token);
      console.log('Raw Device Push Token obtained:', rawDeviceToken); // NEW LOG

      // --- NEW LOGIC TO SAVE TOKEN TO SUPABASE ---
      if (user && rawDeviceToken) {
        console.log('Attempting to upsert push token for user:', user.id, 'token:', rawDeviceToken);
        const { error } = await supabase
          .from('user_push_tokens')
          .upsert(
            { user_id: user.id, push_token: rawDeviceToken }, // Use rawDeviceToken
            { onConflict: ['user_id'] } // Update if user_id already exists
          );

        if (error) {
          console.error('Error saving push token to Supabase:', error);
          alert('Error saving push token to database: ' + error.message); // NEW ALERT
        } else {
          console.log('Push token saved to Supabase successfully.');
        }
      } else {
        console.log(
          'Skipping push token upsert: user or token is missing. User:',
          user,
          'Token:',
          rawDeviceToken
        );
      }
      // --- END NEW LOGIC ---
    } catch (tokenError) {
      console.error('Error getting Expo Push Token:', tokenError); // NEW LOG
      alert('Error getting push token. Check your EAS project ID and Firebase setup.'); // NEW ALERT
      return;
    }

    return token; // ✅ Now correctly inside function
  }
}
