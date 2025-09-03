# Quick Transaction Screen

This screen facilitates quick and easy recording of transactions.

## Purpose

To allow users to rapidly log financial transactions without navigating through complex forms.

## Functionality
*   **Area Selection:** Allows selecting an area to filter customers.
*   **Customer Selection:** Select a customer from a filtered list (by area and search).
*   **Transaction Input Form:** Input Amount (pre-populates with repayment amount), Remarks, Payment Type (Cash/UPI).
*   **UPI Image Upload:** For UPI transactions, allows uploading a payment proof image (camera/gallery) to Supabase Storage.
*   **Offline Support:** Transactions (including UPI images) are saved locally when offline and synced when online.
*   **Recent Transactions List:** Displays a list of recently added transactions with sync status.
*   **Data Syncing:** Automatically syncs offline data when network is available.

## Data Sources
*   Supabase (for `transactions`, `customers`, `area_master`).
*   `OfflineStorageService` (for local storage).
*   `NetInfoService` (for network checks).

## Components Used
*   `Picker` (from `@react-native-picker/picker`)
*   `TextInput` (from React Native)
*   `TouchableOpacity` (from React Native)
*   `FlatList` (from React Native)
*   `MaterialIcons` (from `@expo/vector-icons`)
*   `ActivityIndicator` (from React Native)

## Images

<img src="images/quick-transaction-screen.png" alt="Quick Transaction Screen Overview" width="200"/>
<img src="images/quick-transaction-form.png" alt="Quick Transaction Form" width="200"/>
<img src="images/quick-transaction-customer-select.png" alt="Quick Transaction Customer Select" width="200"/>
<img src="images/quick-transaction-upi-upload.png" alt="Quick Transaction UPI Upload" width="200"/>
<img src="images/quick-transaction-recent-list.png" alt="Quick Transaction Recent List" width="200"/>
