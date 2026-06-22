import { Page, Locator } from '@playwright/test';

export class ClientElements {

    constructor(public readonly page: Page) { }

    private named(name: string, locator: Locator): Locator {
        (locator as any).__name = name;
        return locator;
    }

    get sidebarClientsMenu(): Locator {
        return this.named('Sidebar Clients Menu',
            this.page.locator(`//ul[@id="side-menu"]//li//a//span[text()="Clients"]`));
    }

    get clientsHeadingText(): Locator {
        return this.named('Clients Heading Text',
            this.page.locator(`//h2[normalize-space(text()="Clients")]`));
    }

    get targetClientNameLink(): Locator {
        return this.named('Target Client Name Link',
            this.page.locator(`//table//tbody//tr//td//a[text()="Syslatech_TestClient1"]`));
    }

    clientNameLabel(clientName: string): Locator {
        return this.named(`Client Name Label: ${clientName}`,
            this.page.locator(`//table//tbody//tr//td[text()="${clientName}"]`));
    }

    get policiesLabel(): Locator {
        return this.named('Policies Tab',
            this.page.locator(`//a[text()="Policies"]`));
    }

    get policyRenewalTab(): Locator {
        return this.named('Policy Renewal Tab',
            this.page.locator(`//a[normalize-space(.)="Policy Renewal"]`));
    }

    get targetMedicalPolicyLink(): Locator {
        return this.named('Target Medical Policy Link',
            this.page.locator(`//a[text()="MedicalPolicy1_Syslatech_TestClient1"]`));
    }

    get policyNameLabel(): Locator {
        return this.named('Policy Name Label',
            this.page.locator(`//label[normalize-space()="Policy Name"]/..//span`));
    }

    get addMembersBulkButton(): Locator {
        return this.named('Add Members Bulk Button',
            this.page.locator(`//a[normalize-space()="Add Members Bulk"]`));
        // this.page.getByRole("link", { name: 'Add Members Bulk' }));
    }
    get processingDataText(): Locator {
        return this.named('Processing data',
            this.page.locator(`//div[@id="operationStatusMessage" and contains(text(),"Processing data")]`));
    }
    get savingDataText(): Locator {
        return this.named('Saving data',
            this.page.locator(`//div[@id="operationStatusMessage" and contains(text(),"Saving data")]`));
    }
    get startingWorkflowsText(): Locator {
        return this.named('Starting workflows',
            this.page.locator(`//div[@id="operationStatusMessage" and contains(text(),"Starting workflows")]`));
    }
    get preparingEmailNotificationMessage(): Locator {
        return this.named('Preparing of email notifications...',
            this.page.locator(`//div[@id="operationStatusMessage" and contains(text(),"Preparing of email notifications...")]`));
    }

    get downloadSampleFileLink(): Locator {
        return this.named('Download Sample File Link',
            this.page.locator(`//div[@class="alert alert-info"]//a[normalize-space(text()="Download sample file")]`));
    }

    get censusExcelFileInput(): Locator {
        return this.named('Census Excel File Input',
            this.page.locator(`//label[normalize-space()="Client Census (Excel) (*)"]//following-sibling::div//div[@aria-label="Select Files"]//input[@id="excel-file" and @type="file"]`));
    }

    get importTypeDropdown(): Locator {
        return this.named('Import Type Dropdown',
            this.page.locator(`//label[normalize-space()="Import Type (*)"]//following-sibling::div//span[contains(@class,"k-dropdown-wrap")]`));
    }

    get importTypeShowPendingAndEmailInsurerOption(): Locator {
        return this.named('Import Type: Show Pending and Email Insurer',
            this.page.locator(`//ul[@id="create-workflow-list_listbox"]//li[normalize-space()="Show in Pending Tasks and Email Insurer"]`));
    }

    get importTypeShowPendingAndNoEmailInsurerOption(): Locator {
        return this.named('Import Type: Show Pending and No Email Insurer',
            this.page.locator(`//ul[@id="create-workflow-list_listbox"]//li[normalize-space()="Show in Pending Tasks and No Email to Insurer"]`));
    }

    get notifyHrDropdown(): Locator {
        return this.named('Notify HR Dropdown',
            this.page.locator(`//label[normalize-space()="Notify HR (*)"]//following-sibling::div//span[contains(@class,"k-dropdown-wrap")]`));
    }

    get notifyHrOption(): Locator {
        return this.named('Notify HR Option',
            this.page.locator(`//ul[@id="notify_hr_list_listbox"]//li[normalize-space()="Notify HR"]`));
    }

    get doNotNotifyHrOption(): Locator {
        return this.named("Don't Notify HR Option",
            this.page.locator(`//ul[@id="notify_hr_list_listbox"]//li[normalize-space()="Don't Notify HR"]`));
    }

    get notifyMemberDropdown(): Locator {
        return this.named('Notify Member Dropdown',
            this.page.locator(`//label[normalize-space()="Notify Member (*)"]//following-sibling::div//span[contains(@class,"k-dropdown-wrap")]`));
    }

    get notifyMemberOption(): Locator {
        return this.named('Notify Member Option',
            this.page.locator(`//ul[@id="notify-member-list_listbox"]//li[normalize-space()="Notify Member"]`));
    }

    get validateImportButton(): Locator {
        return this.named('Validate Import Button',
            this.page.locator(`//button[@id="validate-btn"]`));
    }

    get importMembersButton(): Locator {
        return this.named('Import Members Button',
            this.page.getByRole('button', { name: 'Import Members' }));
    }

    get backToImportLink(): Locator {
        return this.named('Back to Import Link',
            this.page.getByText('Back to Import'));
    }

    get validationResultsGrid(): Locator {
        return this.named('Validation Results Grid',
            this.page.locator(`//*[@id="validationResult"]`));
    }

    get validationSuccessBanner(): Locator {
        return this.named('Validation Success Banner',
            this.page.getByText('Validation Successful'));
    }

    get validationFailedBanner(): Locator {
        return this.named('Validation Failed Banner',
            this.page.getByText('Validation Failed'));
    }

    get noHrUsersConfiguredWarning(): Locator {
        return this.named('No HR Users Configured Warning',
            this.page.locator(`//div[@class="alert alert-warning"]//span[text()="There are no HR users configured for this Policy so HR users will not receive any email from the system."]`));
    }

    get importProgressBarModal(): Locator {
        return this.named('Import Progress Bar Modal',
            this.page.locator(`//div[@id="ProgressBarWindow"]`));
    }

    get addMembersBulkInProgressHeading(): Locator {
        return this.named('Add Members Bulk In Progress Heading',
            this.page.locator(`//h3[text()="Add Members Bulk - In progress"]`));
    }

    get addMembersBulkSuccessHeading(): Locator {
        return this.named('Add Members Bulk Success Heading',
            this.page.getByRole('heading', { name: 'Add Members Bulk Successful' }));
    }

    get errorAndWarningCells(): Locator {
        return this.named('Error and Warning Cells',
            this.page.locator(`//tr[contains(@class,'k-group-row-validation-type-error')]//td[@role='gridcell'][last()] | //*[@id='validationResult']//tr//td[last()] | //*[@id='validationResult']//td[contains(@class,'k-last')]`));
    }
    // get ExportCensusValidationErrorComments(): Locator {
    //     return this.named('Export Census with Validation Error Comments',
    //         this.page.locator(``));
    // }

    get exportCensusWithValidationErrorCommentsLink(): Locator {
        return this.named('Export Census with Validation Error Comments',
            this.page.locator(`//div[@id="validationResult"]//a[contains(normalize-space(),"Export Census with Validation Error Comments") and i[@class="fa fa-download"]] | //a[normalize-space()="Export Census with Validation Error Comments"]`));
    }

    get validationMemberGroupHeaders(): Locator {
        return this.named('Validation Member Group Headers',
            this.page.locator(`//*[@id="validationResult"]//tr[contains(@class,'k-group-row')]`));
    }

    // validationErrorRowsByMemberIndex(memberGroupIndex: number): Locator {
    //     return this.named(`Validation Error Rows — Member[${memberGroupIndex}]`,
    //         this.page.locator(
    //             `//*[@id="validationResult"]//tr[contains(@class,'k-group-row-validation-type-error')]` +
    //             `[${memberGroupIndex + 1}]/following-sibling::tr[not(contains(@class,'k-group-row'))]` +
    //             `//td[@role='gridcell'][last()]`
    //         )
    //     );
    // }

    // validationWarningRowsByMemberIndex(memberGroupIndex: number): Locator {
    //     return this.named(`Validation Warning Rows — Member[${memberGroupIndex}]`,
    //         this.page.locator(
    //             `//*[@id="validationResult"]//tr[contains(@class,'k-group-row-validation-type-warning')]` +
    //             `[${memberGroupIndex + 1}]/following-sibling::tr[not(contains(@class,'k-group-row'))]//td[@role='gridcell'][last()]`
    //         )
    //     );
    // }

    validationErrorRowsByMemberIndex(memberGroupIndex: number): Locator {
        return this.named(`Validation Error Rows — Member[${memberGroupIndex}]`,
            this.page.locator(`//*[@id="validationResult"]//tr[contains(@class,'k-group-row-validation-type-error')][${memberGroupIndex + 1}]/following-sibling::tr[not(contains(@class,'k-group-row'))]//td[@role='gridcell'][last()]`)
        );
    }

    validationWarningRowsByMemberIndex(memberGroupIndex: number): Locator {
        return this.named(`Validation Warning Rows — Member[${memberGroupIndex}]`,
            this.page.locator(`//*[@id="validationResult"]//tr[contains(@class,'k-group-row-validation-type-warning')][${memberGroupIndex + 1}]/following-sibling::tr[not(contains(@class,'k-group-row'))]//td[@role='gridcell'][last()]`)
        );
    }

    get proceedValidMembersButton(): Locator {
        return this.named('Proceed Valid Members Button',
            this.page.getByRole('button', { name: 'Proceed Valid Members' }));
    }
}