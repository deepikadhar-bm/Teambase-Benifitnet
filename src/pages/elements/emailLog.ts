import { Page, FrameLocator, Locator } from '@playwright/test';

export class EmailLogElements {

    private readonly emailFrame: FrameLocator;

    constructor(public readonly page: Page) {
        this.emailFrame = page.frameLocator('iframe[id="iframeEmailTempl"]');
    }

    private named(name: string, locator: Locator): Locator {
        (locator as any).__name = name;
        return locator;
    }

    get sidebarEmailsMenu(): Locator {
        return this.named('Sidebar Emails Menu',
            this.page.locator(`//ul[@id="side-menu"]//li//a//span[text()="Emails"]`));
    }

    get sidebarEmailLogsMenu(): Locator {
        return this.named('Sidebar Email Logs Menu',
            this.page.locator(`//ul[@id="side-menu"]//li//a//span[text()="Email Logs"]`));
    }

    get emailLogClientDropdown(): Locator {
        return this.named('Email Log Client Dropdown',
            this.page.locator(`//div[@id="client_list"]//input[@placeholder="All"]`));
    }

    get emailLogTargetClientOption(): Locator {
        return this.named('Email Log Client Option: Syslatech_TestClient1',
            this.page.locator(`//span[text()="Syslatech_TestClient1"]`));
    }

    get emailLogPolicyDropdown(): Locator {
        return this.named('Email Log Policy Dropdown',
            this.page.locator(`//span[@aria-owns="policy_list_listbox"]`));
    }

    get emailLogTargetPolicyOption(): Locator {
        return this.named('Email Log Policy Option: MedicalPolicy1',
            this.page.locator(`//li[text()="MedicalPolicy1_Syslatech_TestClient1"]`));
    }

    get emailLogSearchButton(): Locator {
        return this.named('Email Log Search Button',
            this.page.locator(`//form[@id="formSearch"]//button[text()="Search"]`));
    }

    get emailLogNotificationTypeLabel(): Locator {
        return this.named('Email Log Notification Type Label',
            this.page.getByText('Notification Type:'));
    }
    emailLogRowViewLinkByMemberLastName(lastName: string): Locator {
        return this.named(`Email Log Row View Link: ${lastName}`,
            this.page.locator('tr')
                .filter({ hasText: lastName })
                .getByRole('link', { name: 'View' })
                .first()
        );
    }

    // emailLogRowViewLinkByMemberLastName(memberLastName: string): Locator {
    //     return this.named(`Email Log Row View Link: ${memberLastName}`,
    //         this.page.locator(`//tbody[@role="rowgroup"]//tr//td[@colspan="2"]//small[contains(text(),"${memberLastName}")]/../..//td[3]//small[contains(text()," Add Members Bulk") and span[text()="Notification Type:"]]/../..//td[5]//a[normalize-space(text()=" View")]`));
    // }
    verifyEmailLogRowByLastNameWithAdditionRequest(lastName: string): Locator {
        return this.named(`Email Log Row With Last Name And Addition Request: ${lastName}`,
            this.page.locator(`//tbody[@role="rowgroup"]//tr//td[@colspan="2"]//small[contains(text(),"${lastName}") and contains(text(),"Addition Request")]`));
    }
    verifyEmailLogRowByLastNameWithAttachmentZero(lastName: string): Locator {
        return this.named(`Email Log Row With Addition Request Attachment Zero: ${lastName}`,
            this.page.locator(`//tr[.//small[span[text()="Subject: "] and contains(.,'${lastName}')]]//td[4]//small[contains(.,'Attachments:') and contains(.,'0')]`));
    }
    
    verifyEmailDetailByLastNameWithToYopEmailLabel(toYopEmail: string): Locator {
        return this.named(`Email Log Row To Yop Email: ${toYopEmail}`,
            this.page.locator(`//tbody[@role="rowgroup"]//tr//td[@colspan="2"]//small[span[text()="To: "] and contains(text(),"${toYopEmail}")]`));
    }

    get insurerBulkRequestEmailViewLink(): Locator {
        return this.named('Insurer Bulk Request Email View Link',
            this.page.locator(`//tbody[@role="rowgroup"]//tr//td[2]//small[contains(text(),"Member Addition Bulk Request")]/../..//td[5]//a[normalize-space(text()=" View")]`).first());
    }

    emailLogClientNameCellByMemberLastName(memberLastName: string, clientName: string): Locator {
        return this.named(`Email Log Client Cell: ${memberLastName}`,
            this.page.locator(`//tbody[@role="rowgroup"]//tr//small[contains(text(),"${memberLastName}")]/../..//td[3]//small[contains(text(),"Wrong")]/../..//td[4]//small//span[text()="Client: "]/..//a[contains(text(),"${clientName}")]`));
    }

    emailLogPolicyCellByMemberLastName(memberLastName: string, policyName: string): Locator {
        return this.named(`Email Log Policy Cell: ${memberLastName}`,
            this.page.locator(`//tbody[@role="rowgroup"]//tr//td[@colspan="2"]//small[contains(text(),"${memberLastName}")]/../..//td[3]//small[contains(text(),"Wrong")]/../..//td[4]//small//span[text()="Policy: "]/..//a[contains(text(),"${policyName}")]`));
    }

    get addMembersBulkEmailDetailHeading(): Locator {
        return this.named('Add Members Bulk Email Detail Heading',
            this.page.locator(`//div[@id="detailsView"]//h2[normalize-space(.)="Add Members Bulk Email"]`));
    }

    emailDetailSubjectByMemberLastName(memberLastName: string): Locator {
        return this.named(`Email Detail Subject: ${memberLastName}`,
            this.page.locator(`//h3[span[normalize-space(text()="Subject:")] and contains(., "${memberLastName}")]`));
    }

    get insurerBulkRequestSubject(): Locator {
        return this.named('Insurer Bulk Request Subject',
            this.page.locator(`//h3[contains(normalize-space(.), "Member Addition Bulk Request")]`));
    }

    get emailDetailToAddressField(): Locator {
        return this.named('Email Detail To Address Field',
            this.page.locator(`//h5[span[text()="To: "]]`));
    }

    get backToListButton(): Locator {
        return this.named('Back to List Button',
            this.page.locator(`//a[normalize-space(text())="Back to List"]`));
    }

    get emailDetailCompanyNameCell(): Locator {
        return this.named('Email Detail Company Name Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Policy Details"]/following-sibling::table[1]//th[normalize-space(.)="Company Name"]/following-sibling::td`));
    }

    get emailDetailInsurerCell(): Locator {
        return this.named('Email Detail Insurer Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Policy Details"]/following-sibling::table[1]//th[normalize-space(.)="Insurer"]/following-sibling::td`));
    }

    get emailDetailPolicyNameCell(): Locator {
        return this.named('Email Detail Policy Name Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Policy Details"]/following-sibling::table[1]//th[normalize-space(.)="Policy Name"]/following-sibling::td`));
    }

    get emailDetailPolicyCategoryCell(): Locator {
        return this.named('Email Detail Policy Category Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Member Details"]/following-sibling::table[1]//th[normalize-space(.)="Policy Category"]/following-sibling::td`));
    }

    get emailDetailMemberNameCell(): Locator {
        return this.named('Email Detail Member Name Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Member Details"]/following-sibling::table[1]//th[normalize-space(.)="Member Name"]/following-sibling::td`));
    }

    get emailDetailEmployeeNumberCell(): Locator {
        return this.named('Email Detail Employee Number Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Member Details"]/following-sibling::table[1]//th[normalize-space(.)="Employee Number"]/following-sibling::td`));
    }

    get emailDetailRelationCell(): Locator {
        return this.named('Email Detail Relation Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Member Details"]/following-sibling::table[1]//th[normalize-space(.)="Relation"]/following-sibling::td`));
    }

    get emailDetailEffectiveDateCell(): Locator {
        return this.named('Email Detail Effective Date Cell',
            this.emailFrame.locator(`//h3[normalize-space(.)="Member Details"]/following-sibling::table[1]//th[normalize-space(.)="Effective Date"]/following-sibling::td`));
    }

    get captionRequestSubmittedToInsurer(): Locator {
        return this.named('Caption Request Submitted to Insurer',
            this.emailFrame.locator(`//p[contains(normalize-space(text()),"This is to advise that the captioned request has been submitted to your insurer")]`));
    }

    get MemberAdditionBulkRequestCompanyName(): Locator {
        return this.named('Member Addition Bulk Request Company Name',
            this.emailFrame.locator(`//h3[normalize-space(.)="Company Details"]/following-sibling::table[1]//th[normalize-space(.)="Company Name"]/following-sibling::td`));
    }

    get MemberAdditionBulkRequestInsurer(): Locator {
        return this.named('Member Addition Bulk Request Insurer',
            this.emailFrame.locator(`//h3[normalize-space(.)="Company Details"]/following-sibling::table[1]//th[normalize-space(.)="Insurer"]/following-sibling::td`));
    }

    get MemberAdditionBulkRequestPolicyName(): Locator {
        return this.named('Member Addition Bulk Request Policy Name',
            this.emailFrame.locator(`//h3[normalize-space(.)="Company Details"]/following-sibling::table[1]//th[normalize-space(.)="Policy Name"]/following-sibling::td`));
    }

    get MemberAdditionBulkRequestMemberListAttachment(): Locator {
        return this.named('Member List Attachment File Name',
            this.page.locator(`//div[contains(@class,"file-box")]//div[@class="file"]//div[@class="file-name"]//div[@class="longtext"]`));
    }

    get MemberAdditionBulkRequestMemberListAttachmentLink(): Locator {
        return this.named('Member List Attachment Download Link',
            this.page.locator(`//div[contains(@class,"file-box")]//a[contains(@href,".xlsx")]`));
    }

    get emailLogNextPageButton(): Locator {
        return this.named('Email Log Next Page Button',
            this.page.locator(
                `//li[contains(@class,"k-next-button") and not(contains(@class,"k-disabled"))]//a` +
                ` | //a[@aria-label="Go to the next page" and not(ancestor::li[contains(@class,"k-disabled") or contains(@class,"disabled")])]`
            ));
    }

}