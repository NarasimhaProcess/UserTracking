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
  const [loadingGroups, setLoadingGroups] = useState(false); // New loading state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [groupDescription, setGroupDescription] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);

  // All users and areas for selection in group modal
  const [allUsers, setAllUsers] = useState([]);
  const [allAreas, setAllAreas] = useState([]);

  // Functions for Group Management
  const loadGroups = async () => {
    if (userProfile?.user_type !== 'superadmin') {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*, group_areas(area_master(id, area_name)), user_groups(user_id, is_group_admin, users(id, name, email))')
        .order('name', { ascending: true });

      if (groupsError) {
        throw groupsError;
      }

      // Flatten the data for easier consumption
      const formattedGroups = groupsData.map(group => ({
        ...group,
        areas: group.group_areas.map(ga => ga.area_master),
        users_in_group: group.user_groups.map(ug => ({
          id: ug.user_id,
          name: ug.users.name,
          email: ug.users.email,
          is_group_admin: ug.is_group_admin,
        })),
      }));

      setGroups(formattedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadAllUsersAndAreas = async () => {
    if (userProfile?.user_type !== 'superadmin') {
      setAllUsers([]);
      setAllAreas([]);
      return;
    }
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .order('name', { ascending: true });
      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      const { data: areasData, error: areasError } = await supabase
        .from('area_master')
        .select('id, area_name')
        .order('area_name', { ascending: true });
      if (areasError) throw areasError;
      setAllAreas(areasData || []);

    } catch (error) {
      console.error('Error loading all users or areas:', error);
      Alert.alert('Error', 'Failed to load users or areas for group management.');
    }
  };

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
    } else if (activeTab === 'groups') {
      loadGroups();
      loadAllUsersAndAreas();
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

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedAreaIds([]);
    setGroupDescription('');
    setSelectedUserIds([]);
    setGroupUsers([]);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelectedAreaIds(group.areas.map(area => area.id));
    setSelectedUserIds(group.users_in_group.map(user => user.id));
    setGroupUsers(group.users_in_group);
    setGroupDescription(group.description);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (groupId) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This will also remove all associated users and areas.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from user_groups first
              const { error: userGroupError } = await supabase
                .from('user_groups')
                .delete()
                .eq('group_id', groupId);
              if (userGroupError) throw userGroupError;

              // Delete from group_areas
              const { error: groupAreaError } = await supabase
                .from('group_areas')
                .delete()
                .eq('group_id', groupId);
              if (groupAreaError) throw groupAreaError;

              // Finally, delete the group
              const { error: groupError } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);
              if (groupError) throw groupError;

              Alert.alert('Success', 'Group deleted successfully.');
              loadGroups();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete group.');
              console.error('Delete group error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSaveGroup = async () => {
    if (!groupName) {
      Alert.alert('Error', 'Group Name is required.');
      return;
    }

    try {
      let currentGroupId;
      if (editingGroup) {
        // Update existing group
        const { data, error } = await supabase
          .from('groups')
          .update({ name: groupName, description: groupDescription })
          .eq('id', editingGroup.id)
          .select();
        if (error) throw error;
        currentGroupId = data[0].id;
        Alert.alert('Success', 'Group updated successfully.');
      } else {
        // Insert new group
        const { data, error } = await supabase
          .from('groups')
          .insert({ name: groupName, description: groupDescription })
          .select();
        if (error) throw error;
        currentGroupId = data[0].id;
        Alert.alert('Success', 'Group added successfully.');
      }

      // Update group_areas
      // First, delete existing associations
      const { error: deleteAreaError } = await supabase
        .from('group_areas')
        .delete()
        .eq('group_id', currentGroupId);
      if (deleteAreaError) throw deleteAreaError;

      // Then, insert new associations
      if (selectedAreaIds.length > 0) {
        const areaInsertData = selectedAreaIds.map(areaId => ({
          group_id: currentGroupId,
          area_id: areaId,
        }));
        const { error: insertAreaError } = await supabase
          .from('group_areas')
          .insert(areaInsertData);
        if (insertAreaError) throw insertAreaError;
      }

      // Update user_groups
      // First, delete existing associations for this group
      const { error: deleteUserGroupError } = await supabase
        .from('user_groups')
        .delete()
        .eq('group_id', currentGroupId);
      if (deleteUserGroupError) throw deleteUserGroupError;

      // Then, insert new associations
      if (groupUsers.length > 0) {
        const userGroupInsertData = groupUsers.map(user => ({
          user_id: user.id,
          group_id: currentGroupId,
          is_group_admin: user.is_group_admin,
        }));
        const { error: insertUserGroupError } = await supabase
          .from('user_groups')
          .insert(userGroupInsertData);
        if (insertUserGroupError) throw insertUserGroupError;
      }

      setShowGroupModal(false);
      loadGroups();
    } catch (error) {
      Alert.alert('Error', 'Failed to save group.');
      console.error('Save group error:', error);
    }
  };

  const handleCancelGroupEdit = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    setGroupName('');
    setSelectedAreaIds([]);
    setGroupDescription('');
    setSelectedUserIds([]);
    setGroupUsers([]);
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
        <View style={styles.tabContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Groups</Text>
            {userProfile?.user_type === 'superadmin' && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddGroup}>
                <Text style={styles.addButtonText}>+ Add New</Text>
              </TouchableOpacity>
            )}
          </View>
          {userProfile?.user_type !== 'superadmin' ? (
            <Text style={styles.emptyListText}>You do not have permission to view group management.</Text>
          ) : (
            <FlatList
              data={groups}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDescription}>{item.description || 'No description'}</Text>
                  <Text style={styles.cardDescription}>Areas: {item.areas.map(area => area.area_name).join(', ') || 'None'}</Text>
                  <Text style={styles.cardDescription}>Users: {item.users_in_group.map(user => `${user.name} (${user.is_group_admin ? 'Admin' : 'User'})`).join(', ') || 'None'}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleEditGroup(item)} style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteGroup(item.id)} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl refreshing={loadingGroups} onRefresh={loadGroups} />
              }
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<Text style={styles.emptyListText}>No groups found.</Text>}
            />
          )}

          <Modal
            animationType="slide"
            transparent={true}
            visible={showGroupModal}
            onRequestClose={handleCancelGroupEdit}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingGroup ? 'Edit Group' : 'Add Group'}</Text>
                <Text style={styles.formLabel}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g., North Region Sales"
                />
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="Optional description for the group"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.formLabel}>Select Areas</Text>
                <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 10 }}>
                  {allAreas.map(area => (
                    <TouchableOpacity
                      key={area.id}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}
                      onPress={() => {
                        setSelectedAreaIds(prev =>
                          prev.includes(area.id)
                            ? prev.filter(id => id !== area.id)
                            : [...prev, area.id]
                        );
                      }}
                    >
                      <MaterialIcons
                        name={selectedAreaIds.includes(area.id) ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color="#007AFF"
                      />
                      <Text style={{ marginLeft: 10 }}>{area.area_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.formLabel}>Add Users to Group</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search users by name or email"
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
                <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 10, marginTop: 5 }}>
                  {allUsers
                    .filter(user =>
                      user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      user.email?.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map(user => (
                      <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, justifyContent: 'space-between' }}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          onPress={() => {
                            const isUserInGroup = groupUsers.some(u => u.id === user.id);
                            if (isUserInGroup) {
                              setGroupUsers(prev => prev.filter(u => u.id !== user.id));
                            } else {
                              setGroupUsers(prev => [...prev, { ...user, is_group_admin: false }]);
                            }
                          }}
                        >
                          <MaterialIcons
                            name={groupUsers.some(u => u.id === user.id) ? 'check-box' : 'check-box-outline-blank'}
                            size={24}
                            color="#007AFF"
                          />
                          <Text style={{ marginLeft: 10 }}>{user.name || user.email}</Text>
                        </TouchableOpacity>
                        {groupUsers.some(u => u.id === user.id) && (
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                              setGroupUsers(prev =>
                                prev.map(u =>
                                  u.id === user.id ? { ...u, is_group_admin: !u.is_group_admin } : u
                                )
                              );
                            }}
                          >
                            <MaterialIcons
                              name={groupUsers.find(u => u.id === user.id)?.is_group_admin ? 'star' : 'star-border'}
                              size={24}
                              color={groupUsers.find(u => u.id === user.id)?.is_group_admin ? 'gold' : 'gray'}
                            />
                            <Text style={{ marginLeft: 5 }}>Admin</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                </ScrollView>


                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelGroupEdit}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveGroup}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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