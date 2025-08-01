
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

// Use a direct import for the HTML file


const LeafletMap = ({ onMapPress, initialRegion, markerCoordinate, mapHtmlContent }) => {
  const webViewRef = useRef(null);

  const onWebViewLoadEnd = () => {
    if (webViewRef.current && mapHtmlContent && initialRegion) {
      const initialLoadMessage = JSON.stringify({ type: 'initialLoad', initialRegion: initialRegion });
      console.log("Sending initialLoad message to WebView:", initialLoadMessage);
      webViewRef.current.postMessage(initialLoadMessage);
    }
  };

  useEffect(() => {
    if (markerCoordinate && webViewRef.current) {
      const markerUpdateMessage = JSON.stringify({ type: 'markerUpdate', markerCoordinate: markerCoordinate });
      console.log("Sending markerUpdate message to WebView:", markerUpdateMessage);
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
      onLoadEnd={onWebViewLoadEnd}
      style={{ flex: 1 }}
    />
  );
};

export default LeafletMap;
