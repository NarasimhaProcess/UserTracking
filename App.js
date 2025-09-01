import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import CalculatorModal from './src/components/CalculatorModal';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RealtimeCollaboration from './src/components/RealtimeCollaboration';
import GlobalChatAndPresence from './src/components/GlobalChatAndPresence';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

// Screens
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

// Services
import { supabase } from './src/services/supabaseClient';
import { locationTracker } from './src/services/locationTracker';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


// ---------------- News Tab Navigator ----------------
function NewsTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Tab.Screen
        name="Newspapers"
        component={NewsPaperScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📰</Text>,
        }}
      />
      <Tab.Screen
        name="Astrology"
        component={AstrologyWebviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🔮</Text>,
        }}
      />
      <Tab.Screen
        name="Marriage"
        component={MarriageScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>💒</Text>,
        }}
      />
      <Tab.Screen
        name="Birthday"
        component={BirthdayScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🎂</Text>,
        }}
      />
      <Tab.Screen
        name="Videos"
        component={YouTubeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>▶️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------- Tab Navigator ----------------

function TabNavigator({ route }) {
  const { user, userProfile } = route.params || {};
  const isAdmin = userProfile?.user_type === 'admin' || userProfile?.user_type === 'superadmin';
  const isCustomer = userProfile?.user_type === 'customer';
  const isUser = userProfile?.user_type === 'user';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🏠</Text>,
        }}
      >
        {(props) => <DashboardScreen {...props} user={user} userProfile={userProfile} />}
      </Tab.Screen>

      {!isCustomer && !isUser && (
        <Tab.Screen
          name="Map"
          options={{
            tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🗺️</Text>,
          }}
        >
          {(props) => <MapScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}

      {!isCustomer && !isUser && (
        <Tab.Screen
          name="History"
          options={{
            tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📊</Text>,
          }}
        >
          {(props) => <LocationHistoryScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}

      {isAdmin && (
        <Tab.Screen
          name="Admin"
          options={{
            tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>⚙️</Text>,
          }}
        >
          {(props) => <AdminScreen {...props} user={user} userProfile={userProfile} />}
        </Tab.Screen>
      )}

      <Tab.Screen
        name="Customers"
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👥</Text>,
        }}
      >
        {(props) => <CreateCustomerScreen {...props} user={user} userProfile={userProfile} />}
      </Tab.Screen>

      <Tab.Screen
        name="News"
        component={NewsTabs}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📰</Text>,
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👤</Text>,
        }}
      >
        {(props) => <ProfileScreen {...props} user={user} userProfile={userProfile} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}


// ---------------- App ----------------
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showRealtimeCollaboration, setShowRealtimeCollaboration] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

 // 🔔 Push notifications
useEffect(() => {
  const registerNotifications = async () => {
    if (user) {
      try {
        await registerForPushNotificationsAsync(user);
      } catch (error) {
        console.error('❌ Error in registerForPushNotificationsAsync:', error);
      }
    }
  };
  registerNotifications();
}, [user]);

  // ---------------- Initialization ----------------
  useEffect(() => {
    const initializeApp = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session) {
            if (event === 'SIGNED_IN') {
              setUser(session.user);
              const profile = await loadUserProfile(session.user.id);
              setIsAuthenticated(true);
            }
          } else {
            setUser(null);
            setUserProfile(null);
            setIsAuthenticated(false);
          }
        }
      );

      await checkAuthStatus();
      await locationTracker.init();
      setIsLoading(false);

      return () => subscription.unsubscribe();
    };
    initializeApp();
  }, []);

  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) {
      setUserProfile(data);
      return data;
    }
  };

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      await loadUserProfile(session.user.id);
      setIsAuthenticated(true);
    }
  };

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    await loadUserProfile(userData.id);
    setIsAuthenticated(true);
  };

  // ---------------- Header ----------------
  const renderHeader = (navigation) => ({
    headerShown: true,
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
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
        <TouchableOpacity onPress={() => setShowRealtimeCollaboration(prev => !prev)} style={{ marginRight: 15 }}>
          <MaterialIcons name={showRealtimeCollaboration ? "visibility" : "visibility-off"} size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowGlobalChat(prev => !prev)} style={{ marginRight: 15 }}>
          <MaterialIcons name={showGlobalChat ? "chat-bubble" : "chat-bubble-outline"} size={24} color="#007AFF" />
        </TouchableOpacity>
        <QuickTransactionButton onPress={() => navigation.navigate('QuickTransaction')} />
        <TouchableOpacity onPress={() => navigation.navigate('Expenses')} style={{ marginRight: 15 }}>
          <MaterialIcons name="receipt-long" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCalculatorModal(true)}>
          <Icon name="calculator" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    ),
  });

  // ---------------- Render ----------------
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
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onAuthSuccess={handleAuthSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="Signup" options={{ headerShown: false }}>
              {(props) => <SignupScreen {...props} onAuthSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              options={({ navigation }) => renderHeader(navigation)}
            >
              {(props) => (
                <TabNavigator {...props} route={{ params: { user, userProfile } }} />
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerMap">
              {(props) => <CustomerMapScreen {...props} user={user} userProfile={userProfile} />}
            </Stack.Screen>
            <Stack.Screen name="Expenses">
              {(props) => <UserExpensesScreen {...props} user={user} userProfile={userProfile} />}
            </Stack.Screen>
            <Stack.Screen name="QuickTransaction">
              {(props) => <QuickTransactionScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="BankTransaction">
              {(props) => <BankTransactionScreen {...props} user={user} userProfile={userProfile} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>

      {isAuthenticated && (
        <CalculatorModal isVisible={showCalculatorModal} onClose={() => setShowCalculatorModal(false)} />
      )}

      {isAuthenticated && user && showRealtimeCollaboration && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <RealtimeCollaboration user={user} selectedGroup={selectedGroup} />
        </View>
      )}

      {isAuthenticated && user && showGlobalChat && (
        <GlobalChatAndPresence
          user={user}
          userProfile={userProfile}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
        />
      )}
    </NavigationContainer>
  );
}

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
