import React, { forwardRef } from 'react';
import { WebView as RNWebView } from 'react-native-webview';

export const WebView = forwardRef((props, ref) => {
  return <RNWebView ref={ref} {...props} />;
});

export default WebView;
