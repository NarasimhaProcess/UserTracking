import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import CalculatorModal from './src/components/CalculatorModal';
import { Buffer } from 'buffer';
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
import AreaManagementScreen from './src/screens/AreaManagementScreen';
import CreateCustomerScreen from './src/screens/CreateCustomerScreen';
import AstrologyWebviewScreen from './src/screens/AstrologyWebviewScreen';
import NewsPaperScreen from './src/screens/NewsPaperScreen';
import YouTubeScreen from './src/screens/YouTubeScreen';
import CustomerMapScreen from './src/screens/CustomerMapScreen';
import BirthdayScreen from './src/screens/BirthdayScreen';
import MarriageScreen from './src/screens/MarriageScreen';

// Import services
import { supabase } from './src/services/supabase';
import { locationTracker } from './src/services/locationTracker';


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

function TabNavigator({ route, setShowCalculatorModal }) {
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
        {(props) => <DashboardScreen {...props} user={user} userProfile={userProfile} setShowCalculatorModal={setShowCalculatorModal} />}
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
      {isAdmin && (
        <Tab.Screen 
          name="Area Management" 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>🗺️</Text>
            ),
          }}
        >
          {(props) => <AreaManagementScreen {...props} user={user} userProfile={userProfile} />}
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

  useEffect(() => {
    checkAuthStatus();
    setupLocationTracker();
    
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (session) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setUserProfile(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    await loadUserProfile(userData.id);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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
      <Stack.Navigator screenOptions={({ navigation }) => ({
        headerShown: isAuthenticated, // Only show header if authenticated
        headerLeft: () => (
          userProfile?.profile_photo_data ? (
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image source={{ uri: userProfile.profile_photo_data }} style={{ width: 30, height: 30, borderRadius: 15, marginLeft: 15 }} />
            </TouchableOpacity>
          ) : null
        ),
        headerTitle: () => null,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '600', marginRight: 15 }}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalculatorModal(true)}>
              <Icon name="calculator" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ),
      })}>
        {isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Main" 
              initialParams={{ user, userProfile }}
            >
              {(props) => <TabNavigator {...props} setShowCalculatorModal={setShowCalculatorModal} />}
            </Stack.Screen>
            <Stack.Screen 
              name="CustomerMap" 
              component={CustomerMapScreen}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              initialParams={{ onAuthSuccess: handleAuthSuccess }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              initialParams={{ onAuthSuccess: handleAuthSuccess }}
            />
          </>
        )}
      </Stack.Navigator>
      <CalculatorModal
        isVisible={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#007AFF',
  },
});

registerRootComponent(App); 