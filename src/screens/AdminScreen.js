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
  Modal,
} from 'react-native';
import { supabase } from '../services/supabase';
import { Buffer } from 'buffer';

export default function AdminScreen({ navigation, user, userProfile }) {
  // Tab state
  const [activeTab, setActiveTab] = useState('users');

  // User management state (existing)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intervals, setIntervals] = useState({});

  // Area management state
  const [areas, setAreas] = useState([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [areaType, setAreaType] = useState('city');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');

  // Group management state
  const [groups, setGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [groupDescription, setGroupDescription] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);

  // Repayment plan management state
  const [repaymentPlans, setRepaymentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    frequency: 'weekly',
    periods: '',
    base_amount: '',
    repayment_per_period: '',
    advance_amount: '',
    late_fee_per_period: '',
    description: '',
  });

  // Customer Type management state
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loadingCustomerTypes, setLoadingCustomerTypes] = useState(false);
  const [showCustomerTypeModal, setShowCustomerTypeModal] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState(null);
  const [customerTypeName, setCustomerTypeName] = useState('');
  const [customerTypeDescription, setCustomerTypeDescription] = useState('');

  useEffect(() => {
    loadUsers();
    if (activeTab === 'customerTypes') {
      loadCustomerTypes();
    }
  }, [userProfile, activeTab]);

  const loadCustomerTypes = async () => {
    setLoadingCustomerTypes(true);
    try {
      const { data, error } = await supabase
        .from('customer_types')
        .select('*')
        .order('status_name', { ascending: true });

      if (error) {
        throw error;
      }
      setCustomerTypes(data || []);
    } catch (error) {
      console.error('Error loading customer types:', error);
      Alert.alert('Error', 'Failed to load customer types');
    } finally {
      setLoadingCustomerTypes(false);
    }
  };

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
          <Text style={styles.userEmail}>{item.email}</Text>
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

  const handleAddCustomerType = () => {
    setEditingCustomerType(null);
    setCustomerTypeName('');
    setCustomerTypeDescription('');
    setShowCustomerTypeModal(true);
  };

  const handleEditCustomerType = (type) => {
    setEditingCustomerType(type);
    setCustomerTypeName(type.status_name);
    setCustomerTypeDescription(type.description);
    setShowCustomerTypeModal(true);
  };

  const handleDeleteCustomerType = async (id) => {
    Alert.alert(
      'Delete Customer Type',
      'Are you sure you want to delete this customer type?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('customer_types')
                .delete()
                .eq('id', id);
              if (error) throw error;
              Alert.alert('Success', 'Customer type deleted.');
              loadCustomerTypes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer type.');
              console.error('Delete customer type error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSaveCustomerType = async () => {
    if (!customerTypeName) {
      Alert.alert('Error', 'Status Name is required.');
      return;
    }
    try {
      const newCustomerType = {
        status_name: customerTypeName,
        description: customerTypeDescription,
      };
      if (editingCustomerType) {
        const { error } = await supabase
          .from('customer_types')
          .update(newCustomerType)
          .eq('id', editingCustomerType.id);
        if (error) throw error;
        Alert.alert('Success', 'Customer type updated.');
      } else {
        const { error } = await supabase
          .from('customer_types')
          .insert(newCustomerType);
        if (error) throw error;
        Alert.alert('Success', 'Customer type added.');
      }
      setShowCustomerTypeModal(false);
      loadCustomerTypes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save customer type.');
      console.error('Save customer type error:', error);
    }
  };

  const handleCancelCustomerTypeEdit = () => {
    setShowCustomerTypeModal(false);
    setEditingCustomerType(null);
    setCustomerTypeName('');
    setCustomerTypeDescription('');
  };

  const renderCustomerTypeItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.status_name}</Text>
      <Text style={styles.cardDescription}>{item.description || 'No description'}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => handleEditCustomerType(item)} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteCustomerType(item.id)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'users' && styles.activeTabButtonText]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'areas' && styles.activeTabButton]}
          onPress={() => setActiveTab('areas')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'areas' && styles.activeTabButtonText]}>Areas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'customerTypes' && styles.activeTabButton]}
          onPress={() => setActiveTab('customerTypes')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'customerTypes' && styles.activeTabButtonText]}>Customer Types</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'groups' && styles.activeTabButton]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'groups' && styles.activeTabButtonText]}>Groups</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
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
      )}

      {/* Placeholder for other tabs */}
      {activeTab === 'areas' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Areas Management (Coming Soon)</Text>
        </View>
      )}
      {activeTab === 'groups' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Groups Management (Coming Soon)</Text>
        </View>
      )}
      {activeTab === 'repaymentPlans' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Repayment Plans Management (Coming Soon)</Text>
        </View>
      )}
      {activeTab === 'customerTypes' && (
        <View style={styles.tabContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Customer Types</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddCustomerType}>
              <Text style={styles.addButtonText}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={customerTypes}
            renderItem={renderCustomerTypeItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loadingCustomerTypes} onRefresh={loadCustomerTypes} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.emptyListText}>No customer types found.</Text>}
          />

          <Modal
            animationType="slide"
            transparent={true}
            visible={showCustomerTypeModal}
            onRequestClose={handleCancelCustomerTypeEdit}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingCustomerType ? 'Edit Customer Type' : 'Add Customer Type'}</Text>
                <Text style={styles.formLabel}>Status Name</Text>
                <TextInput
                  style={styles.input}
                  value={customerTypeName}
                  onChangeText={setCustomerTypeName}
                  placeholder="e.g., VIP, Regular, New"
                />
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={customerTypeDescription}
                  onChangeText={setCustomerTypeDescription}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelCustomerTypeEdit}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomerType}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
}); 