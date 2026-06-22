import { Page, expect } from "@playwright/test";
import { BasePage } from "@pages/basePage";
import { LoginElements } from "@pages/elements/login";
import { APP_CONSTANTS } from "src/constant/app-constants";

export class LoginPage extends BasePage {
    private loginPage: LoginElements;

    constructor(page: Page) {
        super(page);
        this.loginPage = new LoginElements(page);
    }

    /**
     * Action: Navigate to Login Landing Page URL
     * Steps: Directs the browser context to the base environment path, waits for the primary log-in view identifier text container to render, and confirms structural presence.
     * Fills credential string parameters inside the username and password input locator nodes, hits the submission trigger element, and asserts valid verification banners.
     */
    async loginToBenefitNetApplication(baseURL: string, username: string, password: string) {
        await this.navigateTo(baseURL);
        await this.waitForElementIsVisible(this.loginPage.LoginPageText);
        await this.assertElementVisible(this.loginPage.LoginPageText);
        await this.fill(this.loginPage.UserNameInput, username);
        await this.fill(this.loginPage.PasswordInput, password);
        await this.click(this.loginPage.LoginButton);
    }

    /**
     * Action: Assert Dashboard Welcome Banner Visibility and Content
     * Steps: Waits for the post-authentication success message element to become visible within the dashboard layout, retrieves its text content, and asserts the expected welcome string is present within the rendered output.
     */
    async verifyDashboardWelcomeMessage() {
        await this.assertElementVisible(this.loginPage.WelcomeTo);
        const welcomeUser = await this.loginPage.WelcomeTo.textContent();
        expect(welcomeUser).toContain(APP_CONSTANTS.USERNAME);
    }

    /**
     * Action: Terminate Session and Disconnect Account User
     * Steps: Executes an interactive single click upon the designated global logout navigation element to safely clear state records.
     */
    async logout() {
        await this.click(this.loginPage.LogoutButton);
    }
}