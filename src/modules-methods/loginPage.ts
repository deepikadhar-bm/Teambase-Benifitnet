import { Page } from "@playwright/test";
import { BasePage } from "@pages/basePage";
import { LoginElements } from "@pages/elements/login";

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
        await this.assertElementVisible(this.loginPage.LoginSuccessMessage);
    }

    /**
 * Action: Terminate Session and Disconnect Account User
 * Steps: Executes an interactive single click upon the designated global logout navigation element to safely clear state records.
 */
    async logout() {
        await this.click(this.loginPage.LogoutButton);
    }
}