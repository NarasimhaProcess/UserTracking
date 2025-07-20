import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { supabase } from '../services/supabase';

export default function AdminScreen({ navigation, user, userProfile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intervals, setIntervals] = useState({});

  useEffect(() => {
    loadUsers();
  }, [userProfile]);

  useEffect(() => {
    // Initialize intervals state when users are loaded
    const initialIntervals = {};
    users.forEach(user => {
      initialIntervals[user.id] = user.location_update_interval?.toString() || '30';
    });
    setIntervals(initialIntervals);
  }, [users]);

  const handleIntervalChange = (userId, value) => {
    setIntervals(prev => ({ ...prev, [userId]: value }));
  };

  const handleIntervalEndEditing = (userId) => {
    const value = parseInt(intervals[userId]) || 30;
    handleUpdateInterval(userId, value);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Only load users if current user is admin or superadmin
      if (userProfile?.user_type !== 'admin' && userProfile?.user_type !== 'superadmin') {
        Alert.alert('Access Denied', 'You do not have permission to view this page');
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'delete':
          Alert.alert(
            'Delete User',
            'Are you sure you want to delete this user?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);

                  if (error) {
                    Alert.alert('Error', 'Failed to delete user');
                    return;
                  }

                  Alert.alert('Success', 'User deleted successfully');
                  loadUsers();
                },
              },
            ]
          );
          break;

        case 'change_role':
          Alert.alert(
            'Change User Role',
            'Select new role:',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'User',
                onPress: async () => {
                  await updateUserRole(userId, 'user');
                },
              },
              {
                text: 'Admin',
                onPress: async () => {
                  await updateUserRole(userId, 'admin');
                },
              },
              {
                text: 'Super Admin',
                onPress: async () => {
                  await updateUserRole(userId, 'superadmin');
                },
              },
              {
                text: 'Customer',
                onPress: async () => {
                  await updateUserRole(userId, 'customer');
                },
              },
            ]
          );
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling user action:', error);
      Alert.alert('Error', 'Failed to perform action');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ user_type: newRole })
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to update user role');
        return;
      }

      Alert.alert('Success', 'User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const handleToggleLocationStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const { error } = await supabase
        .from('users')
        .update({ location_status: newStatus })
        .eq('id', userId);
      if (error) {
        Alert.alert('Error', 'Failed to update location status');
        return;
      }
      Alert.alert('Success', `Location status set to ${newStatus === 1 ? 'Active' : 'Inactive'}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update location status');
    }
  };

  const handleUpdateInterval = async (userId, interval) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ location_update_interval: interval })
        .eq('id', userId);
      if (error) {
        Alert.alert('Error', 'Failed to update location interval');
        return;
      }
      Alert.alert('Success', 'Location update interval set');
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update location interval');
    }
  };

  const renderUserItem = ({ item }) => {
    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'No Name'}</Text>
          <Text style={styles.userEmail}>{item.id}</Text>
          <Text style={[styles.userRole, { color: getRoleColor(item.user_type) }]}> {item.user_type || 'user'} </Text>
          <Text style={[styles.userStatus, { color: item.location_status === 1 ? '#34C759' : '#FF3B30' }]}> Location: {item.location_status === 1 ? 'Active' : 'Inactive'} </Text>
          <Text style={styles.userDate}> Created: {new Date(item.created_at).toLocaleDateString()} </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>Interval (sec):</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 4, width: 60, textAlign: 'center' }}
              value={intervals[item.id]}
              keyboardType="numeric"
              onChangeText={value => handleIntervalChange(item.id, value)}
              onEndEditing={() => handleIntervalEndEditing(item.id)}
            />
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUserAction(item.id, 'change_role')}
          >
            <Text style={styles.actionButtonText}>Change Role</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleUserAction(item.id, 'delete')}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: item.location_status === 1 ? '#FF3B30' : '#34C759' }]}
            onPress={() => handleToggleLocationStatus(item.id, item.location_status)}
          >
            <Text style={styles.actionButtonText}>
              {item.location_status === 1 ? 'Set Inactive' : 'Set Active'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin':
        return '#FF3B30';
      case 'admin':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadUsers}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUsers} />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 