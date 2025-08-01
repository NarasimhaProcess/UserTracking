import 'dotenv/config';

export default {
  "expo": {
    "name": "Location Tracker",
    "slug": "UserTracking",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "icon": "./assets/icon.png",
    "splash": {
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Location Tracker needs access to location to track your movements for location history.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Location Tracker needs access to location to track your movements even when the app is in background for continuous tracking.",
        "NSLocationAlwaysUsageDescription": "Location Tracker needs access to location to track your movements in background for continuous location monitoring.",
        "UIBackgroundModes": [
          "location",
          "background-processing"
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.WAKE_LOCK",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO"
      ],
      "package": "com.narasimhaexpo.locationtrackermobile"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/icon.png"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow User Tracking to use your location for tracking purposes.",
          "locationAlwaysPermission": "Allow User Tracking to use your location in the background for continuous tracking."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow User Tracking to access your photos to upload profile images."
        }
      ]
    ],
    "updates": {
      "url": "https://u.expo.dev/e1129aeb-d49c-498a-8a68-9063bb755b96"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "sdkVersion": "53.0.0",
    "extra": {
      SUPABASE_URL: "https://otmklncbcfbfrvvtdgme.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bWtsbmNiY2ZiZnJ2dnRkZ21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk1MTMsImV4cCI6MjA2OTIzNTUxM30.nbDhERSwKOS2DV6Rk78f5sUB9MZoyZWWVxARDNs4u5E",
      "eas": {
        "projectId": "otmklncbcfbfrvvtdgme"
      }
    }
  }
}; 