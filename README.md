# LocalWala UserTracking App 

This document outlines the key features and recent enhancements made to the UserTracking mobile application.

## Features & Enhancements

### 1. User Authentication & Management
- **Robust Login Flow:** Enhanced login process with improved navigation handling, ensuring smooth transitions to the main application dashboard upon successful authentication.
- **Seamless Logout:** Implemented a reliable logout mechanism that correctly clears user sessions and redirects to the login screen, allowing for easy switching between user accounts.
- **Biometric Authentication (Fingerprint/Face ID):**
    - Integrated optional biometric login for faster and more secure access.
    - Improved user experience: The app now remembers if a user declines biometric setup, preventing repeated prompts on subsequent logins.
    - Graceful handling for devices without biometric hardware or enrolled biometrics, ensuring the login process proceeds without interruption.

### 2. Push Notifications
- **Comprehensive Notification System:** Integrated push notifications using Expo Notifications for real-time alerts.
- **Supabase Integration:** Leverages Supabase for secure storage of device push tokens and backend logic for sending notifications.
- **Event-Driven Alerts:** Notifications are automatically triggered for key events:
    - New customer additions.
    - New bank transactions (including quick transactions).
    - **NEW:** New user expenses.
- **Note:** For push notifications to function in standalone Android APKs, ensure the `google-services.json` file from your Firebase project is correctly placed in the project root and configured in `app.config.js`.

### 3. Real-time Global Chat & Presence
- **Group-Based Communication:** Enables real-time chat within selected user groups.
- **Live Presence Indicators:** Users can see who is currently online within their active chat group.
- **Scalable Design:** Handles groups with multiple participants gracefully, with horizontal scrolling for large user lists.
- **Note:** A database schema update is required for the `messages` table to include the `sender_email` column for proper chat functionality. Please run the provided SQL script against your Supabase database.

### 4. Header UI Enhancements (Pending)
- **Improved Navigation Bar Layout:** Icons for real-time cursor visibility and global chat will be moved to the left side of the header, next to the profile photo, for better accessibility and organization.

---

## Getting Started

(Placeholder for setup instructions - e.g., `npm install`, `npx expo start`)

## Development

(Placeholder for development guidelines - e.g., `npm run android`, `npm run ios`)

## Deployment

(Placeholder for deployment instructions - e.g., `eas build`)
