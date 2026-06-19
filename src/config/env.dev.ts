import type { AppConfig } from "./types";

export const devConfig: AppConfig = {
  env: "dev",
  baseURL: "https://showcase.bluecopa.com/welcome",
  easyURL: "https://www.easemytrip.com/",

  credentials: {
    username: "auto-testadmin@bluecopa.com",
    password: "Admin@copa123",
  },

  timeouts: {
    action: 60000,
    wait: 60000,
    navigation: 40000,
  },

  browser: {
    headless: false,
    slowMo: 100,
    timeout: 600000,
  },

  requestOptions: {
    timeout: 30000,
    retries: 1,
  },

  logging: {
    level: "debug",
    verbose: true,
  },
};
