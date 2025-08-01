import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

const SimpleLeafletMap = forwardRef(({ 
  initialRegion, 
  markerCoordinate, 
  userLocations = [],
  onMarkerDragEnd,
  onMapPress 
}, ref) => {
  const webViewRef = useRef(null);
  const [mapData, setMapData] = useState({
    initialRegion,
    markerCoordinate,
    userLocations
  });

  // Create dynamic HTML with embedded data
  const createMapHtml = (data) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Leaflet Map</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    .leaflet-control-attribution {
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Embedded data from React Native
    const mapData = ${JSON.stringify(data)};
    
    let map;
    let marker;
    let routePolyline;
    let locationMarkers = [];

    function initializeMap() {
      try {
        map = L.map('map', {
          zoomControl: true,
          attributionControl: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Initialize with data
        if (mapData.initialRegion) {
          const { latitude, longitude } = mapData.initialRegion;
          map.setView([latitude, longitude], 13);
          
          // Add marker
          if (mapData.markerCoordinate) {
            const { latitude: markerLat, longitude: markerLng } = mapData.markerCoordinate;
            marker = L.marker([markerLat, markerLng], { 
              draggable: true,
              title: 'Current Location'
            }).addTo(map);
            
            marker.on('dragend', function(e) {
              const message = JSON.stringify({
                type: 'markerDragEnd',
                latitude: e.target.getLatLng().lat,
                longitude: e.target.getLatLng().lng
              });
              
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(message);
              }
            });
          }
        } else {
          map.setView([0, 0], 2);
        }

        // Add route if locations exist
        if (mapData.userLocations && mapData.userLocations.length > 0) {
          updateRoute(mapData.userLocations);
        }

        // Handle map clicks
        map.on('click', function(e) {
          const message = JSON.stringify({
            type: 'mapClick',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          });
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(message);
          }
        });

        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }

    function updateRoute(locations) {
      if (!map || !locations || locations.length === 0) return;
      
      // Remove existing route
      if (routePolyline) {
        map.removeLayer(routePolyline);
      }
      
      // Remove existing location markers
      locationMarkers.forEach(marker => {
        map.removeLayer(marker);
      });
      locationMarkers = [];
      
      // Create route polyline
      const routeCoords = locations.map(loc => [loc.latitude, loc.longitude]);
      routePolyline = L.polyline(routeCoords, {
        color: 'blue',
        weight: 3,
        opacity: 0.7
      }).addTo(map);
      
      // Add small markers for each location
      locations.forEach((location, index) => {
        const locationMarker = L.circleMarker([location.latitude, location.longitude], {
          radius: 4,
          fillColor: index === 0 ? 'green' : (index === locations.length - 1 ? 'red' : 'blue'),
          color: 'white',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);
        
        // Add popup with timestamp if available
        if (location.timestamp) {
          locationMarker.bindPopup(\`
            <div>
              <strong>Location \${index + 1}</strong><br>
              Lat: \${location.latitude.toFixed(6)}<br>
              Lng: \${location.longitude.toFixed(6)}<br>
              Time: \${new Date(location.timestamp).toLocaleString()}
            </div>
          \`);
        }
        
        locationMarkers.push(locationMarker);
      });
      
      // Fit map to route bounds
      if (routeCoords.length > 0) {
        const bounds = L.latLngBounds(routeCoords);
        map.fitBounds(bounds.pad(0.1));
      }
    }

    // Initialize map when page loads
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing map');
      initializeMap();
    });

    // Fallback initialization
    setTimeout(() => {
      if (!map) {
        console.log('Fallback initialization');
        initializeMap();
      }
    }, 1000);
  </script>
</body>
</html>`;
  };

  // Update map data when props change
  useEffect(() => {
    setMapData({
      initialRegion,
      markerCoordinate,
      userLocations
    });
  }, [initialRegion, markerCoordinate, userLocations]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', data);
      
      switch (data.type) {
        case 'mapClick':
          onMapPress && onMapPress({
            latitude: data.latitude,
            longitude: data.longitude
          });
          break;
          
        case 'markerDragEnd':
          onMarkerDragEnd && onMarkerDragEnd({
            latitude: data.latitude,
            longitude: data.longitude
          });
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    centerOnLocation: (location) => {
      // Update the map by reloading with new center
      setMapData(prev => ({
        ...prev,
        initialRegion: location,
        markerCoordinate: location
      }));
    },
    
    clearMap: () => {
      setMapData(prev => ({
        ...prev,
        userLocations: []
      }));
    },
    
    fitToRoute: () => {
      // Route fitting is handled automatically when userLocations change
      console.log('Fitting to route');
    }
  }));

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: createMapHtml(mapData) }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
        mixedContentMode="compatibility"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error: ', nativeEvent);
        }}
        onLoadStart={() => console.log('WebView load started')}
        onLoadEnd={() => console.log('WebView load ended')}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default SimpleLeafletMap;