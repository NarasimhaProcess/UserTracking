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

// Conditionally import react-native-maps only on native platforms
import LeafletMap from '../components/LeafletMap';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ user, userProfile }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapHtmlContent, setMapHtmlContent] = useState(null);

  useEffect(() => {
    const loadMapHtml = async () => {
      try {
        const response = await default_api.read_file({ absolute_path: "C:\AIGenarator\DalabHRPORTAL\UserTracking\src\assets\map.html" });
        if (response.read_file_response && response.read_file_response.output) {
          setMapHtmlContent(response.read_file_response.output);
        } else {
          console.error("Error reading map.html:", response);
        }
      } catch (error) {
        console.error("Failed to read map.html:", error);
      }
    };

    loadMapHtml();

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
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Center map on current location (only on native)
      // Removed mapRef.current.animateToRegion as it's not compatible with WebView-based LeafletMap
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
        .limit(100); // Limit to last 100 locations for performance

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
    if (currentLocation && mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion(currentLocation);
    }
  };

  const clearMap = () => {
    setUserLocations([]);
  };

  const getRouteCoordinates = () => {
    return userLocations.map(location => ({
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  };

  const getRegionForCoordinates = (coordinates) => {
    if (coordinates.length === 0) return null;

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const deltaLat = (maxLat - minLat) * 1.1;
    const deltaLng = (maxLng - minLng) * 1.1;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01),
    };
  };

  const fitMapToRoute = () => {
    const coordinates = getRouteCoordinates();
    if (coordinates.length > 0) {
      const region = getRegionForCoordinates(coordinates);
      if (region && mapRef.current && Platform.OS !== 'web') {
        mapRef.current.animateToRegion(region);
      }
    }
  };

  // Web fallback component
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
        {userLocations.length > 0 && (
          <Text style={styles.locationHistoryText}>
            Current Location: {currentLocation ? 
              `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : 
              'Not available'
            }
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

  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setCurrentLocation({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        // Also update the marker to the searched location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } else {
        Alert.alert('Not Found', 'No results found for your search.');
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      Alert.alert('Error', 'Could not search for location.');
    }
  };

  const renderMap = () => {
    if (!mapHtmlContent) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map content...</Text>
        </View>
      );
    }
    return (
      <LeafletMap
        initialRegion={currentLocation}
        markerCoordinate={currentLocation}
        userLocations={userLocations}
        mapHtmlContent={mapHtmlContent}
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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      {renderMap()}

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnCurrentLocation}
        >
          <Text style={styles.controlButtonText}>📍 Current</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={fitMapToRoute}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
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
    zIndex: 1, // Ensure search bar is above the map
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
    bottom: 20,
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
    right: 20,
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
    maxHeight: 150, // Limit height for scrollable list
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