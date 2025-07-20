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

function hexToBase64(hexString) {
  if (!hexString) return '';
  const hex = hexString.startsWith('\\x') ? hexString.slice(2) : hexString;
  // Use Buffer for safe conversion
  return Buffer.from(hex, 'hex').toString('base64');
}

export default function AreaManagementScreen({ navigation, user, userProfile }) {
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' or 'groups'
  const [areas, setAreas] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Form states for areas
  const [areaName, setAreaName] = useState('');
  const [areaType, setAreaType] = useState('city');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  
  // Form states for groups
  const [groupName, setGroupName] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [groupDescription, setGroupDescription] = useState('');
  // Add user selection state
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadAreas();
    loadGroups();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('area_master')
        .select('*')
        .order('area_name', { ascending: true });

      if (error) {
        throw error;
      }

      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
      Alert.alert('Error', 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`*, group_areas (area_id, area_master (id, area_name, area_type, pin_code)), user_groups (user_id)`)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    }
  };

  // Load users with user_type = 'user'
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('user_type', 'user');
    if (!error) setUsers(data || []);
  };
  useEffect(() => { loadUsers(); }, []);

  const handleAddArea = () => {
    setEditingArea(null);
    setAreaName('');
    setAreaType('city');
    setPinCode('');
    setState('');
    setDescription('');
    setShowAreaModal(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setAreaName(area.area_name);
    setAreaType(area.area_type);
    setPinCode(area.pin_code || '');
    setState(area.state || '');
    setDescription(area.description || '');
    setShowAreaModal(true);
  };

  const handleSaveArea = async () => {
    if (!areaName.trim()) {
      Alert.alert('Error', 'Area name is required');
      return;
    }

    try {
      const areaData = {
        area_name: areaName.trim(),
        area_type: areaType,
        pin_code: pinCode.trim() || null,
        state: state.trim() || null,
        description: description.trim() || null,
      };

      if (editingArea) {
        // Update existing area
        const { error } = await supabase
          .from('area_master')
          .update(areaData)
          .eq('id', editingArea.id);

        if (error) throw error;
        Alert.alert('Success', 'Area updated successfully');
      } else {
        // Create new area
        const { error } = await supabase
          .from('area_master')
          .insert(areaData);

        if (error) throw error;
        Alert.alert('Success', 'Area created successfully');
      }

      setShowAreaModal(false);
      loadAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'Failed to save area');
    }
  };

  const handleDeleteArea = (area) => {
    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${area.area_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('area_master')
                .delete()
                .eq('id', area.id);

              if (error) throw error;
              Alert.alert('Success', 'Area deleted successfully');
              loadAreas();
            } catch (error) {
              console.error('Error deleting area:', error);
              Alert.alert('Error', 'Failed to delete area');
            }
          },
        },
      ]
    );
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedAreaIds([]);
    setGroupDescription('');
    setSelectedUserIds([]);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelectedAreaIds((group.group_areas || []).map(ga => ga.area_id));
    setGroupDescription(group.description || '');
    // Pre-select users already assigned to this group
    setSelectedUserIds((group.user_groups || []).map(ug => ug.user_id));
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    if (!selectedAreaIds.length) {
      Alert.alert('Error', 'Please select at least one area');
      return;
    }
    try {
      let groupId;
      if (editingGroup) {
        // Update group
        const { error } = await supabase
          .from('groups')
          .update({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .eq('id', editingGroup.id);
        if (error) throw error;
        groupId = editingGroup.id;
      } else {
        // Create group
        const { data, error } = await supabase
          .from('groups')
          .insert({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        groupId = data.id;
      }
      // Remove old group_areas
      await supabase.from('group_areas').delete().eq('group_id', groupId);
      // Insert new group_areas
      const groupAreaRows = selectedAreaIds.map(areaId => ({ group_id: groupId, area_id: areaId }));
      if (groupAreaRows.length) {
        await supabase.from('group_areas').insert(groupAreaRows);
      }
      // After saving group and group_areas:
      await supabase.from('user_groups').delete().eq('group_id', groupId);
      const userGroupRows = selectedUserIds.map(userId => ({ user_id: userId, group_id: groupId }));
      if (userGroupRows.length) {
        await supabase.from('user_groups').insert(userGroupRows);
      }
      Alert.alert('Success', editingGroup ? 'Group updated successfully' : 'Group created successfully');
      setShowGroupModal(false);
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', 'Failed to save group');
    }
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', group.id);

              if (error) throw error;
              Alert.alert('Success', 'Group deleted successfully');
              loadGroups();
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const renderAreaItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.area_name}</Text>
        <Text style={styles.itemType}>{item.area_type}</Text>
        {item.pin_code && <Text style={styles.itemDetail}>PIN: {item.pin_code}</Text>}
        {item.state && <Text style={styles.itemDetail}>State: {item.state}</Text>}
        {item.description && <Text style={styles.itemDetail}>{item.description}</Text>}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditArea(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteArea(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroupItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>
          Areas: {(item.group_areas || []).map(ga => ga.area_master?.area_name).filter(Boolean).join(', ') || 'None'}
        </Text>
        {item.description && <Text style={styles.itemDetail}>{item.description}</Text>}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditGroup(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteGroup(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAreaModal = () => (
    <Modal
      visible={showAreaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAreaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingArea ? 'Edit Area' : 'Add New Area'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Area Name"
            value={areaName}
            onChangeText={setAreaName}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Area Type:</Text>
            <View style={styles.pickerRow}>
              {['village', 'town', 'city', 'district'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerOption,
                    areaType === type && styles.pickerOptionSelected
                  ]}
                  onPress={() => setAreaType(type)}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    areaType === type && styles.pickerOptionTextSelected
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="PIN Code (optional)"
            value={pinCode}
            onChangeText={setPinCode}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="State (optional)"
            value={state}
            onChangeText={setState}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAreaModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveArea}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderGroupModal = () => (
    <Modal
      visible={showGroupModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGroupModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingGroup ? 'Edit Group' : 'Add New Group'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Select Areas:</Text>
            <ScrollView style={styles.areaPicker}>
              {areas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.pickerOption,
                    selectedAreaIds.includes(area.id) && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedAreaIds((prev) =>
                      prev.includes(area.id)
                        ? prev.filter((id) => id !== area.id)
                        : [...prev, area.id]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedAreaIds.includes(area.id) && styles.pickerOptionTextSelected
                    ]}
                  >
                    {area.area_name} ({area.area_type})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TextInput
              style={styles.input}
              placeholder="Search Users"
              value={userSearch}
              onChangeText={setUserSearch}
            />
          </View>
          <ScrollView style={styles.userPicker}>
            {users.filter(
              u =>
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase())
            ).map(user => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.pickerOption,
                  selectedUserIds.includes(user.id) && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  setSelectedUserIds(prev =>
                    prev.includes(user.id)
                      ? prev.filter(id => id !== user.id)
                      : [...prev, user.id]
                  );
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedUserIds.includes(user.id) && styles.pickerOptionTextSelected
                  ]}
                >
                  {user.name} ({user.email})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowGroupModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveGroup}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Area Management</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'areas' && styles.activeTab]}
          onPress={() => setActiveTab('areas')}
        >
          <Text style={[styles.tabText, activeTab === 'areas' && styles.activeTabText]}>
            Areas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'areas' ? (
          <>
            <TouchableOpacity style={styles.addButton} onPress={handleAddArea}>
              <Text style={styles.addButtonText}>+ Add Area</Text>
            </TouchableOpacity>
            
            <FlatList
              data={areas}
              renderItem={renderAreaItem}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadAreas} />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No areas found. Add your first area!</Text>
              }
            />
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.addButton} onPress={handleAddGroup}>
              <Text style={styles.addButtonText}>+ Add Group</Text>
            </TouchableOpacity>
            
            <FlatList
              data={groups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadGroups} />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No groups found. Add your first group!</Text>
              }
            />
          </>
        )}
      </View>

      {renderAreaModal()}
      {renderGroupModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  areaPicker: {
    maxHeight: 150,
  },
  userPicker: {
    maxHeight: 150,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 