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
                log.info(`Opening BenefitNet portal — ${qaConfig.baseURL}`);
                log.info(`Entering broker credentials for account: ${qaConfig.credentials.username}`);
                log.info('Submitting login form and waiting for dashboard to load');
                await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
                log.stepPass('STEP 1: Login successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 1: Login failed');
                throw e;
            }

            log.step('STEP 2: Navigate to target client policy and open bulk member import form');
            try {
                log.info('Clicking Clients in the sidebar to open the client list');
                await clientPage.navigateToClientsViasidebar();
                log.info('Opening the target client account details page');
                await clientPage.openTargetClientDetails();
                const capturedClientName = clientPage.capturedClientName;
                log.info(`Client account confirmed: ${capturedClientName}`);
                log.info(`Switching to the Policies tab for client: ${capturedClientName}`);
                await clientPage.openPolicyTab(capturedClientName);
                log.info(`Medical policy confirmed: ${clientPage.capturedMedicalPolicyName}`);
                log.info('Clicking "Add Members Bulk" to open the bulk member import form');
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
                log.info(`Generating ${NUMBER_OF_MEMBERS} unique member records — each with a unique last name, employee number, UID, passport, phone, and email`);
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
                log.info('Building Round 1 Excel rows — partial data intentionally missing mandatory fields (Gender, Marital Status, Nationality, Relation, Category)');
                const round1ExcelRows: any[] = [];

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const profileName = getProfileNameByGender(gender, 1, 'Partial');

                    const round1Profile = tdm.getProfile(profileName);
                    const round1ExcelRow = tdm.buildExcelRow(
                        tdm.resolvePlaceholders(round1Profile.memberData, runtimeMembers[i], policyCategory)
                    );
                    round1ExcelRows.push(round1ExcelRow);
                    log.info(`Member ${i + 1} — Round 1 partial row built (${Object.keys(round1ExcelRow).length} columns, missing mandatory fields intentionally)`);
                }

                log.info('Downloading fresh census sample file from BenefitNet portal');
                const round1FilePath = await clientPage.downloadCensusSampleFile();
                log.info(`Writing ${NUMBER_OF_MEMBERS} partial member rows into the census Excel file`);
                await clientPage.writeMultipleMembersToExcelFile(round1FilePath, round1ExcelRows);
                log.info('Capturing Round 1 Excel snapshot for audit diff comparison');
                await FileUtils.captureExcelStep(round1FilePath, 'Incomplete Census — mandatory field validation trigger', TC_ID);
                log.info('Uploading the partial census file to the BenefitNet bulk import form');
                await clientPage.uploadCensusExcelFile(round1FilePath);
                log.info('Setting Import Type to "Show in Pending Tasks and Email Insurer"');
                await clientPage.selectImportTypeOption();
                log.info('Setting Notify HR option');
                await clientPage.selectNotifyHrOption();
                log.info('Setting Notify Member option');
                await clientPage.selectNotifyMemberOption();
                log.info('Clicking "Validate Import" — BenefitNet will now validate the uploaded census data');
                await clientPage.clickValidateImportButton();

                log.info('Checking if "No HR Users Configured" warning is displayed');
                const isNoHrWarningDisplayed = await clientPage.isNoHrUsersConfiguredWarningDisplayed();
                log.info('Reading validation error results from the UI — capturing per-member required and invalid field errors');
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
                log.info('Clicking "Back to Import" to return to the upload form for Round 2');
                await clientPage.clickBackToImportLink();

                log.info('Building Round 2 Excel rows — all 31 mandatory fields will be populated with randomised valid dropdown values');
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

                log.info('Downloading a fresh census sample file for Round 2 (saved with "_Updated" suffix)');
                const round2FilePath = await clientPage.downloadCensusSampleFile('Updated');
                log.info(`Writing ${NUMBER_OF_MEMBERS} complete member rows (31 mandatory fields each) into the Round 2 census Excel file`);
                await clientPage.writeMultipleMembersToExcelFile(round2FilePath, round2ExcelRows);
                log.info('Capturing Round 2 Excel snapshot — will auto-diff against Round 1 to confirm additional fields were written');
                await FileUtils.captureExcelStep(round2FilePath, 'Complete Census — all mandatory fields resolved', TC_ID);
                log.info('Waiting 2 seconds to ensure Excel file is fully flushed to disk before upload');
                await page.waitForTimeout(2000);
                log.info('Uploading the complete Round 2 census file to the BenefitNet bulk import form');
                await clientPage.uploadCensusExcelFile(round2FilePath);
                log.info('Setting Import Type to "Show in Pending Tasks and Email Insurer"');
                await clientPage.selectImportTypeOption();

                if (isNoHrWarningDisplayedFinal) {
                    log.info('HR warning was shown in Round 1 — selecting "Do Not Notify HR" this round');
                    await clientPage.selectDoNotNotifyHrOption();
                } else {
                    log.info('Setting Notify HR option');
                    await clientPage.selectNotifyHrOption();
                }

                log.info('Setting Notify Member option');
                await clientPage.selectNotifyMemberOption();
                log.info('Clicking "Validate Import" — BenefitNet will re-validate the complete census data');
                await clientPage.clickValidateImportButton();

                log.info(`Asserting that all Round 1 validation errors are now resolved — checking ${allRound1Errors.length} previously failed fields`);
                await clientPage.assertPreviousValidationErrorsAreResolved(allRound1Errors);
                log.info('Handling validation outcome — clicking "Import Members" or "Proceed Valid Members" based on result');
                await clientPage.handleValidationOutcomeAndProceedToImport();

                log.stepPass(`STEP 5: All mandatory field errors resolved — corrected census validated and import initiated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Corrected census re-validation failed — mandatory field errors not resolved');
                throw e;
            }

            log.step('STEP 6: Assert bulk import processing completes and success state is reached');
            try {
                log.info('Waiting for BenefitNet to process the import — monitoring: "Processing data" → "Starting workflows" → "Preparing email notifications" → "Success" heading');
                await clientPage.assertAddMembersBulkProcessingAndSuccess();
                log.stepPass(`STEP 6: Bulk import completed successfully for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 6: Bulk import did not reach success state within expected time');
                throw e;
            }

            log.step(`STEP 7: Verify member notification emails are dispatched and contain correct policy and member details for all ${NUMBER_OF_MEMBERS} members`);
            try {
                log.info('Navigating to the Email Logs section from the sidebar');
                await emailLogPage.navigateToEmailLogs();
                log.info(`Filtering email log by Client: ${capturedClientName} | Policy: ${capturedMedicalPolicyName}`);
                await emailLogPage.filterEmailLogsByClientAndPolicy();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];

                    log.info(`--- Verifying Member ${i + 1} notification email: ${member.lastName} ---`);
                    log.info(`Verifying email log row exists for member: ${member.lastName} under policy: ${capturedMedicalPolicyName}`);
                    await emailLogPage.assertEmailLogRowExistsForMember(capturedClientName, capturedMedicalPolicyName);
                    log.info(`Verifying email type shows "Addition Request" for member: ${member.lastName}`);
                    await emailLogPage.assertEmailLogRowExistsForLastNameWithAdditionRequest(member.lastName);
                    log.info(`Verifying notification type is correct for member: ${member.lastName}`);
                    await emailLogPage.assertEmailLogRowExistsForLastNameWithNotificationType(member.lastName);
                    log.info(`Verifying email was sent to correct yopmail address: ${member.email}`);
                    await emailLogPage.assertEmailLogRowExistsForToYopEmail(member.lastName, member.email);
                    log.info(`Verifying email attachment indicator for member: ${member.lastName}`);
                    await emailLogPage.assertEmailLogRowExistsForToYopEmailHaveAttachments(member.lastName);
                    log.info('Verifying member notification email has 0 attachments (attachment is on the insurer email, not this one)');
                    await emailLogPage.assertEmailLogRowExistsForToYopEmailHaveAttachmentsZero(member.lastName);
                    log.info(`Opening email detail view for member: ${member.lastName}`);
                    await emailLogPage.openMemberEmailLogDetail(member.lastName);
                    log.info('Verifying email detail heading is visible — confirms correct email was opened');
                    await emailLogPage.assertEmailDetailHeadingIsVisible();
                    log.info(`Verifying email subject line contains the member name: ${member.lastName}`);
                    await emailLogPage.assertEmailDetailSubjectContainsMemberName(member.lastName);
                    log.info('Verifying email body contains "Request submitted to insurer" paragraph');
                    await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                    log.info(`Verifying company name in email detail: expected "${capturedClientName}"`);
                    await emailLogPage.assertEmailDetailCompanyName(capturedClientName);
                    log.info(`Verifying insurer name in email detail: expected "${APP_CONSTANTS.TESTINSURER}"`);
                    await emailLogPage.assertEmailDetailInsurer(APP_CONSTANTS.TESTINSURER);
                    log.info(`Verifying policy name in email detail: expected "${capturedMedicalPolicyName}"`);
                    await emailLogPage.assertEmailDetailPolicyName(capturedMedicalPolicyName);
                    log.info(`Verifying policy category in email detail: expected "${policyCategory}"`);
                    await emailLogPage.assertEmailDetailPolicyCategory(policyCategory);
                    log.info(`Verifying employee number in email detail: expected "${member.employeeNumber}"`);
                    await emailLogPage.assertEmailDetailEmployeeNumber(member.employeeNumber);

                    log.stepPass(`Member ${i + 1} notification email content verified`);

                    if (i < NUMBER_OF_MEMBERS - 1) {
                        log.info('Returning to email log list to verify next member');
                        await emailLogPage.clickBackToList();
                        log.info('Re-filtering email logs for next member verification');
                        await emailLogPage.filterEmailLogsByClientAndPolicy();
                    }
                }

                log.stepPass(`STEP 7: Notification emails verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, `STEP 7: Member notification email content verification failed`);
                throw e;
            }

            log.step('STEP 8: Verify HR insurer bulk request email is dispatched and member list attachment Excel contains correct member data');
            try {
                log.info('Returning to email log list to find the HR insurer bulk request email');
                await emailLogPage.clickBackToList();
                log.info(`Filtering email logs to find HR insurer bulk request email for: ${capturedClientName} | ${capturedMedicalPolicyName}`);
                await emailLogPage.filterEmailLogsByClientAndPolicy();
                log.info('Opening the HR insurer bulk request email detail view');
                await emailLogPage.openInsurerBulkRequestEmailDetail();
                log.info('Verifying email body contains "Request submitted to insurer" paragraph');
                await emailLogPage.assertEmailDetailRequestSubmittedToInsurer();
                log.info(`Verifying company name in HR insurer email: expected "${capturedClientName}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestCompanyName(capturedClientName);
                log.info(`Verifying insurer name in HR insurer email: expected "${APP_CONSTANTS.TESTINSURER}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestInsurer(APP_CONSTANTS.TESTINSURER);
                log.info(`Verifying policy name in HR insurer email: expected "${capturedMedicalPolicyName}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestPolicyName(capturedMedicalPolicyName);
                log.info(`Verifying attachment file name contains "${APP_CONSTANTS.ATTACHMENTMEMBERLIST}" — confirms MemberList Excel is attached`);
                await emailLogPage.assertAttachmentFileNameContains(APP_CONSTANTS.ATTACHMENTMEMBERLIST);

                log.info(`Downloading MemberList attachment Excel — will verify all ${NUMBER_OF_MEMBERS} member rows from this single file`);
                const attachmentFilePath = await emailLogPage.downloadAttachmentExcel(
                    capturedClientName,
                    capturedMedicalPolicyName
                );

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`--- Verifying Member ${i + 1} in member list attachment Excel: ${member.lastName} ---`);
                    log.info(`Verifying Member ${i + 1} (${member.lastName}) in MemberList attachment Excel — checking 9 fields: Last Name, Employee No, Policy, Category, Relation, Marital Status, Nationality, National ID, Email`);
                    await emailLogPage.verifyAttachmentExcelRow(attachmentFilePath, i, capturedClientName, capturedMedicalPolicyName, member);
                    log.stepPass(`Member ${i + 1} attachment Excel row verified`);
                }

                log.stepPass('STEP 8: HR Insurer bulk request email and member list attachment Excel verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 8: HR Insurer bulk request email or attachment Excel verification failed');
                throw e;
            }

            log.step('STEP 9: Verify insurer bulk request email is dispatched and member list attachment Excel contains correct member data');
            try {
                log.info('Returning to email log list to find the insurer bulk request email');
                await emailLogPage.clickBackToList();
                log.info(`Filtering email logs to find insurer bulk request email for: ${capturedClientName} | ${capturedMedicalPolicyName}`);
                await emailLogPage.filterEmailLogsByClientAndPolicy();
                log.info(`Verifying insurer "To" email address row exists in log for client: ${capturedClientName}`);
                await emailLogPage.assertInsurerEmailTo(capturedClientName, APP_CONSTANTS.INSURER_TO_EMAIL);
                log.info(`Verifying "View" button is present on the insurer email row for: ${APP_CONSTANTS.INSURER_TO_EMAIL}`);
                await emailLogPage.assertInsurerEmailToViewButton(capturedClientName, APP_CONSTANTS.INSURER_TO_EMAIL);
                log.info('Verifying insurer email table paragraph text is correct');
                await emailLogPage.assertInsurerEmailTableParaText();
                log.info(`Verifying insurer "To" email address is shown in the email log detail: ${APP_CONSTANTS.INSURER_TO_EMAIL}`);
                await emailLogPage.assertInsurerEmailToInEmailLogDetails(APP_CONSTANTS.INSURER_TO_EMAIL);
                log.info(`Verifying company name in insurer email: expected "${capturedClientName}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestCompanyName(capturedClientName);
                log.info(`Verifying insurer name in insurer email: expected "${APP_CONSTANTS.TESTINSURER}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestInsurer(APP_CONSTANTS.TESTINSURER);
                log.info(`Verifying policy name in insurer email: expected "${capturedMedicalPolicyName}"`);
                await emailLogPage.assertEmailDetailMembersAdditionBulkRequestPolicyName(capturedMedicalPolicyName);
                log.info(`Verifying attachment file name contains "${APP_CONSTANTS.ATTACHMENTMEMBERADDITION}" — confirms MemberList Excel is attached`);
                await emailLogPage.assertAttachmentFileNameContains(APP_CONSTANTS.ATTACHMENTMEMBERADDITION);

                log.info(`Downloading Member Addition Report Excel and verifying all ${NUMBER_OF_MEMBERS} members — Beneficiary Last Name, Staff No, Policy Name, TPA Name, Endorsement Type`);
                await emailLogPage.downloadAndVerifyMemberAdditionReportExcel(capturedMedicalPolicyName,APP_CONSTANTS.TESTINSURER,'Member Addition',runtimeMembers);

                log.stepPass('STEP 9: Insurer bulk request email, member list attachment Excel and Member Addition Report verified');
            } catch (e) {
                await log.stepFail(page, 'STEP 9: Insurer bulk request email or attachment Excel verification failed');
                throw e;
            }

            log.step(`STEP 10: Verify workflow logs report reflects member addition request entries for all ${NUMBER_OF_MEMBERS} members`);
            try {
                log.info('Navigating to the Reports section from the sidebar');
                await reportPage.navigateToReports();
                log.info('Opening the Workflow Logs Report');
                await reportPage.openWorkflowLogsReport();
                log.info(`Selecting client filter: ${capturedClientName}`);
                await reportPage.selectWorkflowClient();
                log.info(`Selecting policy filter: ${capturedMedicalPolicyName}`);
                await reportPage.selectWorkflowPolicy();
                log.info('Selecting category filter: Cat A_');
                await reportPage.selectWorkflowCategory();
                log.info('Executing the report search to load workflow log entries');
                await reportPage.clickSearch();
                log.info('Exporting Workflow Logs Report to Excel file');
                const workflowExcelPath = await reportPage.exportWorkflowToExcel();

                log.info(`Verifying ${NUMBER_OF_MEMBERS} member entries in the Workflow Logs Report Excel — searching by Employee Number and checking 8 fields each`);
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} workflow log entry: ${member.lastName}`);
                    log.info(`Searching Workflow Logs Excel for Employee Number: ${member.employeeNumber} (Member: ${member.lastName})`);
                    await reportPage.verifyWorkflowExcelMemberRow(workflowExcelPath, member, capturedClientName, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 10: Workflow logs report entries verified for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 10: Workflow logs report verification failed — member entry missing or data mismatch');
                throw e;
            }

            log.step(`STEP 11: Verify consolidated membership report reflects pending addition status for all ${NUMBER_OF_MEMBERS} members`);
            try {
                log.info('Navigating to the Reports section from the sidebar');
                await reportPage.navigateToReports();
                log.info('Opening the Consolidated Membership List report');
                await reportPage.openConsolidatedMembershipReport();
                log.info(`Selecting insurer filter: ${APP_CONSTANTS.TESTINSURER}`);
                await reportPage.selectConsolidatedInsurer();
                log.info(`Selecting client filter: ${capturedClientName}`);
                await reportPage.selectConsolidatedClient();
                log.info(`Selecting policy filter: ${capturedMedicalPolicyName}`);
                await reportPage.selectConsolidatedPolicy();
                log.info('Selecting category filter: Cat A_');
                await reportPage.selectConsolidatedCategory();
                log.info('Executing the report search to load consolidated membership records');
                await reportPage.clickSearch();
                log.info('Exporting Consolidated Membership List to Excel file');
                const consolidatedExcelPath = await reportPage.exportConsolidatedToExcel();

                log.info(`Verifying ${NUMBER_OF_MEMBERS} member records in the Consolidated Membership List Excel — searching by Employee Number and checking 12 fields each`);
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const member = runtimeMembers[i];
                    log.info(`Verifying Member ${i + 1} consolidated membership record: ${member.lastName}`);
                    log.info(`Searching Consolidated Membership Excel for Employee Number: ${member.employeeNumber} (Member: ${member.lastName})`);
                    await reportPage.verifyConsolidatedExcelMemberRow(consolidatedExcelPath, member, capturedMedicalPolicyName);
                }

                log.stepPass(`STEP 11: Consolidated membership report verified — all ${NUMBER_OF_MEMBERS} members show pending addition status`);
            } catch (e) {
                await log.stepFail(page, 'STEP 11: Consolidated membership report verification failed — member record missing or status mismatch');
                throw e;
            }

            log.step('STEP 12: Logout from application');
            try {
                log.info('Clicking logout to end the broker session and clear authentication state');
                await loginPage.logout();
                log.stepPass('STEP 12: Logout successful');
            } catch (e) {
                await log.stepFail(page, 'STEP 12: Logout failed');
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