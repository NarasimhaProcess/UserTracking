import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { View } from 'react-native';

export const WebView = forwardRef(({ 
  source, 
  style, 
  onMessage, 
  javaScriptEnabled,
  domStorageEnabled,
  startInLoadingState,
  scalesPageToFit,
  bounces,
  scrollEnabled,
  mixedContentMode,
  originWhitelist,
  onLoadStart,
  onLoadEnd,
  onError,
  onHttpError,
  allowsFullscreenVideo,
  ...props 
}, ref) => {
  const iframeRef = useRef(null);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          // For srcDoc or same-origin iframes, we can try to execute script directly
          iframeRef.current.contentWindow.eval(script);
        } catch (e) {
          console.error('Error injecting JS into iframe:', e);
          // Fallback: try postMessage if the iframe is listening
          iframeRef.current.contentWindow.postMessage({ type: 'injectJS', script }, '*');
        }
      }
    },
    reload: () => {
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    }
  }));

  useEffect(() => {
    const handleMessage = (event) => {
      if (onMessage) {
        // Wrap the event to match RNWebView's onMessage structure
        onMessage({
          nativeEvent: {
            data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
          }
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  const iframeStyle = {
    border: 'none',
    width: '100%',
    height: '100%',
    ...style
  };

  const handleLoad = () => {
    if (onLoadEnd) onLoadEnd();
  };

  // If it's HTML content
  if (source && source.html) {
    const polyfill = `
      <script>
        if (!window.ReactNativeWebView) {
          window.ReactNativeWebView = {
            postMessage: function(data) {
              window.parent.postMessage(data, '*');
            }
          };
        }
      </script>
    `;
    return (
      <iframe
        ref={iframeRef}
        srcDoc={polyfill + source.html}
        style={iframeStyle}
        onLoad={handleLoad}
        allowFullScreen={allowsFullscreenVideo}
        {...props}
      />
    );
  }

  // If it's a URI
  if (source && source.uri) {
    return (
      <iframe
        ref={iframeRef}
        src={source.uri}
        style={iframeStyle}
        onLoad={handleLoad}
        allowFullScreen={allowsFullscreenVideo}
        {...props}
      />
    );
  }

  return <View style={style} />;
});

export default WebView;
