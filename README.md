# Teambase BenefitNet — QA Automation Framework Reference

> **Stack:** Playwright · TypeScript · Page Object Model · Allure · Jenkins  
> **Target:** [demo.benefitnet.com](https://demo.benefitnet.com) — Insurance member management portal  
> **Version:** 2.0.0

---

## Table of Contents

1. [Framework Architecture](#1-framework-architecture)
2. [Folder Structure](#2-folder-structure)
3. [Setup and Installation](#3-setup-and-installation)
4. [Execution Commands](#4-execution-commands)
5. [Configuration System](#5-configuration-system)
6. [Elements Layer — Locators](#6-elements-layer--locators)
7. [BasePage — All Interaction Methods](#7-basepage--all-interaction-methods)
8. [Module Methods Layer](#8-module-methods-layer)
9. [Test Data Management](#9-test-data-management)
10. [Logger — All Log Methods](#10-logger--all-log-methods)
11. [FileUtils — Excel and File Handling](#11-fileutils--excel-and-file-handling)
12. [AutoHeal Engine](#12-autoheal-engine)
13. [Error Handler and Retry Utils](#13-error-handler-and-retry-utils)
14. [Runtime Store](#14-runtime-store)
15. [Reports and Artifacts](#15-reports-and-artifacts)
16. [Writing a New Test Case](#16-writing-a-new-test-case)
17. [Coding Standards](#17-coding-standards)

---

## 1. Framework Architecture

The framework uses a strict **five-layer Page Object Model**. Each layer has one responsibility and never reaches into another layer's job.

```
┌────────────────────────────────────────────────────────────┐
│  LAYER 5 — SPEC FILE          tests/e2e/*.spec.ts          │
│  Orchestrates the test. Calls module methods only.         │
│  Contains: log.step(), try/catch, for loops                │
├────────────────────────────────────────────────────────────┤
│  LAYER 4 — MODULE METHODS     src/modules-methods/*.ts     │
│  Business workflows: login, uploadCensus, verifyEmail      │
├────────────────────────────────────────────────────────────┤
│  LAYER 3 — BASE PAGE          src/pages/basePage.ts        │
│  Core interactions: click, fill, assert, autoHeal, wait    │
├────────────────────────────────────────────────────────────┤
│  LAYER 2 — ELEMENTS           src/pages/elements/*.ts      │
│  Locators only — no actions, no logic                      │
├────────────────────────────────────────────────────────────┤
│  LAYER 1 — HELPERS/UTILS      src/helpers/ src/utils/      │
│  Logger, FileUtils, AutoHeal, RetryUtils, ErrorHandler     │
└────────────────────────────────────────────────────────────┘
```

**The golden rule:** A spec file never touches locators. A locator file never performs actions. No layer skips a layer.

---

## 2. Folder Structure

```
Teambase-Benifitnet/
├── tests/                          ← Test specifications
│   ├── e2e/                        ← End-to-end full workflow tests
│   └── login-module/               ← Login-specific tests
│
├── src/
│   ├── config/                     ← Environment config, timeouts, paths
│   │   ├── env.qa.ts               ← QA environment (URL, credentials)
│   │   ├── env.dev.ts              ← DEV environment
│   │   ├── env.index.ts            ← Config manager — picks env at runtime
│   │   ├── env.schema.ts           ← Zod validation schema
│   │   ├── memberGenerationConfig.ts  ← NUMBER_OF_MEMBERS — scale here
│   │   ├── fileConstants.ts        ← File path constants
│   │   ├── globalTimeout.ts        ← Timeout values
│   │   └── types.ts                ← TypeScript interfaces
│   │
│   ├── constant/
│   │   └── app-constants.ts        ← Application string constants
│   │
│   ├── pages/
│   │   ├── basePage.ts             ← All interaction methods (60+ methods)
│   │   └── elements/               ← Locator-only files
│   │       ├── login.ts            ← Login page locators
│   │       ├── client.ts           ← Bulk import page locators
│   │       ├── emailLog.ts         ← Email log page locators
│   │       └── reports.ts          ← Reports page locators
│   │
│   ├── modules-methods/            ← Business workflow action classes
│   │   ├── loginPage.ts
│   │   ├── clientPage.ts
│   │   ├── emailPage.ts
│   │   └── reportPage.ts
│   │
│   ├── helpers/
│   │   ├── logger.ts               ← Universal logger
│   │   ├── fileUtils.ts            ← Excel/file utilities
│   │   └── validationUtils.ts      ← Soft validation helpers
│   │
│   └── utils/
│       ├── autoHeal.ts             ← 9-strategy locator recovery engine
│       ├── waitUtils.ts            ← Smart wait methods
│       ├── retryUtils.ts           ← Exponential backoff retry
│       ├── errorHandler.ts         ← Centralized error capture
│       └── runtimeStore.ts         ← In-memory key-value store
│
├── test-data/
│   ├── testDataManager.ts          ← Central data access class
│   └── json-files/
│       ├── benefitnet_test_data.json  ← Column schema + member profiles
│       └── loginTestData.json
│
├── reports/
│   ├── qa-reporter.js              ← Post-run reporter (ZIP + email)
│   ├── generate-report.js          ← ZIP archive generator
│   └── send-email.js               ← Gmail SMTP email sender
│
├── logs/                           ← IST-timestamped log files (auto-generated)
├── test-results/                   ← Screenshots, videos, traces, downloads
├── playwright.config.ts            ← Playwright global configuration
├── package.json
├── tsconfig.json                   ← Path aliases (@pages, @utils, @fixtures)
└── Jenkinsfile                     ← Jenkins CI/CD pipeline
```

---

## 3. Setup and Installation

```bash
# 1. Clone the repository
git clone https://github.com/syslatech/Syslatech_Playwright.git
cd Teambase-Benifitnet

# 2. Install Node dependencies
npm install

# 3. Install Playwright browsers
npx playwright install --with-deps

# 4. Create .env from example
cp .env
# Edit .env and fill in email credentials if needed

# 5. Verify framework health
bash verify-framework.sh
```

**Required `.env` variables:**

```env
ENVIRONMENT=qa
AUTO_SEND_EMAIL=false
EMAIL_USER=your.name@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx    # Gmail App Password
EMAIL_TO=recipient@example.com
LOG_LEVEL=DEBUG
```

---

## 4. Execution Commands

```bash
# Run a specific test file
npx playwright test tests/e2e/reg_ts01_tc01 --headed

# Run all tests
npx playwright test

# Run with debug mode (step-through browser)
npx playwright test tests/e2e/reg_ts01_tc01 --debug

# Run with UI explorer
npx playwright test --ui

# Run by environment
cross-env ENVIRONMENT=qa npx playwright test
cross-env ENVIRONMENT=dev npx playwright test

# View last HTML report
npx playwright show-report

# View a specific trace file
npx playwright show-trace test-results/<folder>/trace.zip

# Generate Allure report
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report

# Send email report manually
node reports/send-email.js
```

**npm script shortcuts:**

```bash
npm test              # Run all tests
npm run test:qa       # QA environment
npm run test:dev      # DEV environment
npm run test:headed   # Headed browser
npm run test:debug    # Debug mode
npm run test:chrome   # Chromium only
```

---

## 5. Configuration System

### `src/config/env.qa.ts` — QA Environment

```typescript
export const qaConfig: AppConfig = {
  env:     "qa",
  baseURL: "baseURL",
  credentials: {
    username: "username",
    password: "password",
  },
  timeouts: {
    action:     60000,   // element interaction timeout (ms)
    wait:       60000,   // assertion wait timeout (ms)
    navigation: 45000,   // page navigation timeout (ms)
  },
  browser: {
    headless: false,
    slowMo:   0,
  },
};
```

### `src/config/env.index.ts` — Config Manager

Used everywhere via `configManager`. Automatically picks the right environment.

```typescript
import { configManager } from 'src/config/env.index';

configManager.getBaseURL()           // "https://demo.benefitnet.com/"
configManager.getTimeout('action')   // 60000
configManager.getTimeout('navigation') // 45000
configManager.getBrowserConfig()     // { headless: false, slowMo: 0 }
```

### `src/config/memberGenerationConfig.ts` — Scaling Member Count

**Single variable controls all test loops, logs, and Excel rows:**

```typescript
// src/constant/app-constants.ts
export const APP_CONSTANTS = {
  NUMBER_OF_MEMBERS: 3,   // ← Change to 2, 5, 10 — no other files need changing
};
```

```typescript
// Used in specs:
import { NUMBER_OF_MEMBERS, getGenderForMemberIndex, getProfileNameByGender } from 'src/config/memberGenerationConfig';

for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
  const gender = getGenderForMemberIndex(i);       // 'Male' or 'Female' based on pattern
  const profileName = getProfileNameByGender(gender, 1, 'Partial'); // Round 1
}
```

### `src/config/fileConstants.ts` — File Paths

```typescript
import { FILE_PATHS } from 'src/config/fileConstants';

FILE_PATHS.SCREENSHOTS   // "test-results/screenshots"
FILE_PATHS.DOWNLOADS     // "test-results/downloads"
FILE_PATHS.TRACES        // "test-results/traces"
FILE_PATHS.VIDEOS        // "test-results/videos"
```

---

## 6. Elements Layer — Locators

Every locator lives in `src/pages/elements/`. No locator string ever appears in a spec or module method.

### The `named()` Pattern

Every locator **must** use `named()`. This attaches a human-readable label used in all log output.

```typescript
// src/pages/elements/login.ts
export class LoginElements {
  constructor(private readonly page: Page) {}

  private named(name: string, locator: Locator): Locator {
    (locator as any).__name = name;
    return locator;
  }

  // ── Locator definition ──────────────────────────────────────────────────
  get LoginButton(): Locator {
    return this.named('Login Button',
      this.page.locator('//button[@id="btnSubmit"]'));
  }

  get UserNameInput(): Locator {
    return this.named('Username Input',
      this.page.locator('//input[@id="signin_username"]'));
  }
}
```

**With `named()`:**
```
[INFO    ] Click → Login Button
[PASS    ] ✔ Clicked → Login Button
```

**Without `named()`:**
```
[INFO    ] Click → button-btnSubmit
[PASS    ] ✔ Clicked → button-btnSubmit
```

### Dynamic Locators

For locators that depend on runtime values, use methods instead of getters:

```typescript
// Target a specific member row by last name
emailLogRowViewLinkByMemberLastName(lastName: string): Locator {
  return this.named(`Email Log Row View Link: ${lastName}`,
    this.page.locator('tr')
      .filter({ hasText: lastName })
      .getByRole('link', { name: 'View' })
      .first());
}
```

### Adding a New Locator

1. Open the relevant elements file (e.g. `src/pages/elements/client.ts`)
2. Add a getter or method using `named()`
3. Use XPath or CSS — never raw strings in specs

```typescript
// CORRECT
get ValidateImportButton(): Locator {
  return this.named('Validate Import Button',
    this.page.locator('//button[normalize-space(text())="Validate Import"]'));
}

// WRONG — locator used directly in spec
await page.locator('//button[text()="Validate Import"]').click();
```

---

## 7. BasePage — All Interaction Methods

`src/pages/basePage.ts` is the foundation of the framework. All module method classes extend it. Every method handles auto-wait, auto-heal, error handling, and logging internally — you never need to add these manually.

**How it works internally:** Every interaction method calls `resolveLocator()` which waits for the element to be visible, and if not found, fires the AutoHeal engine through 9 fallback strategies before throwing.

---

### Navigation Methods

#### `navigateTo(url)`
Navigate to a full URL. Waits for `domcontentloaded` + `load` state.

```typescript
// Where to use: module methods (loginPage.ts, clientPage.ts)
await this.navigateTo('https://demo.benefitnet.com/');

// Log output:
// [INFO ] Navigate To → https://demo.benefitnet.com/
// [PASS ] ✔ Navigated → https://demo.benefitnet.com/
```

#### `goto(path)`
Navigate to a path relative to `baseURL` from config.

```typescript
await this.goto('/dashboard');       // goes to baseURL + /dashboard
await this.goto('/');                // goes to baseURL
```

#### `reload()`
Reload the current page.

```typescript
await this.reload();
// Log: [PASS ] ✔ Page reloaded
```

#### `goBack()` / `goForward()`
Browser back / forward navigation.

```typescript
await this.goBack();
await this.goForward();
```

---

### Element Action Methods

All action methods use `resolveLocator()` internally — auto-wait and auto-heal are built in.

#### `click(selector, options?)`
Click an element. Waits for it to be visible first.

```typescript
// Basic usage
await this.click(this.clientPageElements.ValidateImportButton);

// With force click (bypasses visibility check)
await this.click(this.clientPageElements.HiddenCheckbox, { force: true });

// With explicit label override
await this.click(this.clientPageElements.GenericButton, { label: 'Import Type Dropdown' });

// Log output:
// [INFO ] Click → Validate Import Button
// [PASS ] ✔ Clicked → Validate Import Button
```

#### `fill(selector, text)`
Set input value directly (fast, no keyboard simulation). Best for text inputs, email fields, date fields.

```typescript
await this.fill(this.loginElements.UserNameInput, 'syslatech_broker1');

// Log output:
// [INFO ] Fill → Username Input | "syslatech_broker1"
// [PASS ] ✔ Filled → Username Input
```

#### `type(selector, text, delay?)`
Simulate keyboard typing character by character. Use when the application listens to keyboard events (e.g. autocomplete, search suggestions).

```typescript
// Slow typing to trigger autocomplete
await this.type(this.elements.SearchField, 'Purchase Order', 100);

// Fast typing (no delay)
await this.type(this.elements.SearchField, 'Purchase Order');
```

#### `clear(selector)`
Clear an input field completely.

```typescript
await this.clear(this.elements.QuantityInput);
// Log: [PASS ] ✔ Cleared → Quantity Input
```

#### `hover(selector)`
Mouse hover over an element. Used to trigger dropdown menus, tooltips, reveal hidden buttons.

```typescript
await this.hover(this.clientElements.AddMembersBulkButton);
// Log: [PASS ] ✔ Hovered → Add Members Bulk Button
```

#### `check(selector)` / `uncheck(selector)`
Check or uncheck a checkbox.

```typescript
await this.check(this.elements.AgreeTermsCheckbox);
await this.uncheck(this.elements.NewsletterCheckbox);
```

#### `press(selector, key)`
Press a keyboard key on a focused element.

```typescript
await this.press(this.elements.SearchField, 'Enter');
await this.press(this.elements.DateInput, 'Tab');
```

#### `pressKey(key)`
Press a keyboard key globally (no element focus needed).

```typescript
await this.pressKey('Escape');    // close a modal
await this.pressKey('Tab');       // move focus
await this.pressKey('Enter');     // submit form
```

#### `selectOption(selector, value)`
Select from a native HTML `<select>` dropdown by value or label.

```typescript
await this.selectOption(this.elements.CountryDropdown, 'India');
await this.selectOption(this.elements.StatusDropdown, ['Active']);  // array form
```

#### `doubleClick(selector)`
Double-click an element. Used for inline editing, file renaming.

```typescript
await this.doubleClick(this.elements.EditableCell);
```

#### `rightClick(selector)`
Right-click to open context menu.

```typescript
await this.rightClick(this.elements.TableRow);
```

#### `dragAndDrop(source, target)`
Drag one element and drop it onto another.

```typescript
await this.dragAndDrop(this.elements.DraggableCard, this.elements.DropZone);
```

#### `focus(selector)`
Set keyboard focus on an element.

```typescript
await this.focus(this.elements.EmailInput);
```

---

### Keyboard and Mouse

#### `typeText(text)`
Type text at the current focus position (no element needed).

```typescript
await this.focus(this.elements.SearchBox);
await this.typeText('Hello World');
```

#### `mouseClick(x, y, button?, clickCount?)`
Click at exact pixel coordinates. Used when element-based clicking isn't possible.

```typescript
await this.mouseClick(250, 400);
await this.mouseClick(100, 200, 'right');       // right-click at coordinates
await this.mouseClick(300, 300, 'left', 2);     // double-click
```

#### `mouseMove(x, y)`
Move the mouse to exact coordinates.

```typescript
await this.mouseMove(100, 200);
```

---

### Tab / Window Methods

#### `clickAndGetNewTab(selector)`
Click a link that opens a new tab and return the new page object.

```typescript
const newPage = await this.clickAndGetNewTab(this.elements.OpenInNewTabLink);
// newPage is a full Playwright Page — you can navigate and interact on it
await newPage.waitForLoadState('domcontentloaded');
```

#### `switchToTab(index)`
Switch to an open tab by index (0 = first tab, 1 = second tab, etc.).

```typescript
const secondTab = await this.switchToTab(1);
```

#### `getTabCount()`
Get the number of open browser tabs.

```typescript
const count = this.getTabCount();  // e.g. 2
```

---

### Wait Methods

#### `waitForElementIsVisible(selector, timeout?)`
Wait until an element is visible. Includes auto-heal if element not found within timeout.

```typescript
await this.waitForElementIsVisible(this.elements.DownloadSampleFileLink);
await this.waitForElementIsVisible(this.elements.Modal, 10000);  // custom timeout

// Log output:
// [INFO ] Wait visible → Download Sample File Link
// [PASS ] ✔ Visible → Download Sample File Link
```

#### `waitForElementToDisappear(selector, timeout?)`
Wait until an element disappears (goes hidden). **No auto-heal** — disappearing is correct behaviour.

```typescript
await this.waitForElementToDisappear(this.elements.ImportProgressBarModal);
await this.waitForElementToDisappear(this.elements.LoadingSpinner, 30000);

// Log output:
// [INFO ] Wait disappear → Import Progress Bar Modal
// [PASS ] ✔ Disappeared → Import Progress Bar Modal
```

#### `waitForElementEnabled(selector)`
Wait until an element becomes enabled (not disabled).

```typescript
await this.waitForElementEnabled(this.elements.SubmitButton);
```

#### `waitForURL(url)`
Wait until the browser URL matches a string or regex.

```typescript
await this.waitForURL('/dashboard');
await this.waitForURL(/\/policy\/[0-9]+/);
```

#### `waitForLoadState(state?)`
Wait for a specific page load state.

```typescript
await this.waitForLoadState('load');              // default
await this.waitForLoadState('domcontentloaded');
await this.waitForLoadState('networkidle');
```

#### `waitForTextOnPage(text, timeout?)`
Wait for a text string to appear anywhere on the page.

```typescript
await this.waitForTextOnPage('Import Successful');
await this.waitForTextOnPage(/Members Added/, 15000);
```

#### `waitForTextDisappear(text, timeout?)`
Wait for a text string to disappear from the page.

```typescript
await this.waitForTextDisappear('Loading...');
await this.waitForTextDisappear('Processing data');
```

---

### Assertion Methods

All assertion methods use Playwright's `expect()` with the configured wait timeout. Failures throw immediately and stop the test.

#### `assertElementVisible(selector)`
Assert element is visible on the page.

```typescript
await this.assertElementVisible(this.elements.SuccessMessage);
// Log: [PASS ] ✔ Assert visible → Success Message
```

#### `assertElementHidden(selector)`
Assert element is not visible.

```typescript
await this.assertElementHidden(this.elements.ErrorBanner);
```

#### `assertElementEnabled(selector)` / `assertElementDisabled(selector)`
Assert element is enabled or disabled.

```typescript
await this.assertElementEnabled(this.elements.SaveButton);
await this.assertElementDisabled(this.elements.SubmitButton);
```

#### `assertText(selector, text)`
Assert element has exactly this text.

```typescript
await this.assertText(this.elements.StatusBadge, 'Approved');
await this.assertText(this.elements.Heading, /Welcome/);   // regex supported
```

#### `assertContainsText(selector, text)`
Assert element contains this text (partial match).

```typescript
await this.assertContainsText(this.elements.TitleBar, 'Purchase Order');
```

#### `assertValue(selector, value)`
Assert input field contains this value.

```typescript
await this.assertValue(this.elements.QuantityInput, '10');
```

#### `assertAttributeValue(selector, attribute, value)`
Assert a specific HTML attribute has an expected value.

```typescript
await this.assertAttributeValue(this.elements.Checkbox, 'checked', 'true');
await this.assertAttributeValue(this.elements.Input, 'placeholder', 'Enter email');
```

#### `assertChecked(selector)` / `assertNotChecked(selector)`
Assert checkbox state.

```typescript
await this.assertChecked(this.elements.TermsCheckbox);
await this.assertNotChecked(this.elements.NewsletterCheckbox);
```

#### `assertURL(url)` / `assertTitle(title)`
Assert page URL or title.

```typescript
await this.assertURL(/\/dashboard/);
await this.assertTitle('BenefitNet | Dashboard');
```

#### `assertElementCount(selector, count)`
Assert exactly N elements matching the selector exist.

```typescript
await this.assertElementCount(this.elements.TableRows, 3);
```

#### Soft Assertions — `softAssertVisible()` / `softAssertText()`
Soft assertions collect failures without stopping the test. Call `assertNoSoftErrors()` at the end to throw all collected failures at once.

```typescript
// These do NOT stop the test on failure
await this.softAssertVisible(this.elements.OptionalBanner);
await this.softAssertText(this.elements.Badge, 'New');
await this.softAssertVisible(this.elements.Notification);

// This throws if any of the above failed
this.assertNoSoftErrors();

// Use case: verify multiple optional elements and report all failures together
```

---

### Query Methods (No AutoHeal, No Wait)

These return values instantly without waiting or healing. Use for conditional logic.

#### `isVisible(selector)` → `boolean`
Check if element is visible right now. Returns `true`/`false`, never throws.

```typescript
const isWarningShown = await this.isVisible(this.elements.WarningBanner);
if (isWarningShown) {
  await this.click(this.elements.DismissWarning);
}
```

#### `isEnabled(selector)` → `boolean`

```typescript
const canSubmit = await this.isEnabled(this.elements.SubmitButton);
```

#### `isChecked(selector)` → `boolean`

```typescript
const isSelected = await this.isChecked(this.elements.SelectAll);
```

#### `getText(selector)` → `string`
Get text content of an element. Uses `resolveLocator` (auto-heal enabled).

```typescript
const clientName = await this.getText(this.elements.ClientNameLabel);
log.info(`Client Name captured: ${clientName}`);
```

#### `getInputValue(selector)` → `string`
Get current value of an input field.

```typescript
const currentQty = await this.getInputValue(this.elements.QuantityField);
```

#### `getAttribute(selector, attribute)` → `string | null`
Get value of any HTML attribute.

```typescript
const href = await this.getAttribute(this.elements.DownloadLink, 'href');
const dataId = await this.getAttribute(this.elements.Row, 'data-id');
```

#### `getElementCount(selector)` → `number`
Count matching elements.

```typescript
const rowCount = await this.getElementCount(this.elements.TableRows);
log.info(`Table has ${rowCount} rows`);
```

#### `getDisabledFieldValue(selector)` → `string`
Read value from a disabled or read-only input field. Uses JavaScript evaluation — bypasses Playwright's normal input restrictions.

```typescript
const amount = await this.getDisabledFieldValue(this.elements.TotalAmountField);
log.info(`Total amount: ${amount}`);
```

---

### Runtime Store Methods

Store values during a test and retrieve them later. Useful for capturing dynamic values (IDs, names) and verifying them in later steps.

#### `storeText(selector, key?)` → `string`
Read element text → store in Runtime → return value.

```typescript
// Auto-key (uses element name)
await this.storeText(this.elements.OrderNumber);

// Custom key
const orderNum = await this.storeText(this.elements.OrderNumber, 'OrderNumber');

// Retrieve later (from anywhere in the test)
const stored = Runtime.get('OrderNumber');
```

#### `storeValue(selector, key?)` → `string`
Read input field value → store in Runtime → return value.

```typescript
const qty = await this.storeValue(this.elements.QuantityField, 'Quantity');
```

#### `storeCount(selector, key?)` → `number`
Count elements → store → return count.

```typescript
const count = await this.storeCount(this.elements.TableRows, 'RowCount');
```

#### `storeAttribute(selector, attribute, key?)` → `string`
Read HTML attribute → store → return value.

```typescript
const policyId = await this.storeAttribute(this.elements.PolicyLink, 'data-id', 'PolicyId');
```

---

### Conditional Methods (IF)

Execute actions based on element state. No auto-heal — these only check current state.

#### `ifVisible(selector, thenDo, elseDo?, timeout?)`
Run an action if the element is visible.

```typescript
await this.ifVisible(
  this.elements.NoHrWarningBanner,
  async () => { await this.click(this.elements.DoNotNotifyHrOption); },
  async () => { await this.click(this.elements.NotifyHrOption); }
);
```

#### `ifNotVisible(selector, thenDo, elseDo?, timeout?)`
Run action if element is NOT visible.

```typescript
await this.ifNotVisible(
  this.elements.ConfigIcon,
  async () => { log.info('Config icon not visible — skipping configuration'); }
);
```

#### `ifEnabled(selector, thenDo, elseDo?)`
Run action if element is enabled.

```typescript
await this.ifEnabled(
  this.elements.ProceedButton,
  async () => { await this.click(this.elements.ProceedButton); }
);
```

#### `ifChecked(selector, thenDo, elseDo?)` / `ifUnchecked(selector, thenDo, elseDo?)`
Run action based on checkbox state.

```typescript
await this.ifChecked(
  this.elements.SelectAllCheckbox,
  async () => { log.info('Already checked — skipping'); },
  async () => { await this.check(this.elements.SelectAllCheckbox); }
);
```

#### `ifText(selector, op, expected, thenDo, elseDo?)`
Compare element text using an operator: `==`, `!=`, `contains`, `!contains`, `>`, `>=`, `<`, `<=`

```typescript
await this.ifText(
  this.elements.StatusBadge, '==', 'Approved',
  async () => { log.pass('Status is Approved — proceeding'); },
  async () => { throw new Error('Status not Approved'); }
);

await this.ifText(this.elements.Amount, '>', 1000, async () => {
  log.info('Amount exceeds threshold');
});
```

#### `ifInputValue(selector, op, expected, thenDo, elseDo?)`
Compare input field value with an operator.

```typescript
await this.ifInputValue(this.elements.Quantity, '>', 0, async () => {
  log.pass('Quantity is valid');
});
```

#### `ifPageContainsText(text, thenDo, elseDo?, timeout?)`
Check if specific text exists anywhere on the page.

```typescript
await this.ifPageContainsText('Validation Failed', async () => {
  await this.takeScreenshot('validation_failed');
  throw new Error('Import validation failed unexpectedly');
});
```

#### `ifCount(selector, op, expected, thenDo, elseDo?)`
Compare element count with an operator.

```typescript
await this.ifCount(this.elements.ValidationErrors, '>', 0, async () => {
  log.warn('Validation errors still present');
});
```

#### `ifEmpty(selector, thenDo, elseDo?)`
Check if an input field is empty.

```typescript
await this.ifEmpty(this.elements.SearchBox, async () => {
  await this.fill(this.elements.SearchBox, 'default search');
});
```

#### `ifURL(op, expected, thenDo, elseDo?)`
Check the current page URL.

```typescript
await this.ifURL('contains', '/dashboard', async () => {
  log.pass('Confirmed on dashboard page');
});
```

---

### While Loop Methods

Repeat an action until a condition changes.

#### `whileVisible(selector, doAction, maxIterations?)`
Keep running action while element is visible. Default max: 10 iterations.

```typescript
// Click "Next" button until it disappears (paginate through all pages)
await this.whileVisible(
  this.elements.NextPageButton,
  async () => {
    await this.click(this.elements.NextPageButton);
    await this.waitForLoadState('domcontentloaded');
  },
  20  // max 20 pages
);
```

#### `whileNotVisible(selector, doAction, maxIterations?)`
Keep running action while element is NOT visible.

```typescript
// Wait for success banner to appear (poll with pause)
await this.whileNotVisible(
  this.elements.SuccessBanner,
  async () => { await this.pause(1000); },
  30
);
```

#### `whileEnabled(selector, doAction, maxIterations?)`
Keep running action while element is enabled.

```typescript
await this.whileEnabled(this.elements.ApproveButton, async () => {
  await this.click(this.elements.ApproveButton);
}, 10);
```

#### `closeUntilVisible(closeSelector, targetSelector, maxAttempts?)`
Click a close button repeatedly until a target element becomes visible. Stops automatically when: target appears, close button disappears, or max attempts reached.

```typescript
// Close panels one by one until the final status element is visible
await this.closeUntilVisible(
  this.elements.ClosePanel,
  this.elements.ApprovedStatus,
  5
);
```

---

### Special Methods

#### `retryAction(action, maxRetries?, delayMs?, label?)`
Retry any async action with exponential backoff. Use for unstable UI elements or network-dependent operations.

```typescript
await this.retryAction(
  async () => {
    await this.click(this.elements.UnstableButton);
    await this.assertElementVisible(this.elements.ConfirmDialog);
  },
  3,      // max 3 attempts
  1000,   // 1 second between attempts
  'click unstable button and confirm'
);
```

#### `waitForAPIResponse(urlPattern, action)` → `{ status, body }`
Intercept an API call triggered by a UI action and return the response.

```typescript
const { status, body } = await this.waitForAPIResponse(
  '/api/members/import',
  async () => { await this.click(this.elements.ImportButton); }
);
log.info(`Import API status: ${status}`);
log.info(`Members imported: ${body.count}`);
```

#### `mockAPIResponse(urlPattern, responseBody, status?)`
Mock an API endpoint to return fake data.

```typescript
await this.mockAPIResponse('/api/products', { items: [] }, 200);
// All subsequent calls to /api/products will return { items: [] }
```

#### `blockRequest(urlPattern)`
Block a network request entirely.

```typescript
await this.blockRequest('/api/analytics');  // stop analytics calls during tests
```

#### `acceptDialog(promptText?)` / `dismissDialog()`
Handle browser `alert()`, `confirm()`, or `prompt()` dialogs. **Must be called BEFORE the action that triggers the dialog.**

```typescript
// Accept a confirm dialog
this.acceptDialog();
await this.click(this.elements.DeleteButton);  // this triggers the dialog

// Accept a prompt dialog with input
this.acceptDialog('My input text');
await this.click(this.elements.RenameButton);

// Dismiss a dialog
this.dismissDialog();
await this.click(this.elements.DeleteButton);
```

#### `switchToFrame(selector)` → `FrameLocator` / `switchToMainFrame()`
Switch context into an iframe and back.

```typescript
const frame = await this.switchToFrame(this.elements.EmailContentIframe);
// Now use frame.locator() to interact inside the iframe

await this.switchToMainFrame();  // return to main page context
```

#### `uploadFile(selector, filePaths)` / `clearFileUpload(selector)`
Set files on a `<input type="file">` element.

```typescript
await this.uploadFile(this.elements.FileInput, 'test-results/downloads/ImportMembers.xlsx');

// Multiple files
await this.uploadFile(this.elements.ZipInput, ['file1.pdf', 'file2.pdf']);

// Clear selection
await this.clearFileUpload(this.elements.FileInput);
```

#### `fillDatePicker(selector, date)`
Smart date field handler. Automatically detects calendar popup vs plain text input and handles both.

```typescript
await this.fillDatePicker(this.elements.AdditionDateField, '22/06/2026');
// Tries calendar popup first, falls back to direct text input
```

#### `waitForSuccessToast()` / `waitForErrorToast()` → `string`
Wait for a toast notification and return its message text.

```typescript
const msg = await this.waitForSuccessToast();
expect(msg).toContain('Members imported successfully');

const errMsg = await this.waitForErrorToast();
log.warn(`Error toast: ${errMsg}`);
```

#### Table Helpers

```typescript
// Count rows in a table
const count = await this.getTableRowCount(this.elements.MembersTable);

// Get text from cell at [row 0][column 2]
const cell = await this.getTableCellText(this.elements.Table, 0, 2);

// Click row containing specific text
await this.clickTableRowByText(this.elements.Table, 'EMP147933');
```

#### Storage and Cookies

```typescript
// Cookies
const token = await this.getCookie('auth_token');
await this.clearCookies();

// LocalStorage
const userId = await this.getLocalStorageItem('user_id');
await this.setLocalStorageItem('theme', 'dark');
await this.clearLocalStorage();
```

#### Screenshot Methods

```typescript
// Full page screenshot
await this.takeScreenshot('after_import');
// Saves to: test-results/screenshots/after_import_<timestamp>.png

// Single element screenshot
await this.takeElementScreenshot(this.elements.ErrorTable, 'validation_errors');
```

#### Miscellaneous

```typescript
const url   = this.getCurrentURL();
const title = await this.getTitle();
const page  = this.getPage();          // raw Playwright page object

// Execute JavaScript in browser
await this.executeScript("document.body.style.zoom = '0.5'");
const title = await this.executeScript<string>("return document.title");

// Scroll
await this.scrollToElement(this.elements.Footer);
await this.scrollToTop();
await this.scrollToBottom();
await this.scrollBy(0, 500);     // scroll down 500px

// Pause (use sparingly — prefer wait methods)
await this.pause(300);

// Highlight element (only in DEBUG=true mode)
await this.highlight(this.elements.SubmitButton, 'red');
```

---

## 8. Module Methods Layer

Module method classes extend `BasePage` and group related business workflows. They call `basePage` interaction methods and element locators together.

### Structure Pattern

```typescript
import { Page } from '@playwright/test';
import { BasePage } from '@pages/basePage';
import { ClientElements } from '@pages/elements/client';
import { logger as log } from 'src/helpers/logger';

export class ClientPage extends BasePage {
  private clientPageElements: ClientElements;

  constructor(page: Page) {
    super(page);
    this.clientPageElements = new ClientElements(page);
  }

  async openAddMembersBulkForm(): Promise<void> {
    await this.waitForElementIsVisible(this.clientPageElements.AddMembersBulkButton);
    await this.hover(this.clientPageElements.AddMembersBulkButton);
    await this.click(this.clientPageElements.AddMembersBulkButton);
    await this.waitForElementIsVisible(this.clientPageElements.DownloadSampleFileLink);
  }
}
```

### Available Module Method Classes

| Class | File | Responsibilities |
|---|---|---|
| `LoginPage` | `loginPage.ts` | Login, logout, verify dashboard |
| `ClientPage` | `clientPage.ts` | Navigate to client, open bulk import, write Excel, upload census, capture validation errors, assert resolution, proceed to import |
| `EmailLogPage` | `emailPage.ts` | Navigate to email logs, filter by client/policy, verify notification content, download attachment, verify attachment rows |
| `ReportPage` | `reportPage.ts` | Navigate to reports, export workflow logs Excel, export consolidated membership Excel, verify member rows |

### Using in a Spec

```typescript
let loginPage:   LoginPage;
let clientPage:  ClientPage;
let emailLogPage: EmailLogPage;
let reportPage:   ReportPage;

test.beforeEach(async ({ page }) => {
  loginPage    = new LoginPage(page);
  clientPage   = new ClientPage(page);
  emailLogPage = new EmailLogPage(page);
  reportPage   = new ReportPage(page);
});
```

---

## 9. Test Data Management

### `benefitnet_test_data.json` — Data File Structure

The JSON file contains three sections:

**Column Schema** — defines all 53 BenefitNet Excel columns:
```json
{
  "excelHeader": "First Name (*)",
  "fieldKey": "firstName",
  "mandatory": true,
  "inputType": "text"
}
```

**Test Profiles** — named datasets:

| Profile Name | Purpose |
|---|---|
| `User Profile 1 - Male Principal Member (Round 1 Partial)` | Intentionally incomplete — triggers validation |
| `User Profile 1 - Male Principal Member (Round 2 Full)` | Complete 31-field — resolves validation |
| `User Profile 2 - Female Principal Member (Round 1 Partial)` | Female Round 1 |
| `User Profile 2 - Female Principal Member (Round 2 Full)` | Female Round 2 |
| `Login - Valid Credentials` | Valid login |
| `Login - Invalid Password` | Negative login test |

**Default Values** — fallback dropdown values (nationality, city, work area, etc.)

### `testDataManager.ts` — Data Access

```typescript
import { testDataManager as tdm } from 'test-data/testDataManager';

// Get a named profile
const profile = tdm.getProfile('User Profile 1 - Male Principal Member (Round 2 Full)');

// Generate unique runtime data per member
const runtimeData = tdm.generateRuntimeDataForGender('Male');
// Returns: { firstName, lastName, employeeNumber, uidNumber, fileNumber,
//            nationalIdNumber, passportNumber, phoneNumber, email, dateOfBirth, additionDate }

// Resolve {{placeholders}} with actual runtime values
const resolved = tdm.resolvePlaceholders(profile.memberData, runtimeData, policyCategory);

// Build Excel column map from resolved data
const excelRow = tdm.buildExcelRow(resolved);
// Returns: { 'First Name (*)': 'Sysla', 'Last Name (*)': 'Test49470', ... }

// Get profiles by round for dynamic multi-gender iteration
const profileName = getProfileNameByGender('Male', 1, 'Partial');  // Round 1
const profileName = getProfileNameByGender('Male', 2, 'Full');      // Round 2
```

### Runtime Data Format

Every test run generates unique values:

| Field | Format | Example |
|---|---|---|
| `lastName` | `Test` + 5 random digits | `Test49470` |
| `employeeNumber` | `EMP` + 6 random digits | `EMP147933` |
| `uidNumber` | 9 digits only | `638673242` |
| `fileNumber` | 9 digits only | `292792097` |
| `nationalIdNumber` | `NID` + 9 digits | `NID301433258` |
| `passportNumber` | Letter + 7 digits | `V9495543` |
| `phoneNumber` | UAE mobile format | `0538046018` |
| `email` | `syslatech_NNN@yopmail.com` | `syslatech798121@yopmail.com` |
| `dateOfBirth` | `DD/MM/YYYY` | `02/08/1975` |
| `additionDate` | Current date IST | `22/06/2026` |

---

## 10. Logger — All Log Methods

The logger writes to **console** (color-coded, no timestamp) and **file** (IST-timestamped, `logs/test-run-YYYY-MM-DD.log`).

```typescript
import { logger as log } from 'src/helpers/logger';
```

### Log Level Labels

All labels are exactly 10 characters for column alignment:

```
[TC_START]  [TC_END  ]  [STEP    ]  [PASS    ]  [FAIL    ]
[ERROR   ]  [WARN    ]  [SECTION ]  [VALIDATE]  [DATA    ]
[FILE    ]  [API     ]  [TABLE   ]  [INFO    ]  [DEBUG   ]
```

### Test Lifecycle

```typescript
// Start banner — call at the beginning of every test
log.tcStart('REG_TS01_TC01', 'should add 3 principal members via bulk import...');

// End banner — call at the end of every test
log.tcEnd('PASS');   // or 'FAIL'
```

### Step Methods

```typescript
// Business step boundary — ONLY in spec files, not in basePage or module methods
// Increments step counter, shows elapsed time since previous step
log.step('STEP 1: Login to application with valid broker credentials');

// Step success
log.stepPass('STEP 1: Login successful');

// Step failure with screenshot — stops the test
await log.stepFail(page, 'STEP 1: Login failed');
```

### Standard Log Methods

```typescript
// General informational — UI actions in basePage
log.info('Click → Login Button');
log.info('Dropdown selected: "Show in Pending Tasks"');

// Warning — non-fatal issues
log.warn('Config icon not visible — skipping configuration');

// Error — before throwing
log.error('FAILURE in [REG_TS01_TC01]: element not found');

// Pass — action-level success
log.pass('Clicked → Login Button');

// Fail — inline failure without screenshot
log.fail('Validation comment mismatch for Member 2');

// Debug — verbose, hidden when LOG_LEVEL=INFO
log.debug('Wait: loadState → load');
log.debug('LoadState reached in 145ms');
```

### Specialised QA Methods

```typescript
// Named data value
log.data('Member 1', 'Sysla Test49470 | EmpNo: EMP147933');
log.data('Loan Amount', '$300,000');
log.data('Runtime Data', { firstName: 'Sysla', lastName: 'Test49470' });

// File operation
log.file('Downloaded: ImportMembers_22-6-2026.xlsx (130 KB)');
log.file('Saved to: C:\\path\\downloads\\MemberList.xlsx');

// Validation — expected vs actual with verdict
log.validate('Last Name',    'Test49470', 'Test49470', true);    // PASS
log.validate('Marital Status', 'Married', 'Single',   false);   // FAIL
log.validate('Employee No', 'EMP147933', 'EMP147933');           // no verdict

// API call
log.api('POST /loans/create', 201, 'loanId: 52935a6b');
log.api('GET /token', 200);
```

### Section Grouping

Use `section()` and `sectionEnd()` to visually group related log lines:

```typescript
for (let i = 0; i < NUMBER_OF_MEMBERS; i++) {
  log.section(`Verifying Member ${i + 1} — ${member.lastName}`);

  // ... verification steps ...

  log.sectionEnd(`Verifying Member ${i + 1} — ${member.lastName}`);
}

// Log output:
// [SECTION ] ┌─ Verifying Member 1 — Test49470 ─────────────────────
// [VALIDATE] Last Name | Expected: "Test49470" | Actual: "Test49470" | ✔ PASS
// [SECTION ] └─ Verifying Member 1 — Test49470 — done
```

### Table Logging

```typescript
log.table([
  { Field: 'Last Name',   Expected: 'Test49470', Actual: 'Test49470', Result: 'PASS' },
  { Field: 'Employee No', Expected: 'EMP147933', Actual: 'EMP147933', Result: 'PASS' },
  { Field: 'Marital',     Expected: 'Married',   Actual: 'Single',    Result: 'FAIL' },
]);
```

### Summary

Call before `log.tcEnd()` to print a pass/fail/warn count summary:

```typescript
log.summary();
log.tcEnd('PASS');
```

### Failure Capture

```typescript
// In the outer catch block of every test
await log.captureOnFailure(page, TC_TITLE, e);

// Captures:
// - Error message and stack trace (first 3 frames)
// - Full-page screenshot
// - Paths to video and trace files
```

### Log Level Control

```env
LOG_LEVEL=DEBUG   # show all (default)
LOG_LEVEL=INFO    # hide DEBUG lines
LOG_LEVEL=WARN    # hide DEBUG and INFO lines
```

---

## 11. FileUtils — Excel and File Handling

```typescript
import { FileUtils } from 'src/helpers/fileUtils';
```

### TC-Scoped Download Management

All downloads are organized by test case ID to prevent file collisions in parallel runs.

```typescript
// Set at the start of every test
FileUtils.setTestContext('REG_TS01_TC01');
// All downloads now go to: test-results/downloads/REG_TS01_TC01/

// Clear at the end
FileUtils.clearTestContext();
FileUtils.clearExcelStepHistory('REG_TS01_TC01');
```

### Excel Step Snapshots

Capture Excel state between import rounds and automatically diff changes.

```typescript
// Capture snapshot with label
await FileUtils.captureExcelStep(
  filePath,
  'Incomplete Census — mandatory field validation trigger',
  'REG_TS01_TC01'
);

// Second call compares against first
await FileUtils.captureExcelStep(
  updatedFilePath,
  'Complete Census — all mandatory fields resolved',
  'REG_TS01_TC01'
);

// Snapshot files saved to:
// test-results/downloads/REG_TS01_TC01/steps/01_ImportMembers_....xlsx
// test-results/downloads/REG_TS01_TC01/steps/02_ImportMembers_....xlsx

// How it works:
// - Uses XlsxPopulate to count actual populated rows (not total allocated rows)
// - If ≤ 500 rows: reads data and diffs against previous snapshot
// - If > 500 rows (report export): saves snapshot only — skips diff to prevent hang
```

### Excel Read

```typescript
// Read all rows from an Excel file as array of objects
const rows = await FileUtils.readExcel(filePath, 'Sheet1');
// Returns: [{ 'First Name (*)': 'Sysla', 'Last Name (*)': 'Test49470', ... }, ...]

// Find a specific row by Employee Number
const memberRow = rows.find(r => r['Employee Number'] === 'EMP147933');
```

---

## 12. AutoHeal Engine

`src/utils/autoHeal.ts` — automatically recovers from DOM changes without manual test fixes.

### How It Works

When `resolveLocator()` cannot find an element, it fires AutoHeal which tries 9 strategies in order:

```
Strategy 1: primary          — retry the original locator (timing issue)
Strategy 2: getByRole        — find by ARIA role + accessible name
Strategy 3: getByLabel       — find by associated label text
Strategy 4: getByPlaceholder — find by placeholder attribute
Strategy 5: getByText        — find by visible text content
Strategy 6: CSS              — find by class name similarity
Strategy 7: XPath            — alternative XPath expressions
Strategy 8: DOM Similarity   — find structurally similar element
Strategy 9: Relative XPath   — find by position relative to nearby elements
```

### What You See in Logs

```
[WARN    ] [AutoHeal] "Login Button" not visible after 60000ms — attempting heal
[WARN    ] [AutoHeal] Healed via [getByRole] → Login Button
[PASS    ] ✔ Clicked → Login Button
```

### What to Do After AutoHeal

When you see a heal in the logs, update the locator in the elements file:

```typescript
// Old locator (that failed)
this.page.locator('//button[@class="old-btn-class"]')

// New locator (what AutoHeal found)
this.page.getByRole('button', { name: 'Login' })
```

### AutoHeal vs No AutoHeal

| Method | AutoHeal |
|---|---|
| `click`, `fill`, `type`, `hover`, `check`, `press`, `getText` | ✔ Yes |
| `waitForElementIsVisible` | ✔ Yes |
| `waitForElementToDisappear` | ✘ No — disappearing IS correct |
| `isVisible`, `isEnabled`, `isChecked` | ✘ No — instant state check |
| `ifVisible`, `ifEnabled`, `whileVisible` | ✘ No — conditional check only |

---

## 13. Error Handler and Retry Utils

### `ErrorHandler.handle()`

Wraps any async operation with centralized error logging, context tagging, and error classification.

```typescript
import { ErrorHandler } from 'src/utils/errorHandler';

// Used inside every BasePage method automatically
return ErrorHandler.handle<this>(async () => {
  // your action here
  return this;
}, { context: 'BasePage.click (Login Button)' });
```

You never call `ErrorHandler` directly in specs. It's used internally by `BasePage`.

### `RetryUtils`

Provides exponential backoff retry. Used internally by `BasePage.retryAction()`.

```typescript
// Called via basePage
await this.retryAction(
  async () => { await this.click(this.elements.FlakyButton); },
  3,      // attempts
  1000,   // initial delay (doubles each attempt: 1s, 2s, 4s)
  'click flaky button'
);
```

---

## 14. Runtime Store

In-memory key-value store that persists values during a single test run.

```typescript
import { Runtime } from 'src/utils/runtimeStore';

// Set a value
Runtime.set('ClientName', 'Syslatech_TestClient1');
Runtime.set('PolicyName', 'MedicalPolicy1_Syslatech_TestClient1');

// Get a value
const clientName = Runtime.get('ClientName');

// Check if key exists
if (Runtime.has('PolicyName')) { ... }

// Delete a key
Runtime.delete('TempValue');

// Clear all (call in afterAll or afterEach)
Runtime.clear();
```

**Where it's used:** `storeText()`, `storeValue()`, `storeCount()`, `storeAttribute()` on BasePage all write to Runtime automatically. The `capturedClientName` and `capturedMedicalPolicyName` in `clientPage.ts` use this pattern.

---

## 15. Reports and Artifacts

### Generated After Every Run

| Path | Contains | How to Open |
|---|---|---|
| `playwright-report/index.html` | Interactive HTML report | `npx playwright show-report` |
| `allure-report/index.html` | Allure trend report | `npx allure open allure-report` |
| `logs/test-run-YYYY-MM-DD.log` | IST-timestamped log | Any text editor |
| `test-results/screenshots/` | Failure PNGs | Open directly |
| `test-results/downloads/REG_TS01_TC01/` | Downloaded Excel files | Open in Excel |
| `test-results/downloads/REG_TS01_TC01/steps/` | Census snapshots per round | Open in Excel |
| `reports/html-reports-zip/` | ZIP of full run | Extract → open `playwright-report/index.html` |

### Sending the Report by Email

```bash

# Install these 3 dependencies
npm install archiver nodemailer dotenv

# Manual trigger
node reports/send-email.js

# Automatic after every run
# Set in .env: AUTO_SEND_EMAIL=true
```

### Viewing a Trace File (Most Detailed Debugging Tool)

```bash
npx playwright show-trace test-results/<folder>/trace.zip
```

The trace shows every browser action with before/after screenshots, network calls, console logs, and exact timing.

---

## 16. Writing a New Test Case

### Step 1 — Create the spec file

```typescript
// tests/e2e/reg_ts01_tc03_yourTestName.spec.ts

import { test } from '@playwright/test';
import { LoginPage } from 'src/modules-methods/loginPage';
import { ClientPage } from 'src/modules-methods/clientPage';
import { qaConfig } from 'src/config/env.qa';
import { logger as log } from 'src/helpers/logger';
import { FileUtils } from 'src/helpers/fileUtils';

const TC_ID    = 'REG_TS01_TC03';
const TC_TITLE = 'should do something specific';

test.describe('Your Suite Name', () => {

  let loginPage: LoginPage;
  let clientPage: ClientPage;

  test.beforeEach(async ({ page }) => {
    loginPage  = new LoginPage(page);
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

      log.step('STEP 1: Login to application');
      try {
        await loginPage.loginToBenefitNetApplication(
          qaConfig.baseURL,
          qaConfig.credentials.username,
          qaConfig.credentials.password
        );
        log.stepPass('STEP 1: Login successful');
      } catch (e) {
        await log.stepFail(page, 'STEP 1: Login failed');
        throw e;
      }

      // ... add more steps

      log.tcEnd('PASS');

    } catch (e) {
      await log.captureOnFailure(page, TC_TITLE, e);
      log.tcEnd('FAIL');
      throw e;
    }
  });
});
```

### Step 2 — Add new locators if needed

```typescript
// src/pages/elements/client.ts
get MyNewButton(): Locator {
  return this.named('My New Button',
    this.page.locator('//button[@id="myBtn"]'));
}
```

### Step 3 — Add module method if needed

```typescript
// src/modules-methods/clientPage.ts
async clickMyNewButton(): Promise<void> {
  await this.waitForElementIsVisible(this.clientPageElements.MyNewButton);
  await this.click(this.clientPageElements.MyNewButton);
}
```

### Step 4 — Run and verify

```bash
npx playwright test tests/e2e/reg_ts01_tc03 --headed
```

---

## 17. Coding Standards

### `log.step()` is ONLY for spec files

```typescript
// CORRECT — in spec file
log.step('STEP 1: Login to application');

// WRONG — in basePage or module method (breaks step counter)
log.step(`Click → ${name}`);   // use log.info() instead
```

### Always use `named()` for locators

```typescript
// CORRECT
return this.named('Login Button', this.page.locator('#loginBtn'));

// WRONG
return this.page.locator('#loginBtn');
```

### Never hardcode member count

```typescript
//  CORRECT
for (let i = 0; i < NUMBER_OF_MEMBERS; i++) { ... }

// WRONG
for (let i = 0; i < 3; i++) { ... }
```

### Use `let` before `try`, never `var`

```typescript
// CORRECT
let uiErrors: Map<number, MemberValidationResult> = new Map();
try {
  uiErrors = await clientPage.getValidationErrorsPerMember();
} catch (e) { ... }

// WRONG
try {
  var uiErrors = await clientPage.getValidationErrorsPerMember();
} catch (e) { ... }
// using uiErrors here — var leaks but is undefined if try failed
```

### Optional chaining on all external data access

```typescript
// CORRECT
memberResult?.requiredFieldErrors?.join(', ') ?? 'none'

// WRONG — crashes if memberResult is undefined
memberResult.requiredFieldErrors.join(', ')
```

### Set TC context for all downloads

```typescript
// CORRECT — at start of test
FileUtils.setTestContext('REG_TS01_TC01');

// CORRECT — at end of test
FileUtils.clearTestContext();
FileUtils.clearExcelStepHistory('REG_TS01_TC01');
```

### Spec structure: always try/catch per step

```typescript
// CORRECT
log.step('STEP 2: Navigate to client policy');
try {
  await clientPage.navigateToClientsViasidebar();
  log.stepPass('STEP 2: Navigation successful');
} catch (e) {
  await log.stepFail(page, 'STEP 2: Navigation failed');
  throw e;  // always rethrow
}
```

### Never skip a layer

```typescript
// WRONG — spec touching locators directly
await page.locator('//button[@id="btnSubmit"]').click();

// WRONG — module method bypassing basePage
await this.page.click('//button[@id="btnSubmit"]');

// CORRECT flow
// Elements file → Module method calls basePage → basePage uses elements
```

---

*Framework Version: 2.0.0 | Last Updated: June 2026 | Target: demo.benefitnet.com*
