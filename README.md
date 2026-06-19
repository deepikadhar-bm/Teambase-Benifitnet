# Teambase BenefitNet — Playwright Automation Framework

> **Enterprise-grade end-to-end test automation for the Teambase BenefitNet insurance portal — built with Playwright and TypeScript.**

[![Playwright](https://img.shields.io/badge/Playwright-1.61+-45ba4b?logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js)](https://nodejs.org/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939?logo=jenkins)](https://www.jenkins.io/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Framework Components](#framework-components)
- [Test Data Management](#test-data-management)
- [Excel Step Tracking](#excel-step-tracking)
- [Reporting](#reporting)
- [CI/CD](#cicd)
- [Known Issues & Roadmap](#known-issues--roadmap)

---

## Overview

This framework automates the Teambase BenefitNet insurance portal's bulk member import end-to-end workflow. It validates the complete lifecycle: login → policy navigation → two-round Excel validation → bulk import → email log verification → report Excel verification.

**Currently automated:**
- `REG_TS01_TC01` — Add N principal members via bulk import, verify notification emails, attachment Excel, workflow logs report, and consolidated membership report (11 steps, configurable member count)
- `REG_TS01_TC02` — Validate bulk import validation-failed Excel matches UI error messages (planned)
- Login module tests (in progress)

---

## Architecture

The framework follows a strict 4-layer pattern:

```
┌─────────────────────────────────────────────────────────┐
│          Spec Layer  (tests/e2e/*.spec.ts)               │
│  Test orchestration only — no locators, no raw waits     │
└────────────────────┬────────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────────┐
│     Module-Methods Layer  (src/modules-methods/)         │
│  LoginPage, ClientPage, EmailLogPage, ReportPage         │
│  Business-action methods — each method = one user action │
└────────────────────┬────────────────────────────────────┘
                     │ uses
┌────────────────────▼────────────────────────────────────┐
│       Elements Layer  (src/pages/elements/)              │
│  Pure locator definitions — zero logic, named() pattern  │
└────────────────────┬────────────────────────────────────┘
                     │ extends
┌────────────────────▼────────────────────────────────────┐
│         BasePage  (src/pages/basePage.ts)                │
│  click, fill, hover, wait, assert, scroll, upload …     │
│  Auto-heal on element not found, structured error logging│
└─────────────────────────────────────────────────────────┘
```

**Supporting infrastructure:**

| Layer | Location | Purpose |
|-------|----------|---------|
| FileUtils | `src/helpers/fileUtils.ts` | Excel/CSV/PDF read-write, step capture, TC context |
| Logger | `src/helpers/logger.ts` | Structured console + JSON log output |
| Config | `src/config/` | Environment configs, file paths, member generation config |
| TestDataManager | `test-data/testDataManager.ts` | Runtime data generation, profile resolution, Excel row building |
| Constants | `src/constant/app-constants.ts` | App-wide string constants |

---

## Project Structure

```
teambase/
├── tests/
│   ├── e2e/
│   │   └── reg_ts01_tc01_addMembersBulkEndToEndWorkflow.spec.ts   ← Active E2E spec
│   ├── login-module/
│   │   ├── benefitLogin.spec.ts
│   │   └── benefitLoginDataDriven.spec.ts
│   └── unused/                    ← Old specs — not included in test run
│
├── src/
│   ├── config/
│   │   ├── env.qa.ts              ← QA environment (baseURL, credentials, timeouts)
│   │   ├── env.dev.ts             ← Dev environment
│   │   ├── env.index.ts           ← Config manager (reads ENVIRONMENT variable)
│   │   ├── fileConstants.ts       ← Download/screenshot path constants
│   │   ├── memberGenerationConfig.ts ← NUMBER_OF_MEMBERS, GENDER_PATTERN, helpers
│   │   └── types.ts               ← AppConfig interface
│   │
│   ├── constant/
│   │   └── app-constants.ts       ← TESTINSURER, ATTACHMENTMEMBERLIST, etc.
│   │
│   ├── helpers/
│   │   ├── fileUtils.ts           ← FileUtils class (Excel, CSV, PDF, step capture)
│   │   └── logger.ts              ← Structured logger (tcStart, step, stepPass, stepFail)
│   │
│   ├── modules-methods/           ← Business action classes
│   │   ├── loginPage.ts           ← Login/logout
│   │   ├── clientPage.ts          ← Client navigation, bulk import, Excel write
│   │   ├── emailPage.ts           ← Email log navigation and assertions
│   │   └── reportPage.ts          ← Workflow/consolidated report export and verification
│   │
│   ├── pages/
│   │   ├── basePage.ts            ← All UI interaction primitives
│   │   └── elements/
│   │       ├── login.ts           ← Login page locators
│   │       ├── client.ts          ← Client/bulk-import locators
│   │       ├── emailLog.ts        ← Email log locators (iframe-aware)
│   │       └── reports.ts         ← Report page locators
│   │
│   └── utils/
│       ├── autoHeal.ts            ← Self-healing locator fallback
│       ├── retryUtils.ts          ← Retry with backoff
│       ├── waitUtils.ts           ← Wait helpers
│       ├── errorHandler.ts        ← Centralised error wrapping
│       └── runtimeStore.ts        ← In-memory key-value store across steps
│
├── test-data/
│   ├── testDataManager.ts         ← Runtime data generation and profile resolution
│   └── json-files/
│       ├── benefitnet_test_data.json   ← Excel column schema + allowedValues
│       └── loginTestData.json
│
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Install

```bash
# Clone the repository
git clone <repo-url>
cd teambase-benefitnet

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Environment configuration

The active environment is controlled by the `ENVIRONMENT` variable (defaults to `qa`).

QA credentials and base URL are in `src/config/env.qa.ts`. Do not commit real credentials — use
environment variables or a secrets manager in CI.

```typescript
// src/config/env.qa.ts — Teambase BenefitNet QA environment
export const qaConfig: AppConfig = {
  baseURL: "https://demo.benefitnet.com/",
  credentials: { username: "...", password: "..." },
  timeouts: { action: 60000, wait: 60000, navigation: 45000 },
};
```

### Configure member count

Edit `src/config/memberGenerationConfig.ts` to control how many members are imported per test run:

```typescript
export const NUMBER_OF_MEMBERS = 3;  // change to 1, 5, 10, etc.

export const GENDER_PATTERN = ['Male', 'Male', 'Female', 'Female', 'Female', 'Male'];
// Pattern repeats cyclically — Member 1 = Male, Member 2 = Male, Member 3 = Female, ...
```

---

## Running Tests

```bash
# Run the active E2E spec (headed)
npx playwright test tests/e2e/reg_ts01_tc01_addMembersBulkEndToEndWorkflow --headed

# Run all tests headless
npm test

# Run specific environment
cross-env ENVIRONMENT=qa npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Show last HTML report
npx playwright show-report
```

> **Note:** The active E2E spec uses `test.only` — only the marked test runs when targeting that spec file.
> Remove `test.only` when running as part of a full suite.

---

## Framework Components

### BasePage

All page classes extend `BasePage`, which wraps every Playwright interaction with:
- Auto-wait before action (uses configured `action` timeout)
- Auto-heal on element not found (tries ARIA role, text, and partial selector fallbacks)
- Structured pass/fail logging with element names
- Soft assertion support (`softAssertVisible`, `softAssertText`, `assertNoSoftErrors`)

```typescript
// Examples from BasePage
await this.click(this.elements.submitButton);
await this.fill(this.elements.emailInput, "user@test.com");
await this.assertElementVisible(this.elements.successBanner);
await this.waitForElementIsVisible(this.elements.loadingSpinner);
const text = await this.getText(this.elements.statusLabel);
```

### Elements pattern

Locators are defined as named getters using the `named()` helper, which attaches a display name
for logging without any runtime overhead:

```typescript
get addMembersBulkButton(): Locator {
    return this.named('Add Members Bulk Button',
        this.page.locator(`//button[normalize-space(text())="Add Members Bulk"]`));
}
```

### Logger

```typescript
log.tcStart(TC_ID, TC_TITLE);   // prints test header block
log.step('STEP 1: ...');         // marks step start
log.info('some info');           // info line
log.stepPass('STEP 1: done');    // green PASS line
log.stepFail(page, 'STEP 1: ...');  // red FAIL line + screenshot
log.tcEnd('PASS');               // prints test result footer
```

### FileUtils — Excel step capture

`FileUtils.captureExcelStep` saves a numbered snapshot of any downloaded Excel file to
`test-results/downloads/<TC_ID>/steps/` and logs a cell-level diff against the previous snapshot:

```typescript
FileUtils.setTestContext(TC_ID);      // call once at start of test
await FileUtils.captureExcelStep(filePath, 'Step 9 — workflow export', TC_ID);
// → saves: test-results/downloads/REG_TS01_TC01/steps/01_WorkflowLogsReport_*.xlsx
// → logs:  diff of every changed cell vs previous snapshot

// In test.afterAll:
FileUtils.clearTestContext();
FileUtils.clearExcelStepHistory(TC_ID);
```

> **Important on Windows:** Do not call `captureExcelStep` on census template files (XlsxPopulate-written)
> before `uploadCensusExcelFile` — ExcelJS holds a read lock that blocks `setInputFiles`. Only call it
> after the upload and validation complete, or use it for report exports only.

---

## Test Data Management

Test profiles live in `test-data/json-files/benefitnet_test_data.json`. Each profile defines which
fields to populate in the census Excel for a given member type and round:

```
User Profile 1 - Male Principal Member (Round 1 Partial)    ← minimal fields for Round 1
User Profile 1 - Male Principal Member (Round 2 Full)       ← all mandatory fields for Round 2
User Profile 2 - Female Principal Member (Round 1 Partial)
User Profile 2 - Female Principal Member (Round 2 Full)
```

Runtime data (names, employee numbers, UIDs, etc.) is generated fresh each run via `testDataManager`:

```typescript
const runtimeData = tdm.generateRuntimeDataForGender('Male');
// → { firstName: 'Sysla', lastName: 'Test72064', employeeNumber: 'EMP638174', ... }

const profile = tdm.getProfile('User Profile 1 - Male Principal Member (Round 2 Full)');
const resolved = tdm.resolvePlaceholders(profile.memberData, runtimeData, policyCategory);
const excelRow = tdm.buildExcelRow(resolved);
// → { "First Name (*)": "Sysla", "Last Name (*)": "Test72064", ... }
```

Dropdown fields that can be randomised are picked via `getDropdownValues(fieldKey)` and `pickRandom(arr)`:

```typescript
const values = getDropdownValues('maritalStatus');  // reads from benefitnet_test_data.json
resolvedData.maritalStatus = pickRandom(values);    // e.g. 'Married', 'Single', 'Widowed'
```

---

## Reporting

**HTML Report** (always generated):
```bash
npx playwright show-report
```

**Allure Report** (requires allure CLI):
```bash
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

**JSON log files** are written to `logs/` after each run, containing full step-by-step details.

---

## CI/CD

Jenkins pipeline is defined in `Jenkinsfile`. Key stages:

1. **Install** — `npm ci`
2. **Test** — `cross-env ENVIRONMENT=qa npx playwright test`
3. **Report** — Allure report generation + email notification via `reports/send-email.js`
4. **Archive** — HTML report, screenshots, traces attached to build

Environment variables for CI: `ENVIRONMENT`, `BASE_URL`, `QA_USERNAME`, `QA_PASSWORD`

---

## Known Issues & Roadmap

### Active bugs

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| 1 | High | `assertEmailLogRowExistsForToYopEmail` — args swapped, locator never matches | Swap to `(toEmail, memberLastName)` in emailPage.ts |
| 2 | Medium | Download paths inconsistent (`downloads/` vs `test-results/downloads/`) | Standardise to `FILE_PATHS.DOWNLOADS` in emailPage + reportPage |
| 3 | Medium | `downloadAndVerifyAttachmentExcel` always reads row 12 — fails for member 2+ | Scan by employee number like `verifyWorkflowExcelMemberRow` |
| 4 | Medium | `loginPage.login()` method missing — login spec and unused specs broken | Add `login()` alias or update callers |
| 5 | Low | `waitForTimeout(2000)` hardcoded in `assertEmailDetailRequestSubmittedToInsurer` | Replace with `waitFor({ state: 'visible' })` |

### Test coverage gaps

- **HR email verification** — `selectNotifyHrOption` is called but no step verifies the HR notification email was sent or its contents
- **Login negative tests** — `benefitLogin.spec.ts` references stale APIs and needs rewriting
- **TC02 validation-failed Excel** — spec exists in `unused/` but is not active

### Roadmap

- [ ] Fix arg swap in `assertEmailLogRowExistsForToYopEmail`
- [ ] Standardise download paths to `FILE_PATHS.DOWNLOADS`
- [ ] Fix attachment Excel verification to scan by employee number
- [ ] Add HR email verification step
- [ ] Rewrite `benefitLogin.spec.ts` using current `loginToBenefitNetApplication` API
- [ ] Replace `any[]` types with typed interfaces (`RuntimeMember`, etc.)
- [ ] Activate `REG_TS01_TC02` validation-failed Excel spec
- [ ] Add `TC02` to CI pipeline