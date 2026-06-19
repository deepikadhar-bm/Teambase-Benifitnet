import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage } from 'src/modules-methods/clientPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { testDataManager as tdm } from 'test-data/testDataManager';

const TC_ID = 'REG_TS01_TC02';
const TC_TITLE = 'should add two principal members via bulk import and Download validation failed Excel and verify it matches UI errors for both members';

test.describe('Add Members Bulk — Full End-to-End Workflow', () => {

    let loginPage: LoginPage;
    let clientPage: ClientPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        clientPage = new ClientPage(page);
    });

    test(TC_TITLE, async ({ page }) => {

        log.tcStart(TC_ID, `${TC_TITLE}`);

        try {

            log.step('STEP 1: Login to application');
            try {
                await loginPage.login(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
                log.stepPass('STEP 1: Login successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 1: Login failed');
                throw e;
            }

            log.step('STEP 2: Navigate to target client policy and open bulk add form');
            try {
                await clientPage.navigateToClientsViasidebar();
                await clientPage.openTargetClientDetails();
                const capturedClientName = clientPage.capturedClientName;
                await clientPage.openPolicyTab(capturedClientName);
                await clientPage.openAddMembersBulkForm();
                log.stepPass('STEP 2: Navigated to bulk add form');
            } catch (e) {
                await log.stepFail(page, 'STEP 2: Failed to navigate to bulk add form');
                throw e;
            }

            const capturedClientName = clientPage.capturedClientName;
            const capturedMedicalPolicyName = clientPage.capturedMedicalPolicyName;
            const policyCategory = `Cat A_ ${capturedMedicalPolicyName}`;

            log.step('STEP 3: Generate runtime data for two members');
            try {
                const runtime1 = tdm.generateRuntimeDataForGender('Male');
                const runtime2 = tdm.generateRuntimeDataForGender('Female');
                log.info(`Member 1: ${runtime1.firstName} ${runtime1.lastName} | EmpNo: ${runtime1.employeeNumber}`);
                log.info(`Member 2: ${runtime2.firstName} ${runtime2.lastName} | EmpNo: ${runtime2.employeeNumber}`);
                log.stepPass('STEP 3: Runtime data generated for both members');

                var runtime1Final = runtime1;
                var runtime2Final = runtime2;
            } catch (e) {
                await log.stepFail(page, 'STEP 3: Failed to generate runtime data');
                throw e;
            }

            log.step('STEP 4: Round 1 — partial fill for both members to discover missing fields');
            try {
                const round1Profile1 = tdm.getProfile('User Profile 1 - Male Principal Member (Round 1 Partial)');
                const round1Profile2 = tdm.getProfile('User Profile 2 - Female Principal Member (Round 1 Partial)');
                const round1Resolved1 = tdm.resolvePlaceholders(round1Profile1.memberData, runtime1Final);
                const round1Resolved2 = tdm.resolvePlaceholders(round1Profile2.memberData, runtime2Final);
                const round1ExcelRow1 = tdm.buildExcelRow(round1Resolved1);
                const round1ExcelRow2 = tdm.buildExcelRow(round1Resolved2);

                const round1FilePath = await clientPage.downloadCensusSampleFile();
                await clientPage.writeMultipleMembersToExcelFile(round1FilePath, [round1ExcelRow1, round1ExcelRow2]);
                await clientPage.uploadCensusExcelFile(round1FilePath);
                await clientPage.selectImportTypeOption();
                await clientPage.selectNotifyHrOption();
                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                const uiErrorsPerMember = await clientPage.getValidationErrorsPerMember();
                const round1Result1 = uiErrorsPerMember.get(0);
                const round1Result2 = uiErrorsPerMember.get(1);

                log.info(`Member 1 Round 1 required errors (${round1Result1?.requiredFieldErrors.length ?? 0}): ${round1Result1?.requiredFieldErrors.join(', ')}`);
                log.info(`Member 1 Round 1 invalid fields  (${round1Result1?.invalidFieldErrors.length ?? 0}): ${round1Result1?.invalidFieldErrors.join(', ')}`);
                log.info(`Member 1 Round 1 warnings        (${round1Result1?.warnings.length ?? 0}): ${round1Result1?.warnings.join(' | ')}`);
                log.info(`Member 2 Round 1 required errors (${round1Result2?.requiredFieldErrors.length ?? 0}): ${round1Result2?.requiredFieldErrors.join(', ')}`);
                log.info(`Member 2 Round 1 invalid fields  (${round1Result2?.invalidFieldErrors.length ?? 0}): ${round1Result2?.invalidFieldErrors.join(', ')}`);
                log.info(`Member 2 Round 1 warnings        (${round1Result2?.warnings.length ?? 0}): ${round1Result2?.warnings.join(' | ')}`);
                log.stepPass('STEP 4: Round 1 validation completed — missing fields discovered');

                var uiErrorsPerMemberFinal = uiErrorsPerMember;

            } catch (e) {
                await log.stepFail(page, 'STEP 4: Round 1 validation failed unexpectedly');
                throw e;
            }

            log.step('STEP 5: Download validation failed Excel and verify it matches UI errors for both members');
            try {
                const validationFailedExcelPath = await clientPage.downloadValidationFailedCensusExcel();
                await clientPage.assertValidationFailedExcelMatchesUiErrors(validationFailedExcelPath, uiErrorsPerMemberFinal);
                log.stepPass('STEP 5: Validation failed Excel matches UI error messages for all members');
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Validation failed Excel does not match UI errors');
                throw e;
            }

            log.step('STEP 6: Logout');
            try {
                await loginPage.logout();
                log.stepPass('STEP 6: Logout Successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 6: Logout failed');
                throw e;
            }

            log.tcEnd('PASS');

        } catch (e) {
            await log.captureOnFailure(page, TC_TITLE, e);
            log.tcEnd('FAIL');
            throw e;
        }
    });
});