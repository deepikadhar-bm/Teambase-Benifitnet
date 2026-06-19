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
  forbidOnly: !!process.env.CI,
  retries: isCI ? 1 : 0,
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
    video: 'on',
    trace: 'on',
  },

  projects: [
    // {
    //   name: 'project-name',
    //   testDir: './tests/ext-web',
    //   testMatch: ['**/folder-name/**/*.spec.ts'],
    // },
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
            // slowMo: 1500,
          ],
        },
      },
    },
  ],

  reporter: isCI
    ? [
      ['html', { outputFolder: 'playwright-report', open: 'never' }],
      [path.join(__dirname, 'reports/qa-reporter.js')],
      ['list'],
      ['allure-playwright', { outputFolder: 'allure-results' }],
    ]
    : [
      ['html', { open: 'never' }],
      ['allure-playwright', { outputFolder: 'allure-results' }],
    ],
});









// import { defineConfig } from "@playwright/test";
// import { configManager } from "./src/config/env.index";
// import "./src/utils/runtimeGlobal";

// const baseURL = configManager.getBaseURL();
// const browserConf = configManager.getBrowserConfig();

// const isCI = !!process.env.CI;

// export default defineConfig({
//   testDir: "tests",
//   timeout: 900_000,

//   expect: {
//     timeout: 25_000,
//   },

//   use: {
//     baseURL,
//     headless: isCI ? true : browserConf.headless,
//     viewport: { width: 1920, height: 1080 },
//     launchOptions: isCI
//       ? {
//           args: [
//             "--no-sandbox",
//             "--disable-setuid-sandbox",
//             "--force-device-scale-factor=0.9",
//             "--window-size=1920,1080",
//           ],
//         }
//       : {
//           args: [
//             "--start-maximized",
//             "--window-size=1920,1080",
//             "--force-device-scale-factor=0.9",
//           ],
//         },

//     actionTimeout: configManager.getTimeout("action"),
//     navigationTimeout: configManager.getTimeout("navigation"),

//     screenshot: "only-on-failure",
//     video: "on",
//     trace: "on",
//   },

//   retries: isCI ? 0 : 0,
//   workers: isCI ? 3 : 4,

//   projects: [
//     {
//       name: "chromium",
//       use: { browserName: "chromium" },
//     },
//   ],

//   reporter: isCI
//     ? [
//         // ["list"],
//         // ["junit", { outputFile: "reports/results.xml" }],
//         ["html", { outputFolder: "playwright-report" }],
//         ["allure-playwright", { outputFolder: "allure-results" }],
//       ]
//     : [
//         // ["list"],
//         ["html", { open: "never" }],
//         // ["junit", { outputFile: "reports/results.xml" }],
//         ["allure-playwright", { outputFolder: "allure-results" }],
//       ],
// });