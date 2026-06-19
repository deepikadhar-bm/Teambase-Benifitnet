# Advanced Testing Guide - MakeMyTrip Automation Framework

## 🎯 Overview

This document provides comprehensive guidance for using the advanced MakeMyTrip Playwright automation framework.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Page Object Model Architecture](#page-object-model-architecture)
3. [Writing Tests](#writing-tests)
4. [Advanced Features](#advanced-features)
5. [Debugging & Troubleshooting](#debugging--troubleshooting)
6. [Performance Tips](#performance-tips)
7. [Integration Examples](#integration-examples)

---

## Getting Started

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Create .env file
cp .env.example .env

# 4. Run tests
npm test
```

### Verify Installation

```bash
# Generate test report
npm run test:report

# Run single test
npx playwright test -g "Verify Home Page loads"
```

---

## Page Object Model Architecture

### Understanding POM

The Page Object Model is a design pattern that:
- **Encapsulates** page elements and interactions
- **Centralizes** locators for easy maintenance
- **Improves** code reusability across tests
- **Simplifies** updates when UI changes

### Layer Structure

```
Test File (booking.spec.ts)
    ↓
Page Object (BookingPage)
    ↓
Base Page (BasePage)
    ↓
Playwright API
    ↓
Browser
```

### BasePage - Core Methods

```typescript
// BasePage provides 30+ methods for all tests

// Navigation
await page.navigateTo(url);           // Go to URL
await page.reloadPage();              // Refresh page
await page.goBack();                  // Go back

// Wait Strategies
await page.waitForElement(selector);  // Wait for element visibility
await page.delay(ms);                 // Wait specific time

// User Interactions
await page.click(selector);           // Click element
await page.fillText(selector, text);  // Fill input field
await page.typeText(selector, text);  // Type with delay

// Assertions
const visible = await page.isElementVisible(selector);
const text = await page.getText(selector);
const count = await page.getElementCount(selector);
```

---

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '../fixtures/fixtures';
import { HomePage } from '../pages/homePage';
import { formatDateForMakeMyTrip, getDateAfterDays } from '../utils/helpers';

test.describe('Flight Search Tests', () => {
  test('Search one-way flight from Delhi to Mumbai', async ({ page }) => {
    // Arrange - Prepare test data
    const homePage = new HomePage(page);
    const departDate = formatDateForMakeMyTrip(getDateAfterDays(7));
    
    // Act - Perform actions
    await homePage.navigateTo('https://www.makemytrip.com');
    await homePage.searchOneWayFlight('Delhi', 'Mumbai', departDate);
    
    // Assert - Verify results
    const url = await homePage.getPageURL();
    expect(url).toContain('search');
  });
});
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
test('Complete booking flow', async ({ page }) => {
  // ===== ARRANGE =====
  const homePage = new HomePage(page);
  const searchPage = new SearchPage(page);
  const bookingPage = new BookingPage(page);
  const departDate = formatDateForMakeMyTrip(getDateAfterDays(7));

  // ===== ACT =====
  await homePage.navigateTo('https://www.makemytrip.com');
  await homePage.searchOneWayFlight('Delhi', 'Mumbai', departDate);
  await page.waitForTimeout(2000);
  
  await searchPage.selectFlightByIndex(0);
  await page.waitForTimeout(3000);
  
  const passenger = {
    firstName: 'Raj',
    lastName: 'Kumar',
    email: 'raj@test.com',
    phone: '9876543210'
  };
  await bookingPage.enterPassengerDetails(passenger, 1);

  // ===== ASSERT =====
  expect(page.url()).toBeTruthy();
  const isConfirmed = await bookingPage.isBookingConfirmed();
  expect(isConfirmed).toBe(true);
});
```

### Data-Driven Tests

```typescript
const testData = [
  { from: 'Delhi', to: 'Mumbai', date: 7 },
  { from: 'Bangalore', to: 'Hyderabad', date: 5 },
  { from: 'Pune', to: 'Delhi', date: 10 }
];

testData.forEach(({ from, to, date }) => {
  test(`Search flight from ${from} to ${to}`, async ({ page }) => {
    const homePage = new HomePage(page);
    const departDate = formatDateForMakeMyTrip(getDateAfterDays(date));
    
    await homePage.navigateTo('https://www.makemytrip.com');
    await homePage.searchOneWayFlight(from, to, departDate);
    
    const url = await homePage.getPageURL();
    expect(url).toContain('search');
  });
});
```

---

## Advanced Features

### 1. Custom Fixtures

```typescript
// fixtures/fixtures.ts - Custom test setup

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.navigateTo('https://www.makemytrip.com');
    await use(homePage);
    // Cleanup if needed
  },
  
  searchPage: async ({ page }, use) => {
    const searchPage = new SearchPage(page);
    await use(searchPage);
  }
});
```

### 2. Global Setup/Teardown

```typescript
// globalSetup.ts
export async function globalSetup() {
  console.log('🚀 Starting Test Suite');
  // Initialize database, mock servers, etc.
}

// globalTeardown.ts
export async function globalTeardown() {
  console.log('✅ Test Suite Completed');
  // Cleanup resources
}
```

### 3. Advanced Filtering

```typescript
test('Complex flight search with multiple filters', async ({ page }) => {
  const searchPage = new SearchPage(page);
  
  // Apply multiple filters
  await searchPage.filterByPrice(5000, 20000);
  await searchPage.filterByAirline('IndiGo');
  await searchPage.filterByDepartureTime('Early Morning');
  await searchPage.filterByStops('Non Stop');
  
  // Sort results
  await searchPage.sortResults('priceAsc');
  
  // Select result
  const results = await searchPage.getFlightResults();
  expect(results.length).toBeGreaterThan(0);
});
```

### 4. Screenshot & Video Capture

```typescript
test('Capture screenshots on failure', async ({ page }) => {
  const homePage = new HomePage(page);
  
  try {
    await homePage.navigateTo('https://www.makemytrip.com');
    // Test logic...
  } catch (error) {
    await homePage.takeScreenshot('failure_screenshot');
    throw error;
  }
});

// Configured automatically in playwright.config.ts:
// screenshot: 'only-on-failure'
// video: 'retain-on-failure'
```

### 5. Logging & Reporting

```typescript
test('Test with comprehensive logging', async ({ page }) => {
  const homePage = new HomePage(page);
  
  logger.info('Starting home page navigation');
  await homePage.navigateTo('https://www.makemytrip.com');
  logger.pass('Home page loaded successfully');
  
  logger.info('Searching for flights');
  await homePage.searchOneWayFlight('Delhi', 'Mumbai', '15/12/2024');
  logger.pass('Flight search completed');
  
  const url = await homePage.getPageURL();
  expect(url).toContain('search');
});
```

---

## Debugging & Troubleshooting

### 1. Debug Mode

```bash
# Run tests with inspector
npm run test:debug

# Keyboard shortcuts:
# s - step over
# c - continue
# p - step into
```

### 2. Headed Mode Debugging

```bash
# See the browser while tests run
npm run test:headed

# Add --headed to specific test
npx playwright test src/tests/home.spec.ts --headed
```

### 3. Verbose Logging

```bash
# Enable debug mode
DEBUG=pw:api npx playwright test

# Enable trace viewer
npx playwright show-trace trace.zip
```

### 4. Common Issues

**Issue: Element not found**
```typescript
// ❌ Wrong - Brittle selector
await page.click('.button-xyz');

// ✅ Correct - Descriptive selector
await page.click('[data-testid="search-button"]');
```

**Issue: Timeout errors**
```typescript
// ❌ Wrong - Hard wait
await page.waitForTimeout(5000);

// ✅ Correct - Explicit wait
await page.waitForSelector('[data-testid="results"]', { timeout: 10000 });
```

**Issue: Flaky tests**
```typescript
// ❌ Wrong - No wait for navigation
await page.click(selector);
const url = await page.getPageURL();

// ✅ Correct - Wait for navigation
await page.clickAndWait(selector);
const url = await page.getPageURL();
```

---

## Performance Tips

### 1. Parallel Execution

```bash
# Run 4 workers in parallel
npm run test:parallel

# Configured in playwright.config.ts:
workers: 4
fullyParallel: true
```

### 2. Efficient Waits

```typescript
// ❌ Slow - Multiple sequential waits
await page.waitForTimeout(1000);
await page.waitForSelector(selector);
await page.waitForTimeout(1000);

// ✅ Fast - Single optimized wait
await page.waitForSelector(selector, { timeout: 10000 });
```

### 3. Test Retries (CI Only)

```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0  // Retry failed tests on CI
```

### 4. Resource Optimization

```typescript
// playwright.config.ts
use: {
  headless: true,        // Run without UI
  actionTimeout: 5000,   // Quick timeout
  navigationTimeout: 30000  // Page load timeout
}
```

---

## Integration Examples

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        run: npx playwright test --project=${{ matrix.browser }}
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
```

### Test Report Publishing

```bash
# Generate reports after tests
npm test

# View HTML report
npm run test:report

# JUnit XML for CI integration
# Located at: test-results/junit.xml
```

---

## Best Practices Summary

✅ **DO:**
- Use Page Object Model for all tests
- Write descriptive test names
- Use explicit waits instead of hard waits
- Log important test actions
- Keep tests independent and isolated
- Use data-driven testing for similar scenarios
- Add appropriate timeouts for network operations
- Capture screenshots on failures

❌ **DON'T:**
- Hard-code waits like `waitForTimeout(5000)`
- Mix assertions with page interactions
- Create tightly coupled tests
- Use global variables in tests
- Forget to handle async/await
- Ignore test failures in CI
- Skip logging and reporting

---

## Quick Reference

### Running Tests

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:headed` | Run with visible browser |
| `npm run test:debug` | Run in debug mode |
| `npm run test:chrome` | Run on Chrome only |
| `npm run test:parallel` | Run with 4 workers |
| `npm run test:report` | Show HTML report |

### Important Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Main Playwright configuration |
| `src/pages/basePage.ts` | Base methods for all pages |
| `src/utils/helpers.ts` | Utility functions |
| `src/utils/testData.ts` | Test data & constants |
| `.env.example` | Environment variables template |

---

**Last Updated:** November 2024  
**Framework Version:** 2.0.0  
**Playwright Version:** 1.45.0+
