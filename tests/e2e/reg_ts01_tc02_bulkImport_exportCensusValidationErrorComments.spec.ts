import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage, MemberValidationResult } from 'src/modules-methods/clientPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { testDataManager as tdm } from 'test-data/testDataManager';
import { NUMBER_OF_MEMBERS, getGenderForMemberIndex, getProfileNameByGender } from 'src/config/memberGenerationConfig';
import { FileUtils } from 'src/helpers/fileUtils';

const TC_ID = 'REG_TS01_TC02';
const TC_TITLE = `should export census with validation error comments that match UI errors after bulk import with incomplete member data`;

test.describe('Add Members Bulk — Export Census with Validation Error Comments', () => {

    let loginPage: LoginPage;
    let clientPage: ClientPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        clientPage = new ClientPage(page);
    });

    test.afterAll(async () => {
        FileUtils.clearTestContext();
        FileUtils.clearExcelStepHistory(TC_ID);
    });

    test(TC_TITLE, async ({ page }) => {

        FileUtils.setTestContext(TC_ID);
        log.tcStart(TC_ID, TC_TITLE);

        try {

            log.step('STEP 1: Login to application with valid broker credentials');
            try {
                await loginPage.loginToBenefitNetApplication(qaConfig.baseURL, qaConfig.credentials.username, qaConfig.credentials.password);
                await loginPage.verifyDashboardWelcomeMessage();
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

            const capturedMedicalPolicyName = clientPage.capturedMedicalPolicyName;
            const policyCategory = `Cat A_ ${capturedMedicalPolicyName}`;

            const runtimeMembers: any[] = [];

            log.step(`STEP 3: Generate unique runtime test data for ${NUMBER_OF_MEMBERS} principal members`);
            try {
                for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
                    const gender = getGenderForMemberIndex(i);
                    const runtimeData = tdm.generateRuntimeDataForGender(gender);
                    runtimeMembers.push(runtimeData);
                    log.info(`Member ${i + 1}: ${runtimeData.firstName} ${runtimeData.lastName} | Gender: ${gender} | EmpNo: ${runtimeData.employeeNumber}`);
                }
                log.stepPass(`STEP 3: Unique runtime data generated for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 3: Failed to generate runtime test data');
                throw e;
            }

            let uiErrorsPerMemberFinal: Map<number, MemberValidationResult> = new Map();

            log.step(`STEP 4: Upload census with intentionally incomplete data to expose mandatory field validation errors for all ${NUMBER_OF_MEMBERS} members`);
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
                await FileUtils.captureExcelStep(initialValidationFilePath, 'Incomplete Census — mandatory field validation trigger', TC_ID);
                await clientPage.uploadCensusExcelFile(initialValidationFilePath);
                await clientPage.selectImportTypeOption();
                await clientPage.selectNotifyHrOption();
                await clientPage.selectNotifyMemberOption();
                await clientPage.clickValidateImportButton();

                uiErrorsPerMemberFinal = await clientPage.getValidationErrorsPerMember();
                log.stepPass(`STEP 4: Mandatory field validation errors captured for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 4: Incomplete census validation did not trigger expected field errors');
                throw e;
            }

            log.step(`STEP 5: Export census with validation error comments and verify comments match UI errors for all ${NUMBER_OF_MEMBERS} members`);
            try {
                const validationFailedExcelPath = await clientPage.downloadValidationFailedCensusExcel();
                await FileUtils.captureExcelStep(validationFailedExcelPath, 'Validation Failed Census — error comments exported', TC_ID);
                await clientPage.assertValidationFailedExcelMatchesUiErrors(validationFailedExcelPath, uiErrorsPerMemberFinal);
                log.stepPass(`STEP 5: Validation error comments verified — all comments match UI errors for all ${NUMBER_OF_MEMBERS} members`);
            } catch (e) {
                await log.stepFail(page, 'STEP 5: Census validation error comments do not match UI errors');
                throw e;
            }

            log.step('STEP 6: Logout from application');
            try {
                await loginPage.logout();
                log.stepPass('STEP 6: Logout successful');
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