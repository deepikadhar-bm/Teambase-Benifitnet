import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage, MemberValidationResult } from 'src/modules-methods/clientPage';
import { EmailLogPage } from 'src/modules-methods/emailPage';
import { ReportPage } from 'src/modules-methods/reportPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { testDataManager as tdm } from 'test-data/testDataManager';
import { APP_CONSTANTS } from 'src/constant/app-constants';

const TC_ID = 'REG_TS01_TC02';
const TC_TITLE = 'should add two principal members via bulk import and Download validation failed Excel and verify it matches UI errors for both members';

test.describe('Add Members Bulk — Full End-to-End Workflow', () => {

    let loginPage: LoginPage;
    let clientPage: ClientPage;
    let emailLogPage: EmailLogPage;
    let reportPage: ReportPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        clientPage = new ClientPage(page);
        emailLogPage = new EmailLogPage(page);
        reportPage = new ReportPage(page);
    });

    test(TC_TITLE, async ({ page }) => {

        log.tcStart(TC_ID, `${TC_TITLE}`);

        try {

            log.step('STEP 1: Login to application');
            try {
                await loginPage.navigateToLogin(qaConfig.baseURL);
                await loginPage.login(qaConfig.credentials.username, qaConfig.credentials.password);
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

                const isNoHrWarningDisplayed = await clientPage.isNoHrUsersConfiguredWarningDisplayed();
                const uiErrorsPerMember = await clientPage.getValidationErrorsPerMember();
                const round1Result1 = uiErrorsPerMember.get(0);
                const round1Result2 = uiErrorsPerMember.get(1);
                const round1Errors1 = round1Result1?.allErrors ?? [];
                const round1Errors2 = round1Result2?.allErrors ?? [];

                log.info(`Member 1 Round 1 required errors (${round1Result1?.requiredFieldErrors.length ?? 0}): ${round1Result1?.requiredFieldErrors.join(', ')}`);
                log.info(`Member 1 Round 1 invalid fields  (${round1Result1?.invalidFieldErrors.length ?? 0}): ${round1Result1?.invalidFieldErrors.join(', ')}`);
                log.info(`Member 1 Round 1 warnings        (${round1Result1?.warnings.length ?? 0}): ${round1Result1?.warnings.join(' | ')}`);
                log.info(`Member 2 Round 1 required errors (${round1Result2?.requiredFieldErrors.length ?? 0}): ${round1Result2?.requiredFieldErrors.join(', ')}`);
                log.info(`Member 2 Round 1 invalid fields  (${round1Result2?.invalidFieldErrors.length ?? 0}): ${round1Result2?.invalidFieldErrors.join(', ')}`);
                log.info(`Member 2 Round 1 warnings        (${round1Result2?.warnings.length ?? 0}): ${round1Result2?.warnings.join(' | ')}`);
                log.stepPass('STEP 4: Round 1 validation completed — missing fields discovered');

                var uiErrorsPerMemberFinal = uiErrorsPerMember;
                var round1Errors1Final = round1Errors1;
                var round1Errors2Final = round1Errors2;
                var isNoHrWarningDisplayedFinal = isNoHrWarningDisplayed;
                var round1ExcelRow1Final = round1ExcelRow1;
                var round1ExcelRow2Final = round1ExcelRow2;
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

            log.step('STEP 6: Round 2 — fill all missing fields for both members and re-validate');
            try {
                await clientPage.clickBackToImportLink();

                const round2MissingFields1 = tdm.resolveMissingFields(round1Errors1Final, {}, policyCategory);
                const round2MissingFields2 = tdm.resolveMissingFields(round1Errors2Final, {}, policyCategory);
                const round2ExcelRow1 = { ...round1ExcelRow1Final, ...round2MissingFields1 };
                const round2ExcelRow2 = { ...round1ExcelRow2Final, ...round2MissingFields2 };

                log.info(`Member 1 Round 2 — writing ${Object.keys(round2ExcelRow1).length} columns`);
                log.info(`Member 2 Round 2 — writing ${Object.keys(round2ExcelRow2).length} columns`);

                const round2FilePath = await clientPage.downloadCensusSampleFile();
                await clientPage.writeMultipleMembersToExcelFile(round2FilePath, [round2ExcelRow1, round2ExcelRow2]);
                await clientPage.uploadCensusExcelFile(round2FilePath);
                await clientPage.selectImportTypeOption();

                if (isNoHrWarningDisplayedFinal) {
                    await clientPage.selectDoNotNotifyHrOption();
                } else {
                    await clientPage.selectNotifyHrOption();
                }

                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                await clientPage.assertPreviousValidationErrorsAreResolved([...round1Errors1Final, ...round1Errors2Final]);
                await clientPage.handleValidationOutcomeAndProceedToImport();
                log.stepPass('STEP 6: Round 2 validation passed — all missing fields resolved');
            } catch (e) {
                await log.stepFail(page, 'STEP 6: Round 2 re-validation failed');
                throw e;
            }

            log.step('STEP 7: Assert import processing and success');
            try {
                await clientPage.assertAddMembersBulkProcessingAndSuccess();
                log.stepPass('STEP 7: Bulk import completed successfully for both members');
            } catch (e) {
                await log.stepFail(page, 'STEP 7: Bulk import processing did not reach success state');
                throw e;
            }

            log.step('STEP 8: Verify member 1 notification email');
            try {
                await emailLogPage.navigateToEmailLogs();
                await emailLogPage.filterEmailLogsByClientAndPolicy();
                await emailLogPage.assertEmailLogRowExistsForMember(capturedClientName, capturedMedicalPolicyName, runtime1Final.lastName);
                await emailLogPage.openMemberEmailLogDetail(runtime1Final.lastName);
                await emailLogPage.assertEmailDetailHeadingIsVisible();
                await emailLogPage.assertEmailDetailSubjectContainsMemberName(runtime1Final.lastName);
                await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                await emailLogPage.assertEmailDetailCompanyName(capturedClientName);
                await emailLogPage.assertEmailDetailInsurer(APP_CONSTANTS.TESTINSURER);
                await emailLogPage.assertEmailDetailPolicyName(capturedMedicalPolicyName);
                await emailLogPage.assertEmailDetailPolicyCategory(policyCategory);
                await emailLogPage.assertEmailDetailEmployeeNumber(runtime1Final.employeeNumber);
                log.stepPass('STEP 8: Member 1 notification email verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 8: Member 1 notification email verification failed');
                throw e;
            }

            log.step('STEP 9: Verify member 2 notification email');
            try {
                await emailLogPage.clickBackToList();
                await emailLogPage.filterEmailLogsByClientAndPolicy();
                await emailLogPage.assertEmailLogRowExistsForMember(capturedClientName, capturedMedicalPolicyName, runtime2Final.lastName);
                await emailLogPage.openMemberEmailLogDetail(runtime2Final.lastName);
                await emailLogPage.assertEmailDetailHeadingIsVisible();
                await emailLogPage.assertEmailDetailSubjectContainsMemberName(runtime2Final.lastName);
                await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                await emailLogPage.assertEmailDetailCompanyName(capturedClientName);
                await emailLogPage.assertEmailDetailInsurer(APP_CONSTANTS.TESTINSURER);
                await emailLogPage.assertEmailDetailPolicyName(capturedMedicalPolicyName);
                await emailLogPage.assertEmailDetailPolicyCategory(policyCategory);
                await emailLogPage.assertEmailDetailEmployeeNumber(runtime2Final.employeeNumber);
                log.stepPass('STEP 9: Member 2 notification email verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 9: Member 2 notification email verification failed');
                throw e;
            }

            log.step('STEP 10: Verify insurer bulk request email and attachment Excel');
            try {
                await emailLogPage.clickBackToList();
                await emailLogPage.filterEmailLogsByClientAndPolicy();
                await emailLogPage.openInsurerBulkRequestEmailDetail();
                await emailLogPage.logToEmailAddress();
                await emailLogPage.assertInsurerEmailSubject();
                await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestCompanyName(capturedClientName);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestInsurer(APP_CONSTANTS.TESTINSURER);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestPolicyName(capturedMedicalPolicyName);
                await emailLogPage.assertAttachmentFileNameContains(APP_CONSTANTS.ATTACHMENTMEMBERLIST);
                await emailLogPage.downloadAndVerifyAttachmentExcel(capturedClientName, capturedMedicalPolicyName, runtime1Final);
                log.stepPass('STEP 10: Insurer bulk request email and attachment Excel verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 10: Insurer bulk request email verification failed');
                throw e;
            }

            log.step('STEP 11: Verify workflow logs report for both members');
            try {
                await reportPage.navigateToReports();
                await reportPage.openWorkflowLogsReport();
                await reportPage.selectWorkflowClient();
                await reportPage.selectWorkflowPolicy();
                await reportPage.selectWorkflowCategory();
                await reportPage.clickSearch();
                const workflowExcelPath = await reportPage.exportWorkflowToExcel();
                await reportPage.verifyWorkflowExcelMemberRow(workflowExcelPath, runtime1Final, capturedClientName, capturedMedicalPolicyName);
                await reportPage.verifyWorkflowExcelMemberRow(workflowExcelPath, runtime2Final, capturedClientName, capturedMedicalPolicyName);
                log.stepPass('STEP 11: Workflow logs report verified for both members');
            } catch (e) {
                await log.stepFail(page, 'STEP 11: Workflow logs report verification failed');
                throw e;
            }

            log.step('STEP 12: Verify consolidated membership report for both members');
            try {
                await reportPage.navigateToReports();
                await reportPage.openConsolidatedMembershipReport();
                await reportPage.selectConsolidatedInsurer();
                await reportPage.selectConsolidatedClient();
                await reportPage.selectConsolidatedPolicy();
                await reportPage.selectConsolidatedCategory();
                await reportPage.clickSearch();
                const consolidatedExcelPath = await reportPage.exportConsolidatedToExcel();
                await reportPage.verifyConsolidatedExcelMemberRow(consolidatedExcelPath, runtime1Final, capturedMedicalPolicyName);
                await reportPage.verifyConsolidatedExcelMemberRow(consolidatedExcelPath, runtime2Final, capturedMedicalPolicyName);
                log.stepPass('STEP 12: Consolidated membership report verified for both members');
            } catch (e) {
                await log.stepFail(page, 'STEP 12: Consolidated membership report verification failed');
                throw e;
            }

            log.step('STEP 13: Logout');
            try {
                await loginPage.logout();
                log.stepPass('STEP 13: Logout Successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 13: Logout failed');
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