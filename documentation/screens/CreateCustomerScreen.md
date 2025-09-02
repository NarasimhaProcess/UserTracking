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

![Create Customer Screen Overview](images/create-customer-screen.png)
![Customer List with Search](images/customer-list-search.png)
![Customer Form Details](images/customer-form-details.png)
![Customer Form Repayment](images/customer-form-repayment.png)
![Customer Transaction Modal](images/customer-transaction-modal.png)
![Customer Document Modal](images/customer-document-modal.png)
![Customer Location Picker](images/customer-location-picker.png)
![Customer Item Actions](images/customer-item-actions.png)
