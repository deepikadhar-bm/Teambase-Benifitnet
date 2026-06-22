import { test, expect } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { LoginElements } from 'src/pages/elements/login';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { BasePage } from 'src/pages/basePage';
import { APP_CONSTANTS } from 'src/constant/app-constants';

const TC01_ID = 'REG_TS01_TC01';
const TC01_TITLE = 'should login successfully with valid credentials and land on the dashboard';

const TC02_ID = 'REG_TS01_TC02';
const TC02_TITLE = 'should show error message when login is attempted with invalid credentials';

const TC03_ID = 'REG_TS01_TC03';
const TC03_TITLE = 'should show field validation errors when login is submitted with empty username and password';

test.describe('Teambase BenefitNet — Login Module', () => {

  test(TC01_TITLE, async ({ page }) => {

    const loginPage = new LoginPage(page);
    const loginElement = new LoginElements(page);

    log.tcStart(TC01_ID, TC01_TITLE);

    try {

      log.step('STEP 1: Navigate to application and login with valid credentials');
      try {
        await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
        log.stepPass('STEP 1: Login successful');
      } catch (e) {
        await log.stepFail(page, 'STEP 1: Login failed with valid credentials');
        throw e;
      }

      log.step('STEP 2: Verify welcome message displays correct username');
      try {
        const welcomeUser = await loginElement.WelcomeTo.textContent();
        log.info(`Login welcome message: "${welcomeUser?.trim()}"`);
        await expect(loginElement.WelcomeTo).toContainText(APP_CONSTANTS.USERNAME);
        log.info(`Welcome message verified for user: ${APP_CONSTANTS.USERNAME}`);
        log.stepPass('STEP 2: Welcome message username verified');
      } catch (e) {
        await log.stepFail(page, 'STEP 2: Welcome message username mismatch');
        throw e;
      }

      log.step('STEP 3: Logout');
      try {
        await loginPage.logout();
        log.stepPass('STEP 3: Logout Successful');
      } catch (e) {
        await log.stepFail(page, 'STEP 3: Logout failed');
        throw e;
      }

      log.tcEnd('PASS');

    } catch (e) {
      await log.captureOnFailure(page, TC01_TITLE, e);
      log.tcEnd('FAIL');
      throw e;
    }
  });

  test(TC02_TITLE, async ({ page }) => {

    const basePage = new BasePage(page);
    const loginPage = new LoginPage(page);
    const loginElement = new LoginElements(page);

    log.tcStart(TC02_ID, TC02_TITLE);

    try {

      log.step('STEP 1: Navigate to login page');
      try {
        await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, APP_CONSTANTS.WRONG_PASSWORD);
        log.stepPass('STEP 1: Login page loaded');
      } catch (e) {
        await log.stepFail(page, 'STEP 1: Login page did not load');
        throw e;
      }

      log.step('STEP 2: Verify invalid credentials error message is displayed');
      try {
        await basePage.waitForElementIsVisible(loginElement.ErrorMessage);
        const error = await loginElement.ErrorMessage.textContent();
        log.info(`Error message: "${error?.trim()}"`);
        expect(error).toContain('The user name or password provided is incorrect');
        log.stepPass('STEP 3: Invalid credentials error message verified');
      } catch (e) {
        await log.stepFail(page, 'STEP 3: Invalid credentials error message not found or incorrect');
        throw e;
      }

      log.tcEnd('PASS');

    } catch (e) {
      await log.captureOnFailure(page, TC02_TITLE, e);
      log.tcEnd('FAIL');
      throw e;
    }
  });

  test(TC03_TITLE, async ({ page }) => {

    const basePage = new BasePage(page);
    const loginPage = new LoginPage(page);
    const loginElement = new LoginElements(page);

    log.tcStart(TC03_ID, TC03_TITLE);

    try {

      log.step('STEP 1: Navigate to login page');
      try {
        await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, APP_CONSTANTS.EMPTY_USERNAME, APP_CONSTANTS.EMPTY_PASSWORD);
        log.stepPass('STEP 1: Login page loaded');
      } catch (e) {
        await log.stepFail(page, 'STEP 1: Login page did not load');
        throw e;
      }

      log.step('STEP 3: Verify general validation error message is displayed');
      try {
        await basePage.waitForElementIsVisible(loginElement.ErrorMessage);
        const error = await loginElement.ErrorMessage.textContent();
        log.info(`General error message: "${error?.trim()}"`);
        expect(error).toContain('User email is not specified');
        log.stepPass('STEP 3: General validation error message verified');
      } catch (e) {
        await log.stepFail(page, 'STEP 3: General validation error message not found or incorrect');
        throw e;
      }

      log.step('STEP 4: Verify username field validation error is displayed');
      try {
        await basePage.waitForElementIsVisible(loginElement.UserNameError);
        const userNameError = await loginElement.UserNameError.textContent();
        log.info(`Username field error: "${userNameError?.trim()}"`);
        expect(userNameError).toContain('The User name field is required.');
        log.stepPass('STEP 4: Username field validation error verified');
      } catch (e) {
        await log.stepFail(page, 'STEP 4: Username field validation error not found or incorrect');
        throw e;
      }

      log.step('STEP 5: Verify password field validation error is displayed');
      try {
        await basePage.waitForElementIsVisible(loginElement.PasswordError);
        const passwordError = await loginElement.PasswordError.textContent();
        log.info(`Password field error: "${passwordError?.trim()}"`);
        expect(passwordError).toContain('The Password field is required.');
        log.stepPass('STEP 5: Password field validation error verified');
      } catch (e) {
        await log.stepFail(page, 'STEP 5: Password field validation error not found or incorrect');
        throw e;
      }

      log.tcEnd('PASS');

    } catch (e) {
      await log.captureOnFailure(page, TC03_TITLE, e);
      log.tcEnd('FAIL');
      throw e;
    }
  });

});