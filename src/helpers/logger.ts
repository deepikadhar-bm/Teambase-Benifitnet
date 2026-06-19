import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import { FILE_PATHS } from '../config/fileConstants';

export interface TestContext {
  testName: string;
  testFile: string;
  environment: string;
  suiteName?: string;
  dataSet?: string;
  browser?: string;
  startTime: number;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  PASS = 'PASS',
  FAIL = 'FAIL',
  STEP = 'STEP',
  TC_START = 'TC_START',
  TC_END = 'TC_END',
}

interface LogEntry {
  timestamp: string;
  level: string;
  tcId?: string;
  tcTitle?: string;
  step?: number;
  message: string;
  durationMs?: number;
  screenshotPath?: string;
  attachments?: string[];
}

const C: Record<string, string> = {
  STEP: '\x1b[1m\x1b[97m',
  PASS: '\x1b[1m\x1b[92m',
  ERROR: '\x1b[1m\x1b[91m',
  WARN: '\x1b[1m\x1b[93m',
  INFO: '\x1b[96m',
  DEBUG: '\x1b[2m\x1b[37m',
  FAIL: '\x1b[1m\x1b[97m\x1b[41m',
  HEADER: '\x1b[1m\x1b[94m',
  HEAL: '\x1b[1m\x1b[95m',
  TC_START: '\x1b[1m\x1b[94m',
  TC_END: '\x1b[1m\x1b[94m',
  RESET: '\x1b[0m',
};

const PREFIX: Record<string, string> = {
  STEP: '[STEP] ',
  PASS: '[PASS] ',
  ERROR: '[ERROR]',
  WARN: '[WARN] ',
  INFO: '[INFO] ',
  DEBUG: '[DEBUG]',
  FAIL: '[FAIL] ',
  TC_START: '[START]',
  TC_END: '[END]  ',
};

export class Logger {
  private static instance: Logger;

  private static readonly isCI: boolean =
    !!process.env.CI ||
    !!process.env.GITHUB_ACTIONS ||
    !!process.env.JENKINS_URL ||
    !!process.env.CIRCLECI ||
    !!process.env.AZURE_PIPELINES ||
    !!process.env.TF_BUILD;

  private readonly logDir: string;
  private readonly logFile: string;
  private readonly jsonFile: string;
  private readonly sessionId: string;
  private readonly currentLevel: LogLevel;

  private ctx: TestContext | null = null;
  private stepCount = 0;
  private stepStart = Date.now();
  private testActive = false;

  private static testContext: TestContext | null = null;
  private static stepStartTime = Date.now();
  private static testActive = false;

  private readonly entries: LogEntry[] = [];

  private constructor() {
    this.logDir = 'logs';
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.sessionId = this.buildSessionId();
    const today = this.istTimestamp().split('T')[0];

    this.logFile = path.join(this.logDir, `test-run-${today}.log`);
    this.jsonFile = path.join(this.logDir, `test-log-${this.sessionId}.json`);

    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
    this.currentLevel = LogLevel[envLevel] ? envLevel : LogLevel.DEBUG;

    if (Logger.isCI) {
      Object.keys(C).forEach(key => { C[key] = ''; });
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  private istTimestamp(): string {
    return new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}),\s*/, '$3-$2-$1T').replace(/\s/g, '');
  }

  private buildSessionId(): string {
    return new Date()
      .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
      .replace(/[\/,:\s]/g, '-');
  }

  testStart(ctx: Omit<TestContext, 'startTime'>): void {
    const now = Date.now();
    this.ctx = { ...ctx, startTime: now };
    this.stepCount = 0;
    this.stepStart = now;
    this.testActive = true;

    const fileBase = path.basename(ctx.testFile);
    const suite = ctx.suiteName && ctx.suiteName !== fileBase ? ctx.suiteName : undefined;

    const line = '═'.repeat(60);
    const rows = [
      ``,
      line,
      `  TEST    : ${ctx.testName}`,
      `  FILE    : ${fileBase}`,
      suite ? `  SUITE   : ${suite}` : null,
      `  ENV     : ${ctx.environment.toUpperCase()}`,
      ctx.browser ? `  BROWSER : ${ctx.browser}` : null,
      ctx.dataSet ? `  DATASET : ${ctx.dataSet}` : null,
      line,
    ].filter(Boolean).join('\n');

    this.print('HEADER', rows);

    this.persistStructured({
      timestamp: this.istTimestamp(),
      level: 'TC_START',
      tcId: ctx.testFile,
      tcTitle: ctx.testName,
      message: `TEST CASE START ► ${ctx.testName}`,
    });
  }

  testEnd(status: 'passed' | 'failed' | 'skipped'): void {
    if (!this.ctx) return;

    const durationMs = Date.now() - this.ctx.startTime;
    const duration = (durationMs / 1000).toFixed(2);
    const icon = status === 'passed' ? ' PASSED'
      : status === 'skipped' ? ' SKIPPED'
        : ' FAILED';
    const line = '═'.repeat(60);
    const colorKey = status === 'passed' ? 'PASS'
      : status === 'skipped' ? 'WARN'
        : 'ERROR';

    const msg = [
      line,
      `  ${icon} — ${this.ctx.testName}`,
      `  Duration : ${duration}s  |  Steps completed : ${this.stepCount}`,
      line,
      ``,
    ].join('\n');

    this.print(colorKey, msg);

    this.persistStructured({
      timestamp: this.istTimestamp(),
      level: 'TC_END',
      tcId: this.ctx.testFile,
      tcTitle: this.ctx.testName,
      durationMs,
      message: `TEST CASE END ◄ ${this.ctx.testName} | Status: ${status.toUpperCase()}`,
    });

    this.ctx = null;
    this.stepCount = 0;
    this.stepStart = Date.now();
    this.testActive = false;
  }

  tcStart(id: string, title: string): void {
    const env = process.env.ENVIRONMENT || process.env.NODE_ENV || 'local';
    this.testStart({ testName: `${id} - ${title}`, testFile: id, environment: env });
  }

  tcEnd(status: string): void {
    const s = String(status).toLowerCase();
    const mapped = s === 'pass' || s === 'passed' ? 'passed'
      : s === 'fail' || s === 'failed' ? 'failed'
        : 'skipped';
    this.testEnd(mapped as 'passed' | 'failed' | 'skipped');
  }

  step(msg: string, data?: any): void {
    if (!this.testActive) {
      this.stepStart = this.stepStart || Date.now();
      this.testActive = true;
    }

    this.stepCount++;
    const now = Date.now();
    const elapsed = ((now - this.stepStart) / 1000).toFixed(2);
    this.stepStart = now;

    this.output(LogLevel.STEP, `▶ Step ${this.stepCount} | ${msg} | +${elapsed}s`, data);
  }

  stepPass(msg: string, data?: any): void {
    this.pass(msg, data);
  }

  async stepFail(page: Page, message: string): Promise<void> {
    const screenshotPath = await this.captureScreenshot(page, `fail-step${this.stepCount}`);

    this.output(LogLevel.FAIL, `✘ STEP FAILED: ${message}`);

    this.persistStructured({
      timestamp: this.istTimestamp(),
      level: 'FAIL',
      tcId: this.ctx?.testFile,
      step: this.stepCount,
      message: `✘ STEP FAILED: ${message}`,
      screenshotPath,
    });
  }

  static async stepInfo(message: string): Promise<void> {
    Logger.getInstance().info(message);
  }

  heal(elementName: string, originalLocator: string, healedLocator: string, strategy: string): void {
    const testName = this.ctx?.testName ?? 'unknown test';
    const stepNo = this.stepCount > 0 ? `Step ${this.stepCount}` : 'before steps';

    const msg = [
      `[AutoHeal] ⚠️  Locator healed`,
      `  Test     : ${testName}`,
      `  At step  : ${stepNo}`,
      `  Element  : ${elementName}`,
      `  Original : ${originalLocator}`,
      `  Healed   : ${healedLocator}`,
      `  Strategy : ${strategy}`,
      `  Fix      : Update this locator in your POM file`,
    ].join('\n');

    this.print('HEAL', msg);
    this.writeFile(`[WARN] ${msg}`);
  }

  async captureScreenshot(page: Page, name = 'screenshot'): Promise<string> {
    const dir = path.join(process.cwd(), FILE_PATHS.SCREENSHOTS);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const filePath = path.join(dir, `${safeName}-${Date.now()}.png`);

    try {
      await page.screenshot({ path: filePath, fullPage: true });
      this.info(`[Screenshot saved] ${filePath}`);
    } catch (e) {
      this.warn(`[Screenshot failed] ${(e as Error).message}`);
    }
    return filePath;
  }

  async captureOnFailure(page: Page, methodName: string, error: unknown): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.error(`FAILURE in [${methodName}]: ${errorMsg}`);

    const screenshotPath = await this.captureScreenshot(
      page,
      `failure-${methodName.replace(/[\s/\\:*?"<>|]/g, '-')}`
    );

    const tracesDir = path.join(process.cwd(), FILE_PATHS.TRACES);
    const videosDir = path.join(process.cwd(), FILE_PATHS.VIDEOS);
    const attachments = [
      `${videosDir}/**/*.webm  (video)`,
      `${tracesDir}/**/*.zip   (trace - open with: npx playwright show-trace <file>)`,
    ];

    console.log(`${C.WARN}[Screenshot] ${screenshotPath}${C.RESET}`);
    attachments.forEach(a => console.log(`${C.DEBUG}[Attachment] ${a}${C.RESET}`));

    this.persistStructured({
      timestamp: this.istTimestamp(),
      level: 'FAIL',
      tcId: this.ctx?.testFile,
      step: this.stepCount,
      message: `✘ FAILURE in [${methodName}]: ${errorMsg}`,
      screenshotPath,
      attachments,
    });
  }

  debug(msg: string, data?: any) { this.output(LogLevel.DEBUG, msg, data); }
  info(msg: string, data?: any) { this.output(LogLevel.INFO, msg, data); }
  warn(msg: string, data?: any) { this.output(LogLevel.WARN, msg, data); }
  error(msg: string, data?: any) { this.output(LogLevel.ERROR, msg, data); }
  pass(msg: string, data?: any) { this.output(LogLevel.PASS, msg, data); }
  fail(msg: string, data?: any) { this.output(LogLevel.FAIL, msg, data); }

  getLogFile(): string { return this.logFile; }

  private shouldLog(level: LogLevel): boolean {
    const p: Record<LogLevel, number> = {
      [LogLevel.ERROR]: 0,
      [LogLevel.FAIL]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.STEP]: 3,
      [LogLevel.INFO]: 3,
      [LogLevel.PASS]: 4,
      [LogLevel.DEBUG]: 5,
      [LogLevel.TC_START]: 0,
      [LogLevel.TC_END]: 0,
    };
    return p[level] <= p[this.currentLevel];
  }

  private format(level: string, message: string, data?: any): string {
    const ts = this.istTimestamp();
    const prefix = PREFIX[level] ?? `[${level}]`;
    const details = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `${ts} ${prefix} ${message}${details}`;
  }

  private output(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    const formatted = this.format(level, message, data);
    console.log((C[level] ?? '') + formatted + C.RESET);
    this.writeFile(formatted);

    this.persistStructured({
      timestamp: this.istTimestamp(),
      level: level.toString(),
      tcId: this.ctx?.testFile,
      step: this.stepCount > 0 ? this.stepCount : undefined,
      message,
    });
  }

  private print(colorKey: string, message: string): void {
    console.log((C[colorKey] ?? '') + message + C.RESET);
    this.writeFile(message);
  }

  private writeFile(text: string): void {
    fs.appendFileSync(this.logFile, text + '\n');
  }

  private persistStructured(entry: LogEntry): void {
    this.entries.push(entry);
    try {
      fs.writeFileSync(this.jsonFile, JSON.stringify(this.entries, null, 2));
    } catch (e) {
    }
  }
}

export const logger = Logger.getInstance();