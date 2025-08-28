
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      console.log('Notification permissions not granted. Final status:', finalStatus); // Added log
      return;
    }

    // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS project ID is automatically configured in eas.json
    const projectId = Constants.expoConfig.extra.eas.projectId;
    console.log('Using projectId for push token:', projectId); // Added log
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token obtained:', token);

  // --- NEW LOGIC TO SAVE TOKEN TO SUPABASE ---
    // const { data: { user } } = await supabase.auth.getUser(); // This line is removed

    if (user && token) {
      console.log('Attempting to upsert push token for user:', user.id, 'token:', token);
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          { user_id: user.id, push_token: token },
          { onConflict: ['user_id'] } // Update if user_id already exists
        );

      if (error) {
        console.error('Error saving push token to Supabase:', error);
      } else {
        console.log('Push token saved to Supabase successfully.');
      }
    } else {
      console.log('Skipping push token upsert: user or token is missing. User:', user, 'Token:', token);
    }
    // --- END NEW LOGIC ---
  } else {
    alert('Must use physical device for Push Notifications');
    console.log('Not on a physical device, skipping push notification registration.');
  }

  return token;
}
