import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

export default function CustomerMapScreen({ route }) {
  const navigation = useNavigation();
  const { groupId, areaId } = route.params;
  const [customerLocations, setCustomerLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCustomerLocations() {
      console.log('fetchCustomerLocations started. groupId:', groupId, 'areaId:', areaId);
      try {
        setLoading(true);
        let query = supabase
          .from('customers')
          .select('id, name, email, latitude, longitude, area_id, mobile, book_no'); // Include mobile and book_no

        if (groupId) {
          console.log('Fetching customer_groups for groupId:', groupId);
          // Fetch customer_ids within the selected group
          const { data: customerGroups, error: customerGroupError } = await supabase
            .from('customer_groups') // Assuming a customer_groups table
            .select('customer_id')
            .eq('group_id', groupId);

          if (customerGroupError) {
            console.error('Supabase Error fetching customer_groups:', customerGroupError);
            throw customerGroupError;
          }
          console.log('customerGroups fetched:', customerGroups);
          const customerIdsInGroup = customerGroups.map(cg => cg.customer_id);
          query = query.in('id', customerIdsInGroup);
        }

        if (areaId) {
          console.log('Filtering by areaId:', areaId);
          // If areaId is provided, filter directly by area_id on the customers table
          query = query.eq('area_id', areaId);
        }

        console.log('Executing final customers query...');
        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Supabase Error fetching customers:', fetchError);
          throw fetchError;
        }
        console.log('Customers data fetched:', data);

        let filteredLocations = data.filter(customer => customer.latitude && customer.longitude);
        console.log('Filtered locations (with lat/lon):', filteredLocations);

        setCustomerLocations(filteredLocations);
        console.log('customerLocations state updated.');
      } catch (err) {
        console.error('Error fetching customer locations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log('setLoading(false) called.');
      }
    }

    fetchCustomerLocations();
  }, [groupId, areaId]);

  // Haversine distance function (still useful for internal calculations if needed)
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Nearest Neighbor algorithm for approximate TSP (kept for reference, not used by LRM)
  const calculateShortestPath = (locations) => {
    if (locations.length === 0) return [];

    let unvisited = [...locations];
    let path = [];
    let current = unvisited.shift(); // Start with the first location
    path.push(current);

    while (unvisited.length > 0) {
      let nearest = null;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = haversineDistance(
          current.latitude, current.longitude,
          unvisited[i].latitude, unvisited[i].longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = unvisited[i];
        }
      }
      path.push(nearest);
      unvisited = unvisited.filter(loc => loc !== nearest);
      current = nearest;
    }
    return path;
  };

  // const orderedLocations = calculateShortestPath(customerLocations); // Not directly used by LRM

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading customer locations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  console.log('WebView: customerLocations before HTML generation:', customerLocations);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Customer Map</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
        <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #mapid { width: 100vw; height: 100vh; background-color: #f0f0f0; border: 2px solid red; }
            .leaflet-routing-container { display: none; } /* Hide routing control UI */
            #totalDistance { 
                position: absolute; 
                bottom: 10px; 
                left: 50%; 
                transform: translateX(-50%);
                background-color: white; 
                padding: 3px 8px; /* Reduced padding */
                border-radius: 3px; /* Reduced border-radius */
                z-index: 1000; 
                font-weight: bold; 
                white-space: nowrap; /* Ensure it stays on one line */
                font-size: 14px; /* Slightly smaller font size */
            }
        </style>
    </head>
    <body>
        <div id="mapid"></div>
        <div id="totalDistance"></div>
        <script>
            var map = L.map('mapid').setView([0, 0], 2); // Default view, will be adjusted

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            var customerLocations = ${JSON.stringify(customerLocations.map(loc => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                name: loc.name || loc.email,
                mobile: loc.mobile || 'N/A',
                book_no: loc.book_no || 'N/A',
                id: loc.id // Include customer ID for view details button
            })))};

            console.log('WebView: customerLocations received:', customerLocations);
                       if (customerLocations.length > 0) {
                var waypoints = customerLocations.map(function(loc) {
                    return L.latLng(loc.latitude, loc.longitude);
                });

                // Create routing control
                var routingControl = L.Routing.control({
                    waypoints: waypoints,
                    routeWhileDragging: false,
                    showAlternatives: false,
                    addWaypoints: false,
                    draggableWaypoints: false,
                    fitSelectedRoutes: true,
                    show: false, // Hide the routing instructions panel
                    lineOptions: {
                        styles: [{
                            color: 'blue',
                            weight: 5
                        }]
                    },
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1'
                    })
                }).addTo(map);

                // Fit map to all markers and the route
                routingControl.on('routesfound', function(e) {
                    var routes = e.routes;
                    console.log('Leaflet Routing Machine: Routes found', routes);
                    if (routes.length > 0) {
                        var bounds = L.latLngBounds([]);
                        routes[0].coordinates.forEach(function(coord) {
                            bounds.extend(coord);
                        });
                        customerLocations.forEach(function(loc) {
                            bounds.extend(L.latLng(loc.latitude, loc.longitude));
                        });
                        map.fitBounds(bounds);

                        // Add markers with popups
                        customerLocations.forEach(function(location) {
                            L.marker([location.latitude, location.longitude])
                                .addTo(map)
                                .bindPopup(
                                   '<b>' + (location.name || 'Customer') + '</b><br/>' +
'Mobile: ' + (location.mobile || 'N/A') + '<br/>' +
'Card No: ' + (location.book_no || 'N/A') + '<br/>'                                 );
                        });

                        // Display total distance
                        var totalDistance = (routes[0].summary.totalDistance / 1000).toFixed(2);
                        document.getElementById('totalDistance').innerHTML = 'Total Distance: ' + totalDistance + ' km';

                        // Display total duration (optional)
                        var totalTime = (routes[0].summary.totalTime / 60).toFixed(0);
                        console.log('Total Time:', totalTime, 'minutes');
                    } else {
                        console.log('Leaflet Routing Machine: No routes found.');
                        document.getElementById('totalDistance').innerHTML = 'No route found.';
                    }
                });
                routingControl.on('routingerror', function(e) {
                    console.error('Leaflet Routing Machine Error:', e.error.message);
                    document.getElementById('totalDistance').innerHTML = 'Routing Error: ' + e.error.message;
                });
            } else {
                console.log('No customer locations to display.');
                document.getElementById('totalDistance').innerHTML = 'No customer locations to display.';
            }
        </script>
    </body>
    </html>
  `;

  console.log('WebView: Generated HTML content:', htmlContent);

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          if (message.startsWith('view_details:')) {
            const customerId = message.split(':')[1];
            // Navigate to CreateCustomerScreen in read-only mode
            navigation.navigate('Customers', { customerId: customerId, readOnly: true });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});
