import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage, MemberValidationResult } from 'src/modules-methods/clientPage';
import { EmailLogPage } from 'src/modules-methods/emailPage';
import { ReportPage } from 'src/modules-methods/reportPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { testDataManager as tdm } from 'test-data/testDataManager';
import { APP_CONSTANTS } from 'src/constant/app-constants';
import { NUMBER_OF_MEMBERS, getGenderForMemberIndex, getProfileNameByGender, pickRandom, getDropdownValues } from 'src/config/memberGenerationConfig';
import { FileUtils } from 'src/helpers/fileUtils';

const TC_ID = 'REG_TS01_TC01';
const TC_TITLE = `should add ${NUMBER_OF_MEMBERS} principal members via bulk import and verify email notifications, attachment Excel, workflow logs report and consolidated membership report`;

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

    test.afterAll(async () => {
        FileUtils.clearTestContext();
        FileUtils.clearExcelStepHistory(TC_ID);
    });

    test.only(TC_TITLE, async ({ page }) => {

        FileUtils.setTestContext(TC_ID);
        log.tcStart(TC_ID, TC_TITLE);

        try {

            log.step('STEP 1: Login to application');
            try {
                await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
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

            // Generate runtime data for all members dynamically
            const runtimeMembers: any[] = [];

            log.step(`STEP 3: Generate runtime data for ${NUMBER_OF_MEMBERS} members`);
            try {
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const runtimeData = tdm.generateRuntimeDataForGender(gender);
                    runtimeMembers.push(runtimeData);
                    log.info(`Member ${i + 1}: ${runtimeData.firstName} ${runtimeData.lastName} | Gender: ${gender} | EmpNo: ${runtimeData.employeeNumber} | UID: ${runtimeData.uidNumber} | Passport: ${runtimeData.passportNumber}`);
                }
                log.stepPass(`STEP 3: Runtime data generated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 3: Failed to generate runtime data');
                throw e;
            }

            log.step('STEP 4: Round 1 — partial fill for all members to discover missing fields');
            try {
                const round1ExcelRows: any[] = [];

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const profileName = getProfileNameByGender(gender, 1, 'Partial');

                    const round1Profile = tdm.getProfile(profileName);
                    const round1ExcelRow = tdm.buildExcelRow(
                        tdm.resolvePlaceholders(round1Profile.memberData, runtimeMembers[i], policyCategory)
                    );
                    round1ExcelRows.push(round1ExcelRow);
                }

                const round1FilePath = await clientPage.downloadCensusSampleFile();
                await clientPage.writeMultipleMembersToExcelFile(round1FilePath, round1ExcelRows);
                await clientPage.uploadCensusExcelFile(round1FilePath);
                await clientPage.selectImportTypeOption();
                await clientPage.selectNotifyHrOption();
                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                const isNoHrWarningDisplayed = await clientPage.isNoHrUsersConfiguredWarningDisplayed();
                const uiErrorsPerMember = await clientPage.getValidationErrorsPerMember();

                // Store all errors for each member
                const round1ErrorsList: any[] = [];
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const memberResult = uiErrorsPerMember.get(i);
                    const memberErrors = memberResult?.allErrors ?? [];
                    round1ErrorsList.push({
                        memberIndex: i,
                        memberResult: memberResult,
                        allErrors: memberErrors
                    });

                    log.info(`Member ${i + 1} Round 1 required errors (${memberResult?.requiredFieldErrors?.length ?? 0}): ${memberResult?.requiredFieldErrors?.join(', ') ?? 'none'}`);
                    log.info(`Member ${i + 1} Round 1 invalid fields  (${memberResult?.invalidFieldErrors?.length ?? 0}): ${memberResult?.invalidFieldErrors?.join(', ') ?? 'none'}`);
                    log.info(`Member ${i + 1} Round 1 warnings        (${memberResult?.warnings?.length ?? 0}): ${memberResult?.warnings?.join(' | ') ?? 'none'}`);
                }

                log.stepPass(`STEP 4: Round 1 validation completed — missing fields discovered for all ${NUMBER_OF_MEMBERS} members`);

                var round1ErrorsListFinal = round1ErrorsList;
                var isNoHrWarningDisplayedFinal = isNoHrWarningDisplayed;
            } catch (e) {
                await log.stepFail(page, 'STEP 4: Round 1 validation failed unexpectedly');
                throw e;
            }

            log.step('STEP 5: Round 2 — upload complete profile with ALL mandatory fields filled');
            try {
                await clientPage.clickBackToImportLink();

                const round2ExcelRows: any[] = [];
                const allRound1Errors: any[] = [];

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const profileName = getProfileNameByGender(gender, 2, 'Full');

                    const round2Profile = tdm.getProfile(profileName);
                    const resolvedData: any = tdm.resolvePlaceholders(round2Profile.memberData, runtimeMembers[i], policyCategory);

                    // Randomly pick from dropdown allowedValues for non-interdependent fields
                    const randomizableDropdowns = [
                        'maritalStatus',
                        'memberType',
                        'subMemberType',
                        'establishmentType',
                        'commissionBased',
                        'salaryBracket',
                        'salaryType',
                    ];
                    for (const field of randomizableDropdowns) {
                        const values = getDropdownValues(field);
                        if (values.length > 0) {
                            resolvedData[field] = pickRandom(values);
                        }
                    }

                    // Store picked dropdown values back into runtimeMembers so verification steps use the same values
                    for (const field of randomizableDropdowns) {
                        if (resolvedData[field] !== undefined) {
                            runtimeMembers[i][field] = resolvedData[field];
                        }
                    }

                    log.info(`Member ${i + 1} Random dropdowns — maritalStatus: ${resolvedData.maritalStatus} | memberType: ${resolvedData.memberType} | subMemberType: ${resolvedData.subMemberType} | establishmentType: ${resolvedData.establishmentType} | commissionBased: ${resolvedData.commissionBased} | salaryBracket: ${resolvedData.salaryBracket} | salaryType: ${resolvedData.salaryType}`);

                    const round2ExcelRow = tdm.buildExcelRow(resolvedData);
                    round2ExcelRows.push(round2ExcelRow);
                    log.info(`Member ${i + 1} Round 2 — writing ${Object.keys(round2ExcelRow).length} columns`);

                    // Collect all errors for assertion
                    allRound1Errors.push(...(round1ErrorsListFinal[i]?.allErrors ?? []));
                }

                const round2FilePath = await clientPage.downloadCensusSampleFile();
                await clientPage.writeMultipleMembersToExcelFile(round2FilePath, round2ExcelRows);
                await clientPage.uploadCensusExcelFile(round2FilePath);
                await clientPage.selectImportTypeOption();

                if (isNoHrWarningDisplayedFinal) {
                    await clientPage.selectDoNotNotifyHrOption();
                } else {
                    await clientPage.selectNotifyHrOption();
                }

                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                await clientPage.assertPreviousValidationErrorsAreResolved(allRound1Errors);
                await clientPage.handleValidationOutcomeAndProceedToImport();

                log.stepPass(`STEP 5: Round 2 validation passed — all mandatory fields resolved for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Round 2 re-validation failed');
                throw e;
            }

            log.step('STEP 6: Assert import processing and success');
            try {
                await clientPage.assertAddMembersBulkProcessingAndSuccess();
                log.stepPass(`STEP 6: Bulk import completed successfully for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 6: Bulk import processing did not reach success state');
                throw e;
            }

            log.step(`STEP 7: Verify notification emails for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await emailLogPage.navigateToEmailLogs();
                await emailLogPage.filterEmailLogsByClientAndPolicy();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];

                    log.info(`--- Verifying Member ${i + 1} email: ${member.lastName} ---`);
                    await emailLogPage.assertEmailLogRowExistsForMember(capturedClientName, capturedMedicalPolicyName);
                    await emailLogPage.assertEmailLogRowExistsForLastNameWithAdditionRequest(member.lastName);
                    await emailLogPage.assertEmailLogRowExistsForLastNameWithNotificationType(member.lastName);
                    await emailLogPage.assertEmailLogRowExistsForToYopEmail(member.lastName, member.email);
                    await emailLogPage.assertEmailLogRowExistsForToYopEmailHaveAttachments(member.lastName);
                    await emailLogPage.assertEmailLogRowExistsForToYopEmailHaveAttachmentsZero(member.lastName);
                    await emailLogPage.openMemberEmailLogDetail(member.lastName);
                    await emailLogPage.assertEmailDetailHeadingIsVisible();
                    await emailLogPage.assertEmailDetailSubjectContainsMemberName(member.lastName);
                    await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                    await emailLogPage.assertEmailDetailCompanyName(capturedClientName);
                    await emailLogPage.assertEmailDetailInsurer(APP_CONSTANTS.TESTINSURER);
                    await emailLogPage.assertEmailDetailPolicyName(capturedMedicalPolicyName);
                    await emailLogPage.assertEmailDetailPolicyCategory(policyCategory);
                    await emailLogPage.assertEmailDetailEmployeeNumber(member.employeeNumber);

                    log.stepPass(`Member ${i + 1} notification email verified`);

                    // Go back to list for next member (except for last member)
                    if (i < NUMBER_OF_MEMBERS - 1) {
                        await emailLogPage.clickBackToList();
                        await emailLogPage.filterEmailLogsByClientAndPolicy();
                    }
                }

                log.stepPass(`STEP 7: All ${NUMBER_OF_MEMBERS} member notification emails verified`);
            } catch (e) {
                await log.stepFail(page, `STEP 7: Member notification email verification failed`);
                throw e;
            }

            log.step('STEP 8: Verify insurer bulk request email and attachment Excel');
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

                const attachmentFilePath = await emailLogPage.downloadAttachmentExcel(
                    capturedClientName,
                    capturedMedicalPolicyName
                );

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`--- Verifying Member ${i + 1} attachment Excel: ${member.lastName} ---`);
                    await emailLogPage.verifyAttachmentExcelRow(attachmentFilePath, i, capturedClientName, capturedMedicalPolicyName, member);
                    log.stepPass(`Member ${i + 1} attachment Excel verified`);
                }

                log.stepPass('STEP 8: Insurer bulk request email and attachment Excel verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 8: Insurer bulk request email verification failed');
                throw e;
            }

            log.step(`STEP 9: Verify workflow logs report for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await reportPage.navigateToReports();
                await reportPage.openWorkflowLogsReport();
                await reportPage.selectWorkflowClient();
                await reportPage.selectWorkflowPolicy();
                await reportPage.selectWorkflowCategory();
                await reportPage.clickSearch();
                const workflowExcelPath = await reportPage.exportWorkflowToExcel();
                await FileUtils.captureExcelStep(workflowExcelPath, 'Step 9 — workflow logs report exported', TC_ID);

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} in workflow report: ${member.lastName}`);
                    await reportPage.verifyWorkflowExcelMemberRow(workflowExcelPath, member, capturedClientName, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 9: Workflow logs report verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 9: Workflow logs report verification failed');
                throw e;
            }

            log.step(`STEP 10: Verify consolidated membership report for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await reportPage.navigateToReports();
                await reportPage.openConsolidatedMembershipReport();
                await reportPage.selectConsolidatedInsurer();
                await reportPage.selectConsolidatedClient();
                await reportPage.selectConsolidatedPolicy();
                await reportPage.selectConsolidatedCategory();
                await reportPage.clickSearch();
                const consolidatedExcelPath = await reportPage.exportConsolidatedToExcel();
                await FileUtils.captureExcelStep(consolidatedExcelPath, 'Step 10 — consolidated membership report exported', TC_ID);

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} in consolidated report: ${member.lastName}`);
                    await reportPage.verifyConsolidatedExcelMemberRow(consolidatedExcelPath, member, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 10: Consolidated membership report verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 10: Consolidated membership report verification failed');
                throw e;
            }

            log.step('STEP 11: Logout');
            try {
                await loginPage.logout();
                log.stepPass('STEP 11: Logout Successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 11: Logout failed');
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