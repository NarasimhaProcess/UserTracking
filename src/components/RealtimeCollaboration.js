import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated, Text } from 'react-native';
import { supabase } from '../services/supabaseClient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Path } from 'react-native-svg';

// A simple component for the cursor itself
const Cursor = ({ x, y, name }) => (
  <Animated.View style={[styles.cursor, { transform: [{ translateX: x }, { translateY: y }] }]}>
    <Icon name="navigation" size={24} color="#007AFF" style={styles.cursorIcon} />
    <Text style={styles.cursorLabel}>{name}</Text>
  </Animated.View>
);

// Helper function to convert an array of points to an SVG path string
const pointsToPath = (points) => {
  if (points.length === 0) {
    return '';
  }
  const [firstPoint, ...rest] = points;
  return `M ${firstPoint.x} ${firstPoint.y} ` + rest.map(p => `L ${p.x} ${p.y}`).join(' ');
};

export default function RealtimeCollaboration({ user, selectedGroup }) {
  const [remoteCursors, setRemoteCursors] = useState({});
  const [paths, setPaths] = useState({});
  const myCursorPos = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current;
  const channelRef = useRef(null);
  const currentPath = useRef(null);

  const myInstanceId = useRef(Date.now() + Math.random()).current;

  useEffect(() => {
    if (!selectedGroup) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channelName = `collaboration-group-${selectedGroup.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Subscribe to cursor events
    channel.on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
      setRemoteCursors(current => ({ ...current, [payload.userId]: { ...payload } }));
    });

    // Subscribe to drawing events
    channel.on('broadcast', { event: 'path-start' }, ({ payload }) => {
      if (!payload || !payload.pathId) return; // Added null check
      setPaths(current => ({ ...current, [payload.pathId]: [payload.point] }));
    });

    channel.on('broadcast', { event: 'path-point' }, ({ payload }) => {
      if (!payload || !payload.pathId) return; // Added null check
      setPaths(current => {
        if (!current[payload.pathId]) return current;
        return { ...current, [payload.pathId]: [...current[payload.pathId], payload.point] };
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log(`Successfully subscribed to channel: ${channelName}`);
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedGroup]); // Added dependency array

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // Start a new path
        const pathId = `${user.id}-${Date.now()}`;
        const point = { x: gestureState.x0, y: gestureState.y0 };
        currentPath.current = { pathId, points: [point] };
        setPaths(current => ({ ...current, [pathId]: [point] }));

        // Broadcast path start
        channelRef.current?.send({
          type: 'broadcast', event: 'path-start', payload: { pathId, point },
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        const { moveX, moveY } = gestureState;
        myCursorPos.setValue({ x: moveX, y: moveY });

        // Add point to current path
        if (currentPath.current && currentPath.current.pathId) {
          const point = { x: moveX, y: moveY };
          currentPath.current.points.push(point);
          setPaths(current => ({ ...current, [currentPath.current.pathId]: currentPath.current.points }));

          // Broadcast new point
          channelRef.current?.send({
            type: 'broadcast', event: 'path-point', payload: { pathId: currentPath.current.pathId, point },
          });
        }

        // Broadcast cursor position
        channelRef.current?.send({
          type: 'broadcast', event: 'cursor-pos', payload: { userId: user.id, instanceId: myInstanceId, name: user.name || user.email, x: moveX, y: moveY },
        });
      },
      onPanResponderRelease: () => {
        myCursorPos.setValue({ x: -100, y: -100 });
        currentPath.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%">
        {Object.values(paths).map((points, index) => (
          <Path
            key={index}
            d={pointsToPath(points)}
            stroke="red"
            strokeWidth={3}
            fill="none"
          />
        ))}
      </Svg>
      <Cursor x={myCursorPos.x} y={myCursorPos.y} name="You" />
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
    backgroundColor: 'transparent',
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