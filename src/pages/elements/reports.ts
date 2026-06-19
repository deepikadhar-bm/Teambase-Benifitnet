import { Page, Locator } from '@playwright/test';

export class ReportsElements {

    constructor(public readonly page: Page) { }

    private named(name: string, locator: Locator): Locator {
        (locator as any).__name = name;
        return locator;
    }

    get sidebarReportsMenu(): Locator {
        return this.named('Sidebar Reports Menu',
            this.page.locator(`//ul[@id="side-menu"]//li//a//span[text()="Reports"]`));
    }

    get reportsHeadingText(): Locator {
        return this.named('Reports Heading Text',
            this.page.locator(`//h3[text()=" Reports"]`));
    }

    get workflowLogsReportLink(): Locator {
        return this.named('Workflow Logs Report Link',
            this.page.locator(`//a[text()="Workflow Logs Report"]`));
    }

    get workflowLogsReportClientDropdown(): Locator {
        return this.named('Workflow Client Dropdown',
            this.page.locator(`//label[text()="Client"]/..//div//span[text()="All"]`));
    }

    get workflowLogsReportClientDropdownClose(): Locator {
        return this.named('Workflow Client Dropdown Close',
            this.page.locator(`//label[text()="Client"]/..//div[@role="listbox"]`));
    }

    get workflowLogsReportClientDropdownOption(): Locator {
        return this.named('Workflow Client Option: Syslatech_TestClient1',
            this.page.locator(`//span[text()="Syslatech_TestClient1"]`));
    }

    get verifyWorkflowLogsReportClientDropdown(): Locator {
        return this.named('Workflow Client Selected Verify',
            this.page.locator(`//ul//li//span[@unselectable="on" and text()="Syslatech_TestClient1"]`));
    }

    get workflowLogsReportPolicyDropdown(): Locator {
        return this.named('Workflow Policy Dropdown',
            this.page.locator(`//label[text()="Policy"]/..//div//span[text()="All"]`));
    }

    get workflowLogsReportPolicyDropdownOption(): Locator {
        return this.named('Workflow Policy Option: MedicalPolicy1',
            this.page.locator(`//span[text()="MedicalPolicy1_Syslatech_TestClient1"]`));
    }

    get verifyWorkflowLogsReportPolicyDropdown(): Locator {
        return this.named('Workflow Policy Selected Verify',
            this.page.locator(`//span[@unselectable="on" and text()="MedicalPolicy1_Syslatech_TestClient1"]`));
    }

    get workflowLogsReportCategoryDropdown(): Locator {
        return this.named('Workflow Category Dropdown',
            this.page.locator(`//label[text()="Category"]/..//div//span[text()="All"]`));
    }

    get workflowLogsReportCategoryDropdownOption(): Locator {
        return this.named('Workflow Category Option: Cat A_',
            this.page.locator(`//li[contains(text(),"Cat A_ MedicalPolicy1_Syslatech_TestClient1")]`));
    }

    get verifyWorkflowLogsReportCategoryDropdown(): Locator {
        return this.named('Workflow Category Selected Verify',
            this.page.locator(`//ul[@id="category_list_listbox"]//li[contains(text(),"Cat A_ MedicalPolicy1_Syslatech_TestClient1")]`));
    }

    get SearchButton(): Locator {
        return this.named('Search Button',
            this.page.locator(`//button[text()="Search"]`));
    }

    get ExportToExcelButton(): Locator {
        return this.named('Export to Excel Button',
            this.page.locator(`//a[text()=" Export to Excel"]`));
    }

    get consolidatedMembershipReportLink(): Locator {
        return this.named('Consolidated Membership Report Link',
            this.page.locator(`//a[text()="Consolidated Membership Report"]`));
    }

    get consolidatedMembershipListInsurerLabel(): Locator {
        return this.named('Consolidated Insurer Label',
            this.page.locator(`//label[text()="Insurer"]`));
    }

    get consolidatedMembershipListInsurerDropdown(): Locator {
        return this.named('Consolidated Insurer Dropdown',
            this.page.locator(`//label[text()="Insurer"]/..//div[@id="insurer-multiselect"]`));
    }

    get consolidatedMembershipListInsurerDropdownOptionTestInsurerHover(): Locator {
        return this.named('Consolidated Insurer Option Hover: TestInsurer',
            this.page.locator(`//span[contains(text(),"TestInsurer")]`));
    }

    get consolidatedMembershipListInsurerDropdownOption(): Locator {
        return this.named('Consolidated Insurer Checkbox: TestInsurer',
            this.page.locator(`//span[contains(text(),"TestInsurer")]/../..//span[@class="k-checkbox-wrapper" or @role="presentation"]`));
    }

    get consolidatedMembershipListClientDropdown(): Locator {
        return this.named('Consolidated Client Dropdown',
            this.page.locator(`//label[text()="Client"]/..//div//span[text()="All"]`));
    }

    get consolidatedMembershipListClientDropdownOption(): Locator {
        return this.named('Consolidated Client Option: Syslatech_TestClient1',
            this.page.locator(`//span[text()="Syslatech_TestClient1"]`));
    }

    get verifyConsolidatedMembershipListClientDropdown(): Locator {
        return this.named('Consolidated Client Selected Verify',
            this.page.locator(`//ul//li//span[@unselectable="on" and text()="Syslatech_TestClient1"]`));
    }

    get consolidatedMembershipListClientDropdownClose(): Locator {
        return this.named('Consolidated Client Dropdown Close',
            this.page.locator(`//label[text()="Client"]/..//div[@role="listbox"]`));
    }

    get consolidatedMembershipListPolicyLabel(): Locator {
        return this.named('Consolidated Policy Label',
            this.page.locator(`//label[text()="Policy (*)"]`));
    }

    get consolidatedMembershipListPolicyDropdown(): Locator {
        return this.named('Consolidated Policy Dropdown',
            this.page.locator(`//label[text()="Policy (*)"]/..//div//input[@role="listbox"]`));
    }

    get consolidatedMembershipListPolicyCheckbox(): Locator {
        return this.named('Consolidated Policy Checkbox: MedicalPolicy1',
            this.page.locator(`//span[contains(text(),"MedicalPolicy1_Syslatech_TestClient1") and not(contains(text(),"Cat A_"))]/../..//span[@role="presentation" and @class="k-checkbox-wrapper"]`));
    }

    get verifyConsolidatedMembershipListPolicy(): Locator {
        return this.named('Consolidated Policy Selected Verify',
            this.page.locator(`//span[contains(text(),"MedicalPolicy1_Syslatech_TestClient1")]`).first());
    }

    get consolidatedMembershipListCategoryDropdown(): Locator {
        return this.named('Consolidated Category Dropdown',
            this.page.locator(`//label[text()="Category (*)"]/..//div//input[@role="listbox"]`));
    }

    get consolidatedMembershipListCategoryCheckbox(): Locator {
        return this.named('Consolidated Category Checkbox: Cat A_',
            this.page.locator(`//span[contains(text(),"Cat A_ MedicalPolicy1_Syslatech_TestClient1")]/../..//span[@class="k-checkbox-wrapper"]`));
    }

    get consolidatedMembershipListCategoryLabel(): Locator {
        return this.named('Consolidated Category Label',
            this.page.locator(`//label[text()="Category (*)"]`));
    }

    get consolidatedMembershipListPolicyExportToExcelButton(): Locator {
        return this.named('Consolidated Export to Excel Button',
            this.page.locator(`//button[normalize-space()="Export to Excel"]`));
    }
}