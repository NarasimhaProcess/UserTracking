import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';
import LeafletMap from '../components/LeafletMap';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ user, userProfile }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    if (user) {
      getCurrentLocation();
      loadUserLocations();
    }
  }, [user]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentLocation(newLocation);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserLocations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading locations:', error);
        return;
      }

      if (data && data.length > 0) {
        setUserLocations(data);
      }
    } catch (error) {
      console.error('Error loading user locations:', error);
    }
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.centerOnLocation(currentLocation);
    }
  };

  const clearMap = () => {
    setUserLocations([]);
    if (mapRef.current) {
      mapRef.current.clearMap();
    }
  };

  const fitMapToRoute = () => {
    if (mapRef.current && userLocations.length > 0) {
      mapRef.current.fitToRoute();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const searchLocation = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setCurrentLocation(searchLocation);
        
        if (mapRef.current) {
          mapRef.current.centerOnLocation(searchLocation);
        }
        
        setSearchQuery('');
      } else {
        Alert.alert('Not Found', 'No results found for your search.');
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      Alert.alert('Error', 'Could not search for location.');
    }
  };

  const handleMapPress = (coordinate) => {
    console.log('Map pressed at:', coordinate);
    // You can add functionality here, like adding a new marker
  };

  const handleMarkerDragEnd = (coordinate) => {
    console.log('Marker dragged to:', coordinate);
    setCurrentLocation({
      ...currentLocation,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  // Web fallback component (for when maps don't work)
  const WebMapFallback = () => (
    <View style={styles.webFallback}>
      <Text style={styles.webFallbackTitle}>🗺️ Map View</Text>
      <Text style={styles.webFallbackText}>
        Maps are not available in web browser.
      </Text>
      <Text style={styles.webFallbackText}>
        Please use the mobile app for full map functionality.
      </Text>
      
      {/* Location History Display */}
      <View style={styles.locationHistory}>
        <Text style={styles.locationHistoryTitle}>Location History</Text>
        <Text style={styles.locationHistoryText}>
          Total Points: {userLocations.length}
        </Text>
        {userLocations.length > 0 && (
          <Text style={styles.locationHistoryText}>
            Last Update: {new Date(userLocations[userLocations.length - 1].timestamp).toLocaleString()}
          </Text>
        )}
        {currentLocation && (
          <Text style={styles.locationHistoryText}>
            Current Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      {/* Recent Locations List */}
      {userLocations.length > 0 && (
        <View style={styles.recentLocations}>
          <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
          <ScrollView style={styles.locationsList}>
            {userLocations.slice(-10).reverse().map((location, index) => (
              <View key={location.id || index} style={styles.locationItem}>
                <Text style={styles.locationCoordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationTime}>
                  {new Date(location.timestamp).toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderMap = () => {
    // Show fallback for web or if no location
    if (Platform.OS === 'web' || !currentLocation) {
      return <WebMapFallback />;
    }

    return (
      <LeafletMap
        ref={mapRef}
        initialRegion={currentLocation}
        markerCoordinate={currentLocation}
        userLocations={userLocations}
        onMapPress={handleMapPress}
        onMarkerDragEnd={handleMarkerDragEnd}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Container */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnCurrentLocation}
          disabled={!currentLocation}
        >
          <Text style={styles.controlButtonText}>📍 Current</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={fitMapToRoute}
          disabled={userLocations.length === 0}
        >
          <Text style={styles.controlButtonText}>🗺️ Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={clearMap}
        >
          <Text style={styles.controlButtonText}>🗑️ Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={loadUserLocations}
        >
          <Text style={styles.controlButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Info panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Location History</Text>
        <Text style={styles.infoText}>
          Total Points: {userLocations.length}
        </Text>
        {userLocations.length > 0 && (
          <Text style={styles.infoText}>
            Last Update: {new Date(userLocations[userLocations.length - 1].timestamp).toLocaleString()}
          </Text>
        )}
        {currentLocation && (
          <Text style={styles.infoText}>
            Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  mapContainer: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  controls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  controlButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  // Web fallback styles
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  webFallbackText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 10,
  },
  locationHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  locationHistoryText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  recentLocations: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recentLocationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  locationsList: {
    maxHeight: 150,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  locationCoordinates: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  locationTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
});