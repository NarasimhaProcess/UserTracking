// e2e/customerCreate.test.js
// Remember to add testID="your_id_here" to your React Native components
// e.g., <TextInput testID="customer_name_input" />
// <TouchableOpacity testID="create_customer_nav_button" />

describe('Customer Create Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Assuming you need to log in to access customer creation
    // You might want to create a helper function for login if many tests require it
    await element(by.id('email_input')).typeText('valid@example.com'); // Replace with valid test user
    await element(by.id('password_input')).typeText('validpass'); // Replace with valid test password
    await element(by.id('sign_in_button')).tap();
    await expect(element(by.id('dashboard_welcome_text'))).toBeVisible(); // Wait for dashboard
  });

  it('should navigate to customer creation form and display elements', async () => {
    // Assuming a button on the dashboard or main screen navigates to customer creation
    await element(by.id('create_customer_nav_button')).tap(); // Replace with actual testID

    await expect(element(by.id('customer_name_input'))).toBeVisible();
    await expect(element(by.id('customer_mobile_input'))).toBeVisible();
    await expect(element(by.id('customer_email_input'))).toBeVisible();
    await expect(element(by.id('customer_book_no_input'))).toBeVisible();
    await expect(element(by.id('customer_type_picker'))).toBeVisible();
    await expect(element(by.id('area_picker'))).toBeVisible();
    await expect(element(by.id('amount_given_input'))).toBeVisible();
    await expect(element(by.id('repayment_frequency_picker'))).toBeVisible();
    await expect(element(by.id('repayment_amount_input'))).toBeVisible();
    await expect(element(by.id('days_to_complete_input'))).toBeVisible();
    await expect(element(by.id('start_date_input'))).toBeVisible();
    await expect(element(by.id('save_customer_button'))).toBeVisible();

    await device.takeScreenshot('Customer_Create_Form_Initial');
  });

  it('should show validation errors for missing required fields', async () => {
    await element(by.id('create_customer_nav_button')).tap(); // Navigate to form

    // Attempt to save without filling any fields
    await element(by.id('save_customer_button')).tap();

    // Assuming an alert or specific text indicates missing fields
    await expect(element(by.text('Required Fields Missing'))).toBeVisible(); // Replace with actual error message
    await device.takeScreenshot('Customer_Create_Validation_Error');
    // If it's a native Alert, dismiss it
    // await element(by.text('OK')).tap();
  });

  it('should allow creating a new customer with valid data', async () => {
    await element(by.id('create_customer_nav_button')).tap(); // Navigate to form

    // Fill in all required fields with unique data for a new customer
    await element(by.id('customer_name_input')).typeText('Test Customer ' + Date.now());
    await element(by.id('customer_mobile_input')).typeText('1234567890'); // Use a unique mobile
    await element(by.id('customer_email_input')).typeText('test' + Date.now() + '@example.com'); // Use a unique email
    await element(by.id('customer_book_no_input')).typeText('BOOK' + Date.now().toString().slice(-4)); // Use a unique book no

    // Select customer type (assuming Picker)
    await element(by.id('customer_type_picker')).setNativePickerValue('food'); // Replace 'food' with a valid value
    
    // Select area (assuming Picker)
    await element(by.id('area_picker')).setNativePickerValue('area_id_1'); // Replace 'area_id_1' with a valid area ID
    
    await element(by.id('amount_given_input')).typeText('1000');
    await element(by.id('repayment_frequency_picker')).setNativePickerValue('weekly'); // Replace with valid value
    await element(by.id('repayment_amount_input')).typeText('100');
    await element(by.id('days_to_complete_input')).typeText('10');
    await element(by.id('start_date_input')).typeText('2025-01-01'); // Replace with a valid date format

    await device.takeScreenshot('Customer_Create_Form_Filled');

    await element(by.id('save_customer_button')).tap();

    // Verify success message or navigation back to customer list
    await expect(element(by.text('Customer created successfully!'))).toBeVisible(); // Replace with actual success message
    await device.takeScreenshot('Customer_Create_Success');
    // If it's a native Alert, dismiss it
    // await element(by.text('OK')).tap();
  });

  // You would add more test cases here for:
  // - Handling duplicate mobile/card numbers
  // - Testing optional fields
  // - Testing different repayment plan calculations
});
