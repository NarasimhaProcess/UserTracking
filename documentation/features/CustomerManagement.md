# Customer Management

This feature encompasses all functionalities related to managing customer records within the application.

## Overview

Users with appropriate permissions can create, view, and potentially modify customer profiles.

## Key Screens/Components Involved

*   [`CreateCustomerScreen`](../screens/CreateCustomerScreen.md): For adding new customers.
*   [`CustomerMapScreen`](../screens/CustomerMapScreen.md): For visualizing customer locations.
*   `CustomerItemActions` (component): For actions related to individual customer items.

## Functionality

*   **Adding New Customers:** Users can input various details to create a new customer profile.
    <img src="../images/create-customer-form.png" alt="Create Customer Form" width="200"/>
*   **Viewing Customer List:** A list of all registered customers is accessible.
    <img src="../images/customer-list.png" alt="Customer List" width="200"/>
*   **Customer Details:** Viewing detailed information for a selected customer.
    <img src="../images/customer-detail-view.png" alt="Customer Detail View" width="200"/>
*   **Customer Location Tracking:** Integration with mapping features to track or display customer locations.
    <img src="../images/customer-on-map.png" alt="Customer on Map" width="200"/>

## Permissions

Access to customer management features may vary based on user roles (e.g., `admin` vs. `user`). Refer to the [User Roles and Permissions](03-user-roles.md) documentation for details.
