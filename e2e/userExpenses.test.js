// e2e/userExpenses.test.js
// Remember to add testID="your_id_here" to your React Native components
// e.g., <TextInput testID="expense_area_search_input" />
// <TouchableOpacity testID="user_expenses_nav_button" />

describe('User Expenses Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Assuming you need to log in to access User Expenses screen
    await element(by.id('email_input')).typeText('valid@example.com'); // Replace with valid test user
    await element(by.id('password_input')).typeText('validpass'); // Replace with valid test password
    await element(by.id('sign_in_button')).tap();
    await expect(element(by.id('dashboard_welcome_text'))).toBeVisible(); // Wait for dashboard

    // Navigate to the User Expenses screen
    await element(by.id('user_expenses_nav_button')).tap(); // Replace with actual testID
    await expect(element(by.id('user_expenses_header'))).toBeVisible(); // Wait for screen to load
  });

  it('should allow adding an expense for a selected area', async () => {
    // 1. Select an Area
    await element(by.id('expense_area_search_input')).typeText('Test Area A'); // Replace with a valid area name
    await element(by.id('expense_area_dropdown_item_Test_Area_A')).tap(); // Tap on the dropdown item for the area
    await expect(element(by.id('expense_area_search_input'))).toHaveText('Test Area A'); // Verify area is selected
    await device.takeScreenshot('UserExpenses_AreaSelected');

    // 2. Fill Expense Details
    await element(by.id('expense_amount_input')).typeText('150');
    await element(by.id('expense_remarks_input')).typeText('Lunch with client');

    // Select Expense Type: Food
    await element(by.id('expense_type_picker')).setNativePickerValue('Food'); // Replace 'Food' with actual value

    await device.takeScreenshot('UserExpenses_DetailsFilled');

    // 3. Add Expense
    await element(by.id('add_expense_button')).tap();

    // Verify success message
    await expect(element(by.text('Expense added successfully!'))).toBeVisible(); // Replace with actual success message
    await device.takeScreenshot('UserExpenses_Add_Success');
    // Dismiss alert if it's a native Alert
    // await element(by.text('OK')).tap();

    // Optionally, verify the expense appears in the list
    await expect(element(by.text('Lunch with client'))).toBeVisible(); // Verify remarks text is visible in the list
    await expect(element(by.text('₹150'))).toBeVisible(); // Verify amount is visible
    await device.takeScreenshot('UserExpenses_List_AfterAdd');
  });

  // You would add more test cases here for:
  // - Testing "Other" expense type
  // - Testing offline expense saving (requires mocking network state)
  // - Testing validation errors
  // - Testing total expenses calculation
});
