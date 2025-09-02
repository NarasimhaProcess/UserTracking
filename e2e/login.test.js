// e2e/login.test.js
// Remember to add testID="your_id_here" to your React Native components
// e.g., <TextInput testID="email_input" />
// <TouchableOpacity testID="sign_in_button">

describe('Login Flow', () => {
  beforeAll(async () => {
    // Launch the app before all tests in this suite
    await device.launchApp();
  });

  beforeEach(async () => {
    // Reload the React Native app before each test to ensure a clean state
    await device.reloadReactNative();
  });

  it('should display login screen elements', async () => {
    // Verify visibility of key elements on the login screen
    await expect(element(by.id('login_title'))).toBeVisible();
    await expect(element(by.id('email_input'))).toBeVisible();
    await expect(element(by.id('password_input'))).toBeVisible();
    await expect(element(by.id('sign_in_button'))).toBeVisible();
    await expect(element(by.id('forgot_password_link'))).toBeVisible();
    await expect(element(by.id('sign_up_link'))).toBeVisible();

    // Take a screenshot of the initial login screen
    await device.takeScreenshot('Login_Screen_Initial');
  });

  it('should show error on invalid credentials', async () => {
    // Enter invalid credentials
    await element(by.id('email_input')).typeText('invalid@example.com');
    await element(by.id('password_input')).typeText('wrongpass');

    // Tap the sign-in button
    await element(by.id('sign_in_button')).tap();

    // Verify an error message is displayed (adjust ID/text based on your app's error display)
    await expect(element(by.text('Login Error'))).toBeVisible(); // Assuming an Alert or Text component shows this
    
    // Take a screenshot of the error state
    await device.takeScreenshot('Login_Invalid_Credentials_Error');
    
    // If it's a native Alert, dismiss it
    // await element(by.text('OK')).tap(); 
  });

  it('should allow successful login and navigate to main screen', async () => {
    // Clear any previous input and enter valid credentials
    await element(by.id('email_input')).clearText(); 
    await element(by.id('password_input')).clearText();
    await element(by.id('email_input')).typeText('valid@example.com'); // <<< REPLACE with a valid test user email
    await element(by.id('password_input')).typeText('validpass'); // <<< REPLACE with a valid test user password
    
    // Tap the sign-in button
    await element(by.id('sign_in_button')).tap();

    // Verify successful login by checking for an element on the main dashboard/tab screen
    await expect(element(by.id('dashboard_welcome_text'))).toBeVisible(); // <<< REPLACE with an ID from your main screen
    
    // Take a screenshot of the dashboard after successful login
    await device.takeScreenshot('Login_Successful_Dashboard');
  });

  it('should navigate to signup screen', async () => {
    // Start fresh for this test
    await device.reloadReactNative(); 
    
    // Tap the sign-up link
    await element(by.id('sign_up_link')).tap();
    
    // Verify the signup screen title or a key element is visible
    await expect(element(by.id('signup_title'))).toBeVisible(); // <<< REPLACE with an ID from your signup screen
    
    // Take a screenshot of the signup screen
    await device.takeScreenshot('Signup_Screen_Navigated');
    
    // Optionally, navigate back to login for subsequent tests if needed
    // await element(by.id('back_to_login_link')).tap(); 
  });

  // You would add more test cases here for other functionalities like:
  // - Customer Create
  // - Customer Update
  // - Customer Status Change
  // - Transaction View
  // - Add Transactions
});
