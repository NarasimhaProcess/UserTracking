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
  import RealtimeCollaboration from './src/components/RealtimeCollaboration';
  import GlobalChatAndPresence from './src/components/GlobalChatAndPresence';
  import VideoCallScreen from './src/screens/VideoCallScreen'; // Added VideoCallScreen import
  import Constants from 'expo-constants'; // Added Constants import

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
          {(props) => <ProfileScreen {...props} user={user} userProfile={userProfile} reloadUserProfile={() =>
  loadUserProfile(user.id)} />}
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
    const [showGlobalChat, setShowGlobalChat] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null); // New state for selected group
    const [expoPushToken, setExpoPushToken] = useState('');
    const notificationListener = React.useRef();
    const responseListener = React.useRef();

    // Detect if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

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
                }\n              setIsAuthenticated(true);\n            }\n\n          } else if (event ===
  'SIGNED_OUT') {\n            setUser(null);\n            setUserProfile(null);\n
  setIsAuthenticated(false);\n            // Clear biometric data on sign out\n            await
  AsyncStorage.removeItem('BIOMETRICS_ENABLED');\n            await AsyncStorage.removeItem('BIOMETRICS_EMAIL');
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

        let alertMessage = Welcome back!\nYour last login was: ${lastLogin}.;

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
            alertMessage += \n\nYour total collections in the current area (5km radius) are: ${total.toFixed(2)}.;
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

    const fetchUserGroups = async (userId, userType) => {
      try {
        let groups = [];
        if (userType === 'superadmin') {
          // Fetch all groups for superadmin
          const { data, error } = await supabase
            .from('groups')
            .select('id, name');
          if (error) {
            console.error('❌ Error fetching all groups for superadmin:', error);
            return [];
          }
          groups = data;
        } else {
          // Fetch group_ids from user_groups table for the given userId
          const { data: userGroupLinks, error: userGroupError } = await supabase
            .from('user_groups')
            .select('group_id')
            .eq('user_id', userId);

          if (userGroupError) {
            console.error('❌ Error fetching user group links:', userGroupError);
            return [];
          }

          if (!userGroupLinks || userGroupLinks.length === 0) {
            return [];
          }\n        // Extract group_ids\n        const groupIds = userGroupLinks.map(link => link.group_id);\n\n
    // Fetch group details from the groups table\n        const { data, error } = await supabase\n
  .from('groups')\n          .select('id, name')\n          .in('id', groupIds);\n\n        if (error) {\n
  console.error('❌ Error fetching group details:', error);\n          return [];\n        }\n        groups = data;\n
      }\n      return groups; // Returns an array of { id, name } objects\n    } catch (error) {\n
  console.error('❌ Unexpected error in fetchUserGroups:', error);\n      return [];\n    }\n  };\n\n  // Update route
  params when user data changes\n  useEffect(() => {\n    if (isAuthenticated && user && userProfile) {\n
  console.log('🔄 Updating route params with user data:', { user, userProfile });\n      // Automatically start/stop
  tracking based on location_status\n      if (userProfile.location_status === 1) {\n        console.log('🚦
  location_status is 1: Starting location tracking...');\n        locationTracker.startTracking(userProfile.id,
  userProfile.email);\n      } else {\n        console.log('🚦 location_status is 0: Stopping location tracking...');\n
         locationTracker.stopTracking();\n      }\n    }\n  }, [isAuthenticated, user, userProfile]);\n\n  const
  loadUserProfile = async (userId) => {\n    try {\n      console.log('🔍 Loading user profile for userId:', userId);\n
       const { data, error } = await supabase\n        .from('users')\n        .select('')\n        .eq('id', userId)\n
         .single();\n\n      if (error) {\n        console.error('❌ Error loading user profile:', error);\n        \n
        // If user profile doesn't exist, try to create it\n        if (error.code === 'PGRST116') {\n
  console.log('🔄 User profile not found, attempting to create...');\n          await createUserProfile(userId);\n
      return;\n        }\n        return;\n      }\n\n      console.log('✅ User profile loaded successfully:', data);\n
        \n      // Fetch user's groups\n      const userGroups = await fetchUserGroups(userId, data.user_type);\n
  console.log('✅ User groups loaded successfully:', userGroups);\n\n      setUserProfile({ ...data, groups: userGroups
  });\n      \n      // Use the complete user data from users table\n      const userData = {\n        id: data.id,\n
       email: data.email,\n        name: data.name,\n        user_type: data.user_type,\n        location_status:
  data.location_status,\n        ...data\n      };\n      \n      console.log('📱 Setting user data:', userData);\n
   setUser(userData);\n    } catch (error) {\n      console.error('❌ Error loading user profile:', error);\n    }\n
  };\n\n  const createUserProfile = async (userId) => {\n    try {\n      console.log('🔄 Creating user profile for
  userId:', userId);\n      \n      // Get user data from auth\n      const { data: { user } } = await
  supabase.auth.getUser();\n      \n      if (!user) {\n        console.error('❌ No user found in auth');\n
  return;\n      }\n\n      console.log('📧 Auth user email:', user.email);\n      console.log('📝 Auth user metadata:',
   user.user_metadata);\n\n      // Create user profile with email from auth\n      const { data, error } = await
  supabase\n        .from('users')\n        .insert({\n          id: userId,\n          email: user.email, // Add email
  to users table\n          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',\n          user_type:
   user.user_metadata?.user_type || 'user',\n          location_status: 0\n        })\n        .select()\n
  .single();\n\n      if (error) {\n        console.error('❌ Error creating user profile:', error);\n        return;\n
       }\n\n      console.log('✅ User profile created successfully:', data);\n      setUserProfile(data);\n      \n
    // Update user state with the created profile data\n      const userData = {\n        id: data.id,\n        email:
  data.email,\n        name: data.name,\n        user_type: data.user_type,\n        location_status:
  data.location_status,\n        ...data\n      };\n      \n      console.log('📱 Setting user data after creation:',
  userData);\n      setUser(userData);\n    } catch (error) {\n      console.error('❌ Error creating user profile:',
  error);\n    }\n  };\n\n  const checkAuthStatus = async () => {\n    try {\n      console.log('🔍 Checking auth
  status...');\n      const { data: { session } } = await supabase.auth.getSession();\n      if (session) {\n
  console.log('✅ Session found:', session.user);\n        setUser(session.user);\n        await
  loadUserProfile(session.user.id);\n        setIsAuthenticated(true);\n      } else {\n        console.log('❌ No
  session found');\n      }\n    } catch (error) {\n      console.error('❌ Error checking auth status:', error);\n
  }\n  };\n\n  const setupLocationTracker = async () => {\n    try {\n      // Initialize location tracker\n      await
  locationTracker.init();\n    } catch (error) {\n      console.error('Error initializing location tracker:', error);\n
     }\n  };\n\n  const handleAuthSuccess = async (userData, navigation) => {\n    setUser(userData);\n    await
  loadUserProfile(userData.id);\n    setIsAuthenticated(true);\n    setShowCalculatorModal(false); // Ensure calculator
  is hidden on successful auth\n    if (navigation) {\n      navigation.replace('Main');\n    }\n  };\n\n  const
  handleBiometricLogin = async () => {\n    try {\n      const isBiometricsEnabled = await
  AsyncStorage.getItem('BIOMETRICS_ENABLED');\n      const userEmail = await
  AsyncStorage.getItem('BIOMETRICS_EMAIL');\n\n      if (isBiometricsEnabled === 'true' && userEmail) {\n        const {
   success } = await LocalAuthentication.authenticateAsync({\n          promptMessage: 'Log in with your fingerprint or
  Face ID',\n          cancelLabel: 'Use Password',\n        });\n\n        if (success) {\n
  console.log('Biometric authentication successful');\n          // NOTE: This is a simplified login flow.\n          //
   A more secure implementation would use a securely stored refresh token\n          // to get a new session from
  Supabase instead of just loading the profile.\n          const { data: userData, error } = await supabase\n
   .from('users')\n            .select('')\n            .eq('email', userEmail)\n            .single();\n\n          if
  (error || !userData) {\n            console.error('Failed to fetch user profile after biometric login:', error);\n
          Alert.alert('Login Error', 'Could not log you in. Please use your password.');\n            return;\n
   }\n          \n          // We have the user profile, now we can set the app state to authenticated\n
  handleAuthSuccess(userData);\n\n        } else {\n          console.log('Biometric authentication failed or was
  cancelled.');\n        }\n      }\n    } catch (error) {\n      console.error('Error during biometric login attempt:',
   error);\n    }\n  };\n\n  const [showRealtimeCollaboration, setShowRealtimeCollaboration] = useState(false);\n\n  //
  Header component for authenticated screens\n  const renderHeader = (navigation) => ({\n    headerShown:
  isAuthenticated,\n    headerLeft: () => (\n      userProfile?.profile_photo_data ? (\n        <TouchableOpacity
  onPress={() => navigation.navigate('Profile')}>\n          <Image \n            source={{ uri:
  userProfile.profile_photo_data }} \n            style={{ width: 30, height: 30, borderRadius: 15, marginLeft: 15 }} \n
            />\n        </TouchableOpacity>\n      ) : null\n    ),\n    headerTitle: () => null,\n    headerRight: ()
  => (\n      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>\n        <TouchableOpacity
  \n          onPress={() => setShowRealtimeCollaboration(prev => !prev)} \n          style={{ marginRight: 15 }}\n
     >\n          <MaterialIcons \n            name={showRealtimeCollaboration ? \"visibility\" : \"visibility-off\"} \n
              size={24} \n            color=\"#007AFF\" \n          />\n        </TouchableOpacity>\n
  <TouchableOpacity \n          onPress={() => setShowGlobalChat(prev => !prev)} \n          style={{ marginRight: 15
  }}\n        >\n          <MaterialIcons \n            name={showGlobalChat ? \"chat-bubble\" :
  \"chat-bubble-outline\"} \n            size={24} \n            color=\"#007AFF\" \n          />\n
  </TouchableOpacity>\n        <QuickTransactionButton onPress={() => navigation.navigate('QuickTransaction')} />\n
     <TouchableOpacity \n          onPress={() => navigation.navigate('Expenses')} \n          style={{ marginRight: 15
  }}\n        >\n          <MaterialIcons name=\"receipt-long\" size={24} color=\"#007AFF\" />\n
  </TouchableOpacity>\n        <TouchableOpacity onPress={() => setShowCalculatorModal(true)}>\n          <Icon
  name=\"calculator\" size={20} color=\"#007AFF\" />\n        </TouchableOpacity>\n      </View>\n    ),\n  });\n\n  if
  (isLoading) {\n    return (\n      <View style={styles.loadingContainer}>\n        <Text
  style={styles.loadingText}>Loading...</Text>\n      </View>\n    );\n  }\n\n  console.log('App render: isAuthenticated
   =', isAuthenticated);\n  return (\n    <NavigationContainer>\n      <StatusBar style=\"auto\" />\n
  <Stack.Navigator>\n        {!isAuthenticated ? (\n          // Auth screens without header\n          <>\n
  <Stack.Screen \n              name=\"Login\" \n              options={{ headerShown: false }}\n            >\n
        {(props) => (\n                <LoginScreen {...props} onAuthSuccess={handleAuthSuccess} />\n              )}\n
             </Stack.Screen>\n            <Stack.Screen \n              name=\"Signup\" \n              options={{
  headerShown: false }}\n            >\n              {(props) => (\n                <SignupScreen {...props}
  onAuthSuccess={handleAuthSuccess} />\n              )}\n            </Stack.Screen>\n          </>\n        ) : (\n
         // Authenticated screens with header\n          <>\n            <Stack.Screen \n              name=\"Main\" \n
               options={({ navigation }) => renderHeader(navigation, setShowCalculatorModal)}\n            >\n
      {(props) => (\n                <TabNavigator \n                  {...props} \n                  route={{ params: {
   user, userProfile } }}\n                  setShowCalculatorModal={setShowCalculatorModal}\n                />\n
          )}\n            </Stack.Screen>\n            <Stack.Screen \n              name=\"CustomerMap\" \n
    options={({ navigation }) => renderHeader(navigation)}\n            >\n              {(props) => (\n
  <CustomerMapScreen {...props} user={user} userProfile={userProfile} />\n              )}\n
  </Stack.Screen>\n            <Stack.Screen \n              name=\"Expenses\" \n              options={({ navigation })
   => renderHeader(navigation)}\n            >\n              {(props) => (\n                <UserExpensesScreen
  {...props} user={user} userProfile={userProfile} />\n              )}\n            </Stack.Screen>\n
  <Stack.Screen \n              name=\"QuickTransaction\" \n              options={({ navigation }) =>
  renderHeader(navigation)}\n            >\n              {(props) => (\n                <QuickTransactionScreen
  {...props} user={user} />\n              )}\n            </Stack.Screen>\n            <Stack.Screen\n
  name=\"BankTransaction\" \n              options={({ navigation }) => renderHeader(navigation)}\n            >\n
          {(props) => (\n                <BankTransactionScreen {...props} user={user} userProfile={userProfile} />\n
             )}\n            </Stack.Screen>\n            {/* Conditionally render VideoCallScreen */}\n
  {!isExpoGo && (\n              <Stack.Screen \n                name=\"VideoCall\" \n                options={{
  headerShown: false }} // Hide header for full video experience\n              >\n                {(props) => (\n
              <VideoCallScreen {...props} user={user} />\n                )}\n              </Stack.Screen>\n
   )}\n          </>\n        )}\n      </Stack.Navigator>\n      \n      {/* Calculator Modal */}\n
  {console.log('showCalculatorModal before render:', showCalculatorModal)}\n      {isAuthenticated && (\n
  <CalculatorModal \n          isVisible={showCalculatorModal} \n          onClose={() => setShowCalculatorModal(false)}
   \n        />\n      )}\n\n      {/* Real-time collaboration overlay */}\n      {isAuthenticated && user &&
  showRealtimeCollaboration && (\n        <View style={StyleSheet.absoluteFillObject} pointerEvents=\"box-none\">\n
       <RealtimeCollaboration user={user} selectedGroup={selectedGroup} />\n        </View>\n      )}\n\n      {/*
  Global Chat and Presence */}\n      {isAuthenticated && user && showGlobalChat && (\n        <GlobalChatAndPresence \n
            user={user} \n          userProfile={userProfile} \n          selectedGroup={selectedGroup} \n
  setSelectedGroup={setSelectedGroup} \n               />\n      )}\n    </NavigationContainer>\n  );\n}\n\n// Add
  styles\nconst styles = StyleSheet.create({\n  loadingContainer: {\n    flex: 1,\n    justifyContent: 'center',\n
  alignItems: 'center',\n    backgroundColor: 'white',\n  },\n  loadingText: {\n    fontSize: 18,\n    color: '#333',\n
     fontWeight: '500',\n  },\n});"}}