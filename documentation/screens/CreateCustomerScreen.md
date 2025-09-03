# Create Customer Screen

This screen is used for creating and managing customer records within the application.

## Purpose

To allow users to add new customer profiles and potentially edit existing ones.

## Functionality
*   **Customer List & Search:** Displays a filterable list of customers. Users can search by various criteria, including comma-separated terms.
*   **Customer Form (Create/Edit):** Allows creating new customer profiles or editing existing ones (if they have no transactions). Includes comprehensive fields for customer details, repayment plans, and date calculations.
*   **Repayment Plan Integration:** Automatically calculates repayment details based on selected plan and amount.
*   **Date Calculation:** Automatically calculates end date based on start date, frequency, and days.
*   **Validation & Duplicate Checks:** Ensures data integrity and prevents duplicate entries.
*   **Location Picker:** Allows selecting a customer's location on a map.
*   **Transaction Management:** View a customer's transaction history, add new transactions (including UPI image upload), and export transactions to CSV.
*   **Document Management:** View and upload images associated with a customer.
*   **Customer Status Change:** Allows changing a customer's status (for admins/superadmins).
*   **Clone Customer:** Creates a new customer profile by pre-populating fields from an existing one.
*   **Calculator Integration:** Can open a calculator modal for calculations.
*   **Access Control:** Filters customers and areas based on user's group memberships and user type.

## Data Sources
*   Supabase (for customers, areas, repayment plans, transactions, customer documents, user groups).
*   `expo-location` (for location detection and permissions).
*   `expo-image-picker` (for image upload).
*   `expo-document-picker` (for CSV upload).

## Components Used
*   [`AreaSearchBar`](../../src/components/AreaSearchBar.js)
*   [`CustomerItemActions`](../../src/components/CustomerItemActions.js)
*   [`LeafletMap`](../../src/components/LeafletMap.js)
*   [`CalculatorModal`](../../src/components/CalculatorModal.js)
*   [`EnhancedDatePicker`](../../src/components/EnhancedDatePicker.js)

## Images

<img src="images/create-customer-screen.png" alt="Create Customer Screen Overview" width="200"/>
<img src="images/customer-list-search.png" alt="Customer List with Search" width="200"/>
<img src="images/customer-form-details.png" alt="Customer Form Details" width="200"/>
<img src="images/customer-form-repayment.png" alt="Customer Form Repayment" width="200"/>
<img src="images/customer-transaction-modal.png" alt="Customer Transaction Modal" width="200"/>
<img src="images/customer-document-modal.png" alt="Customer Document Modal" width="200"/>
<img src="images/customer-location-picker.png" alt="Customer Location Picker" width="200"/>
<img src="images/customer-item-actions.png" alt="Customer Item Actions" width="200"/>
