import { LoginPage } from 'src/modules-methods/loginPage';
import { test, expect } from '../../src/fixtures';
import { qaConfig } from 'src/config/env.qa';
import { APP_CONSTANTS } from 'src/constant/app-constants';
import { BasePage } from 'src/pages/basePage';

const TC_TITLE = "BenefitNet Login Tests";

test.describe(`${TC_TITLE}`, () => {

  test('Login successfully with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const basePage = new BasePage(page);

    await loginPage.navigateToLogin(qaConfig.baseURL);
    await loginPage.login(qaConfig.credentials.username, qaConfig.credentials.password);

    const loginSuccessMessage = await loginPage.LoginSuccessMessage.textContent();
    expect(loginSuccessMessage).toContain('WELCOME ADMIN USER!');
    expect(loginPage.WelcomeTo).toContainText(APP_CONSTANTS.USERNAME);

  });

  test('Show error for invalid credentials', async ({ page }) => {
    const loginPage = new loginPage(page);

    await loginPage.navigateToLogin(qaConfig.baseURL);
    await loginPage.login(qaConfig.credentials.username, APP_CONSTANTS.WRONG_PASSWORD);

    const error = await loginPage.ErrorMessage.textContent();
    expect(error).toContain('The user name or password provided is incorrect');
  });

  test('Show validation for empty fields', async ({ page }) => {
    const loginPage = new loginPage(page);

    await loginPage.navigateToLogin(qaConfig.baseURL);
    await loginPage.login(APP_CONSTANTS.EMPTY_USERNAME, APP_CONSTANTS.EMPTY_PASSWORD);

    const error = await loginPage.ErrorMessage.textContent();
    expect(error).toContain('User email is not specified');

    const userNameError = await loginPage.UserNameError.textContent();
    expect(userNameError).toContain('The User name field is required.');

    const passwordError = await loginPage.PasswordError.textContent();
    expect(passwordError).toContain('The Password field is required.');
  });

});