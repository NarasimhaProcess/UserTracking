import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import CalculatorModal from './src/components/CalculatorModal';
import { Buffer } from 'buffer';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}



// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LocationHistoryScreen from './src/screens/LocationHistoryScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminScreen from './src/screens/AdminScreen';

import CreateCustomerScreen from './src/screens/CreateCustomerScreen';
import AstrologyWebviewScreen from './src/screens/AstrologyWebviewScreen';
import NewsPaperScreen from './src/screens/NewsPaperScreen';
import YouTubeScreen from './src/screens/YouTubeScreen';
import CustomerMapScreen from './src/screens/CustomerMapScreen';
import BirthdayScreen from './src/screens/BirthdayScreen';
import MarriageScreen from './src/screens/MarriageScreen';
import UserExpensesScreen from './src/screens/UserExpensesScreen';
import QuickTransactionScreen from './src/screens/QuickTransactionScreen';
import QuickTransactionButton from './src/components/QuickTransactionButton';
import BankTransactionScreen from './src/screens/BankTransactionScreen';

// Import services
import { supabase, initializeSupabase } from './src/services/supabase';
import { locationTracker } from './src/services/locationTracker';
console.log('locationTracker after import:', locationTracker);


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


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function NewsTabNavigator() {
  const WishesTab = createBottomTabNavigator();

  function WishesTabNavigator() {
    return (
      <WishesTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
          },
        }}
      >
        <WishesTab.Screen
          name="Birthday"
          component={BirthdayScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>🎂</Text>
            ),
          }}
        />
        <WishesTab.Screen
          name="Marriage"
          component={MarriageScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>💍</Text>
            ),
          }}
        />
      </WishesTab.Navigator>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tab.Screen
        name="Astrology"
        component={AstrologyWebviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🔮</Text>
          ),
        }}
      />
      <Tab.Screen
        name="News Paper"
        component={NewsPaperScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Videos"
        component={YouTubeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🎥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Wishes"
        component={WishesTabNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>✨</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabNavigator({ route }) {
  // Get user and userProfile from route params or use the state from App.js
  const { user, userProfile } = route.params || {};
  const isAdmin = userProfile?.user_type === 'admin' || userProfile?.user_type === 'superadmin';
  const isCustomer = userProfile?.user_type === 'customer';
  const isUser = userProfile?.user_type === 'user';
  
  console.log('📱 TabNavigator received props:', { user, userProfile });
  console.log('📧 User email from TabNavigator:', user?.email);
  console.log('👤 UserProfile name from TabNavigator:', userProfile?.name);
  console.log('🔐 Is Admin:', isAdmin);
  console.log('🔐 Is Customer:', isCustomer);
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      >
        {(props) => <DashboardScreen {...props} user={user} userProfile={userProfile} />}
      </Tab.Screen>
      {!isCustomer && !isUser && (
        <Tab.Screen 
          name="Map" 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>🗺️</Text>
            ),
          }}
        >
          {(props) => <MapScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}
      {!isCustomer && !isUser && (
        <Tab.Screen 
          name="History" 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📊</Text>
            ),
          }}
        >
          {(props) => <LocationHistoryScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>⚙️</Text>
            ),
          }}
        >
          {(props) => <AdminScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}
      
      <Tab.Screen 
        name="Customers" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👥</Text>
          ),
        }}
      >
        {(props) => <CreateCustomerScreen {...props} user={user} userProfile={userProfile} route={props.route} />}
      </Tab.Screen>
      <Tab.Screen
        name="News"
        component={NewsTabNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📰</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      >
        {(props) => <ProfileScreen {...props} user={user} userProfile={userProfile} reloadUserProfile={() => loadUserProfile(user.id)} />}
      </Tab.Screen>
      
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  useEffect(() => {
    const initializeApp = async () => {
      console.log('Starting app initialization...');
      await initializeSupabase();
      console.log('Supabase initialized, proceeding with auth.');

      

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session);
          if (session) {
            // Only run the welcome logic on initial SIGN_IN
            if (event === 'SIGNED_IN') {
              setUser(session.user);
              const profile = await loadUserProfile(session.user.id);
              setIsAuthenticated(true);
              
              // --- START: Welcome Alert Logic ---
              if (profile) {
                await showWelcomeAlert(session, profile);
              }
              // --- END: Welcome Alert Logic ---

            } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
              // Don't show alert on token refresh, just update user state
              setUser(session.user);
              if (!userProfile) { // Only load profile if it's not already there
                await loadUserProfile(session.user.id);
              }
              setIsAuthenticated(true);
            }

          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserProfile(null);
            setIsAuthenticated(false);
            // Clear biometric data on sign out
            await AsyncStorage.removeItem('BIOMETRICS_ENABLED');
            await AsyncStorage.removeItem('BIOMETRICS_EMAIL');
          }
        }
      );

      await handleBiometricLogin();
      await checkAuthStatus();
      await setupLocationTracker();
      setIsLoading(false);
      console.log('App initialization complete.');

      // --- DEEP LINKING LOGIC ---
      const handleDeepLink = (url) => {
        if (!url) return;
        console.log('Received deep link:', url);
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Found tokens in URL, setting session.');
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error setting session from deep link:', error);
              Alert.alert('Login Error', 'Failed to log in from the confirmation link.');
            } else {
              console.log('Session successfully set from deep link.');
              // The onAuthStateChange listener will handle the rest.
            }
          });
        }
      };

      // Check if the app was opened from a deep link
      Linking.getInitialURL().then(url => {
        if (url) {
          handleDeepLink(url);
        }
      });

      // Listen for incoming deep links while the app is open
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        handleDeepLink(url);
      });
      // --- END DEEP LINKING LOGIC ---

      return () => {
        subscription.unsubscribe();
        linkingSubscription.remove();
      };
    };

    initializeApp();
  }, []);

  const showWelcomeAlert = async (session, profile) => {
    try {
      // 1. Get Last Login Time
      const lastLogin = profile.previous_last_login_at 
        ? new Date(profile.previous_last_login_at).toLocaleString()
        : 'this is your first login!';
      
      let alertMessage = `Welcome back!\nYour last login was: ${lastLogin}.`;

      // 2. Get Area Wise Amount
      const currentLocation = await locationTracker.getCurrentLocation(); // Assuming this function exists
      if (currentLocation) {
        const { coords } = currentLocation;
        const { data: total, error } = await supabase.rpc('get_area_wise_summary', {
          user_id_param: session.user.id,
          latitude_param: coords.latitude,
          longitude_param: coords.longitude,
        });

        if (error) {
          console.error('Error fetching area summary:', error);
        } else {
          alertMessage += `\n\nYour total collections in the current area (5km radius) are: ${total.toFixed(2)}.`;
        }
      }

      Alert.alert('Login Summary', alertMessage, [{ text: 'OK' }]);

      // 3. Update the previous_last_login_at for the next login
      await supabase
        .from('users')
        .update({ previous_last_login_at: session.user.last_sign_in_at })
        .eq('id', session.user.id);

    } catch (error) {
      console.error('Error in showWelcomeAlert:', error);
    }
  };

  // Update route params when user data changes
  useEffect(() => {
    if (isAuthenticated && user && userProfile) {
      console.log('🔄 Updating route params with user data:', { user, userProfile });
      // Automatically start/stop tracking based on location_status
      if (userProfile.location_status === 1) {
        console.log('🚦 location_status is 1: Starting location tracking...');
        locationTracker.startTracking(userProfile.id, userProfile.email);
      } else {
        console.log('🚦 location_status is 0: Stopping location tracking...');
        locationTracker.stopTracking();
      }
    }
  }, [isAuthenticated, user, userProfile]);

  const loadUserProfile = async (userId) => {
    try {
      console.log('🔍 Loading user profile for userId:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading user profile:', error);
        
        // If user profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('🔄 User profile not found, attempting to create...');
          await createUserProfile(userId);
          return;
        }
        return;
      }

      console.log('✅ User profile loaded successfully:', data);
      setUserProfile(data);
      
      // Use the complete user data from users table
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        user_type: data.user_type,
        location_status: data.location_status,
        ...data // Include all fields from users table
      };
      
      console.log('📱 Setting user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  const createUserProfile = async (userId) => {
    try {
      console.log('🔄 Creating user profile for userId:', userId);
      
      // Get user data from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ No user found in auth');
        return;
      }

      console.log('📧 Auth user email:', user.email);
      console.log('📝 Auth user metadata:', user.user_metadata);

      // Create user profile with email from auth
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email, // Add email to users table
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          user_type: user.user_metadata?.user_type || 'user',
          location_status: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user profile:', error);
        return;
      }

      console.log('✅ User profile created successfully:', data);
      setUserProfile(data);
      
      // Update user state with the created profile data
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        user_type: data.user_type,
        location_status: data.location_status,
        ...data
      };
      
      console.log('📱 Setting user data after creation:', userData);
      setUser(userData);
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Session found:', session.user);
        setUser(session.user);
        await loadUserProfile(session.user.id);
        setIsAuthenticated(true);
      } else {
        console.log('❌ No session found');
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupLocationTracker = async () => {
    try {
      // Initialize location tracker
      await locationTracker.init();
    } catch (error) {
      console.error('Error initializing location tracker:', error);
    }
  };

  const handleAuthSuccess = async (userData, navigation) => {
    setUser(userData);
    await loadUserProfile(userData.id);
    setIsAuthenticated(true);
    setShowCalculatorModal(false); // Ensure calculator is hidden on successful auth
    if (navigation) {
      navigation.replace('Main');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const isBiometricsEnabled = await AsyncStorage.getItem('BIOMETRICS_ENABLED');
      const userEmail = await AsyncStorage.getItem('BIOMETRICS_EMAIL');

      if (isBiometricsEnabled === 'true' && userEmail) {
        const { success } = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Log in with your fingerprint or Face ID',
          cancelLabel: 'Use Password',
        });

        if (success) {
          console.log('Biometric authentication successful');
          // NOTE: This is a simplified login flow.
          // A more secure implementation would use a securely stored refresh token
          // to get a new session from Supabase instead of just loading the profile.
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single();

          if (error || !userData) {
            console.error('Failed to fetch user profile after biometric login:', error);
            Alert.alert('Error', 'Could not log you in. Please use your password.');
            return;
          }
          
          // We have the user profile, now we can set the app state to authenticated
          handleAuthSuccess(userData);

        } else {
          console.log('Biometric authentication failed or was cancelled.');
        }
      }
    } catch (error) {
      console.error('Error during biometric login attempt:', error);
    }
  };

  // Header component for authenticated screens
  const renderHeader = (navigation) => ({
    headerShown: isAuthenticated,
    headerLeft: () => (
      userProfile?.profile_photo_data ? (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image 
            source={{ uri: userProfile.profile_photo_data }} 
            style={{ width: 30, height: 30, borderRadius: 15, marginLeft: 15 }} 
          />
        </TouchableOpacity>
      ) : null
    ),
    headerTitle: () => null,
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
        <QuickTransactionButton onPress={() => navigation.navigate('QuickTransaction')} />
        <TouchableOpacity 
          onPress={() => navigation.navigate('Expenses')} 
          style={{ marginRight: 15 }}
        >
          <MaterialIcons name="receipt-long" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCalculatorModal(true)}>
          <Icon name="calculator" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    ),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        {!isAuthenticated ? (
          // Auth screens without header
          <>
            <Stack.Screen 
              name="Login" 
              options={{ headerShown: false }}
            >
              {(props) => (
                <LoginScreen {...props} onAuthSuccess={handleAuthSuccess} />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="Signup" 
              options={{ headerShown: false }}
            >
              {(props) => (
                <SignupScreen {...props} onAuthSuccess={handleAuthSuccess} />
              )}
            </Stack.Screen>
          </>
        ) : (
          // Authenticated screens with header
          <>
            <Stack.Screen 
              name="Main" 
              options={({ navigation }) => renderHeader(navigation, setShowCalculatorModal)}
            >
              {(props) => (
                <TabNavigator 
                  {...props} 
                  route={{ params: { user, userProfile } }}
                  setShowCalculatorModal={setShowCalculatorModal}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="CustomerMap" 
              options={({ navigation }) => renderHeader(navigation)}
            >
              {(props) => (
                <CustomerMapScreen {...props} user={user} userProfile={userProfile} />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="Expenses" 
              options={({ navigation }) => renderHeader(navigation)}
            >
              {(props) => (
                <UserExpensesScreen {...props} user={user} userProfile={userProfile} />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="QuickTransaction" 
              options={({ navigation }) => renderHeader(navigation)}
            >
              {(props) => (
                <QuickTransactionScreen {...props} user={user} />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="BankTransaction" 
              options={({ navigation }) => renderHeader(navigation)}
            >
              {(props) => (
                <BankTransactionScreen {...props} user={user} userProfile={userProfile} />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
      
      {/* Calculator Modal */}
      {console.log('showCalculatorModal before render:', showCalculatorModal)}
      {isAuthenticated && (
        <CalculatorModal 
          isVisible={showCalculatorModal} 
          onClose={() => setShowCalculatorModal(false)} 
        />
      )}
    </NavigationContainer>
  );
}

// Add styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 18,
    color: '#333333',
    fontWeight: '500',
  },
});