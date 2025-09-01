# User Roles and Permissions

This document outlines the different user roles within the DalabHRPORTAL User Tracking application and their associated permissions, primarily focusing on access to different sections and features.

User roles are determined by the `user_type` field in the user's profile, which is stored in the `users` table in Supabase.

## Role Definitions and Access

### 1. `user` (General User)

This is the basic user type. They have access to core functionalities and information relevant to a standard user.

*   **Access:**
    *   Dashboard
    *   Customers
    *   News (including Newspapers, Astrology, Marriage, Birthday, Videos)
    *   Profile
*   **No Access:**
    *   Map
    *   History
    *   Admin

**[SCREENSHOT: General User Dashboard]**

### 2. `customer`

This role is specifically designed for customer accounts. In terms of main navigation, their access is similar to a general `user`.

*   **Access:**
    *   Dashboard
    *   Customers
    *   News (including Newspapers, Astrology, Marriage, Birthday, Videos)
    *   Profile
*   **No Access:**
    *   Map
    *   History
    *   Admin

**[SCREENSHOT: Customer User Profile]**

### 3. `admin`

Administrators have elevated privileges, allowing them to manage various aspects of the application and access more sensitive data.

*   **Access:**
    *   Dashboard
    *   Customers
    *   News (including Newspapers, Astrology, Marriage, Birthday, Videos)
    *   Profile
    *   Map
    *   History
    *   Admin (Access to the administrative panel)

**[SCREENSHOT: Admin Dashboard with Admin Tab]**

### 4. `superadmin`

The `superadmin` role represents the highest level of administrative access. In the current application's main navigation logic, `superadmin` has the same tab access as an `admin`.

*   **Access:**
    *   Dashboard
    *   Customers
    *   News (including Newspapers, Astrology, Marriage, Birthday, Videos)
    *   Profile
    *   Map
    *   History
    *   Admin (Access to the administrative panel)

**Note:** While `superadmin` and `admin` have the same tab visibility in the main navigation, it is possible that specific functionalities or data within the `AdminScreen` itself might be further restricted or expanded based on whether the user is a `superadmin`.

**[SCREENSHOT: Superadmin Admin Screen (if different from Admin)]**
