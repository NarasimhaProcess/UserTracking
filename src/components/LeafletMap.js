
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

// Use a direct import for the HTML file
import mapHTML from '../../assets/map.html';

const LeafletMap = ({ onMapPress, initialRegion, markerCoordinate, mapHtmlContent }) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (webViewRef.current && mapHtmlContent) {
      // Send initial region when the WebView is ready
      const initialLoadMessage = JSON.stringify({ type: 'initialLoad', initialRegion: initialRegion });
      webViewRef.current.postMessage(initialLoadMessage);
    }
  }, [initialRegion, mapHtmlContent]); // Depend on initialRegion and mapHtmlContent

  useEffect(() => {
    if (markerCoordinate && webViewRef.current) {
      const markerUpdateMessage = JSON.stringify({ type: 'markerUpdate', markerCoordinate: markerCoordinate });
      webViewRef.current.postMessage(markerUpdateMessage);
    }
  }, [markerCoordinate]);

  const handleMessage = (event) => {
    if (onMapPress) {
      const data = JSON.parse(event.nativeEvent.data);
      onMapPress(data);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: mapHtmlContent }}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      style={{ flex: 1 }}
    />
  );
};

export default LeafletMap;
