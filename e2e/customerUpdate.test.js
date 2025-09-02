// e2e/customerUpdate.test.js
// Remember to add testID="your_id_here" to your React Native components
// e.g., <Text testID="customer_name_display" />
// <TouchableOpacity testID="edit_customer_button_ID" />

describe('Customer Update Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Assuming you need to log in to access customer list
    await element(by.id('email_input')).typeText('valid@example.com'); // Replace with valid test user
    await element(by.id('password_input')).typeText('validpass'); // Replace with valid test password
    await element(by.id('sign_in_button')).tap();
    await expect(element(by.id('dashboard_welcome_text'))).toBeVisible(); // Wait for dashboard

    // Navigate to the customer list screen/tab
    // Assuming there's a tab or button to go to customers
    await element(by.id('customers_tab_button')).tap(); // Replace with actual testID for Customers tab/nav button
    await expect(element(by.id('customer_list_header'))).toBeVisible(); // Wait for customer list to load
  });

  it('should allow updating an existing customer without transactions', async () => {
    // Assuming a customer named 'Customer A' without transactions exists and is visible
    // You might need to scroll to find the customer if the list is long
    // await element(by.id('customer_list_flatlist')).scroll(200, 'down');

    // Find the customer item and tap its edit button
    // Replace 'customer_A_name' with the actual testID or text of the customer you want to edit
    // Replace 'edit_button_for_customer_A' with the actual testID for the edit button
    await element(by.text('Customer A')).tap(); // Tap on the customer item to expand/select it
    await element(by.id('edit_customer_button_for_CustomerA')).tap(); // Tap the edit button for that customer

    await expect(element(by.id('customer_name_input'))).toBeVisible(); // Verify edit form is visible

    // Change a field, e.g., mobile number
    await element(by.id('customer_mobile_input')).clearText();
    await element(by.id('customer_mobile_input')).typeText('9876543210');

    await device.takeScreenshot('Customer_Edit_Form_Modified');

    // Save changes
    await element(by.id('save_customer_button')).tap();

    // Verify success message
    await expect(element(by.text('Customer updated successfully!'))).toBeVisible(); // Replace with actual success message
    await device.takeScreenshot('Customer_Update_Success');
    // Dismiss alert if it's a native Alert
    // await element(by.text('OK')).tap();
  });

  it('should prevent editing a customer with existing transactions', async () => {
    // Assuming a customer named 'Customer B' WITH transactions exists and is visible
    await element(by.text('Customer B')).tap(); // Tap on the customer item
    await element(by.id('edit_customer_button_for_CustomerB')).tap(); // Tap the edit button for that customer

    // Verify the alert/message indicating that editing is not allowed
    await expect(element(by.text('Cannot Edit Customer'))).toBeVisible(); // Replace with actual message
    await device.takeScreenshot('Customer_Edit_With_Transactions_Error');
    // Dismiss alert if it's a native Alert
    // await element(by.text('OK')).tap();
  });

  // You would add more test cases here for:
  // - Testing different field updates
  // - Testing validation errors during update
  // - Testing cancellation of edit
});
