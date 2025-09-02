// e2e/addTransaction.test.js
// Remember to add testID="your_id_here" to your React Native components
// e.g., <TextInput testID="area_search_input" />
// <TouchableOpacity testID="quick_transaction_nav_button" />

describe('Add Transaction Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Assuming you need to log in to access Quick Transaction screen
    await element(by.id('email_input')).typeText('valid@example.com'); // Replace with valid test user
    await element(by.id('password_input')).typeText('validpass'); // Replace with valid test password
    await element(by.id('sign_in_button')).tap();
    await expect(element(by.id('dashboard_welcome_text'))).toBeVisible(); // Wait for dashboard

    // Navigate to the Quick Transaction screen
    await element(by.id('quick_transaction_nav_button')).tap(); // Replace with actual testID
    await expect(element(by.id('quick_transaction_header'))).toBeVisible(); // Wait for screen to load
  });

  it('should allow adding a cash transaction for a selected customer', async () => {
    // 1. Select an Area
    await element(by.id('area_search_input')).typeText('Test Area 1'); // Replace with a valid area name
    await element(by.id('area_dropdown_item_Test_Area_1')).tap(); // Tap on the dropdown item for the area
    await expect(element(by.id('area_search_input'))).toHaveText('Test Area 1'); // Verify area is selected
    await device.takeScreenshot('AddTransaction_AreaSelected');

    // 2. Select a Customer
    await element(by.id('customer_search_input')).typeText('Customer A'); // Replace with a valid customer name/card no
    await element(by.id('customer_dropdown_item_Customer_A')).tap(); // Tap on the dropdown item for the customer
    await expect(element(by.id('selected_customer_info'))).toBeVisible(); // Verify customer info card is visible
    await device.takeScreenshot('AddTransaction_CustomerSelected');

    // 3. Fill Transaction Details
    await element(by.id('amount_input')).typeText('500');
    await element(by.id('remarks_input')).typeText('Cash payment for loan');

    // Select Payment Type: Cash (assuming default or explicit selection)
    await element(by.id('payment_type_picker')).setNativePickerValue('cash'); // Replace 'cash' with actual value

    await device.takeScreenshot('AddTransaction_DetailsFilled_Cash');

    // 4. Add Transaction
    await element(by.id('add_transaction_button')).tap();

    // Verify success message
    await expect(element(by.text('Transaction added successfully!'))).toBeVisible(); // Replace with actual success message
    await device.takeScreenshot('AddTransaction_Cash_Success');
    // Dismiss alert if it's a native Alert
    // await element(by.text('OK')).tap();
  });

  it('should allow adding a UPI transaction with image upload', async () => {
    // 1. Select an Area
    await element(by.id('area_search_input')).typeText('Test Area 2'); // Replace with a valid area name
    await element(by.id('area_dropdown_item_Test_Area_2')).tap();
    
    // 2. Select a Customer
    await element(by.id('customer_search_input')).typeText('Customer B'); // Replace with a valid customer name/card no
    await element(by.id('customer_dropdown_item_Customer_B')).tap();

    // 3. Fill Transaction Details
    await element(by.id('amount_input')).typeText('750');
    await element(by.id('remarks_input')).typeText('UPI payment for service');

    // Select Payment Type: UPI
    await element(by.id('payment_type_picker')).setNativePickerValue('upi'); // Replace 'upi' with actual value
    await device.takeScreenshot('AddTransaction_DetailsFilled_UPI');

    // 4. Upload UPI Image
    // Detox can simulate image picking. You need to provide a path to a test image.
    // Make sure 'test_upi_image.jpg' exists in your project's e2e assets or similar.
    await element(by.id('upload_upi_image_button')).tap(); // Tap the button to open image picker
    await device.selectImage({
      uri: 'path/to/your/test_upi_image.jpg', // <<< REPLACE with actual path to a test image
    });
    await expect(element(by.id('payment_proof_image_preview'))).toBeVisible(); // Verify image preview
    await device.takeScreenshot('AddTransaction_UPI_ImageUploaded');

    // 5. Add Transaction
    await element(by.id('add_transaction_button')).tap();

    // Verify success message
    await expect(element(by.text('Transaction added successfully!'))).toBeVisible();
    await device.takeScreenshot('AddTransaction_UPI_Success');
  });

  // You would add more test cases here for:
  // - Validation errors (missing amount, customer)
  // - Offline transaction saving (requires mocking network state)
  // - Viewing recent transactions list
});
