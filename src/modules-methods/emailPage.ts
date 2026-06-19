import { expect } from '@playwright/test';
import { BasePage } from 'src/pages/basePage';
import { EmailLogElements } from 'src/pages/elements/emailLog';
import { logger as log } from 'src/helpers/logger';
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
     * Action: Navigate to Email Logs Menu Layout Section
     * Steps: Controls the side drawer menu tree by scrolling to and expanding the root email category, then triggers visibility and click routines for the secondary email logs leaf.
     */
    async navigateToEmailLogs(): Promise<void> {
        await this.scrollToElement(this.emailLog.sidebarEmailsMenu);
        await this.click(this.emailLog.sidebarEmailsMenu);
        await this.waitForElementIsVisible(this.emailLog.sidebarEmailLogsMenu);
        await this.assertElementVisible(this.emailLog.sidebarEmailLogsMenu);
        await this.click(this.emailLog.sidebarEmailLogsMenu);
    }

    /**
     * Action: Filter Email Logs by Client and Policy Parameter Keys
     * Steps: Expands corporate account and tracker policy dropdown nodes sequentially, clicks target filtering matches, and fires the tabular search dispatch.
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

    private async paginateToMemberRow(memberLastName: string): Promise<void> {
        const MAX_PAGES = 20;
        for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
            const found = await this.emailLog.emailLogRowViewLinkByMemberLastName(memberLastName).isVisible().catch(() => false);
            if (found) return;
            const nextBtn = this.emailLog.emailLogNextPageButton;
            const nextVisible = await nextBtn.isVisible().catch(() => false);
            if (!nextVisible) {
                log.info(`No next page available — "${memberLastName}" not found after page ${pageNum}`);
                return;
            }
            log.info(`"${memberLastName}" not on email log page ${pageNum} — navigating to next page`);
            await this.click(nextBtn);
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Action: Open Detailed Individual Member Email Transaction Log Entry
     * Steps: Paginates through email log results until the member row is found, then opens the detail view.
     */
    async openMemberEmailLogDetail(memberLastName: string): Promise<void> {
        await this.paginateToMemberRow(memberLastName);
        await this.click(this.emailLog.emailLogRowViewLinkByMemberLastName(memberLastName));
    }

    /**
     * Action: Open Corporate Insurer Bulk Request Dispatch Log Detail View
     * Steps: Tracks element layer readiness for bulk delivery tracking link indicators, and commands page layer context interaction updates.
     */
    async openInsurerBulkRequestEmailDetail(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestEmailViewLink);
        await this.click(this.emailLog.insurerBulkRequestEmailViewLink);
    }

    /**
     * Action: Reverse Route Navigation Back to Index Tabular Records List
     * Steps: Tracks presence metrics for main navigation escape targets and triggers standard click sequences.
     */
    async clickBackToList(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.backToListButton);
        await this.click(this.emailLog.backToListButton);
    }

    /**
 * Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
 * Steps: Paginates through results until the member row is found, then asserts visibility.
 */
    async assertEmailLogRowExistsForMember(policyName: string, memberLastName: string): Promise<void> {
        // await this.isVisible(this.emailLog.emailLogNotificationTypeLabel);
        await this.paginateToMemberRow(memberLastName);
        await this.isVisible(this.emailLog.emailLogPolicyCellByMemberLastName(memberLastName, policyName));
        log.info(`assertEmailLogRowExistsForMember : ${memberLastName} | ${policyName}`)
    }

    /**
     * Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
     * Steps: Asserts text visibility components for operational classifications ddition request.
     */
    async assertEmailLogRowExistsForLastNameWithAdditionRequest(memberLastName: string): Promise<void> {
        await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithAdditionRequest(memberLastName));
    }

    /**
* Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
* Steps: Asserts element visibility components for notification type.
*/
    async assertEmailLogRowExistsForLastNameWithNotificationType(memberLastName: string): Promise<void> {
        await this.assertElementVisible(this.emailLog.emailLogRowByLastNameWithNotificationType(memberLastName));
    }

    /**
    * Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
    * Steps: Asserts element visibility components for yop email.
    */
    async assertEmailLogRowExistsForToYopEmail(memberLastName: string, toEmail: string): Promise<void> {
        await this.isVisible(this.emailLog.emailDetailByLastNameWithToYopEmailLabel(memberLastName, toEmail));
    }

    /**
* Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
* Steps: Asserts element visibility components for subject.
*/
    async assertEmailLogRowExistsForToYopEmailHaveAttachments( memberLastName: string): Promise<void> {
        await this.isVisible(this.emailLog.emailDetailSubjectByMemberLastName(memberLastName));
    }

    /**
* Action: Assert Presence of Baseline Email Log Data Rows for Specific Corporate Members
* Steps: Asserts element visibility components for attachment zero.
*/
    async assertEmailLogRowExistsForToYopEmailHaveAttachmentsZero(memberLastName: string): Promise<void> {
        await this.isVisible(this.emailLog.emailLogRowByLastNameWithAttachmentZero(memberLastName));
    }

    /**
     * Action: Assert Structural Visibility of Email Metadata Details Heading Box
     * Steps: Tracks element state loops to confirm the visual presence of message detailing headings inside the framework wrapper.
     */
    async assertEmailDetailHeadingIsVisible(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.addMembersBulkEmailDetailHeading);
        await this.assertElementVisible(this.emailLog.addMembersBulkEmailDetailHeading);
    }

    /**
     * Action: Assert Messaging Subject Lines Contain Core Match Tokens
     * Steps: Evaluates text node targets contextually rendered for specific member entities against safety display expectations.
     */
    async assertEmailDetailSubjectContainsMemberName(memberLastName: string): Promise<void> {
        await this.assertElementVisible(this.emailLog.emailDetailSubjectByMemberLastName(memberLastName));
    }

    /**
     * Action: Assert Insurer Bulk Payload Dispatch Subject String Layout Content
     * Steps: Performs explicit visibility tracking checks on bulk dispatch transaction title components.
     */
    async assertInsurerEmailSubject(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.insurerBulkRequestSubject);
        await this.assertElementVisible(this.emailLog.insurerBulkRequestSubject);
    }

    /**
     * Action: Assert Destination Recipient Value Properties Mirror Intended Routing Parameters
     * Steps: Validates message envelope fields, parses text stream outputs, writes operational reports, and applies hard string matching assertions.
     */
    async assertToEmail(expectedEmail: string): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.emailDetailToAddressField);
        const actual = (await this.emailLog.emailDetailToAddressField.textContent())?.trim() ?? '';
        log.info(`To email — Expected: "${expectedEmail}" | Actual: "${actual}"`);
        expect(actual).toContain(expectedEmail);
    }

    /**
     * Action: Read and Record Despatched Core Transaction Delivery Channels to System Reports
     * Steps: Queries output fields safely to fetch string arrays and passes values cleanly into local pipeline run reports.
     */
    async logToEmailAddress(): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.emailDetailToAddressField);
        const actual = (await this.emailLog.emailDetailToAddressField.textContent())?.trim() ?? '';
        log.info(`Row 2 insurer email — To: ${actual}`);
    }

    /**
     * Action: Assert Transmission Clearances and Confirmation Responses from Corporate Insurer Carriers
     * Steps: Suspends system processes to resolve async timing updates, monitors item states, and evaluates confirmation captions.
     */
    async assertEmailDetailRequestSubmittedToInsurer(): Promise<void> {
        await this.page.waitForTimeout(2000);
        await this.emailLog.captionRequestSubmittedToInsurer.waitFor({ state: 'visible', timeout: 30000 });
        await this.assertElementVisible(this.emailLog.captionRequestSubmittedToInsurer);
        log.info('Email detail — Request submitted to insurer paragraph verified');
    }

    /**
     * Action: Assert Client Account Attributes Displayed Within the Email Record Detail Matrix
     * Steps: Handles specific selector timeout tracking parameters, reads row inner values, and cross-checks tracking identifiers.
     */
    async assertEmailDetailCompanyName(expectedCompanyName: string): Promise<void> {
        await this.emailLog.emailDetailCompanyNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailCompanyNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Company Name: ${actual}`);
        expect(actual).toContain(expectedCompanyName);
    }

    /**
     * Action: Assert Carrying Insurer Allocations Displayed Inside Log Detail Dashboards
     * Steps: Captures active carrier naming fields asynchronously, generates info trace logs, and verifies target text inclusions.
     */
    async assertEmailDetailInsurer(expectedInsurer: string): Promise<void> {
        await this.emailLog.emailDetailInsurerCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailInsurerCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Insurer: ${actual}`);
        expect(actual).toContain(expectedInsurer);
    }

    /**
     * Action: Assert Policy Description Parameters Registered Inside Active Log Summaries
     * Steps: Runs field state tracking checks, reads string attributes, and matches them to upstream runtime dataset keys.
     */
    async assertEmailDetailPolicyName(expectedPolicyName: string): Promise<void> {
        await this.emailLog.emailDetailPolicyNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailPolicyNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Policy Name: ${actual}`);
        expect(actual).toContain(expectedPolicyName);
    }

    /**
     * Action: Assert Client Corporate Entity Classifications in Bulk Request Modules
     * Steps: Isolates explicit component layout fields, handles tracking safety constraints, and evaluates value uniformity.
     */
    async assertEmailDetailMembersAdditionBulkRequestCompanyName(expectedCompanyName: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestCompanyName.waitFor({ state: 'visible', timeout: 30000 });
        const actualCompanyName = (await this.emailLog.MemberAdditionBulkRequestCompanyName.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Company Name: ${actualCompanyName}`);
        expect(actualCompanyName).toContain(expectedCompanyName);
    }

    /**
     * Action: Assert Registered Underwriter Parameters in Bulk Addition Despatches
     * Steps: Validates locator readiness, fetches active text parameters from specific element boxes, and runs clean value tests.
     */
    async assertEmailDetailMembersAdditionBulkRequestInsurer(expectedInsurer: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestInsurer.waitFor({ state: 'visible', timeout: 30000 });
        const actualInsurer = (await this.emailLog.MemberAdditionBulkRequestInsurer.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Insurer: ${actualInsurer}`);
        expect(actualInsurer).toContain(expectedInsurer);
    }

    /**
     * Action: Assert Targeted Healthcare Policy Frameworks Mapped inside Bulk Ingestion Messages
     * Steps: monitors insurance program text elements, writes verification logs, and performs text content matches.
     */
    async assertEmailDetailMembersAdditionBulkRequestPolicyName(expectedPolicyName: string): Promise<void> {
        await this.emailLog.MemberAdditionBulkRequestPolicyName.waitFor({ state: 'visible', timeout: 30000 });
        const actualPolicyName = (await this.emailLog.MemberAdditionBulkRequestPolicyName.textContent())?.trim() ?? '';
        log.info(`Insurer Email detail — Policy Name: ${actualPolicyName}`);
        expect(actualPolicyName).toContain(expectedPolicyName);
    }

    /**
     * Action: Assert Internal Operational Tier Category Details Stored in Transaction Logs
     * Steps: Pulls data properties from localized categorical labels and validates structure layouts via deep matches.
     */
    async assertEmailDetailPolicyCategory(expectedCategory: string): Promise<void> {
        await this.emailLog.emailDetailPolicyCategoryCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailPolicyCategoryCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Policy Category: ${actual}`);
        expect(actual).toContain(expectedCategory);
    }

    /**
     * Action: Assert Linked Staff Tracking Numbers Referenced in Transaction Files
     * Steps: Reads index parameters from corresponding individual data slots to maintain corporate ledger integrity.
     */
    async assertEmailDetailEmployeeNumber(expectedEmployeeNumber: string): Promise<void> {
        await this.emailLog.emailDetailEmployeeNumberCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailEmployeeNumberCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Employee Number: ${actual}`);
        expect(actual).toContain(expectedEmployeeNumber);
    }

    /**
     * Action: Assert Specific Target Member Account Name Elements Inside Message Data Blocks
     * Steps: Evaluates text node targets contextually rendered for specific member entities against baseline configuration entries.
     */
    async assertEmailDetailMemberName(expectedMemberName: string): Promise<void> {
        await this.emailLog.emailDetailMemberNameCell.waitFor({ state: 'visible', timeout: 30000 });
        const actual = (await this.emailLog.emailDetailMemberNameCell.textContent())?.trim() ?? '';
        log.info(`Email detail — Member Name: ${actual}`);
        expect(actual).toContain(expectedMemberName);
    }

    /**
     * Action: Assert Structural Payload Names and Metadata Tags of Outbound Email Attachments
     * Steps: Evaluates generated spreadsheet attachment labels dynamically against corporate template name configurations.
     */
    async assertAttachmentFileNameContains(expectedFileName: string): Promise<void> {
        await this.waitForElementIsVisible(this.emailLog.MemberAdditionBulkRequestMemberListAttachment);
        const actualFileName = (await this.emailLog.MemberAdditionBulkRequestMemberListAttachment.textContent())?.trim() ?? '';
        log.info(`Attachment file name — Expected to contain: "${expectedFileName}" | Actual: "${actualFileName}"`);
        expect(actualFileName).toContain(expectedFileName);
    }

    /**
     * Step Group: SG : EA : Download and Verify Inbound Mail Attachment Excel Structure Details
     * Steps: Allocates workspace download points, monitors file save sequences, handles empty assets checks, opens spreadsheet nodes via third-party parser engines, maps coordinate structures, and executes multi-column value asset validation routines.
     */
    async downloadAndVerifyAttachmentExcel(capturedClientName: string, capturedMedicalPolicyName: string, runtime: { lastName: string; employeeNumber: string; email: string; nationalIdNumber: string; maritalStatus?: string }): Promise<string> {

        const attachmentLink = this.emailLog.MemberAdditionBulkRequestMemberListAttachmentLink;
        await this.waitForElementIsVisible(attachmentLink);

        const downloadDirectory = path.join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadDirectory)) fs.mkdirSync(downloadDirectory, { recursive: true });

        const downloadEventPromise = this.page.waitForEvent('download');
        await this.click(attachmentLink);
        const downloadedFile = await downloadEventPromise;

        const savedFilePath = path.join(downloadDirectory, downloadedFile.suggestedFilename());
        await downloadedFile.saveAs(savedFilePath);

        let waited = 0;
        while (waited < 10000) {
            if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) break;
            await this.page.waitForTimeout(300);
            waited += 300;
        }

        log.info(`Attachment Excel saved: ${savedFilePath}`);

        const workbook = await XlsxPopulate.fromFileAsync(savedFilePath);
        const worksheet = workbook.sheet('Membership List');

        const clientNameCell = String(worksheet.cell(5, 2).value() ?? '').trim();
        const policyNameCell = String(worksheet.cell(7, 2).value() ?? '').trim();
        expect(clientNameCell).toContain(capturedClientName);
        expect(policyNameCell).toContain(capturedMedicalPolicyName);

        const HEADER_ROW = 11;
        const DATA_ROW = 12;
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
        const expectedMaritalStatus = runtime.maritalStatus ?? 'Married';
        log.info(`Attachment — Marital Status: "${maritalStatus}" | Expected: "${expectedMaritalStatus}"`);
        expect(maritalStatus).toBe(expectedMaritalStatus);
        log.info(`Attachment — Nationality: "${nationality}"`);
        expect(nationality).toBe('India');
        log.info(`Attachment — National ID: "${nationalId}" | Expected to contain: "${runtime.nationalIdNumber}"`);
        expect(nationalId).toContain(runtime.nationalIdNumber);
        log.info(`Attachment — Email: "${email}" | Expected: "${runtime.email}"`);
        expect(email).toBe(runtime.email);

        log.info('Attachment Excel — all verifications passed');
        return savedFilePath;
    }
}