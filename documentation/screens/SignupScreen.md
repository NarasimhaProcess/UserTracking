# Signup Screen

This screen allows new users to create an account for the application.

## Purpose

To register new users and set up their initial profile within the application.

## Functionality
*   **User Registration Form:** Allows users to sign up by providing Full Name, Mobile Number, Email Address, Password, and Confirm Password.
*   **Form Validation:** Checks for required fields, password matching, and minimum password length.
*   **Duplicate User Check:** Verifies if a user with the provided email already exists.
*   **Supabase Authentication:** Integrates with Supabase's authentication service to create the user's auth account.
*   **User Profile Creation:** Creates a corresponding user profile entry in the `users` table in Supabase.
*   **Push Notification Registration:** Attempts to register the device for push notifications for the new user.
*   **Success/Error Alerts:** Provides feedback via alerts for successful account creation or errors.
*   **Email Verification:** Informs the user to check their email for verification.
*   **Navigation to Login:** Includes a link to navigate back to the `LoginScreen`.
*   **Loading Indicator:** Shows a loading state during the signup process.
*   **Keyboard Handling:** Adjusts layout when the keyboard appears.

## Data Sources
*   Supabase (for user authentication, `users` table).

## Components Used
*   `TextInput` (from React Native)
*   `TouchableOpacity` (from React Native)
*   `Alert` (from React Native)
*   `KeyboardAvoidingView` (from React Native)
*   `ScrollView` (from React Native)

## Images

![Signup Screen Overview](images/login-signup-screens.png)
![Signup Screen Form](images/signup-screen-form.png)
![Signup Screen Validation Error](images/signup-screen-validation-error.png)
