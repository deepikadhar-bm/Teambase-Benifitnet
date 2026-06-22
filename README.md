# Teambase BenefitNet — QA Automation Framework

> **Enterprise-Grade End-to-End Test Automation**
> Built with Playwright · TypeScript · Page Object Model
> Version 2.0.0 · Target Application: [demo.benefitnet.com](https://demo.benefitnet.com)

---

## Table of Contents

1. [Framework Overview](#1-framework-overview)
2. [Technology Stack](#2-technology-stack)
3. [Framework Architecture](#3-framework-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Setup and Installation](#5-setup-and-installation)
6. [Environment Configuration](#6-environment-configuration)
7. [Test Execution Commands](#7-test-execution-commands)
8. [Test Execution Flow](#8-test-execution-flow)
9. [Core Components](#9-core-components)
10. [Test Data Management](#10-test-data-management)
11. [Page Objects and Locators](#11-page-objects-and-locators)
12. [Logging System](#12-logging-system)
13. [Reporting and CI/CD](#13-reporting-and-cicd)
14. [Test Suites](#14-test-suites)
15. [Framework Best Practices](#15-framework-best-practices)
16. [Contact and Support](#16-contact-and-support)

---

## 1. Framework Overview

The Teambase BenefitNet QA Automation Framework is a production-grade, enterprise-level end-to-end test automation solution purpose-built for the BenefitNet insurance member management portal. It automates the complete lifecycle of member operations — from login and bulk member import through email notification verification, Excel attachment validation, and report generation.

The framework is designed with three core principles: **scalability** (parameterize once, run for any number of members), **maintainability** (single-responsibility components, no duplication), and **reliability** (auto-healing locators, structured error handling, and IST-timestamped audit logs).

### Key Capabilities

- Full end-to-end automation of the bulk member import workflow including two-round validation
- Dynamic, data-driven test execution supporting any number of members from a single configuration variable
- Automated verification of email notifications, Excel attachments, workflow logs, and consolidated membership reports
- Auto-healing locator engine that recovers from DOM changes without test failure
- IST-timestamped log files with color-coded console output for instant readability
- Allure and Playwright HTML dual-reporting with Jenkins CI/CD integration

---

## 2. Technology Stack

| Component | Technology | Version |
|---|---|---|
| Test Runner | Playwright Test | ^1.61.0 |
| Language | TypeScript | ^5.4.5 |
| Browser | Chromium (primary) | Latest |
| Excel Processing | xlsx-populate | ^1.21.0 |
| Excel Parsing | ExcelJS | ^4.4.0 |
| Schema Validation | Zod | ^4.1.12 |
| Reporting | Allure + Playwright HTML | ^3.10.0 |
| CI/CD | Jenkins | Pipeline |
| Environment Variables | dotenv | ^16.6.1 |
| Runtime | Node.js | ≥18.x |

---

## 3. Framework Architecture

The framework follows a layered Page Object Model (POM) architecture with strict separation of concerns across five layers:

```
┌─────────────────────────────────────────────────────┐
│                   TEST SPEC LAYER                   │
│         tests/e2e/*.spec.ts  |  tests/login/*.spec.ts│
│   Orchestrates test flow, calls module methods only  │
├─────────────────────────────────────────────────────┤
│                MODULE METHODS LAYER                  │
│    src/modules-methods/{login,client,email,report}  │
│   Business-level actions (login, upload, verify…)   │
├─────────────────────────────────────────────────────┤
│                  BASE PAGE LAYER                     │
│              src/pages/basePage.ts                  │
│  Core interactions (click, fill, assert, autoHeal)  │
├─────────────────────────────────────────────────────┤
│                  ELEMENTS LAYER                      │
│         src/pages/elements/{login,client…}.ts       │
│     Named locators only — no logic, no actions      │
├─────────────────────────────────────────────────────┤
│              HELPERS & UTILITIES LAYER               │
│     src/helpers/{logger,fileUtils,validationUtils}  │
│     src/utils/{autoHeal,retryUtils,waitUtils…}      │
│         Cross-cutting infrastructure concerns        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Folder Structure

```
Teambase-BenefitNet/
│
├── tests/                              # All test specifications
│   ├── e2e/                            # End-to-end test suites
│   │   ├── reg_ts01_tc01_addMembersBulkEndToEndWorkflow.spec.ts
│   │   └── reg_ts01_tc02_bulkImport_exportCensusValidationErrorComments.spec.ts
│   └── login-module/                   # Login test suites
│       ├── reg_ts01_tc01_login.spec.ts
│       └── reg_ts01_tc02_loginDataDriven.spec.ts
│
├── src/
│   ├── config/                         # Environment and framework configuration
│   │   ├── env.qa.ts                   # QA environment credentials and timeouts
│   │   ├── env.dev.ts                  # DEV environment configuration
│   │   ├── env.index.ts                # Config manager (environment selector)
│   │   ├── env.schema.ts               # Zod-validated config schema
│   │   ├── memberGenerationConfig.ts   # NUMBER_OF_MEMBERS, gender pattern, helpers
│   │   ├── fileConstants.ts            # File path constants (downloads, screenshots)
│   │   ├── globalTimeout.ts            # Global timeout values
│   │   └── types.ts                    # AppConfig TypeScript interface
│   │
│   ├── constant/
│   │   └── app-constants.ts            # Application-level string constants
│   │
│   ├── pages/                          # Page Object Model layer
│   │   ├── basePage.ts                 # Base class with all core interactions
│   │   └── elements/                  # Locator-only element files
│   │       ├── login.ts               # Login page locators
│   │       ├── client.ts              # Client/policy page locators
│   │       ├── emailLog.ts            # Email log page locators
│   │       └── reports.ts             # Reports page locators
│   │
│   ├── modules-methods/               # Business workflow action classes
│   │   ├── loginPage.ts               # Login/logout actions
│   │   ├── clientPage.ts              # Bulk import, Excel write, validation
│   │   ├── emailPage.ts               # Email log navigation and assertions
│   │   └── reportPage.ts             # Workflow and consolidated report verification
│   │
│   ├── helpers/                       # Cross-cutting utilities
│   │   ├── logger.ts                  # IST-timestamped logger with color console
│   │   ├── fileUtils.ts               # Excel, PDF, CSV, download, step capture
│   │   └── validationUtils.ts         # Non-throwing soft validation helpers
│   │
│   └── utils/                         # Low-level infrastructure utilities
│       ├── autoHeal.ts                # Auto-healing locator engine v4
│       ├── waitUtils.ts               # Unified wait handlers with smart labels
│       ├── retryUtils.ts              # Exponential backoff retry mechanism
│       ├── errorHandler.ts            # Centralized error capture
│       └── elementUtils.ts            # Element interaction helpers
│
├── test-data/                         # All test data assets
│   ├── testDataManager.ts             # BenefitNet test data manager class
│   └── json-files/
│       ├── benefitnet_test_data.json  # Member profiles, column schema, defaults
│       └── loginTestData.json         # Login test credentials
│
├── reports/                           # Custom reporting scripts
│   ├── qa-reporter.js                 # Post-run reporter (email dispatch)
│   ├── generate-report.js             # Allure report generator
│   └── send-email.js                  # Email delivery module
│
├── logs/                              # IST-timestamped plain-text run logs
│   └── test-run-YYYY-MM-DD.log
│
├── test-results/                      # Playwright test artifacts (auto-generated)
│   ├── downloads/                     # Downloaded files scoped by TC ID
│   │   └── REG_TS01_TC01/
│   │       ├── steps/                 # Census Excel snapshots (Round 1, Round 2)
│   │       ├── ImportMembers_*.xlsx
│   │       ├── ImportMembers_*_Updated.xlsx
│   │       ├── MemberList_*.xlsx
│   │       ├── WorkflowLogsReport_*.xlsx
│   │       └── ConsolidatedMembershipList_*.xlsx
│   ├── screenshots/                   # Failure screenshots
│   └── traces/                        # Playwright trace files
│
├── allure-report/                     # Generated Allure HTML report
├── playwright-report/                 # Generated Playwright HTML report
├── playwright.config.ts               # Playwright global configuration
├── tsconfig.json                      # TypeScript compiler configuration
├── Jenkinsfile                        # Jenkins CI/CD pipeline definition
├── package.json                       # Dependencies and npm scripts
└── .env                               # Environment variable overrides
```

---

## 5. Setup and Installation

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Git | Any recent version |
| Java (for Allure) | ≥ 11 (optional) |

### Installation Steps

**Step 1 — Clone the repository**

```bash
git clone 'repository URL'
cd Teambase-Benifitnet
```

**Step 2 — Install dependencies**

```bash
npm install
```

**Step 3 — Install Playwright browsers**

```bash
npx playwright install --with-deps
```

**Step 4 — Verify framework integrity**

```bash
bash verify-framework.sh
```

---

## 6. Environment Configuration

### Environment Files

| File | Purpose |
|---|---|
| `src/config/env.qa.ts` | QA environment — primary target (`opensource-demo.orangehrmlive.com`) |
| `src/config/env.dev.ts` | DEV environment configuration |
| `.env` | Override any environment variable at runtime |

### QA Configuration (`env.qa.ts`)

```typescript
baseURL:            "Base URL"
username:           "username"
action timeout:     60,000 ms
navigation timeout: 45,000 ms
browser timeout:    600,000 ms
```

### Selecting Environment at Runtime

```bash
# Run against QA (default)
cross-env ENVIRONMENT=qa npx playwright test

# Run against DEV
cross-env ENVIRONMENT=dev npx playwright test
```

### Member Count Configuration

The number of members generated per test run is controlled by a single variable in `src/config/memberGenerationConfig.ts`:

```typescript
export const NUMBER_OF_MEMBERS = 3;  // Change to 2, 5, 10, 100 — no other changes needed
```

The gender pattern for generated members is also configurable:

```typescript
export const GENDER_PATTERN = ['Male', 'Male', 'Female', 'Female', 'Female', 'Male'];
// Repeats cyclically for any NUMBER_OF_MEMBERS value
```

---

## 7. Test Execution Commands

### Basic Commands

```bash
# Run all tests
npx playwright test

# Run all tests headed (visible browser)
npx playwright test --headed

# Run specific test file
npx playwright test reg_ts01_tc01_addMembersBulkEndToEndWorkflow.spec.ts

# Run by test ID pattern
npx playwright test --grep "REG_TS01_TC01"

# Run in debug mode
npx playwright test --debug

# Run with Playwright UI mode
npx playwright test --ui
```

### Environment-Specific Commands

```bash
npm run test:qa       # QA environment
npm run test:dev      # DEV environment
npm run test:headed   # Headed mode
```

### Browser and Parallel Commands

```bash
npm run test:chrome     # Chromium only (default)
npm run test:firefox    # Firefox
npm run test:webkit     # WebKit (Safari)
npm run test:parallel   # 4 parallel workers
```

### Reporting Commands

```bash
npm run test:report                                          # Open Playwright HTML report
npx allure generate allure-results --clean -o allure-report # Generate Allure report
npx allure open allure-report                               # Open Allure report
```

---

## 8. Test Execution Flow

The primary end-to-end workflow (`REG_TS01_TC01`) follows this sequence:

```
STEP 1  Login
        └─ Navigate to BenefitNet portal → enter credentials → assert success

STEP 2  Navigate to Target Client Policy
        └─ Sidebar → Clients → capture client name → open policy tab → open bulk add form

STEP 3  Generate Runtime Data
        └─ For each member: generate unique name, DOB, national ID, passport,
           phone, email, employee number, UID, file number, establishment ID

STEP 4  Round 1 — Partial Fill (Intentional Validation Discovery)
        ├─ Build partial Excel rows from Round 1 profile (deliberately missing fields)
        ├─ Download census sample file → write member rows → capture Excel snapshot
        ├─ Upload → configure import options → validate
        └─ Capture UI validation errors per member (required fields + invalid fields)

STEP 5  Round 2 — Complete Fill (All Mandatory Fields)
        ├─ Download fresh sample file (saved as *_Updated.xlsx)
        ├─ Build complete Excel rows from Round 2 profile with all mandatory fields
        ├─ Randomize dropdown values (marital status, member type, salary bracket…)
        ├─ Store randomized values back into runtimeMembers for later verification
        ├─ Write → capture Excel snapshot (diff logged vs Round 1) → upload
        ├─ Assert all Round 1 errors resolved → proceed to import
        └─ Handle validation outcome (success / proceed valid members)

STEP 6  Assert Import Success
        └─ Wait for import progress → assert success heading

STEP 7  Verify Notification Emails (per member)
        └─ Navigate to email logs → filter by client/policy → paginate to member row
           → assert addition request, notification type, yopmail address, subject
           → open detail view → assert company, insurer, policy, category, employee number

STEP 8  Verify Insurer Bulk Request Email and Attachment Excel
        ├─ Open insurer bulk request email
        ├─ Download MemberList attachment Excel ONCE
        └─ For each member: verify correct row (row 12 + memberIndex) — last name,
           employee number, policy, category, relation, marital status, nationality,
           national ID, email

STEP 9  Verify Workflow Logs Report
        ├─ Export WorkflowLogsReport Excel
        └─ For each member: search by Employee Number → assert member name,
           company, policy, category, relation, request type, nationality

STEP 10 Verify Consolidated Membership Report
        ├─ Export ConsolidatedMembershipList Excel
        └─ For each member: search by Employee Number → assert first name, last name,
           email, nationality, marital status, relation, policy, category,
           country of residence, member profile status, national ID

STEP 11 Logout
        └─ Click logout → assert session ended
```

---

## 9. Core Components

### `playwright.config.ts`

The central Playwright configuration file defining:

- **Test directory:** `./tests`
- **Global timeout:** 1,800,000 ms (30 minutes) per test — accommodates long import workflows
- **Expect timeout:** 25,000 ms per assertion
- **Parallelism:** 4 workers locally, 3 in CI
- **Artifacts:** Screenshots on failure, video always on, trace always on
- **Reporters:** HTML + Allure in CI; HTML locally
- **Browser:** Chromium at 1920×1080

### `basePage.ts`

The foundation class extended by all module method classes. Provides 30+ interaction methods including click, fill, hover, assert, scroll, and dropdown selection. Every interaction routes through `resolveLocator()` which automatically attempts auto-healing before failing — meaning tests recover from minor DOM changes without manual intervention.

### `memberGenerationConfig.ts`

The single control file governing dynamic test data generation. Change `NUMBER_OF_MEMBERS` and every loop, every log line, every verification step in all specs automatically scales — no other file needs touching.

### `fileUtils.ts`

A 29-method utility class managing the complete file lifecycle: TC-scoped downloads, Excel reading and writing, PDF and CSV verification, step snapshot capture with diff logging, and a master download report. All downloaded files are organized under `test-results/downloads/<TC_ID>/` preventing collisions in parallel runs.

---

## 10. Test Data Management

### Architecture

Test data is managed through a three-tier structure: a JSON data file, a TypeScript manager class, and a configuration module.

### `benefitnet_test_data.json`

A single structured JSON file defining the complete BenefitNet import template for `MedicalPolicy1_Syslatech_TestClient1`. It contains:

**Column Schema (53 columns)** — defines every Excel column with its header, field key, mandatory flag, input type, and allowed dropdown values.

**Test Profiles** — named data sets for specific test scenarios:

| Profile Name | Purpose |
|---|---|
| User Profile 1 - Male Principal Member (Round 1 Partial) | Round 1 upload — deliberately missing fields to trigger validation |
| User Profile 1 - Male Principal Member (Round 2 Full) | Round 2 upload — all 31+ mandatory fields populated |
| User Profile 2 - Female Principal Member (Round 1 Partial) | Female member Round 1 |
| User Profile 2 - Female Principal Member (Round 2 Full) | Female member Round 2 |
| Login - Valid Credentials | Standard login test |
| Login - Invalid Password | Negative login test |
| Login - Empty Fields | Field validation test |

**Default Field Values** — fallback values for common dropdowns (nationality, country, work city, salary type, etc.)

### `testDataManager.ts`

The central data access class providing profile retrieval, runtime data generation, placeholder resolution, and Excel row building.

### Runtime Data Generation

Each member's runtime data includes auto-generated unique values per run:

| Field | Format | Example |
|---|---|---|
| Last Name | `Test` + 5 digits | `Test87485` |
| Employee Number | `EMP` + 6 digits | `EMP176946` |
| National ID Number | `NID` + 9 digits | `NID361572292` |
| UID Number | 9 digits only | `361572292` |
| File Number | 9 digits only | `844291038` |
| Passport Number | Letter + 7 digits | `A1234567` |
| Phone Number | UAE mobile format | `0512345678` |
| Email | `syslatechNNN@yopmail.com` | `syslatech481@yopmail.com` |
| Date of Birth | `DD/MM/YYYY` | `14/06/1987` |
| Addition Date | Current date (IST) | `22/06/2026` |

---

## 11. Page Objects and Locators

### Design Principle

All locators are defined in dedicated element files under `src/pages/elements/`. No locator strings appear in module methods or test specs. Every locator uses the `named()` pattern to attach a human-readable label used throughout all log output.

### `named()` Pattern

```typescript
emailLogRowViewLinkByMemberLastName(lastName: string): Locator {
    return this.named(`Email Log Row View Link: ${lastName}`,
        this.page.locator('tr')
            .filter({ hasText: lastName })
            .getByRole('link', { name: 'View' })
            .first());
}
```

This makes logs self-documenting — instead of raw XPath strings, every log line shows the element's human name:

```
[INFO]  Click → Email Log Row View Link: Test87485
[PASS]  Clicked → Email Log Row View Link: Test87485
```

### iframe Handling

Email detail content renders inside `iframe[id="iframeEmailTempl"]`. The `EmailLogElements` class holds a dedicated `FrameLocator` instance, making iframe scoping transparent to the module methods that call it.

---

## 12. Logging System

The `Logger` class provides dual-output logging: clean color-coded console output for developers and IST-timestamped log files for audit and debugging.

### Console vs Log File

| Output | Timestamps | Purpose |
|---|---|---|
| Console | None — clean readability | Developer feedback during test run |
| `logs/test-run-YYYY-MM-DD.log` | Full IST timestamps | Audit trail, post-run debugging |

Log files are appended across multiple runs on the same day and use IST (`Asia/Kolkata`) timezone throughout.

### Log Levels

| Level | Console Color | Usage |
|---|---|---|
| `STEP` | Bold White | Step boundary markers with elapsed time |
| `PASS` | Bold Green | Successful assertions and actions |
| `INFO` | Cyan | Informational messages and captured values |
| `WARN` | Bold Yellow | Warnings, auto-heal notifications |
| `ERROR` | Bold Red | Errors before throw |
| `FAIL` | White on Red | Failed step with screenshot |
| `DEBUG` | Dim Gray | Verbose diagnostic output |

---

## 13. Reporting and CI/CD

### Playwright HTML Report

Auto-generated at `playwright-report/index.html`. Includes per-test pass/fail status, steps, screenshots, video recordings, and network traces.

```bash
npx playwright show-report
```

### Allure Report

Rich interactive report with test history, trends, and step-level detail:

```bash
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

### Custom QA Reporter

A Playwright reporter plugin (`reports/qa-reporter.js`) fires after all tests complete. It packages test artifacts into a ZIP and optionally sends an email summary:

```bash
# Auto email on run completion
AUTO_SEND_EMAIL=true npx playwright test

# Manual email trigger
node reports/send-email.js
```

### Jenkins Pipeline

The CI/CD pipeline (`Jenkinsfile`) defines five stages:

| Stage | Action |
|---|---|
| Checkout Code | Pull from GitHub `main` branch |
| Install Dependencies | `npm install` |
| Install Playwright Browsers | `npx playwright install --with-deps` |
| Run Playwright Tests | `npx playwright test --retries=2` — build marked UNSTABLE on failure |
| Generate Allure Report | Generate HTML report using Allure CLI |

**CI-specific behavior:** headless mode enforced, 3 workers, 1 retry on failure, `forbidOnly` blocks any `.only` test from being pushed.

---

## 14. Test Suites

### REG_TS01_TC01 — Add Members Bulk End-to-End Workflow

**File:** `tests/e2e/reg_ts01_tc01_addMembersBulkEndToEndWorkflow.spec.ts`

The primary regression test covering the complete member addition lifecycle across 11 steps from login through consolidated membership report verification. Supports any member count via `NUMBER_OF_MEMBERS`.

**Covered validations:**
- Two-round Excel upload with staged validation discovery
- Per-member email notification content (subject, company, insurer, policy, category, employee number)
- MemberList attachment Excel — row-level verification per member
- Workflow Logs report — employee number search and field assertions
- Consolidated Membership report — 12-field assertion per member including dynamic marital status

### REG_TS01_TC02 — Bulk Import Export Census Validation Error Comments

**File:** `tests/e2e/reg_ts01_tc02_bulkImport_exportCensusValidationErrorComments.spec.ts`

Validates that the "Export Census with Validation Error Comments" Excel file accurately reflects validation errors shown in the UI after a Round 1 partial upload.

**Covered validations:**
- Required field error messages match between UI and Excel `Validation Comments` column
- Invalid field error messages match between UI and Excel

### REG_TS01_TC01 — Login Valid Credentials

**File:** `tests/login-module/reg_ts01_tc01_login.spec.ts`

Standard login verification: navigate → enter valid credentials → assert success message.

### REG_TS01_TC02 — Login Data-Driven

**File:** `tests/login-module/reg_ts01_tc02_loginDataDriven.spec.ts`

Data-driven login test covering valid, invalid password, and empty field scenarios from `loginTestData.json`.

---

## 15. Framework Best Practices

### Separation of Concerns

Every layer has a single responsibility. Test specs orchestrate; module methods implement business actions; base page handles interactions; elements hold locators; helpers provide infrastructure. No layer reaches into another layer's responsibility.

### Zero Hardcoded Counts

Member count, gender pattern, profile names, and dropdown values are all derived from configuration or JSON data. Adding a new member profile requires only a JSON entry — no spec code changes.

### Named Locators

Every locator uses the `named()` pattern. Log output is always human-readable — element names appear in every log line, eliminating the need to cross-reference locator files when reading logs.

### TC-Scoped Downloads

All downloaded files are organized under `test-results/downloads/<TC_ID>/`, preventing cross-test file collisions in parallel runs and enabling easy artifact navigation after a run.

### Round-Distinguished File Naming

Census files use an optional suffix to distinguish import rounds:
- `ImportMembers_*_<timestamp>.xlsx` — Round 1 original
- `ImportMembers_*_<timestamp>_Updated.xlsx` — Round 2 corrected

### Surgical Changes Only

All framework modifications follow a minimal-diff principle — existing JSDoc, method signatures, and logic are preserved unless the change specifically targets them. This keeps Git history clean and reviewable.

### Retry and Auto-Heal

Network delays, DOM re-renders, and element timing variations are handled automatically — `retryUtils` for action-level retries, `autoHeal` for locator recovery through a 9-strategy waterfall. Tests are never cluttered with manual `waitForTimeout` calls.

### Audit Trail

Every test run produces a timestamped IST log file. Screenshots are captured on any `stepFail`. Playwright records video and trace for every test. The combination ensures no failure is ever undiagnosable.

---

*This document serves as the primary reference for clients, QA engineers, developers, and new team members onboarding to the Teambase BenefitNet automation framework.*