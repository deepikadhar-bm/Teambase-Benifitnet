import { expect } from '@playwright/test';
import { BasePage } from 'src/pages/basePage';
import { ReportsElements } from 'src/pages/elements/reports';
import { logger as log } from 'src/helpers/logger';
import * as fs from 'fs';
import * as path from 'path';

const XlsxPopulate = require('xlsx-populate').default || require('xlsx-populate');

export class ReportPage extends BasePage {

    private readonly reportPage: ReportsElements;

    constructor(page: any) {
        super(page);
        this.reportPage = new ReportsElements(page);
    }

    /**
     * Action: Navigate to Reports Main Section
     * Steps: Scrolls to and clicks the sidebar navigation item, then verifies the dashboard banner display.
     */
    async navigateToReports(): Promise<void> {
        await this.scrollToElement(this.reportPage.sidebarReportsMenu);
        await this.click(this.reportPage.sidebarReportsMenu);
        await this.waitForElementIsVisible(this.reportPage.reportsHeadingText);
        await this.assertElementVisible(this.reportPage.reportsHeadingText);
    }

    /**
     * Action: Open Workflow Logs Report Link
     * Steps: Explicitly waits for the specific report section interface route link to render and executes a direct click.
     */
    async openWorkflowLogsReport(): Promise<void> {
        await this.waitForElementIsVisible(this.reportPage.workflowLogsReportLink);
        await this.click(this.reportPage.workflowLogsReportLink);
        await this.waitForElementIsVisible(this.reportPage.workflowLogsReportClientDropdown);
    }

    /**
     * Action: Select Workflow Client from Dropdown Menu Configuration
     * Steps: Expands selection option tree, interacts with specific option choice components, and asserts clean exit closures.
     */
    async selectWorkflowClient(): Promise<void> {
        await this.click(this.reportPage.workflowLogsReportClientDropdown);
        await this.waitForElementIsVisible(this.reportPage.workflowLogsReportClientDropdownOption);
        await this.click(this.reportPage.workflowLogsReportClientDropdownOption);
        await this.waitForElementIsVisible(this.reportPage.verifyWorkflowLogsReportClientDropdown);
        await this.click(this.reportPage.workflowLogsReportClientDropdownClose);
    }

    /**
     * Action: Select Workflow Policy Filter Attributes
     * Steps: Interacts with corporate insurance tracking system menus to select target tracking policy nodes.
     */
    async selectWorkflowPolicy(): Promise<void> {
        await this.click(this.reportPage.workflowLogsReportPolicyDropdown);
        await this.waitForElementIsVisible(this.reportPage.workflowLogsReportPolicyDropdownOption);
        await this.click(this.reportPage.workflowLogsReportPolicyDropdownOption);
        await this.waitForElementIsVisible(this.reportPage.verifyWorkflowLogsReportPolicyDropdown);
    }

    /**
     * Action: Select Workflow Category Operational Tier Elements
     * Steps: Opens categorizations hierarchy mapping options, confirms contextual option visibility items, and executes clean confirmation.
     */
    async selectWorkflowCategory(): Promise<void> {
        await this.click(this.reportPage.workflowLogsReportCategoryDropdown);
        await this.waitForElementIsVisible(this.reportPage.workflowLogsReportCategoryDropdownOption);
        await this.click(this.reportPage.workflowLogsReportCategoryDropdownOption);
        await this.waitForElementIsVisible(this.reportPage.verifyWorkflowLogsReportCategoryDropdown);
    }

    /**
     * Action: Export Generated Workflow Summary Matrices to Excel Spreadsheet Data Object
     * Steps: Builds platform workspace download pathways, tracks downstream browser system save events, and handles persistent size verification timeouts.
     */
    async exportWorkflowToExcel(): Promise<string> {
        const downloadDirectory = path.join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadDirectory)) fs.mkdirSync(downloadDirectory, { recursive: true });

        const downloadEventPromise = this.page.waitForEvent('download', { timeout: 30000 });
        await this.click(this.reportPage.ExportToExcelButton);
        const downloadedFile = await downloadEventPromise;

        const baseName = downloadedFile.suggestedFilename().replace('.xlsx', '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const uniqueFileName = `${baseName}_${timestamp}.xlsx`;
        const savedFilePath = path.join(downloadDirectory, uniqueFileName);

        await downloadedFile.saveAs(savedFilePath);

        let waited = 0;
        while (waited < 15000) {
            if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) break;
            await this.page.waitForTimeout(300);
            waited += 300;
        }

        expect(fs.existsSync(savedFilePath), 'Workflow Excel should exist after download').toBe(true);
        log.info(`Workflow Excel downloaded: ${uniqueFileName} (${(fs.statSync(savedFilePath).size / 1024).toFixed(1)} KB)`);
        return savedFilePath;
    }

    /**
     * Step Group: SG : WL : Verifying Excel Report Rows For Workflow Member Transactions
     * Steps: Parses spreadsheet matrices mapping dynamic columns, loops dataset keys, identifies user indices, and enforces deep-field assertions across properties.
     */
    async verifyWorkflowExcelMemberRow(filePath: string, runtime: { lastName: string; employeeNumber: string }, capturedClientName: string, capturedMedicalPolicyName: string): Promise<void> {

        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const worksheet = workbook.sheet('Workflow Logs Report');

        const HEADER_ROW = 8;
        const FIRST_DATA_ROW = 9;
        const MAX_COL = 54;

        const headerToCol: Record<string, number> = {};
        for (let c = 1; c <= MAX_COL; c++) {
            const hdr = worksheet.cell(HEADER_ROW, c).value();
            if (hdr) headerToCol[String(hdr).trim()] = c;
        }
        log.info(`Workflow headers mapped: ${Object.keys(headerToCol).length} columns`);

        const getCell = (row: number, colName: string): string =>
            String(worksheet.cell(row, headerToCol[colName] ?? 0).value() ?? '').trim();

        let lastDataRow = FIRST_DATA_ROW;
        for (let r = FIRST_DATA_ROW; r <= 10000; r++) {
            const txId = String(worksheet.cell(r, 1).value() ?? '').trim();
            if (txId === '') break;
            lastDataRow = r;
        }
        const totalDataRows = lastDataRow - FIRST_DATA_ROW + 1;
        log.info(`Workflow data rows: ${totalDataRows} (rows ${FIRST_DATA_ROW} to ${lastDataRow})`);

        let memberDataRow = -1;
        for (let r = FIRST_DATA_ROW; r <= lastDataRow; r++) {
            const empNo = getCell(r, 'Employee Number');
            if (empNo === runtime.employeeNumber) { memberDataRow = r; break; }
        }

        log.info(`Searching for Employee Number: ${runtime.employeeNumber} in ${totalDataRows} rows`);
        expect(memberDataRow, `Employee Number "${runtime.employeeNumber}" not found in Workflow Logs (rows ${FIRST_DATA_ROW}–${lastDataRow})`).toBeGreaterThan(0);
        if (memberDataRow < 0) return;

        const memberName = getCell(memberDataRow, 'Member Name');
        const employeeNo = getCell(memberDataRow, 'Employee Number');
        const company = getCell(memberDataRow, 'Company');
        const policy = getCell(memberDataRow, 'Policy');
        const category = getCell(memberDataRow, 'Category');
        const relation = getCell(memberDataRow, 'Relation');
        const requestType = getCell(memberDataRow, 'Request Type');
        const nationality = getCell(memberDataRow, 'Nationality');

        log.info(`Workflow — Row ${memberDataRow} found`);
        log.info(`  Member Name  : "${memberName}"  | Expected to contain: "${runtime.lastName}"`);
        log.info(`  Employee No  : "${employeeNo}"  | Expected: "${runtime.employeeNumber}"`);
        log.info(`  Company      : "${company}"`);
        log.info(`  Policy       : "${policy}"`);
        log.info(`  Category     : "${category}"`);
        log.info(`  Relation     : "${relation}"`);
        log.info(`  Request Type : "${requestType}"`);
        log.info(`  Nationality  : "${nationality}"`);

        expect(memberName, `Member Name should contain "${runtime.lastName}"`).toContain(runtime.lastName);
        expect(employeeNo, `Employee Number mismatch`).toBe(runtime.employeeNumber);
        expect(company, `Company mismatch`).toBe(capturedClientName);
        expect(policy, `Policy mismatch`).toBe(capturedMedicalPolicyName);
        expect(category, `Category should contain "Cat A_"`).toContain('Cat A_');
        expect(relation, `Relation should be "Principal"`).toBe('Principal');
        expect(requestType, `Request Type should be "Member Addition"`).toBe('Member Addition');
        expect(nationality, `Nationality should be "India"`).toBe('India');

        log.info('Workflow Logs Excel — all column verifications passed');
    }

    /**
     * Action: Open Consolidated Membership Report View Selection
     * Steps: Identifies interface placement links, triggers navigation access clicks, and sets up explicit elements checks.
     */
    async openConsolidatedMembershipReport(): Promise<void> {
        await this.waitForElementIsVisible(this.reportPage.consolidatedMembershipReportLink);
        await this.click(this.reportPage.consolidatedMembershipReportLink);
    }

    /**
     * Action: Select Consolidated Insurance Underwriter Properties
     * Steps: Controls selection tree interactions, scrolls option layers viewable ranges, handles context-hover dependencies, and sets anchor parameters.
     */
    async selectConsolidatedInsurer(): Promise<void> {
        await this.click(this.reportPage.consolidatedMembershipListInsurerDropdown);
        await this.scrollToElement(this.reportPage.consolidatedMembershipListInsurerDropdownOption);
        await this.hover(this.reportPage.consolidatedMembershipListInsurerDropdownOptionTestInsurerHover);
        await this.click(this.reportPage.consolidatedMembershipListInsurerDropdownOptionTestInsurerHover);
        await this.click(this.reportPage.consolidatedMembershipListInsurerDropdownOption);
        await this.click(this.reportPage.consolidatedMembershipListInsurerLabel);
    }

    /**
     * Action: Select Consolidated Corporate Client Accounts
     * Steps: Activates target dropdown selections, hovers configuration elements, confirms option states, and closes drop overlay boundaries cleanly.
     */
    async selectConsolidatedClient(): Promise<void> {
        await this.click(this.reportPage.consolidatedMembershipListClientDropdown);
        await this.hover(this.reportPage.consolidatedMembershipListClientDropdownOption);
        await this.click(this.reportPage.consolidatedMembershipListClientDropdownOption);
        await this.assertElementVisible(this.reportPage.verifyConsolidatedMembershipListClientDropdown);
        await this.click(this.reportPage.consolidatedMembershipListClientDropdownClose);
    }

    /**
     * Action: Select Consolidated Medical Insurance Allocation Policies
     * Steps: Interacts with multi-select components to filter underlying insurance modules, changing structural visibility flags.
     */
    async selectConsolidatedPolicy(): Promise<void> {
        await this.click(this.reportPage.consolidatedMembershipListPolicyDropdown);
        await this.waitForElementIsVisible(this.reportPage.consolidatedMembershipListPolicyCheckbox);
        await this.click(this.reportPage.consolidatedMembershipListPolicyCheckbox);
        await this.waitForElementIsVisible(this.reportPage.verifyConsolidatedMembershipListPolicy);
        await this.click(this.reportPage.consolidatedMembershipListPolicyLabel);
    }

    /**
     * Action: Select Consolidated Category Filters Grouping Tiers
     * Steps: Activates criteria option selections, switches target contextual validation checkboxes, and safely sets labeling parameters.
     */
    async selectConsolidatedCategory(): Promise<void> {
        await this.click(this.reportPage.consolidatedMembershipListCategoryDropdown);
        await this.waitForElementIsVisible(this.reportPage.consolidatedMembershipListCategoryCheckbox);
        await this.click(this.reportPage.consolidatedMembershipListCategoryCheckbox);
        await this.click(this.reportPage.consolidatedMembershipListCategoryLabel);
    }

    /**
     * Action: Export Consolidated Membership Data Matrices out to Physical Excel Sheet
     * Steps: Initializes storage configurations, attaches to automated event listeners, and evaluates structural asset existence metrics post-download.
     */
    async exportConsolidatedToExcel(): Promise<string> {
        const downloadDirectory = path.join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadDirectory)) fs.mkdirSync(downloadDirectory, { recursive: true });

        const downloadEventPromise = this.page.waitForEvent('download', { timeout: 30000 });
        await this.click(this.reportPage.consolidatedMembershipListPolicyExportToExcelButton);
        const downloadedFile = await downloadEventPromise;

        const baseName = downloadedFile.suggestedFilename().replace('.xlsx', '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const uniqueFileName = `${baseName}_${timestamp}.xlsx`;
        const savedFilePath = path.join(downloadDirectory, uniqueFileName);

        await downloadedFile.saveAs(savedFilePath);

        let waited = 0;
        while (waited < 15000) {
            if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) break;
            await this.page.waitForTimeout(300);
            waited += 300;
        }
        expect(fs.existsSync(savedFilePath), 'Consolidated Excel should exist after download').toBe(true);
        expect(uniqueFileName, 'File name should contain ConsolidatedMembershipList').toContain('ConsolidatedMembershipList');
        log.info(`Consolidated Excel downloaded: ${uniqueFileName} (${(fs.statSync(savedFilePath).size / 1024).toFixed(1)} KB)`);
        return savedFilePath;
    }

    /**
     * Step Group: SG : CM : Verifying Column Details Inside Consolidated Membership List Row
     * Steps: Loads output spreadsheet data streams, maps localized multi-column indexing, parses dynamic row items, isolates record IDs, and runs structured verification assertions.
     */
    async verifyConsolidatedExcelMemberRow(filePath: string, runtime: { firstName: string; lastName: string; employeeNumber: string; email: string; nationalIdNumber: string; maritalStatus?: string }, capturedMedicalPolicyName: string): Promise<void> {
        // Structure confirmed from file: Row 4 title | Row 5 date | Row 6 headers (57 cols) | Row 7+ data
        // Max row 10005 pre-allocated — scan col 1 (BenefitNet ID) to find last real row
        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const worksheet = workbook.sheet('Membership List');

        const HEADER_ROW = 6;
        const FIRST_DATA_ROW = 7;
        const MAX_COL = 57;

        const headerToCol: Record<string, number> = {};
        for (let c = 1; c <= MAX_COL; c++) {
            const hdr = worksheet.cell(HEADER_ROW, c).value();
            if (hdr) headerToCol[String(hdr).trim()] = c;
        }

        const getCell = (row: number, col: string): string =>
            String(worksheet.cell(row, headerToCol[col] ?? 0).value() ?? '').trim();

        let lastDataRow = FIRST_DATA_ROW;
        for (let r = FIRST_DATA_ROW; r <= 10000; r++) {
            if (String(worksheet.cell(r, 1).value() ?? '').trim() === '') break;
            lastDataRow = r;
        }
        const totalRows = lastDataRow - FIRST_DATA_ROW + 1;
        log.info(`Consolidated data rows: ${totalRows} (rows ${FIRST_DATA_ROW}–${lastDataRow})`);

        let memberDataRow = -1;
        for (let r = FIRST_DATA_ROW; r <= lastDataRow; r++) {
            if (getCell(r, 'Employee Number') === runtime.employeeNumber) { memberDataRow = r; break; }
        }

        log.info(`Searching for Employee Number: ${runtime.employeeNumber} in ${totalRows} rows`);
        expect(memberDataRow, `Employee Number "${runtime.employeeNumber}" not found in Consolidated (rows ${FIRST_DATA_ROW}–${lastDataRow})`).toBeGreaterThan(0);
        if (memberDataRow < 0) return;

        const benefitNetId = getCell(memberDataRow, 'BenefitNet ID');
        const firstName = getCell(memberDataRow, 'First Name');
        const lastName = getCell(memberDataRow, 'Last Name');
        const employeeNo = getCell(memberDataRow, 'Employee Number');
        const email = getCell(memberDataRow, 'Email');
        const nationality = getCell(memberDataRow, 'Nationality');
        const maritalStatus = getCell(memberDataRow, 'Marital Status');
        const relation = getCell(memberDataRow, 'Relation');
        const policy = getCell(memberDataRow, 'Policy');
        const category = getCell(memberDataRow, 'Category');
        const countryOfRes = getCell(memberDataRow, 'Country of Residence');
        const profileStatus = getCell(memberDataRow, 'Member Profile Status');
        const nationalId = getCell(memberDataRow, 'National ID Number');

        log.info(`Consolidated — Row ${memberDataRow} | BenefitNet ID: ${benefitNetId}`);
        log.info(`  First Name     : "${firstName}"  | Expected: "${runtime.firstName}"`);
        log.info(`  Last Name      : "${lastName}"  | Expected: "${runtime.lastName}"`);
        log.info(`  Employee No    : "${employeeNo}"  | Expected: "${runtime.employeeNumber}"`);

        expect(firstName, `First Name mismatch`).toBe(runtime.firstName);
        expect(lastName, `Last Name mismatch`).toBe(runtime.lastName);
        expect(employeeNo, `Employee Number mismatch`).toBe(runtime.employeeNumber);
        expect(email, `Email mismatch`).toBe(runtime.email);
        expect(nationality, `Nationality should be "India"`).toBe('India');
        const expectedMaritalStatus = runtime.maritalStatus ?? 'Married';
        expect(maritalStatus, `Marital Status should be "${expectedMaritalStatus}"`).toBe(expectedMaritalStatus);
        expect(relation, `Relation should be "Principal"`).toBe('Principal');
        expect(policy, `Policy mismatch`).toBe(capturedMedicalPolicyName);
        expect(category, `Category should contain "Cat A_"`).toContain('Cat A_');
        expect(countryOfRes, `Country of Residence should be "United Arab Emirates"`).toBe('United Arab Emirates');
        expect(profileStatus, `Member Profile Status should be "Pending Addition"`).toBe('Pending Addition');
        expect(nationalId, `National ID mismatch`).toContain(runtime.nationalIdNumber);

        log.info('Consolidated Membership Excel — all column verifications passed');
    }

    /**
     * Action: Execute Search Filters
     * Steps: Interacts directly with primary execution button instances to run active lookup parameters.
     */
    async clickSearch() {
        await this.click(this.reportPage.SearchButton);
    }
}