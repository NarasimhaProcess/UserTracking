# User Expenses Screen

This screen allows users to track and manage their expenses.

## Purpose

To provide a personal finance management tool for users to record and categorize their expenditures.

## Functionality
*   **Expense Input Form:** Allows users to add new expenses with fields for Amount, Expense Type (with an "Other" option for custom types), Remarks, and Area selection.
*   **Expense List Display:** Shows a list of recorded expenses, including amount, type, associated area, remarks, and date. Indicates if an expense is offline.
*   **Total Expenses Summary:** Displays the sum of all recorded expenses.
*   **Offline Support:** Expenses can be added without network connectivity; they are saved locally and synced when online.
*   **Area Filtering:** Expenses can be filtered by selected area.
*   **Calculator Integration:** Can open a calculator modal to help input the expense amount.

## Data Sources
*   Supabase (for `user_expenses`, `area_master`, `user_groups`).
*   `OfflineStorageService` (for local storage).
*   `NetInfoService` (for network checks).

## Components Used
*   [`CalculatorModal`](../../src/components/CalculatorModal.js)
*   `Picker` (from `@react-native-picker/picker`)
*   `FlatList` (from React Native)
*   `TextInput` (from React Native)
*   `TouchableOpacity` (from React Native)
*   `MaterialIcons` (from `@expo/vector-icons`)

## Images

![User Expenses Screen Overview](images/user-expenses-screen.png)
![User Expenses Add Form](images/user-expenses-add-form.png)
![User Expenses List](images/user-expenses-list.png)
![User Expenses Offline Sync](images/user-expenses-offline-sync.png)
![User Expenses Calculator Integration](images/user-expenses-calculator-integration.png)
