import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';

export default function LocationHistoryScreen({ user, userProfile }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDistance: 0,
    avgAccuracy: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    if (user) {
      loadLocationHistory();
    }
  }, [user]);

  const loadLocationHistory = async () => {
    if (!user) {
      console.log('❌ No user provided to LocationHistoryScreen');
      return;
    }

    console.log('🔍 Loading location history for user:', user.id);
    console.log('📧 User email:', user.email);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error loading locations:', error);
        Alert.alert('Error', 'Failed to load location history');
        return;
      }

      console.log('✅ Location history loaded:', data?.length || 0, 'records');
      if (data && data.length > 0) {
        console.log('📍 First location:', {
          id: data[0].id,
          latitude: data[0].latitude,
          longitude: data[0].longitude,
          timestamp: data[0].timestamp
        });
      }

      setLocations(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('❌ Error loading location history:', error);
      Alert.alert('Error', 'Failed to load location history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (locationData) => {
    if (locationData.length < 2) {
      setStats({
        totalDistance: 0,
        avgAccuracy: 0,
        totalPoints: locationData.length,
      });
      return;
    }

    let totalDistance = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (let i = 1; i < locationData.length; i++) {
      const prev = locationData[i - 1];
      const curr = locationData[i];
      
      const distance = calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      totalDistance += distance;

      if (curr.accuracy) {
        totalAccuracy += curr.accuracy;
        accuracyCount++;
      }
    }

    setStats({
      totalDistance: totalDistance,
      avgAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      totalPoints: locationData.length,
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocationHistory();
    setRefreshing(false);
  };

  const checkAllLocations = async () => {
    try {
      console.log('🔍 Checking all location records in database...');
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error checking all locations:', error);
        Alert.alert('Error', 'Failed to check locations');
        return;
      }

      console.log('📊 All location records in database:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📍 Sample locations:', data.slice(0, 3));
      } else {
        console.log('❌ No location records found in database');
      }

      Alert.alert(
        'Database Check', 
        `Found ${data?.length || 0} location records in database.\nCheck console for details.`
      );
    } catch (error) {
      console.error('❌ Error checking all locations:', error);
      Alert.alert('Error', 'Failed to check locations');
    }
  };

  const renderLocationItem = ({ item, index }) => (
    <View style={styles.locationItem}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationNumber}>#{index + 1}</Text>
        <Text style={styles.locationTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.locationDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Coordinates:</Text>
          <Text style={styles.detailValue}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Accuracy:</Text>
          <Text style={styles.detailValue}>
            {item.accuracy ? `${Math.round(item.accuracy)}m` : 'N/A'}
          </Text>
        </View>
        
        {item.device_name && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Device:</Text>
            <Text style={styles.detailValue}>{item.device_name}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalDistance.toFixed(2)} km</Text>
          <Text style={styles.statLabel}>Total Distance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(stats.avgAccuracy)}m</Text>
          <Text style={styles.statLabel}>Avg Accuracy</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading location history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStats()}
      
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Location History</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={loadLocationHistory}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={checkAllLocations} style={styles.debugButton}>
              <Text style={styles.debugButtonText}>Debug DB</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No location history found</Text>
              <Text style={styles.emptySubtext}>
                Start tracking your location to see history here
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 18,
    color: '#007AFF',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
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
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 16,
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  locationTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  locationDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
}); 