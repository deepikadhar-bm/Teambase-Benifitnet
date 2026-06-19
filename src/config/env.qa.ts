import type { AppConfig } from "./types";

export const qaConfig: AppConfig = {
  env: "qa",
  baseURL: "https://demo.benefitnet.com/",
  easyURL : "https://www.easemytrip.com/",

  credentials: {
    username: "syslatech_broker1",
    password: "Test@1234567",
  },

  timeouts: {
    action: 60000,
    wait: 60000,
    navigation: 45000,
  },

  browser: {
    headless: false,
    slowMo: 0,
    timeout: 600000,
  },

  requestOptions: {
    timeout: 30000,
    retries: 1,
  },

  logging: {
    level: "info",
    verbose: false,
  },
};
