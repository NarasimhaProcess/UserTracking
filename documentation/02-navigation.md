# Application Navigation

This document describes the navigation structure of the DalabHRPORTAL User Tracking application, primarily managed using `@react-navigation`.

## Main Navigation Flow

The application uses a combination of Stack Navigators and Tab Navigators to manage screen transitions.

**[SCREENSHOT: Overall Navigation Flow Diagram]**

### Authentication Flow

Users first encounter the authentication flow:

*   [`LoginScreen`](screens/LoginScreen.md)
*   [`SignupScreen`](screens/SignupScreen.md)

Upon successful authentication, the user is directed to the `Main` screen, which hosts the primary tab navigation.

**[SCREENSHOT: Login/Signup Screens]**

### Main Tab Navigation (`TabNavigator`)

The main part of the application uses a bottom tab navigator, with tabs visible based on the user's role.

*   **Dashboard:** ([`DashboardScreen`](screens/DashboardScreen.md)) - Home screen with an overview.
*   **Map:** ([`MapScreen`](screens/MapScreen.md)) - Displays map functionalities. (Visible to `admin`/`superadmin`)
*   **History:** ([`LocationHistoryScreen`](screens/LocationHistoryScreen.md)) - Shows location history. (Visible to `admin`/`superadmin`)
*   **Admin:** ([`AdminScreen`](screens/AdminScreen.md)) - Administrative functionalities. (Visible to `admin`/`superadmin`)
*   **Customers:** ([`CreateCustomerScreen`](screens/CreateCustomerScreen.md)) - Manages customer data.
*   **News:** (`NewsTabs`) - A nested tab navigator for news-related content.
*   **Profile:** ([`ProfileScreen`](screens/ProfileScreen.md)) - User profile management.

**[SCREENSHOT: Main Tab Bar]**

### Nested News Tab Navigation (`NewsTabs`)

The 'News' tab itself contains a nested bottom tab navigator:

*   **Newspapers:** ([`NewsPaperScreen`](screens/NewsPaperScreen.md)) - Displays various online newspapers.
*   **Astrology:** ([`AstrologyWebviewScreen`](screens/AstrologyWebviewScreen.md)) - Astrology-related content.
*   **Marriage:** ([`MarriageScreen`](screens/MarriageScreen.md)) - Marriage-related content.
*   **Birthday:** ([`BirthdayScreen`](screens/BirthdayScreen.md)) - Birthday-related content.
*   **Videos:** ([`YouTubeScreen`](screens/YouTubeScreen.md)) - Video content, likely from YouTube.

**[SCREENSHOT: News Tab Bar]**

### Stack Screens (Accessed from various points)

Beyond the main tabs, several screens are part of the main stack navigator and can be navigated to from different parts of the app:

*   ([`CustomerMapScreen`](screens/CustomerMapScreen.md))
*   ([`UserExpensesScreen`](screens/UserExpensesScreen.md) (Accessed via 'Expenses' button in header)
*   ([`QuickTransactionScreen`](screens/QuickTransactionScreen.md) (Accessed via 'QuickTransaction' button in header)
*   ([`BankTransactionScreen`](screens/BankTransactionScreen.md)

**[SCREENSHOT: Example of a Stack Screen (e.g., Expenses Screen)]**
