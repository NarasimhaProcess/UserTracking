# Login Screen

This screen provides the primary entry point for users to log into the application.

## Purpose

To authenticate users and grant them access to the application's features.

## Functionality
*   **Email and Password Login:** Allows users to sign in using their registered email and password.
*   **User Validation:** Checks if the user's email exists in the database before authentication.
*   **Supabase Authentication:** Integrates with Supabase's authentication service for secure login.
*   **Error Handling:** Displays alerts for invalid credentials, user not found, or other login errors.
*   **Loading Indicator:** Shows a loading state during the login process.
*   **Password Reset:** Provides a "Forgot Password?" link that sends a password reset email.
*   **Navigation to Signup:** Includes a link to navigate to the `SignupScreen`.
*   **Push Notification Registration:** After successful login, attempts to register the device for push notifications.
*   **Biometric Authentication Prompt:** Prompts the user to enable biometric login (fingerprint/Face ID) for faster future logins.
*   **Keyboard Handling:** Adjusts layout when the keyboard appears.

## Data Sources
*   Supabase (for user authentication, user data, password reset).
*   `AsyncStorage` (for storing biometric preferences).

## Components Used
*   `TextInput` (from React Native)
*   `TouchableOpacity` (from React Native)
*   `Alert` (from React Native)
*   `KeyboardAvoidingView` (from React Native)
*   `ScrollView` (from React Native)

## Images

<img src="images/app-login-screen.png" alt="Login Screen Overview" width="200"/>
<img src="images/login-screen-form.png" alt="Login Screen Form" width="200"/>
<img src="images/login-screen-biometrics-prompt.png" alt="Login Screen Biometrics Prompt" width="200"/>
<img src="images/login-screen-forgot-password.png" alt="Login Screen Forgot Password" width="200"/>
