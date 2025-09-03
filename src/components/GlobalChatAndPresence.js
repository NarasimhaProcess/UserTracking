import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabaseClient';

const GlobalChatAndPresence = ({ user, userProfile, selectedGroup, setSelectedGroup }) => {
  const [groupUsers, setGroupUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatChannelRef = useRef(null);
  const flatListRef = useRef(null);
  useEffect(() => {
    // If no group is selected, clean up any existing channels and return.
    if (!selectedGroup || !user) {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
      setMessages([]);
      setGroupUsers([]);
      return;
    }

    // --- Create a single channel for the selected group ---
    const channel = supabase.channel(`group-${selectedGroup.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    chatChannelRef.current = channel;

    // --- Fetch historical messages ---
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(email, name)')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data);
      }
    };

    fetchMessages();

    // --- Poll for new messages every 3 seconds ---
    const intervalId = setInterval(fetchMessages, 3000);

    // --- Subscribe to presence events on the channel ---
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const currentUsers = Object.values(newState).flat();
        setGroupUsers(currentUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, username: userProfile.name || user.email });
          console.log(`Successfully subscribed to channel: group-${selectedGroup.id}`);
        }
      });

    // --- Cleanup function to remove the channel and interval ---
    return () => {
      clearInterval(intervalId);
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
    };
  }, [selectedGroup, user, userProfile]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (newMessage.trim() && selectedGroup && user) {
      const messagePayload = {
        text: newMessage.trim(),
        sender_id: user.id,
        sender_email: user.email || 'Anonymous',
        group_id: selectedGroup.id,
        // image_url: null, // For future image sharing
      };

      const { error } = await supabase.from('messages').insert([messagePayload]);

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setNewMessage('');
        // The new message will be picked up by the next poll
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Group Selection and User List */}
      <View style={[styles.groupSelectionContainer, { top: 70 }]}>
        <Text style={styles.sectionTitle}>Your Groups:</Text>
        <FlatList
          data={userProfile?.groups || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.groupButton, selectedGroup?.id === item.id && styles.selectedGroupButton]}
              onPress={() => setSelectedGroup(item)}
            >
              <Text style={styles.groupButtonText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />

        {selectedGroup && (
          <View style={styles.selectedGroupInfo}>
            <Text style={styles.sectionTitle}>Users in {selectedGroup.name} ({groupUsers.length} online):</Text>
            <FlatList
              data={groupUsers}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => (
                <View style={styles.userItem}>
                  <Text style={styles.userName}>{item.username}</Text>
                </View>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* Chat Window (Bottom Right) */}
      <View style={[styles.chatWindow, { top: 70 }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[
              styles.messageBubble,
              item.sender_id === user.id ? styles.sentMessageBubble : styles.receivedMessageBubble
            ]}>
              <Text style={item.sender_id === user.id ? styles.sentMessageSender : styles.messageSender}>
                {item.sender ? item.sender.name || item.sender.email : 'Anonymous'}:
              </Text>
              <Text style={item.sender_id === user.id ? styles.sentMessageText : styles.messageText}>
                {item.text}
              </Text>
            </View>
          )}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            placeholderTextColor="#888"
          />
          <Button title="Send" onPress={sendMessage} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allows touches to pass through
  },
  groupSelectionContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  groupButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 5,
  },
  selectedGroupButton: {
    backgroundColor: '#0056b3',
  },
  groupButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedGroupInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  userItem: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 10,
  },
  userName: {
    fontSize: 12,
    color: '#333',
  },
  chatWindow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
    padding: 10,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  sentMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    color: 'white',
  },
  receivedMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
    color: '#333',
  },
  messageSender: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  sentMessageSender: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: 'white',
  },
  messageText: {
    color: '#333',
  },
  sentMessageText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginRight: 10,
    color: '#333',
  },
});

export default GlobalChatAndPresence;
