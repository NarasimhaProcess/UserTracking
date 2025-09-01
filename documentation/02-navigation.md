# Application Navigation

This document describes the navigation structure of the DalabHRPORTAL User Tracking application, primarily managed using `@react-navigation`.

## Main Navigation Flow

The application uses a combination of Stack Navigators and Tab Navigators to manage screen transitions.

**[SCREENSHOT: Overall Navigation Flow Diagram]**

### Authentication Flow

Users first encounter the authentication flow:

*   `LoginScreen`
*   `SignupScreen`

Upon successful authentication, the user is directed to the `Main` screen, which hosts the primary tab navigation.

**[SCREENSHOT: Login/Signup Screens]**

### Main Tab Navigation (`TabNavigator`)

The main part of the application uses a bottom tab navigator, with tabs visible based on the user's role.

*   **Dashboard:** (`DashboardScreen`) - Home screen with an overview.
*   **Map:** (`MapScreen`) - Displays map functionalities. (Visible to `admin`/`superadmin`)
*   **History:** (`LocationHistoryScreen`) - Shows location history. (Visible to `admin`/`superadmin`)
*   **Admin:** (`AdminScreen`) - Administrative functionalities. (Visible to `admin`/`superadmin`)
*   **Customers:** (`CreateCustomerScreen`) - Manages customer data.
*   **News:** (`NewsTabs`) - A nested tab navigator for news-related content.
*   **Profile:** (`ProfileScreen`) - User profile management.

**[SCREENSHOT: Main Tab Bar]**

### Nested News Tab Navigation (`NewsTabs`)

The 'News' tab itself contains a nested bottom tab navigator:

*   **Newspapers:** (`NewsPaperScreen`) - Displays various online newspapers.
*   **Astrology:** (`AstrologyWebviewScreen`) - Astrology-related content.
*   **Marriage:** (`MarriageScreen`) - Marriage-related content.
*   **Birthday:** (`BirthdayScreen`) - Birthday-related content.
*   **Videos:** (`YouTubeScreen`) - Video content, likely from YouTube.

**[SCREENSHOT: News Tab Bar]**

### Stack Screens (Accessed from various points)

Beyond the main tabs, several screens are part of the main stack navigator and can be navigated to from different parts of the app:

*   `CustomerMapScreen`
*   `UserExpensesScreen` (Accessed via 'Expenses' button in header)
*   `QuickTransactionScreen` (Accessed via 'QuickTransaction' button in header)
*   `BankTransactionScreen`

**[SCREENSHOT: Example of a Stack Screen (e.g., Expenses Screen)]**
