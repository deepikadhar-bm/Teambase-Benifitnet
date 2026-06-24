import { expect } from '@playwright/test';
import { BasePage } from 'src/pages/basePage';
import { EmailLogElements } from 'src/pages/elements/emailLog';
import { logger as log } from 'src/helpers/logger';
import { FileUtils } from 'src/helpers/fileUtils';
import * as fs from 'fs';
import * as path from 'path';

const XlsxPopulate = require('xlsx-populate').default || require('xlsx-populate');

export class EmailLogPage extends BasePage {

    private readonly emailLog: EmailLogElements;

    constructor(page: any) {
        super(page);
        this.emailLog = new EmailLogElements(page);
    }

    /**
     * Navigates to the Email Logs section by expanding the Emails menu in the sidebar
     * and clicking the Email Logs link.
     */
    async navigateToEmailLogs(): Promise<void> {
        await this.scrollToElement(this.emailLog.sidebarEmailsMenu);
        await this.click(this.emailLog.sidebarEmailsMenu);
        await this.waitForElementIsVisible(this.emailLog.sidebarEmailLogsMenu);
        await this.assertElementVisible(this.emailLog.sidebarEmailLogsMenu);
        await this.click(this.emailLog.sidebarEmailLogsMenu);
    }

    /**
     * Filters the email log table by selecting the target client and policy from the
     * dropdowns, then runs the search to show only matching email records.
     */
    async filterEmailLogsByClientAndPolicy(): Promise<void> {
        await this.click(this.emailLog.emailLogClientDropdown);
        await this.waitForElementIsVisible(this.emailLog.emailLogTargetClientOption);
        await this.click(this.emailLog.emailLogTargetClientOption);
        await this.click(this.emailLog.emailLogPolicyDropdown);
        await this.waitForElementIsVisible(this.emailLog.emailLogTargetPolicyOption);
        await this.click(this.emailLog.emailLogTargetPolicyOption);
        await this.click(this.emailLog.emailLogSearchButton);
    }

    /**
     * Scans the email log table page by page until a row containing the member's last name is found.
     * On each page it reads every <small> element text and checks for the last name.
     * After clicking Next Page it waits for the first row text to change before checking the new page,
     * ensuring the DOM has fully loaded. Supports up to 100 pages (1000+ email log items).
     */
    private async paginateToMemberRow(memberLastName: string): Promise<void> {
        const MAX_PAGES = 100;
        for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
            // Wait for the table to have at least one row before checking
            await this.page.locator('//tr//td[@colspan="2"]//small').first()
                .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            // Check every <small> text on the current page for the member's last name
            const allSmalls = this.page.locator('//tr//td[@colspan="2"]//small');
            const count = await allSmalls.count();
            for (let s = 0; s < count; s++) {
                const text = await allSmalls.nth(s).textContent().catch(() => '');
                if (text && text.includes(memberLastName)) {
                    log.info(`"${memberLastName}" found on page ${pageNum} (row ${s + 1})`);
                    return;
                }
            }
            await this.emailLog.emailLogNextPageButton.scrollIntoViewIfNeeded();
            const nextBtn = this.emailLog.emailLogNextPageButton;
            const nextVisible = await nextBtn.isVisible().catch(() => false);
            if (!nextVisible) {
                log.info(`No next page available — "${memberLastName}" not found after page ${pageNum}`);
                return;
            }
            log.info(`"${memberLastName}" not on email log page ${pageNum} — navigating to next page`);
            const firstRowLocator = this.page.locator('//tr//td[@colspan="2"]//small').first();
            const textBefore = await firstRowLocator.textContent().catch(() => '');
            await this.click(nextBtn);
            const deadline = Date.now() + 10000;
            while (Date.now() < deadline) {
                const textAfter = await firstRowLocator.textContent().catch(() => '');
                if (textAfter !== textBefore && textAfter !== '') break;
                await this.page.waitForTimeout(200);
            }
        }
        log.warn(`"${memberLastName}" not found after scanning ${MAX_PAGES} pages`);
    }

    /**
     * Scans the email log table page by page until a row containing "Member Addition Bulk Request"
     * is found — this covers both the HR email and the insurer email which share the same subject.
     * After clicking Next Page it waits for the first row text to change before checking the new page,
     * ensuring the DOM has fully loaded. Supports up to 100 pages (1000+ email log items).
     */
    private async paginateToInsurerRow(): Promise<void> {
        const MAX_PAGES = 100;
        for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
            // Wait for the table to have at least one row before checking
            await this.page.locator('//tr//td[@colspan="2"]//small').first()
                .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            // Check every <small> text on the current page for the insurer bulk request subject
            const allSmalls = this.page.locator('//tr//td[@colspan="2"]//small');
            const count = await allSmalls.count();
            for (let s = 0; s < count; s++) {
                const text = await allSmalls.nth(s).textContent().catch(() => '');
                if (text && text.includes('Member Addition Bulk Request')) {
                    log.info(`Insurer bulk request row found on page ${pageNum}`);
                    return;
                }
            }
            await this.emailLog.emailLogNextPageButton.scrollIntoViewIfNeeded();
            const nextBtn = this.emailLog.emailLogNextPageButton;
            const nextVisible = await nextBtn.isVisible().catch(() => false);
            if (!nextVisible) {
                log.info(`No next page available — insurer bulk request row not found after page ${pageNum}`);
                return;
            }
            log.info(`Insurer bulk request row not on email log page ${pageNum} — navigating to next page`);
            const firstRowLocator = this.page.locator('//tr//td[@colspan="2"]//small').first();
            const textBefore = await firstRowLocator.textContent().catch(() => '');
            await this.click(nextBtn);
            const deadline = Date.now() + 10000;
            while (Date.now() < deadline) {
                const textAfter = await firstRowLocator.textContent().catch(() => '');
                if (textAfter !== textBefore && textAfter !== '') break;
                await this.page.waitForTimeout(200);
            }
        }
        log.warn(`Insurer bulk request row not found after scanning ${MAX_PAGES} pages`);
    }

    /**
     * Paginates through the email log until the member row is found by last name,
     * then clicks the View link to open the email detail view.
     */
    async openMemberEmailLogDetail(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.click(this.emailLog.emailLogRowViewLinkByMemberLastName(memberLastName));
    }

    /**
     * Paginates through the email log until the "Member Addition Bulk Request" row is found,
     * then clicks the View link to open the insurer bulk request email detail view.
     */
    async openInsurerBulkRequestEmailDetail(): Promise<void> {
        await this.paginateToInsurerRow();
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestEmailViewLink);
        await this.click(this.emailLog.insurerBulkRequestEmailViewLink);
    }

    /**
     * Clicks the "Back to List" button to return to the email log table from a detail view.
     */
    async clickBackToList(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.backToListButton);
        await this.scrollIntoView(this.emailLog.backToListButton);
        await this.click(this.emailLog.backToListButton);
    }

    /**
     * Paginates through the email log until the member row is found, then verifies
     * the policy name cell is visible for that member.
     */
    async assertEmailLogRowExistsForMember(policyName: string, memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.isVisible(this.emailLog.emailLogPolicyCellByMemberLastName(memberLastName, policyName));
        log.info(`assertEmailLogRowExistsForMember : ${memberLastName} | ${policyName}`);
    }

    /**
     * Paginates to the member row and verifies the email type shows "Addition Request".
     */
    async assertEmailLogRowExistsForLastNameWithAdditionRequest(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithAdditionRequest(memberLastName));
    }

    /**
     * Paginates to the member row and verifies the notification type shows "Add Members Bulk".
     */
    async assertEmailLogRowExistsForLastNameWithNotificationType(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithNotificationType(memberLastName));
    }

    /**
     * Paginates to the member row and verifies the "To:" yopmail recipient address is correct.
     */
    async assertEmailLogRowExistsForToYopEmail(memberLastName: string, toEmail: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.isVisible(this.emailLog.emailDetailByLastNameWithToYopEmailLabel(memberLastName, toEmail));
    }

    /**
     * Paginates to the member row and verifies the email subject line is visible.
     */
    async assertEmailLogRowExistsForToYopEmailHaveAttachments(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.isVisible(this.emailLog.emailDetailSubjectByMemberLastName(memberLastName));
    }

    /**
     * Paginates to the member row and verifies the attachment count shows 0.
     * The attachment is on the insurer email, not on the member notification email.
     */
    async assertEmailLogRowExistsForToYopEmailHaveAttachmentsZero(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.isVisible(this.emailLog.emailLogRowByLastNameWithAttachmentZero(memberLastName));
    }

    /**
     * Verifies the "Add Members Bulk Email" heading is visible in the email detail view,
     * confirming the correct email detail page was opened.
     */
    async assertEmailDetailHeadingIsVisible(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.addMembersBulkEmailDetailHeading);
        await this.assertElementVisible(this.emailLog.addMembersBulkEmailDetailHeading);
    }

    /**
     * Verifies the email subject line contains the member's last name,
     * confirming this detail view belongs to the correct member.
     */
    async assertEmailDetailSubjectContainsMemberName(memberLastName: string): Promise<void> {
        await this.assertElementVisible(this.emailLog.emailDetailSubjectByMemberLastName(memberLastName));
    }

    /**
     * Verifies the insurer bulk request email subject contains "Member Addition Bulk Request".
     */
    async assertInsurerEmailSubject(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestSubject);
        await this.assertElementVisible(this.emailLog.insurerBulkRequestSubject);
    }

    async assertInsurerEmailTo(clientName: string, emailTo: string): Promise<void> {
        await this.paginateToInsurerRow();
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestEmailToRow(clientName, emailTo));
        await this.assertElementVisible(this.emailLog.insurerBulkRequestEmailToRow(clientName, emailTo));
        log.info(`Insurer email row confirmed in log table — To: ${emailTo} | Client: ${clientName}`);
    }

    async assertInsurerEmailToViewButton(clientName: string, emailTo: string): Promise<void> {
        await this.paginateToInsurerRow();
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestEmailToViewButton(clientName, emailTo));
        await this.assertElementVisible(this.emailLog.insurerBulkRequestEmailToViewButton(clientName, emailTo));
        await this.click(this.emailLog.insurerBulkRequestEmailToViewButton(clientName, emailTo));
        log.info(`Insurer email "View" button confirmed — To: ${emailTo}`);
    }

    async assertInsurerEmailTableParaText(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestTableParaText);
        await this.assertElementVisible(this.emailLog.insurerBulkRequestTableParaText);
        log.info('Insurer email body confirmed — member addition bulk request paragraph present');
    }

    async assertInsurerEmailToInEmailLogDetails(emailTo: string): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestEmailToInDetails(emailTo));
        await this.assertElementVisible(this.emailLog.insurerBulkRequestEmailToInDetails(emailTo));
        log.info(`Insurer email detail — To address confirmed: ${emailTo}`);
    }

    /**
     * Reads the "To:" field in the email detail view and asserts it contains the expected email address.
     */
    async assertToEmail(expectedEmail: string): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.emailDetailToAddressField);
        const actual = (await this.emailLog.emailDetailToAddressField.textContent())?.trim() ?? '';
        log.info(`To email — Expected: "${expectedEmail}" | Actual: "${actual}"`);
        expect(actual).toContain(expectedEmail);
    }

    /**
     * Reads and logs the "To:" recipient address from the email detail view for audit trail purposes.
     */
    async logToEmailAddress(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.emailDetailToAddressField);
        const actual = (await this.emailLog.emailDetailToAddressField.textContent())?.trim() ?? '';
        log.info(`Row 2 insurer email — To: ${actual}`);
    }

    /**
     * Verifies the email body contains the "captioned request has been submitted to your insurer" paragraph,
     * confirming the email content is the member addition notification.
     */
    async assertEmailDetailRequestSubmittedToInsurer(): Promise<void> {
        await this.page.waitForTimeout(2000);
        await this.emailLog.captionRequestSubmittedToInsurer.waitFor({ state: 'visible', timeout: 30000 });
        await this.assertElementVisible(this.emailLog.captionRequestSubmittedToInsurer);
        log.info('Email detail — Request submitted to insurer paragraph verified');
    }

    /**
     * Reads the Company Name field in the member email detail view and asserts it matches the expected client name.
     */
    async assertEmailDetailCompanyName(expectedCompanyName: string): Promise<void> {
        await this.emailLog.emailDetailCompanyNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailCompanyNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Company Name: ${actual}`);
        expect(actual).toContain(expectedCompanyName);
    }

    /**
     * Reads the Insurer field in the member email detail view and asserts it matches the expected insurer name.
     */
    async assertEmailDetailInsurer(expectedInsurer: string): Promise<void> {
        await this.emailLog.emailDetailInsurerCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailInsurerCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Insurer: ${actual}`);
        expect(actual).toContain(expectedInsurer);
    }

    /**
     * Reads the Policy Name field in the member email detail view and asserts it matches the expected policy.
     */
    async assertEmailDetailPolicyName(expectedPolicyName: string): Promise<void> {
        await this.emailLog.emailDetailPolicyNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailPolicyNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Policy Name: ${actual}`);
        expect(actual).toContain(expectedPolicyName);
    }

    /**
     * Reads the Company Name field in the insurer bulk request email detail and asserts it matches the expected client name.
     */
    async assertEmailDetailMembersAdditionBulkRequestCompanyName(expectedCompanyName: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestCompanyName.waitFor({ state: 'visible', timeout: 30000 });
        const actualCompanyName = (await this.emailLog.MemberAdditionBulkRequestCompanyName.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Company Name: ${actualCompanyName}`);
        expect(actualCompanyName).toContain(expectedCompanyName);
    }

    /**
     * Reads the Insurer field in the insurer bulk request email detail and asserts it matches the expected insurer name.
     */
    async assertEmailDetailMembersAdditionBulkRequestInsurer(expectedInsurer: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestInsurer.waitFor({ state: 'visible', timeout: 30000 });
        const actualInsurer = (await this.emailLog.MemberAdditionBulkRequestInsurer.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Insurer: ${actualInsurer}`);
        expect(actualInsurer).toContain(expectedInsurer);
    }

    /**
     * Reads the Policy Name field in the insurer bulk request email detail and asserts it matches the expected policy.
     */
    async assertEmailDetailMembersAdditionBulkRequestPolicyName(expectedPolicyName: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestPolicyName.waitFor({ state: 'visible', timeout: 30000 });
        const actualPolicyName = (await this.emailLog.MemberAdditionBulkRequestPolicyName.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Policy Name: ${actualPolicyName}`);
        expect(actualPolicyName).toContain(expectedPolicyName);
    }

    /**
     * Reads the Policy Category field in the member email detail view and asserts it matches the expected category.
     */
    async assertEmailDetailPolicyCategory(expectedCategory: string): Promise<void> {
        await this.emailLog.emailDetailPolicyCategoryCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailPolicyCategoryCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Policy Category: ${actual}`);
        expect(actual).toContain(expectedCategory);
    }

    /**
     * Reads the Employee Number field in the member email detail view and asserts it matches the expected employee number.
     */
    async assertEmailDetailEmployeeNumber(expectedEmployeeNumber: string): Promise<void> {
        await this.emailLog.emailDetailEmployeeNumberCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailEmployeeNumberCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Employee Number: ${actual}`);
        expect(actual).toContain(expectedEmployeeNumber);
    }

    /**
     * Reads the Member Name field in the email detail view and asserts it contains the expected member name.
     */
    async assertEmailDetailMemberName(expectedMemberName: string): Promise<void> {
        await this.emailLog.emailDetailMemberNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailMemberNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Member Name: ${actual}`);
        expect(actual).toContain(expectedMemberName);
    }

    /**
     * Reads the attachment file name in the email detail view and asserts it contains the expected file name keyword.
     */
    async assertAttachmentFileNameContains(expectedFileName: string): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.MemberAdditionBulkRequestMemberListAttachment);
        const actualFileName = (await this.emailLog.MemberAdditionBulkRequestMemberListAttachment.textContent())?.trim() ?? '';
        log.info(`Attachment file name — Expected to contain: "${expectedFileName}" | Actual: "${actualFileName}"`);
        expect(actualFileName).toContain(expectedFileName);
    }

    /**
     * Download the insurer bulk request attachment Excel once.
     * Call this ONCE before the member verification loop.
     */
    async downloadAttachmentExcel(
        capturedClientName: string,
        capturedMedicalPolicyName: string
    ): Promise<string> {

        const attachmentLink = this.emailLog.MemberAdditionBulkRequestMemberListAttachmentLink;
        await this.waitForElementIsVisible(attachmentLink);

        const downloadDirectory = FileUtils.getTcDownloadDir();
        const downloadEventPromise = this.page.waitForEvent('download');
        await this.click(attachmentLink);
        const downloadedFile = await downloadEventPromise;

        const uniqueFileName = `${downloadedFile.suggestedFilename()}`;
        const savedFilePath = path.join(downloadDirectory, uniqueFileName);
        await downloadedFile.saveAs(savedFilePath);

        let waited = 0;
        while (waited < 10000) {
            if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) break;
            await this.page.waitForTimeout(300);
            waited += 300;
        }

        log.info(`Attachment Excel saved: ${savedFilePath}`);
        return savedFilePath;
    }

    /**
     * Verify one member row in the already-downloaded attachment Excel.
     * memberIndex 0 = row 12, memberIndex 1 = row 13, etc.
     */
    async verifyAttachmentExcelRow(
        savedFilePath: string,
        memberIndex: number,
        capturedClientName: string,
        capturedMedicalPolicyName: string,
        runtime: { lastName: string; employeeNumber: string; email: string; nationalIdNumber: string; maritalStatus?: string }
    ): Promise<void> {

        const workbook = await XlsxPopulate.fromFileAsync(savedFilePath);
        const worksheet = workbook.sheet('Membership List');

        const clientNameCell = String(worksheet.cell(5, 2).value() ?? '').trim();
        const policyNameCell = String(worksheet.cell(7, 2).value() ?? '').trim();
        expect(clientNameCell).toContain(capturedClientName);
        expect(policyNameCell).toContain(capturedMedicalPolicyName);

        const HEADER_ROW = 11;
        const DATA_ROW = 12 + memberIndex;
        const MAX_COL = 50;

        const headerToCol: Record<string, number> = {};
        for (let c = 1; c <= MAX_COL; c++) {
            const hdr = worksheet.cell(HEADER_ROW, c).value();
            if (hdr) headerToCol[String(hdr).trim()] = c;
        }

        const getCell = (colName: string): string =>
            String(worksheet.cell(DATA_ROW, headerToCol[colName] ?? 0).value() ?? '').trim();

        const lastName = getCell('Last Name');
        const employeeNo = getCell('Employee No.');
        const policy = getCell('Policy');
        const category = getCell('Category');
        const relation = getCell('Relation');
        const maritalStatus = getCell('Marital Status');
        const nationality = getCell('Nationality');
        const nationalId = getCell('National ID Number');
        const email = getCell('Email');

        const expectedMaritalStatus = runtime.maritalStatus ?? 'Married';

        log.info(`Attachment — Last Name: "${lastName}" | Expected: "${runtime.lastName}"`);
        expect(lastName).toBe(runtime.lastName);
        log.info(`Attachment — Employee No.: "${employeeNo}" | Expected: "${runtime.employeeNumber}"`);
        expect(employeeNo).toBe(runtime.employeeNumber);
        log.info(`Attachment — Policy: "${policy}"`);
        expect(policy).toBe(capturedMedicalPolicyName);
        log.info(`Attachment — Category: "${category}"`);
        expect(category).toContain('Cat A_');
        log.info(`Attachment — Relation: "${relation}"`);
        expect(relation).toBe('Principal');
        log.info(`Attachment — Marital Status: "${maritalStatus}" | Expected: "${expectedMaritalStatus}"`);
        expect(maritalStatus).toBe(expectedMaritalStatus);
        log.info(`Attachment — Nationality: "${nationality}"`);
        expect(nationality).toBe('India');
        log.info(`Attachment — National ID: "${nationalId}" | Expected to contain: "${runtime.nationalIdNumber}"`);
        expect(nationalId).toContain(runtime.nationalIdNumber);
        log.info(`Attachment — Email: "${email}" | Expected: "${runtime.email}"`);
        expect(email).toBe(runtime.email);

        log.info(`Attachment Excel — Member ${memberIndex + 1} (row ${DATA_ROW}) all verifications passed`);
    }

    /**
     * Downloads the MemberList attachment Excel once and verifies all member rows.
     * Completely dynamic — works for 3, 25, 40, or any number of members.
     */
    async downloadAndVerifyAllAttachmentExcelRows(
        capturedClientName: string,
        capturedMedicalPolicyName: string,
        members: Array<{
            lastName: string;
            employeeNumber: string;
            email: string;
            nationalIdNumber: string;
            maritalStatus?: string;
        }>
    ): Promise<void> {
        log.info(`Downloading MemberList attachment Excel — will verify all ${members.length} member rows from this single file`);
        const attachmentFilePath = await this.downloadAttachmentExcel(capturedClientName, capturedMedicalPolicyName);

        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            log.section(`Member ${i + 1} of ${members.length} — MemberList attachment Excel row verification (${member.lastName})`);
            log.info(`Verifying Member ${i + 1} (${member.lastName}) — checking 9 fields: Last Name, Employee No, Policy, Category, Relation, Marital Status, Nationality, National ID, Email`);
            await this.verifyAttachmentExcelRow(attachmentFilePath, i, capturedClientName, capturedMedicalPolicyName, member);
            log.sectionEnd(`Member ${i + 1} of ${members.length} — MemberList attachment Excel row verification (${member.lastName})`);
            log.pass(`Member ${i + 1} of ${members.length} — All 9 MemberList attachment Excel fields verified for ${member.lastName}`);
        }

        log.pass(`All ${members.length} member rows verified in MemberList attachment Excel`);
    }

    async downloadAndVerifyMemberAdditionReportExcel(
        capturedMedicalPolicyName: string,
        expectedTpaName: string,
        expectedEndorsementType: string,
        members: Array<{ lastName: string; employeeNumber: string }>
    ): Promise<void> {

        const attachmentLink = this.emailLog.memberAdditionReportAttachmentLink;
        await this.waitForElementIsVisible(attachmentLink);

        const downloadDirectory = FileUtils.getTcDownloadDir();
        const downloadEventPromise = this.page.waitForEvent('download');
        await this.click(attachmentLink);
        const downloadedFile = await downloadEventPromise;

        const uniqueFileName = `${downloadedFile.suggestedFilename()}`;
        const savedFilePath = path.join(downloadDirectory, uniqueFileName);
        await downloadedFile.saveAs(savedFilePath);

        let waited = 0;
        while (waited < 10000) {
            if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) break;
            await this.page.waitForTimeout(300);
            waited += 300;
        }

        log.info(`Member Addition Report downloaded: ${savedFilePath}`);

        await FileUtils.verifyMemberAdditionReportExcel(
            savedFilePath,
            members,
            capturedMedicalPolicyName,
            expectedTpaName,
            expectedEndorsementType
        );
    }

    // ── Dynamic all-member email log verification ─────────────────────────────

    /**
     * Verifies all email log rows for every member in the runtimeMembers array.
     * Completely dynamic — works for 3, 25, 40, or any number of members.
     */
    async verifyAllMemberEmailLogRows(
        runtimeMembers: Array<{
            lastName: string;
            email: string;
            employeeNumber: string;
        }>,
        capturedClientName: string,
        capturedMedicalPolicyName: string,
        policyCategory: string,
        expectedInsurer: string
    ): Promise<void> {
        const totalMembers = runtimeMembers.length;
        log.info(`Starting email log verification for all ${totalMembers} members`);

        for (let i = 0; i < totalMembers; i++) {
            const member = runtimeMembers[i];

            log.section(`Member ${i + 1} of ${totalMembers} — Email log row verification (${member.lastName})`);

            log.info(`Paginating to email log row for member: ${member.lastName}`);
            await this.paginateToMemberRow(member.lastName);

            log.info(`Verifying email log row exists for member: ${member.lastName} under policy: ${capturedMedicalPolicyName}`);
            await this.isVisible(this.emailLog.emailLogPolicyCellByMemberLastName(member.lastName, capturedMedicalPolicyName));

            log.info(`Verifying email type shows "Addition Request" for member: ${member.lastName}`);
            await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithAdditionRequest(member.lastName));

            log.info(`Verifying notification type is correct for member: ${member.lastName}`);
            await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithNotificationType(member.lastName));

            log.info(`Verifying email was sent to correct yopmail address: ${member.email}`);
            await this.isVisible(this.emailLog.emailDetailByLastNameWithToYopEmailLabel(member.lastName, member.email));

            log.info(`Verifying email attachment indicator is present for member: ${member.lastName}`);
            await this.isVisible(this.emailLog.emailDetailSubjectByMemberLastName(member.lastName));

            log.info(`Verifying member notification email has 0 attachments (attachment is on the insurer email, not this one)`);
            await this.isVisible(this.emailLog.emailLogRowByLastNameWithAttachmentZero(member.lastName));

            log.info(`Opening email detail view for member: ${member.lastName}`);
            await this.click(this.emailLog.emailLogRowViewLinkByMemberLastName(member.lastName));

            log.info(`Verifying email detail heading is visible — confirms correct email was opened`);
            await this.waitForElementIsVisible(this.emailLog.addMembersBulkEmailDetailHeading);
            await this.assertElementVisible(this.emailLog.addMembersBulkEmailDetailHeading);

            log.info(`Verifying email subject line contains member name: ${member.lastName}`);
            await this.assertElementVisible(this.emailLog.emailDetailSubjectByMemberLastName(member.lastName));

            log.info(`Verifying email body contains "Request submitted to insurer" paragraph`);
            await this.page.waitForTimeout(2000);
            await this.emailLog.captionRequestSubmittedToInsurer.waitFor({ state: 'visible', timeout: 30000 });
            await this.assertElementVisible(this.emailLog.captionRequestSubmittedToInsurer);

            log.info(`Verifying company name in email detail: expected "${capturedClientName}"`);
            await this.emailLog.emailDetailCompanyNameCell.waitFor({ state: 'visible', timeout: 30000 });
            const company = (await this.emailLog.emailDetailCompanyNameCell.textContent())?.trim() ?? '';
            expect(company).toContain(capturedClientName);
            log.info(`Company name verified: "${company}"`);

            log.info(`Verifying insurer name in email detail: expected "${expectedInsurer}"`);
            await this.emailLog.emailDetailInsurerCell.waitFor({ state: 'visible', timeout: 30000 });
            const insurer = (await this.emailLog.emailDetailInsurerCell.textContent())?.trim() ?? '';
            expect(insurer).toContain(expectedInsurer);
            log.info(`Insurer name verified: "${insurer}"`);

            log.info(`Verifying policy name in email detail: expected "${capturedMedicalPolicyName}"`);
            await this.emailLog.emailDetailPolicyNameCell.waitFor({ state: 'visible', timeout: 30000 });
            const policy = (await this.emailLog.emailDetailPolicyNameCell.textContent())?.trim() ?? '';
            expect(policy).toContain(capturedMedicalPolicyName);
            log.info(`Policy name verified: "${policy}"`);

            log.info(`Verifying policy category in email detail: expected "${policyCategory}"`);
            await this.emailLog.emailDetailPolicyCategoryCell.waitFor({ state: 'visible', timeout: 30000 });
            const category = (await this.emailLog.emailDetailPolicyCategoryCell.textContent())?.trim() ?? '';
            expect(category).toContain(policyCategory);
            log.info(`Policy category verified: "${category}"`);

            log.info(`Verifying employee number in email detail: expected "${member.employeeNumber}"`);
            await this.emailLog.emailDetailEmployeeNumberCell.waitFor({ state: 'visible', timeout: 30000 });
            const empNo = (await this.emailLog.emailDetailEmployeeNumberCell.textContent())?.trim() ?? '';
            expect(empNo).toContain(member.employeeNumber);
            log.info(`Employee number verified: "${empNo}"`);

            log.sectionEnd(`Member ${i + 1} of ${totalMembers} — Email log row verification (${member.lastName})`);
            log.pass(`Member ${i + 1} of ${totalMembers} — All 14 email log fields verified for ${member.lastName}`);

            if (i < totalMembers - 1) {
                log.info(`Returning to email log list to verify member ${i + 2} of ${totalMembers}`);
                await this.waitForElementIsVisible(this.emailLog.backToListButton);
                await this.scrollIntoView(this.emailLog.backToListButton);
                await this.click(this.emailLog.backToListButton);
                log.info(`Re-filtering email logs for member ${i + 2} of ${totalMembers}`);
                await this.click(this.emailLog.emailLogClientDropdown);
                await this.waitForElementIsVisible(this.emailLog.emailLogTargetClientOption);
                await this.click(this.emailLog.emailLogTargetClientOption);
                await this.click(this.emailLog.emailLogPolicyDropdown);
                await this.waitForElementIsVisible(this.emailLog.emailLogTargetPolicyOption);
                await this.click(this.emailLog.emailLogTargetPolicyOption);
                await this.click(this.emailLog.emailLogSearchButton);
            }
        }

        log.pass(`All ${totalMembers} member notification emails fully verified`);
    }
}