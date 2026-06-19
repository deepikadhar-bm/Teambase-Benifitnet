import { test, expect } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { qaConfig } from 'src/config/env.qa';
import { loadTestData } from 'src/utils/dataFilter';
import { BasePage } from 'src/pages/basePage';
import { LoginElements } from 'src/pages/elements/login';
import { logger as log } from 'src/helpers/logger';

type ErrorField = 'credential' | 'username' | 'password' | 'both' | null;

interface LoginTestCase {
    setName: string;
    enabled: boolean;
    username: string;
    password: string;
    expected: 'success' | 'failure';
    errorField: ErrorField;
    errorMsg?: string;
}

const loginTestData = loadTestData<LoginTestCase>({
    fileName: 'loginTestData',
    filterType: 'setName',
    comparison: 'all',
    onlyEnabled: true,
});

loginTestData.forEach(({ setName, username, password, expected, errorField, errorMsg }) => {

    let tcTitle = `BN Login — ${setName}`;
    if (expected === 'success') {
        tcTitle = `BN Login — ${setName} → Should successfully log into BenefitNet and display dashboard`;
    } else {
        switch (errorField) {
            case 'username':
                tcTitle = `BN Login — ${setName} → Should display inline validation error for username field`;
                break;
            case 'password':
                tcTitle = `BN Login — ${setName} → Should display inline validation error for password field`;
                break;
            case 'credential':
                tcTitle = `BN Login — ${setName} → Should display main application error alert box for invalid credentials`;
                break;
            case 'both':
                tcTitle = `BN Login — ${setName} → Should display inline validation errors on both empty input fields`;
                break;
        }
    }

    test(tcTitle, async ({ page }) => {
        const loginPage = new LoginPage(page);
        const basePage = new BasePage(page);
        const loginElement = new LoginElements(page);

        log.tcStart(setName, tcTitle);

        try {
            log.step('STEP 1: Navigate to application and submit login form');
            try {
                await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, username, password);
                log.info(`Form credentials submitted → Username: "${username}"`);
                log.stepPass('STEP 1: Credentials submitted successfully');
            } catch (e) {
                await log.stepFail(page, 'STEP 1: Failed to submit credentials or page crashed');
                throw e;
            }

            if (expected === 'success') {
                log.step('STEP 2: Assert landing page URL matches basePage dashboard configuration');
                try {
                    await basePage.assertURL(qaConfig.baseURL);
                    log.stepPass('STEP 2: URL redirection verified successfully');
                } catch (e) {
                    await log.stepFail(page, `STEP 2: URL mismatch. Expected basePage: ${qaConfig.baseURL}`);
                    throw e;
                }

                log.step('STEP 3: Verify login success message element is visible on the page layout');
                try {
                    await basePage.waitForElementIsVisible(loginElement.LoginSuccessMessage);
                    log.stepPass('STEP 3: Success message message is visible');
                } catch (e) {
                    await log.stepFail(page, 'STEP 3: Success message message element not visible or timed out');
                    throw e;
                }

                log.step('STEP 4: Perform application logout procedure');
                try {
                    await loginPage.logout();
                    log.stepPass('STEP 4: Logout completed successfully');
                } catch (e) {
                    await log.stepFail(page, 'STEP 4: Logout action failed or timed out');
                    throw e;
                }

            } else {
                switch (errorField) {
                    case 'username':
                        log.step('STEP 2: Verify inline username validation error locator and text message matches');
                        try {
                            await basePage.waitForElementIsVisible(loginElement.UserNameError);
                            await basePage.waitForTextOnPage(errorMsg);
                            log.info(`Username validation error text verified: "${errorMsg}"`);
                            log.stepPass('STEP 2: Username field validation matched expected message');
                        } catch (e) {
                            await log.stepFail(page, `STEP 2: Username error element missing or text mismatch. Expected: "${errorMsg}"`);
                            throw e;
                        }
                        break;

                    case 'password':
                        log.step('STEP 2: Verify inline password validation error locator and text message matches');
                        try {
                            await basePage.waitForElementIsVisible(loginElement.PasswordError);
                            await basePage.waitForTextOnPage(errorMsg);
                            log.info(`Password validation error text verified: "${errorMsg}"`);
                            log.stepPass('STEP 2: Password field validation matched expected message');
                        } catch (e) {
                            await log.stepFail(page, `STEP 2: Password error element missing or text mismatch. Expected: "${errorMsg}"`);
                            throw e;
                        }
                        break;

                    case 'credential':
                        log.step('STEP 2: Verify application main error alert box is displayed with correct string');
                        try {
                            await basePage.waitForElementIsVisible(loginElement.ErrorMessage);
                            await basePage.waitForTextOnPage(errorMsg);
                            log.info(`Main application error text verified: "${errorMsg}"`);
                            log.stepPass('STEP 2: Main login error alert dialog verified successfully');
                        } catch (e) {
                            await log.stepFail(page, `STEP 2: Main error alert box missing or text mismatch. Expected: "${errorMsg}"`);
                            throw e;
                        }
                        break;

                    case 'both':
                        log.step('STEP 2: Verify simultaneous inline validation error markers appear for both inputs');
                        try {
                            await basePage.waitForElementIsVisible(loginElement.UserNameError);
                            await basePage.waitForElementIsVisible(loginElement.PasswordError);
                            await basePage.waitForTextOnPage(errorMsg);
                            log.info(`Validation error text verified on fields: "${errorMsg}"`);
                            log.stepPass('STEP 2: Simultaneous username and password field validation blocks verified');
                        } catch (e) {
                            await log.stepFail(page, `STEP 2: Missing expected field validation errors on page layout for error text: "${errorMsg}"`);
                            throw e;
                        }
                        break;
                }
            }

            log.tcEnd('PASS');

        } catch (e) {
            await log.captureOnFailure(page, tcTitle, e);
            log.tcEnd('FAIL');
            throw e;
        }
    });

});