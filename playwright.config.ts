import path from 'path';
import { defineConfig } from '@playwright/test';
import { configManager } from './src/config/env.index';
import './src/utils/runtimeGlobal';

const baseURL = configManager.getBaseURL();
const browserConf = configManager.getBrowserConfig();
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 1_800_000,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 0,        // ← fixed: was isCI ? 1 : 0 — retries create extra browser contexts = extra video files
  workers: isCI ? 3 : 4,

  expect: {
    timeout: 25_000,
  },

  use: {
    baseURL,
    headless: isCI ? true : browserConf.headless,
    viewport: { width: 1920, height: 1080 },
    launchOptions: isCI
      ? {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--force-device-scale-factor=0.9',
          '--window-size=1920,1080',
        ],
      }
      : {
        args: [
          '--start-maximized',
          '--window-size=1920,1080',
          '--force-device-scale-factor=0.9',
        ],
      },

    actionTimeout: configManager.getTimeout('action'),
    navigationTimeout: configManager.getTimeout('navigation'),

    screenshot: 'only-on-failure',
    video: 'on',    // ← fixed: was { mode: 'on', size: ... } — 'on' records every context including retries = 2 videos
    trace: 'on',    // saves trace only on failure
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--force-device-scale-factor=0.9',
            '--window-size=1920,1080',
          ],
        },
      },
    },
  ],

  reporter: [
    // ── 'line' reporter — shows logger output line-by-line in console (local + CI)
    // This is what makes your [STEP] [PASS] [INFO] logs appear in the terminal
    // Do NOT use 'list' — it suppresses custom logger output
    ['line'],

    // ── HTML report — always generated, open with: npx playwright show-report
    ['html', { outputFolder: 'playwright-report', open: 'never' }],

    // ── Allure report — generate with: npx allure generate allure-results
    ['allure-playwright', { outputFolder: 'allure-results' }],

    // ── ZIP generator + optional email (local + CI)
    // Set AUTO_SEND_EMAIL=true in .env to auto-send after every run
    [path.join(__dirname, 'reports/qa-reporter.js')],
  ],
});