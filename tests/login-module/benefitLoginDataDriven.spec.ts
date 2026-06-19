import { test, expect } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { qaConfig } from 'src/config/env.qa';
import { loadTestData } from 'src/utils/dataFilter';
import { BasePage } from 'src/pages/basePage';
import { LoginLocator } from 'src/pages/elements/login';

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

const TC_TITLE = "BN Login";

loginTestData.forEach(({ setName, username, password, expected, errorField, errorMsg }) => {

    test(`${TC_TITLE} → ${setName}`, async ({ page }) => {

        const loginPage = new LoginPage(page);
        const base = new BasePage(page);
        const el = new LoginLocator(page);

        await loginPage.navigateToLogin(qaConfig.baseURL);
        await loginPage.login(username, password);

        if (expected === 'success') {
            await base.assertURL(qaConfig.baseURL);
            await base.waitForElementIsVisible(el.LoginSuccessMessage);

        } else {
            switch (errorField) {
                case 'username':
                    await base.waitForElementIsVisible(el.UserNameError);
                    await base.waitForTextOnPage(errorMsg);
                    break;

                case 'password':
                    await base.waitForElementIsVisible(el.PasswordError);
                    await base.waitForTextOnPage(errorMsg);
                    break;

                case 'credential':
                    await base.waitForElementIsVisible(el.ErrorMessage);
                    await base.waitForTextOnPage(errorMsg);
                    break;

                case 'both':
                    await base.waitForElementIsVisible(el.UserNameError);
                    await base.waitForTextOnPage(errorMsg);
                    await base.waitForElementIsVisible(el.PasswordError);
                    await base.waitForTextOnPage(errorMsg);
                    break;
            }
        }
    });

});