# Push Notifications

This feature enables the application to send and receive push notifications to users' devices.

## Overview

Push notifications are used to deliver timely alerts, updates, and important information to users, even when the app is not actively in use.

## Key Components/Services Involved

*   `notificationService.js`: Handles the registration of push tokens and sending of notifications.
*   [`App.js`](../../App.js): Initializes the push notification registration process.
*   Supabase: Used to store user push tokens and potentially trigger notifications via Edge Functions.

## Functionality

*   **Device Token Registration:** When a user logs in, the app registers the device for push notifications and obtains a unique push token.
    ![Push Notification Permission Prompt](../images/push-notification-permission-prompt.png)
*   **Token Storage:** The obtained push token is stored in the Supabase database, linked to the user's profile.
    ![Supabase user_push_tokens table](../images/supabase-user-push-tokens-table.png)
*   **Notification Handling:** The app is configured to handle incoming notifications, displaying them to the user.
    ![Example Push Notification](../images/example-push-notification.png)

## Implementation Details

*   Uses Expo's `expo-notifications` and `expo-device` for cross-platform push notification capabilities.
*   Requires user permission to send notifications.
*   Distinguishes between Expo Go environment and standalone/development builds for token retrieval.

## Troubleshooting

*   **"No token received" error:** Ensure the app is running on a physical device, as simulators/emulators may not support push notifications.
*   **Permissions:** Verify that notification permissions have been granted for the app in device settings.
