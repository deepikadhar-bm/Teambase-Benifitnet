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

            log.step('STEP 1: Login to application with valid broker credentials');
            try {
                await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
                log.stepPass('STEP 1: Login successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 1: Login failed');
                throw e;
            }

            log.step('STEP 2: Navigate to target client policy and open bulk member import form');
            try {
                await clientPage.navigateToClientsViasidebar();
                await clientPage.openTargetClientDetails();
                const capturedClientName = clientPage.capturedClientName;
                await clientPage.openPolicyTab(capturedClientName);
                await clientPage.openAddMembersBulkForm();
                log.stepPass('STEP 2: Bulk import form opened successfully');
            } catch (e) {
                await log.stepFail(page, 'STEP 2: Failed to navigate to bulk import form');
                throw e;
            }

            const capturedClientName = clientPage.capturedClientName;
            const capturedMedicalPolicyName = clientPage.capturedMedicalPolicyName;
            const policyCategory = `Cat A_ ${capturedMedicalPolicyName}`;

            const runtimeMembers: any[] = [];

            log.step(`STEP 3: Generate unique runtime test data for ${NUMBER_OF_MEMBERS} principal members`);
            try {
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const runtimeData = tdm.generateRuntimeDataForGender(gender);
                    runtimeMembers.push(runtimeData);
                    log.info(`Member ${i + 1}: ${runtimeData.firstName} ${runtimeData.lastName} | Gender: ${gender} | EmpNo: ${runtimeData.employeeNumber} | UID: ${runtimeData.uidNumber} | Passport: ${runtimeData.passportNumber}`);
                }
                log.stepPass(`STEP 3: Unique runtime data generated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 3: Failed to generate runtime test data');
                throw e;
            }

            log.step(`STEP 4: Upload census with intentionally incomplete data to expose mandatory field validation errors for all ${NUMBER_OF_MEMBERS} members`);
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
                await FileUtils.captureExcelStep(round1FilePath, 'Incomplete Census — mandatory field validation trigger', TC_ID);
                await clientPage.uploadCensusExcelFile(round1FilePath);
                await clientPage.selectImportTypeOption();
                await clientPage.selectNotifyHrOption();
                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                const isNoHrWarningDisplayed = await clientPage.isNoHrUsersConfiguredWarningDisplayed();
                const uiErrorsPerMember = await clientPage.getValidationErrorsPerMember();

                const round1ErrorsList: any[] = [];
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const memberResult = uiErrorsPerMember.get(i);
                    const memberErrors = memberResult?.allErrors ?? [];
                    round1ErrorsList.push({
                        memberIndex: i,
                        memberResult: memberResult,
                        allErrors: memberErrors
                    });

                    log.info(`Member ${i + 1} mandatory field errors   (${memberResult?.requiredFieldErrors?.length ?? 0}): ${memberResult?.requiredFieldErrors?.join(', ') ?? 'none'}`);
                    log.info(`Member ${i + 1} invalid field errors      (${memberResult?.invalidFieldErrors?.length ?? 0}): ${memberResult?.invalidFieldErrors?.join(', ') ?? 'none'}`);
                    log.info(`Member ${i + 1} warnings                  (${memberResult?.warnings?.length ?? 0}): ${memberResult?.warnings?.join(' | ') ?? 'none'}`);
                }

                log.stepPass(`STEP 4: Mandatory field validation errors captured for all ${NUMBER_OF_MEMBERS} members`);

                var round1ErrorsListFinal = round1ErrorsList;
                var isNoHrWarningDisplayedFinal = isNoHrWarningDisplayed;
            } catch (e) {
                await log.stepFail(page, 'STEP 4: Incomplete census validation did not trigger expected field errors');
                throw e;
            }

            log.step(`STEP 5: Upload corrected census with all mandatory fields resolved and assert previous validation errors are cleared for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await clientPage.clickBackToImportLink();

                const round2ExcelRows: any[] = [];
                const allRound1Errors: any[] = [];

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const profileName = getProfileNameByGender(gender, 2, 'Full');

                    const round2Profile = tdm.getProfile(profileName);
                    const resolvedData: any = tdm.resolvePlaceholders(round2Profile.memberData, runtimeMembers[i], policyCategory);

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

                    for (const field of randomizableDropdowns) {
                        if (resolvedData[field] !== undefined) {
                            runtimeMembers[i][field] = resolvedData[field];
                        }
                    }

                    log.info(`Member ${i + 1} randomised dropdowns — maritalStatus: ${resolvedData.maritalStatus} | memberType: ${resolvedData.memberType} | subMemberType: ${resolvedData.subMemberType} | establishmentType: ${resolvedData.establishmentType} | commissionBased: ${resolvedData.commissionBased} | salaryBracket: ${resolvedData.salaryBracket} | salaryType: ${resolvedData.salaryType}`);

                    const round2ExcelRow = tdm.buildExcelRow(resolvedData);
                    round2ExcelRows.push(round2ExcelRow);
                    log.info(`Member ${i + 1} complete census — writing ${Object.keys(round2ExcelRow).length} columns`);

                    allRound1Errors.push(...(round1ErrorsListFinal[i]?.allErrors ?? []));
                }

                const round2FilePath = await clientPage.downloadCensusSampleFile('Updated');
                await clientPage.writeMultipleMembersToExcelFile(round2FilePath, round2ExcelRows);
                await FileUtils.captureExcelStep(round2FilePath, 'Complete Census — all mandatory fields resolved', TC_ID);
                await page.waitForTimeout(2000);
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

                log.stepPass(`STEP 5: All mandatory field errors resolved — corrected census validated and import initiated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Corrected census re-validation failed — mandatory field errors not resolved');
                throw e;
            }

            log.step('STEP 6: Assert bulk import processing completes and success state is reached');
            try {
                await clientPage.assertAddMembersBulkProcessingAndSuccess();
                log.stepPass(`STEP 6: Bulk import completed successfully for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 6: Bulk import did not reach success state within expected time');
                throw e;
            }

            log.step(`STEP 7: Verify member notification emails are dispatched and contain correct policy and member details for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await emailLogPage.navigateToEmailLogs();
                await emailLogPage.filterEmailLogsByClientAndPolicy();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];

                    log.info(`--- Verifying Member ${i + 1} notification email: ${member.lastName} ---`);
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

                    log.stepPass(`Member ${i + 1} notification email content verified`);

                    if (i < NUMBER_OF_MEMBERS - 1) {
                        await emailLogPage.clickBackToList();
                        await emailLogPage.filterEmailLogsByClientAndPolicy();
                    }
                }

                log.stepPass(`STEP 7: Notification emails verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, `STEP 7: Member notification email content verification failed`);
                throw e;
            }

            log.step('STEP 8: Verify insurer bulk request email is dispatched and member list attachment Excel contains correct member data');
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
                    log.info(`--- Verifying Member ${i + 1} in member list attachment Excel: ${member.lastName} ---`);
                    await emailLogPage.verifyAttachmentExcelRow(attachmentFilePath, i, capturedClientName, capturedMedicalPolicyName, member);
                    log.stepPass(`Member ${i + 1} attachment Excel row verified`);
                }

                log.stepPass('STEP 8: Insurer bulk request email and member list attachment Excel verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 8: Insurer bulk request email or attachment Excel verification failed');
                throw e;
            }

            log.step(`STEP 9: Verify workflow logs report reflects member addition request entries for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await reportPage.navigateToReports();
                await reportPage.openWorkflowLogsReport();
                await reportPage.selectWorkflowClient();
                await reportPage.selectWorkflowPolicy();
                await reportPage.selectWorkflowCategory();
                await reportPage.clickSearch();
                const workflowExcelPath = await reportPage.exportWorkflowToExcel();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} workflow log entry: ${member.lastName}`);
                    await reportPage.verifyWorkflowExcelMemberRow(workflowExcelPath, member, capturedClientName, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 9: Workflow logs report entries verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 9: Workflow logs report verification failed — member entry missing or data mismatch');
                throw e;
            }

            log.step(`STEP 10: Verify consolidated membership report reflects pending addition status for all ${NUMBER_OF_MEMBERS} members`);
            try {
                await reportPage.navigateToReports();
                await reportPage.openConsolidatedMembershipReport();
                await reportPage.selectConsolidatedInsurer();
                await reportPage.selectConsolidatedClient();
                await reportPage.selectConsolidatedPolicy();
                await reportPage.selectConsolidatedCategory();
                await reportPage.clickSearch();
                const consolidatedExcelPath = await reportPage.exportConsolidatedToExcel();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} consolidated membership record: ${member.lastName}`);
                    await reportPage.verifyConsolidatedExcelMemberRow(consolidatedExcelPath, member, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 10: Consolidated membership report verified — all ${NUMBER_OF_MEMBERS} members show pending addition status`);
            } catch (e) {
                await log.stepFail(page, 'STEP 10: Consolidated membership report verification failed — member record missing or status mismatch');
                throw e;
            }

            log.step('STEP 11: Logout from application');
            try {
                await loginPage.logout();
                log.stepPass('STEP 11: Logout successful');
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