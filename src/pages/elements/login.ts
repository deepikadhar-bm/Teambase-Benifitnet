import { Page, Locator } from "@playwright/test";

export class LoginElements {

    constructor(private readonly page: Page) { }

    private named(name: string, locator: Locator): Locator {
        (locator as any).__name = name;
        return locator;
    }

    get LoginPageText(): Locator {
        return this.named('Login Page Text',
            this.page.locator('//div[@id="login_page"]//h2[normalize-space(text())="Login to Your Account"]'));
    }

    get UserNameInput(): Locator {
        return this.named('Username Input',
            this.page.locator('//input[@id="signin_username"]'));
    }

    get PasswordInput(): Locator {
        return this.named('Password Input',
            this.page.locator('//input[@id="signin_password"]'));
    }

    get LoginButton(): Locator {
        return this.named('Login Button',
            this.page.locator('//button[@id="btnSubmit"]'));
    }

    get LoginSuccessMessage(): Locator {
        return this.named('Login Success Message',
            this.page.locator('//div[@class="alert alert-info" and text()="WELCOME ADMIN USER!"]'));
    }

    get UserNameError(): Locator {
        return this.named('Username Error',
            this.page.locator('//span[@class="field-validation-error text-danger" and @data-valmsg-for="UserName"]'));
    }

    get PasswordError(): Locator {
        return this.named('Password Error',
            this.page.locator('//span[@class="field-validation-error text-danger" and @data-valmsg-for="Password"]'));
    }

    get ErrorMessage(): Locator {
        return this.named('Error Message',
            this.page.locator('//div[@class="validation-summary-errors text-danger"]//ul//li'));
    }

    get WelcomeTo(): Locator {
        return this.named('Welcome To',
            this.page.locator('//h3[text()="Welcome Syslatech_broker1"]'));
    }
    get LogoutButton(): Locator {
        return this.named('Log Out',
            this.page.locator('//a[span[contains(text(),"Logout") or i[contains(@class,"fa-sign-out")]]]'));
    }
}