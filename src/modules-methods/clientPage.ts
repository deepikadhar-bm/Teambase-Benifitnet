import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from '@pages/basePage';
import { FILE_PATHS } from '../config/fileConstants';
import { APP_CONSTANTS } from 'src/constant/app-constants';
import { ClientElements } from '@pages/elements/client';
import * as fs from 'fs';
import * as path from 'path';
import { logger as log } from 'src/helpers/logger';

const XlsxPopulate = require('xlsx-populate').default || require('xlsx-populate');

export interface MemberValidationResult {
    memberIndex: number;
    requiredFieldErrors: string[];
    invalidFieldErrors: string[];
    warnings: string[];
    allErrors: string[];
}

export class ClientPage extends BasePage {
    private clientPageElements: ClientElements;

    capturedClientName: string = '';
    capturedMedicalPolicyName: string = '';

    private readonly FALLBACK_HEADER_ROW_INDEX = APP_CONSTANTS.FALLBACK_HEADER_ROW_INDEX;
    private readonly HEADER_DETECTION_KEYWORDS = APP_CONSTANTS.HEADER_DETECTION_KEYWORDS;
    private readonly DOWNLOAD_DIR = path.join(process.cwd(), FILE_PATHS.DOWNLOADS);

    private readonly WARNING_PATTERNS: RegExp[] = [
        /does not have an email address/i,
        /will not receive any email/i,
        /no hr users configured/i,
    ];

    constructor(page: Page) {
        super(page);
        this.clientPageElements = new ClientElements(page);
    }

    async navigateToClientsViasidebar(): Promise<void> {
        await this.click(this.clientPageElements.sidebarClientsMenu);
    }

    async openTargetClientDetails(): Promise<void> {
        await this.assertElementVisible(this.clientPageElements.clientsHeadingText);
        this.capturedClientName = (await this.clientPageElements.targetClientNameLink.textContent()) ?? '';
        log.info(`Client Name captured: ${this.capturedClientName}`);
        await this.click(this.clientPageElements.targetClientNameLink);
        await this.isVisible(this.capturedClientName);
    }

    async openPolicyTab(clientName: string): Promise<void> {
        await this.assertElementVisible(this.clientPageElements.clientNameLabel(clientName));
        await this.waitForElementIsVisible(this.clientPageElements.policiesLabel);
        await this.click(this.clientPageElements.policiesLabel);
        await this.waitForElementIsVisible(this.clientPageElements.targetMedicalPolicyLink);
        this.capturedMedicalPolicyName = (await this.clientPageElements.targetMedicalPolicyLink.textContent()) ?? '';
        log.info(`Medical Policy captured: ${this.capturedMedicalPolicyName}`);
        await this.click(this.clientPageElements.targetMedicalPolicyLink);
    }

    async openAddMembersBulkForm(): Promise<void> {
        if (await this.assertElementVisible(this.clientPageElements.addMembersBulkButton)) {
            await this.waitForElementIsVisible(this.clientPageElements.addMembersBulkButton);
            await this.click(this.clientPageElements.addMembersBulkButton);
            await this.waitForElementIsVisible(this.clientPageElements.downloadSampleFileLink);
        } else {
            await this.waitForElementIsVisible(this.clientPageElements.addMembersBulkButton);
            await this.click(this.clientPageElements.addMembersBulkButton);
            await this.waitForElementIsVisible(this.clientPageElements.downloadSampleFileLink);
        }
    }

    async downloadCensusSampleFile(): Promise<string> {
        if (!fs.existsSync(this.DOWNLOAD_DIR)) fs.mkdirSync(this.DOWNLOAD_DIR, { recursive: true });

        await this.waitForElementIsVisible(this.clientPageElements.downloadSampleFileLink);
        const downloadEventPromise = this.page.waitForEvent('download');
        await this.click(this.clientPageElements.downloadSampleFileLink);
        const downloadedFile = await downloadEventPromise;

        const baseFileName = downloadedFile.suggestedFilename().replace('.xlsx', '');
        const uniqueFileName = `${baseFileName}_${this.istFileTimestamp()}.xlsx`;
        const savedFilePath = path.join(this.DOWNLOAD_DIR, uniqueFileName);

        await downloadedFile.saveAs(savedFilePath);
        await this.waitUntilFileIsReady(savedFilePath);

        log.info(`Downloaded : ${uniqueFileName}`);
        log.info(`Saved to   : ${savedFilePath}`);
        return savedFilePath;
    }

    async downloadValidationFailedCensusExcel(): Promise<string> {
        if (!fs.existsSync(this.DOWNLOAD_DIR)) fs.mkdirSync(this.DOWNLOAD_DIR, { recursive: true });

        const exportLink = this.clientPageElements.exportCensusWithValidationErrorCommentsLink;
        await this.waitForElementIsVisible(exportLink);

        const downloadEventPromise = this.page.waitForEvent('download');
        await this.click(exportLink);
        const downloadedFile = await downloadEventPromise;

        const baseName = downloadedFile.suggestedFilename().replace('.xlsx', '');
        const uniqueFileName = `${baseName}_${this.istFileTimestamp()}.xlsx`;
        const savedFilePath = path.join(this.DOWNLOAD_DIR, uniqueFileName);

        await downloadedFile.saveAs(savedFilePath);
        await this.waitUntilFileIsReady(savedFilePath);

        log.info(`Validation Failed Excel downloaded: ${uniqueFileName}`);
        log.info(`Saved to: ${savedFilePath}`);
        return savedFilePath;
    }

    async uploadCensusExcelFile(filePath: string): Promise<void> {
        await this.clientPageElements.censusExcelFileInput.setInputFiles(filePath);
        log.info(`Census file uploaded: ${filePath}`);
    }

    async selectImportTypeOption(): Promise<void> {
        await this.selectDropdownOption(
            this.clientPageElements.importTypeDropdown,
            this.clientPageElements.importTypeShowPendingAndEmailInsurerOption
        );
    }

    async selectNotifyHrOption(): Promise<void> {
        await this.selectDropdownOption(this.clientPageElements.notifyHrDropdown, this.clientPageElements.notifyHrOption);
    }

    async selectDoNotNotifyHrOption(): Promise<void> {
        await this.selectDropdownOption(this.clientPageElements.notifyHrDropdown, this.clientPageElements.doNotNotifyHrOption);
    }

    async selectNotifyMemberOption(): Promise<void> {
        await this.selectDropdownOption(this.clientPageElements.notifyMemberDropdown, this.clientPageElements.notifyMemberOption);
    }

    async clickValidateImportButton(): Promise<void> {
        await this.click(this.clientPageElements.validateImportButton);
        if (await this.assertElementVisible(this.clientPageElements.importProgressBarModal)) {
            await this.waitForElementToDisappear(this.clientPageElements.importProgressBarModal);
        }
    }

    async clickBackToImportLink(): Promise<void> {
        await this.waitForElementIsVisible(this.clientPageElements.backToImportLink);
        await this.click(this.clientPageElements.backToImportLink);
    }

    async clickImportMembersButton(): Promise<void> {
        await this.assertElementVisible(this.clientPageElements.validationSuccessBanner);
        await this.click(this.clientPageElements.importMembersButton);
    }

    async isNoHrUsersConfiguredWarningDisplayed(): Promise<boolean> {
        return await this.clientPageElements.noHrUsersConfiguredWarning.isVisible();
    }

    async isValidationSuccessful(): Promise<boolean> {
        return await this.clientPageElements.validationSuccessBanner.isVisible().catch(() => false);
    }

    async isValidationFailed(): Promise<boolean> {
        return await this.clientPageElements.validationFailedBanner.isVisible().catch(() => false);
    }

    async getValidationErrorFieldNames(): Promise<string[]> {
        const results = await this.getValidationErrorsPerMember();
        const allFields = new Set<string>();
        for (const result of results.values()) {
            result.requiredFieldErrors.forEach(f => allFields.add(f));
            result.invalidFieldErrors.forEach(f => allFields.add(f));
        }
        return Array.from(allFields);
    }

    async getValidationErrorsPerMember(): Promise<Map<number, MemberValidationResult>> {
        await this.clientPageElements.validationResultsGrid
            .waitFor({ state: 'visible', timeout: 30000 })
            .catch(() => { });
        await this.page.waitForTimeout(2000);

        const memberErrorMap = new Map<number, MemberValidationResult>();

        const memberGroupHeaders = this.clientPageElements.validationMemberGroupHeaders;
        const memberGroupCount = await memberGroupHeaders.count();

        if (memberGroupCount === 0) {
            log.info('No member group headers found — falling back to flat error cell reading');
            return this.getValidationErrorsFlat();
        }

        log.info(`Found ${memberGroupCount} member group(s) in validation results`);

        for (let memberIdx = 0; memberIdx < memberGroupCount; memberIdx++) {
            const groupRowText = (await memberGroupHeaders.nth(memberIdx).textContent()) ?? '';

            const lines = groupRowText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            log.info(`Member group [${memberIdx}] lines: ${JSON.stringify(lines)}`);

            const errorLine = lines.find(l =>
                l.includes('field is required') ||
                l.includes('specified is invalid') ||
                l.includes('is invalid') ||
                l.includes('does not have an email') ||
                l.includes('dependant')
            ) ?? '';

            log.info(`Member group [${memberIdx}] error line: "${errorLine}"`);

            const requiredFieldErrors: string[] = [];
            const invalidFieldErrors: string[] = [];
            const warnings: string[] = [];

            this.parseValidationCellText(errorLine, requiredFieldErrors, invalidFieldErrors, warnings);

            const allErrors = [...requiredFieldErrors, ...invalidFieldErrors];
            memberErrorMap.set(memberIdx, { memberIndex: memberIdx, requiredFieldErrors, invalidFieldErrors, warnings, allErrors });

            log.info(`  Member[${memberIdx}] required errors (${requiredFieldErrors.length}): [${requiredFieldErrors.join(', ')}]`);
            log.info(`  Member[${memberIdx}] invalid fields  (${invalidFieldErrors.length}): [${invalidFieldErrors.join(', ')}]`);
            log.info(`  Member[${memberIdx}] warnings        (${warnings.length}): [${warnings.join(' | ')}]`);
        }

        return memberErrorMap;
    }

    async assertPreviousValidationErrorsAreResolved(previouslyFailedFields: string[]): Promise<void> {
        if (previouslyFailedFields.length === 0) {
            log.info('No previously failed fields to check — Round 1 passed clean, skipping assertion');
            return;
        }

        await this.waitForElementIsVisible(this.clientPageElements.validationResultsGrid);

        const isSuccess = await this.clientPageElements.validationSuccessBanner.isVisible().catch(() => false);
        const canProceed = await this.clientPageElements.proceedValidMembersButton.isVisible().catch(() => false);

        if (isSuccess || canProceed) {
            log.info(`Round 2 validation outcome: ${isSuccess ? 'Validation Successful' : 'Proceed Valid Members'} — all fields resolved`);
            return;
        }

        const remainingErrors = await this.getValidationErrorFieldNames();
        log.info(`Remaining errors after Round 2: [${remainingErrors.join(', ')}]`);

        for (const fieldName of previouslyFailedFields) {
            const isStillFailing = remainingErrors.some(
                err => err.toLowerCase().includes(fieldName.toLowerCase())
            );
            if (isStillFailing) {
                log.info(`Field still failing after Round 2: "${fieldName}"`);
            }
            expect(isStillFailing).toBeFalsy();
        }

        log.info('All previously failing required fields are now resolved');
    }

    async handleValidationOutcomeAndProceedToImport(): Promise<void> {
        await this.page.waitForTimeout(2000);

        const isSuccess = await this.clientPageElements.validationSuccessBanner.isVisible().catch(() => false);
        const canProceed = await this.clientPageElements.proceedValidMembersButton.isVisible().catch(() => false);
        const isFailed = await this.clientPageElements.validationFailedBanner.isVisible().catch(() => false);

        log.info(`Validation outcome — Success: ${isSuccess} | ProceedBtn: ${canProceed} | Failed: ${isFailed}`);

        if (isSuccess) {
            log.info('Validation successful — clicking Import Members');
            await this.clientPageElements.importMembersButton.click();
        } else if (canProceed) {
            log.info('Some members valid — clicking Proceed Valid Members');
            await this.clientPageElements.proceedValidMembersButton.click();
        } else if (isFailed) {
            throw new Error('Round 2 validation failed — all members invalid. Check Excel data or application state.');
        }
    }

    async assertAddMembersBulkProcessingAndSuccess(): Promise<void> {
        await this.waitForElementIsVisible(this.clientPageElements.addMembersBulkInProgressHeading);
        await this.assertElementVisible(this.clientPageElements.addMembersBulkInProgressHeading);
        if (!(await this.assertElementVisible(this.clientPageElements.preparingEmailNotificationMessage))) {
            await this.waitForElementIsVisible(this.clientPageElements.preparingEmailNotificationMessage);
            await this.waitForElementToDisappear(this.clientPageElements.preparingEmailNotificationMessage);
        } else {
            await this.waitForElementIsVisible(this.clientPageElements.preparingEmailNotificationMessage);
            await this.waitForElementToDisappear(this.clientPageElements.preparingEmailNotificationMessage);
        }
        await this.waitForElementIsVisible(this.clientPageElements.addMembersBulkSuccessHeading);
        await this.assertElementVisible(this.clientPageElements.addMembersBulkSuccessHeading);
    }

    async writeMultipleMembersToExcelFile(filePath: string, memberRows: Record<string, string>[]): Promise<number[]> {
        try {
            const workbook = await XlsxPopulate.fromFileAsync(filePath);
            const worksheet = workbook.sheet(0);
            const usedRange = worksheet.usedRange();
            if (!usedRange) throw new Error('Could not determine used range in census Excel file');

            const rangeStartRow = usedRange.startCell().rowNumber();
            const rangeEndRow = usedRange.endCell().rowNumber();
            const rangeStartCol = usedRange.startCell().columnNumber();
            const rangeEndCol = usedRange.endCell().columnNumber();

            let headerRowNumber = -1;
            for (let r = rangeStartRow; r <= rangeEndRow; r++) {
                const rowText = Array.from({ length: rangeEndCol - rangeStartCol + 1 }, (_, i) => {
                    const v = worksheet.cell(r, rangeStartCol + i).value();
                    return v != null ? String(v) : '';
                }).join(' ');
                if (this.HEADER_DETECTION_KEYWORDS.some(kw => rowText.includes(kw))) {
                    headerRowNumber = r;
                    break;
                }
            }

            if (headerRowNumber === -1) headerRowNumber = this.FALLBACK_HEADER_ROW_INDEX;

            const headerToColIndex: Record<string, number> = {};
            for (let c = rangeStartCol; c <= rangeEndCol; c++) {
                const raw = worksheet.cell(headerRowNumber, c).value();
                const txt = raw ? String(raw).trim() : '';
                if (txt) headerToColIndex[txt] = c;
            }

            const writtenDataRows: number[] = [];

            for (let memberIdx = 0; memberIdx < memberRows.length; memberIdx++) {
                const columnValueMap = memberRows[memberIdx];
                const dataRowNumber = headerRowNumber + 1 + memberIdx;

                for (const [colName, value] of Object.entries(columnValueMap)) {
                    let colIndex: number | undefined = headerToColIndex[colName];
                    if (colIndex === undefined) {
                        const normalised = colName.trim().replace(/\s+/g, ' ');
                        const match = Object.entries(headerToColIndex).find(
                            ([h]) => h.trim().replace(/\s+/g, ' ') === normalised
                        );
                        colIndex = match?.[1];
                    }
                    if (colIndex !== undefined) {
                        worksheet.cell(dataRowNumber, colIndex).value(value);
                        log.info(`Member[${memberIdx}] → Row ${dataRowNumber}, Col [${colIndex}] | "${colName}" = "${value}"`);
                    }
                }
                writtenDataRows.push(dataRowNumber);
            }

            await workbook.toFileAsync(filePath);
            log.info(`Excel saved: ${filePath} (${memberRows.length} members, rows ${writtenDataRows.join(', ')})`);
            return writtenDataRows;

        } catch (error) {
            log.error(`Excel write failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async writeRowDataToExcelFile(filePath: string, columnValueMap: Record<string, string>): Promise<void> {
        await this.writeMultipleMembersToExcelFile(filePath, [columnValueMap]);
    }

    async assertValidationFailedExcelMatchesUiErrors(
        filePath: string,
        uiErrorsPerMember: Map<number, MemberValidationResult>
    ): Promise<void> {
        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const worksheet = workbook.sheet(0);
        const usedRange = worksheet.usedRange();
        if (!usedRange) throw new Error('Could not determine used range in validation failed Excel');

        const rangeStartRow = usedRange.startCell().rowNumber();
        const rangeEndRow = usedRange.endCell().rowNumber();
        const rangeStartCol = usedRange.startCell().columnNumber();
        const rangeEndCol = usedRange.endCell().columnNumber();

        let headerRowNumber = -1;
        for (let r = rangeStartRow; r <= rangeEndRow; r++) {
            const rowText = Array.from({ length: rangeEndCol - rangeStartCol + 1 }, (_, i) => {
                const v = worksheet.cell(r, rangeStartCol + i).value();
                return v != null ? String(v) : '';
            }).join(' ');
            if (this.HEADER_DETECTION_KEYWORDS.some(kw => rowText.includes(kw))) {
                headerRowNumber = r;
                break;
            }
        }

        if (headerRowNumber === -1) headerRowNumber = this.FALLBACK_HEADER_ROW_INDEX;

        const excelHeaders: Record<string, number> = {};
        for (let c = rangeStartCol; c <= rangeEndCol; c++) {
            const raw = worksheet.cell(headerRowNumber, c).value();
            if (raw) excelHeaders[String(raw).trim()] = c;
        }

        const validationCommentsHeader = Object.keys(excelHeaders).find(
            h => h.toLowerCase().includes('validation comments')
        );
        const validationCommentsColIndex = validationCommentsHeader
            ? excelHeaders[validationCommentsHeader]
            : undefined;

        if (!validationCommentsColIndex) throw new Error('Validation Comments column not found in Excel file');
        log.info(`Validation Comments column at index ${validationCommentsColIndex}`);

        for (const [memberIndex, result] of uiErrorsPerMember) {
            const dataRowNumber = headerRowNumber + 1 + memberIndex;
            const excelComments = String(
                worksheet.cell(dataRowNumber, validationCommentsColIndex).value() ?? ''
            ).trim();

            log.info(`Member[${memberIndex}] (Excel row ${dataRowNumber})`);
            log.info(`  UI required errors : [${result.requiredFieldErrors.join(', ')}]`);
            log.info(`  UI invalid fields  : [${result.invalidFieldErrors.join(', ')}]`);
            log.info(`  Excel comments     : "${excelComments}"`);

            const excelCommentSegments = excelComments
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const fieldName of result.requiredFieldErrors) {
                const found = excelCommentSegments.some(
                    seg => seg.toLowerCase().includes(fieldName.toLowerCase())
                );
                expect(found).toBe(true);
                log.info(`Required error "${fieldName}" confirmed in Excel comments`);
            }

            for (const fieldName of result.invalidFieldErrors) {
                const found = excelCommentSegments.some(
                    seg => seg.toLowerCase().includes(fieldName.toLowerCase())
                );
                expect(found).toBe(true);
                log.info(`   Invalid error "${fieldName}" confirmed in Excel comments`);
            }
        }

        log.info(`Validation Failed Excel — all ${uiErrorsPerMember.size} member(s) verified`);
    }

    private parseValidationCellText(
        rawText: string,
        requiredFieldErrors: string[],
        invalidFieldErrors: string[],
        warnings: string[]
    ): void {
        for (const segment of rawText.split(';')) {
            const trimmed = segment.trim();
            if (!trimmed) continue;

            const isWarning = this.WARNING_PATTERNS.some(pattern => pattern.test(trimmed));
            if (isWarning) {
                warnings.push(trimmed);
                continue;
            }

            const requiredMatch = trimmed.match(/^(.+?)\s+field is required/i);
            if (requiredMatch) {
                requiredFieldErrors.push(requiredMatch[1].trim());
                continue;
            }

            const invalidMatch = trimmed.match(/^(.+?)\s+(specified is invalid|is invalid)/i);
            if (invalidMatch) {
                invalidFieldErrors.push(invalidMatch[1].trim());
                continue;
            }

            log.info(`  Unclassified validation message: "${trimmed}"`);
        }
    }

    private async getValidationErrorsFlat(): Promise<Map<number, MemberValidationResult>> {
        const memberErrorMap = new Map<number, MemberValidationResult>();
        const errorCells = this.clientPageElements.errorAndWarningCells;
        const totalCells = await errorCells.count();
        let memberIndex = 0;

        for (let i = 0; i < totalCells; i++) {
            const rawText = (await errorCells.nth(i).textContent())?.trim() ?? '';
            if (!rawText) continue;
            log.info(`Flat validation cell [${i}]: ${rawText}`);

            const requiredFieldErrors: string[] = [];
            const invalidFieldErrors: string[] = [];
            const warnings: string[] = [];

            this.parseValidationCellText(rawText, requiredFieldErrors, invalidFieldErrors, warnings);

            const allErrors = [...requiredFieldErrors, ...invalidFieldErrors];
            if (allErrors.length > 0 || warnings.length > 0) {
                memberErrorMap.set(memberIndex, { memberIndex, requiredFieldErrors, invalidFieldErrors, warnings, allErrors });
                memberIndex++;
            }
        }

        return memberErrorMap;
    }

    private istFileTimestamp(): string {
        return new Date()
            .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
            .replace(/[\/,:\s]/g, '-');
    }

    private async selectDropdownOption(dropdownTrigger: Locator, optionItem: Locator): Promise<string> {
        await this.click(dropdownTrigger);
        await optionItem.waitFor({ state: 'visible', timeout: 10000 });
        const selectedText = (await optionItem.textContent())?.trim() ?? '';
        await this.click(optionItem);
        await optionItem.waitFor({ state: 'hidden', timeout: 10000 });
        log.info(`Dropdown selected: "${selectedText}"`);
        return selectedText;
    }

    private async waitUntilFileIsReady(filePath: string, timeoutMs = 10000): Promise<void> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                log.info(`File ready: ${filePath} (${fs.statSync(filePath).size} bytes)`);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        throw new Error(`File not ready after ${timeoutMs}ms: ${filePath}`);
    }
}