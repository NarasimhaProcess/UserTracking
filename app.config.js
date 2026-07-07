import 'dotenv/config';

export default {
  "expo": {
    "name": "Location Tracker",
    "slug": "UserTracking",
    "scheme": "usertracking",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "icon": "./assets/icon.png",
    "jsEngine": "jsc",
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
        ],
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF"
      },
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true, 
      "usesCleartextTraffic": true,
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
      "favicon": "./assets/icon.png",
      "jsEngine": "jsc"
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
    "experiments": {
      "baseUrl": "/UserTracking"
    },
    "extra": {
      SUPABASE_URL: process.env.SUPABASE_URL || "https://lodjfazrbdxvpengusxn.supabase.co",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGpmYXpyYmR4dnBlbmd1c3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjI3MDIsImV4cCI6MjA5MzIzODcwMn0.t9yxku6j7-8ugxP_zGsRfjhT3F6P7rKsnX-wDloy_OM",
      "eas": {
        "projectId": "e1129aeb-d49c-498a-8a68-9063bb755b96"
      }
    }
  }
}; 