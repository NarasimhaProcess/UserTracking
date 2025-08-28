import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated, Text } from 'react-native';
import { supabase } from '../services/supabaseClient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// A simple component for the cursor itself
const Cursor = ({ x, y, name }) => (
  <Animated.View style={[styles.cursor, { transform: [{ translateX: x }, { translateY: y }] }]}>
    <Icon name="navigation" size={24} color="#007AFF" style={styles.cursorIcon} />
    <Text style={styles.cursorLabel}>{name}</Text>
  </Animated.View>
);

export default function RealtimeCursorDisplay({ user }) {
  const [remoteCursors, setRemoteCursors] = useState({});
  const myCursorPos = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current; // Start off-screen
  const channelRef = useRef(null);

  // A unique ID for this user's cursor instance
  const myInstanceId = useRef(Date.now() + Math.random()).current;

  useEffect(() => {
    // Define the channel name
    const channelName = 'cursor-channel';
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive our own broadcasts
        },
      },
    });

    channelRef.current = channel;

    // Subscribe to the 'cursor-pos' event
    channel
      .on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
        // Use a function for state updates to get the latest state
        setRemoteCursors(currentCursors => {
          // Ignore stale messages from our own previous sessions
          if (payload.instanceId === myInstanceId) {
            return currentCursors;
          }
          return {
            ...currentCursors,
            [payload.userId]: { x: payload.x, y: payload.y, name: payload.name },
          };
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to channel: ${channelName}`);
        }
      });

    // Clean up on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, myInstanceId]);

  // PanResponder to track touch movements
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const { moveX, moveY } = gestureState;
        // Update our own cursor's animated position
        myCursorPos.setValue({ x: moveX, y: moveY });

        // Broadcast our position to the channel
        if (channelRef.current && user) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'cursor-pos',
            payload: {
              userId: user.id,
              instanceId: myInstanceId,
              name: user.name || user.email,
              x: moveX,
              y: moveY,
            },
          });
        }
      },
      onPanResponderRelease: () => {
        // Move cursor off-screen when touch is released
        myCursorPos.setValue({ x: -100, y: -100 });
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Render our own cursor */}
      <Cursor x={myCursorPos.x} y={myCursorPos.y} name="You" />

      {/* Render cursors for other users */}
      {Object.entries(remoteCursors).map(([userId, { x, y, name }]) => (
        <Cursor key={userId} x={x} y={y} name={name} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent', // Make it an overlay
  },
  cursor: {
    position: 'absolute',
    alignItems: 'center',
  },
  cursorIcon: {
    transform: [{ rotate: '45deg' }],
  },
  cursorLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    marginTop: 4,
  },
});
