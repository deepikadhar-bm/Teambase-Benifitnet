import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage } from 'src/modules-methods/clientPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { testDataManager as tdm } from 'test-data/testDataManager';
import { NUMBER_OF_MEMBERS, getGenderForMemberIndex, getProfileNameByGender } from 'src/config/memberGenerationConfig';

const TC_ID = 'REG_TS01_TC02';
const TC_TITLE = `should add ${NUMBER_OF_MEMBERS} principal members via bulk import, export census with validation error comments and verify comments match UI errors for all members`;

test.describe('Add Members Bulk — Export Census with Validation Error Comments', () => {

    let loginPage: LoginPage;
    let clientPage: ClientPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        clientPage = new ClientPage(page);
    });

    test(TC_TITLE, async ({ page }) => {

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
                    log.info(`Member ${i + 1}: ${runtimeData.firstName} ${runtimeData.lastName} | Gender: ${gender} | EmpNo: ${runtimeData.employeeNumber}`);
                }
                log.stepPass(`STEP 3: Runtime data generated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 3: Failed to generate runtime data');
                throw e;
            }

            log.step('STEP 4: Initial validation pass — partial fill for all members to trigger validation failures');
            try {
                const initialValidationExcelRows: any[] = [];

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const profileName = getProfileNameByGender(gender, 1, 'Partial');

                    const initialValidationProfile = tdm.getProfile(profileName);
                    const initialValidationExcelRow = tdm.buildExcelRow(
                        tdm.resolvePlaceholders(initialValidationProfile.memberData, runtimeMembers[i], policyCategory)
                    );
                    initialValidationExcelRows.push(initialValidationExcelRow);
                }

                const initialValidationFilePath = await clientPage.downloadCensusSampleFile();
                await clientPage.writeMultipleMembersToExcelFile(initialValidationFilePath, initialValidationExcelRows);
                await clientPage.uploadCensusExcelFile(initialValidationFilePath);
                await clientPage.selectImportTypeOption();
                await clientPage.selectNotifyHrOption();
                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                const uiErrorsPerMember = await clientPage.getValidationErrorsPerMember();

                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const memberResult = uiErrorsPerMember.get(i);
                    log.info(`Member ${i + 1} Initial validation required errors (${memberResult?.requiredFieldErrors.length ?? 0}): ${memberResult?.requiredFieldErrors.join(', ')}`);
                    log.info(`Member ${i + 1} Initial validation invalid fields  (${memberResult?.invalidFieldErrors.length ?? 0}): ${memberResult?.invalidFieldErrors.join(', ')}`);
                    log.info(`Member ${i + 1} Initial validation warnings        (${memberResult?.warnings.length ?? 0}): ${memberResult?.warnings.join(' | ')}`);
                }

                log.stepPass(`STEP 4: Initial validation pass completed — mandatory fields identified for all ${NUMBER_OF_MEMBERS} members`);

                var uiErrorsPerMemberFinal = uiErrorsPerMember;
            } catch (e) {
                await log.stepFail(page, 'STEP 4: Initial validation pass failed unexpectedly');
                throw e;
            }

            log.step(`STEP 5: Export census with validation error comments and verify comments match UI errors for all ${NUMBER_OF_MEMBERS} members`);
            try {
                const validationFailedExcelPath = await clientPage.downloadValidationFailedCensusExcel();
                await clientPage.assertValidationFailedExcelMatchesUiErrors(validationFailedExcelPath, uiErrorsPerMemberFinal);
                log.stepPass(`STEP 5: Census with validation error comments verified — all comments match UI errors for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Census with validation error comments does not match UI errors');
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