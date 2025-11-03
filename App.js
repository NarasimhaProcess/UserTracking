import 'react-native-get-random-values';
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import CalculatorModal from './src/components/CalculatorModal';
import RealtimeCollaboration from './src/components/RealtimeCollaboration';
import GlobalChatAndPresence from './src/components/GlobalChatAndPresence';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import * as SecureStore from 'expo-secure-store';

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

import QuickTransactionButton from './src/components/QuickTransactionButton';
import QuickTransactionScreen from './src/screens/QuickTransactionScreen';
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
  const { user, userProfile, handleLogout } = route.params || {};
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
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📰</Text>,
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👤</Text>,
        }}
      >
        {(props) => <ProfileScreen {...props} user={user} userProfile={userProfile} onLogout={handleLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}


// ---------------- App ----------------
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showRealtimeCollaboration, setShowRealtimeCollaboration] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const user = session?.user;
  const isAuthenticated = !!session;

  const memoizedCollaboration = useMemo(() => {
    if (!user) return null;
    return <RealtimeCollaboration user={user} userProfile={userProfile} />
  }, [user, userProfile]);

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
      await loadSession();
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          console.log('onAuthStateChange event:', _event);
          console.log('onAuthStateChange session:', session);
          if (session) {
            await SecureStore.setItemAsync('userSession', JSON.stringify(session));
            setSession(session);
            await loadUserProfile(session.user.id);
          } else {
            await SecureStore.deleteItemAsync('userSession');
            setSession(null);
            setUserProfile(null);
            // Stop tracking when user logs out
            await locationTracker.stopTracking();
          }
        }
      );

      setIsLoading(false);

      return () => subscription.unsubscribe();
    };
    initializeApp();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = await SecureStore.getItemAsync('userSession');
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        setSession(parsedSession);
        if (parsedSession?.user?.id) {
          await loadUserProfile(parsedSession.user.id);
        }
      }
    } catch (error) {
      console.error('Failed to load session from secure store', error);
    }
  };

  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) {
      const groups = await fetchUserGroups(data.id, data.user_type);
      const profileWithGroups = { ...data, groups };
      setUserProfile(profileWithGroups);
      return profileWithGroups;
    }
  };

  const fetchUserGroups = async (userId, userType) => {
    try {
      if (userType === 'superadmin') {
        const { data: allGroups, error: allGroupsError } = await supabase
          .from('groups')
          .select('id, name');
        if (allGroupsError) {
          console.error('❌ Error fetching all groups for superadmin:', allGroupsError);
          return [];
        }
        return allGroups;
      } else {
        const { data: userGroupLinks, error: userGroupLinkError } = await supabase
          .from('user_groups')
          .select('group_id')
          .eq('user_id', userId);

        if (userGroupLinks || userGroupLinks.length === 0) {
          return [];
        }

        const groupIds = userGroupLinks.map(link => link.group_id);
        const { data: groupDetails, error: groupDetailsError } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);

        if (groupDetailsError) {
          console.error('❌ Error fetching group details:', groupDetailsError);
          return [];
        }
        return groupDetails;
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchUserGroups:', error);
      return [];
    }
  };

  const handleAuthSuccess = async (sessionData) => {
    console.log('handleAuthSuccess: sessionData:', sessionData); // Log sessionData here
    await SecureStore.setItemAsync('userSession', JSON.stringify(sessionData));
    setSession(sessionData);
    const profile = await loadUserProfile(sessionData.user.id);
    if (profile?.location_status === 1) {
      await locationTracker.startTracking(sessionData.user.id, sessionData.user.email);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userSession');
    await supabase.auth.signOut();
  };

  // ---------------- Header ----------------
  const renderHeader = ({ navigation }) => {
    return {
      headerShown: true,
      headerTitle: () => null,
      headerLeft: () => {
        const currentStackRoute = navigation.getState().routes[navigation.getState().index];
        let headerTitle = ''; // Default to empty

        // If 'Main' screen has a nested navigator (TabNavigator in this case)
        if (currentStackRoute.state && currentStackRoute.state.routes) {
          const currentTabRoute = currentStackRoute.state.routes[currentStackRoute.state.index];
          // Only show title for Admin screen
          if (currentTabRoute.name === 'Admin') {
            headerTitle = currentTabRoute.name;
          }
        }

        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {userProfile?.profile_photo_data ? (
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Image 
                  source={{ uri: userProfile.profile_photo_data }} 
                  style={{ width: 30, height: 30, borderRadius: 15, marginLeft: 15 }} 
                />
              </TouchableOpacity>
            ) : null}
            {headerTitle ? ( // Only render Text if headerTitle is not empty
              <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' }}>{headerTitle}</Text>
            ) : null}
          </View>
        );
      },
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
          <TouchableOpacity onPress={() => setShowRealtimeCollaboration(prev => !prev)} style={{ marginRight: 15 }}>
            <MaterialIcons name={showRealtimeCollaboration ? "edit" : "edit-off"} size={24} color="#007AFF" />
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
    }
  };

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
              options={({ navigation }) => renderHeader({ navigation })}
            >
              {(props) => (
                <TabNavigator {...props} route={{ params: { user, userProfile, handleLogout } }} />
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerMap">
              {(props) => <CustomerMapScreen {...props} user={user} userProfile={userProfile} />}
            </Stack.Screen>
            <Stack.Screen name="Expenses">
              {(props) => <UserExpensesScreen {...props} user={user} userProfile={userProfile} />}
            </Stack.Screen>

            <Stack.Screen name="QuickTransaction">
              {(props) => <QuickTransactionScreen {...props} user={userProfile} />}
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
          {memoizedCollaboration}
        </View>
      )}

      {isAuthenticated && user && showGlobalChat && (
        <GlobalChatAndPresence
          user={user}
          userProfile={userProfile}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          accessToken={session?.access_token}
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
