import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import { FILE_PATHS } from '../config/fileConstants';

// ============================================================================
// LOG LEVELS  — ordered by severity (lower number = more severe)
// ============================================================================
export enum LogLevel {
  // Infrastructure levels (always shown)
  TC_START = 'TC_START',
  TC_END = 'TC_END',

  // Test execution levels
  STEP = 'STEP',
  PASS = 'PASS',
  FAIL = 'FAIL',
  ERROR = 'ERROR',
  WARN = 'WARN',

  // QA-specific informational levels
  SECTION = 'SECTION',
  VALIDATE = 'VALIDATE',
  DATA = 'DATA',
  FILE = 'FILE',
  API = 'API',
  TABLE = 'TABLE',
  INFO = 'INFO',

  // Diagnostic
  DEBUG = 'DEBUG',
}

// ============================================================================
// INTERFACES
// ============================================================================
export interface TestContext {
  testName: string;
  testFile: string;
  environment: string;
  suiteName?: string;
  dataSet?: string;
  browser?: string;
  startTime: number;
}

export interface ValidationRecord {
  Field: string;
  Expected: string | number;
  Actual: string | number;
  Result: 'PASS' | 'FAIL' | 'SKIP';
}

// ============================================================================
// CI DETECTION
// ============================================================================
const IS_CI =
  !!process.env.CI ||
  !!process.env.GITHUB_ACTIONS ||
  !!process.env.JENKINS_URL ||
  !!process.env.CIRCLECI ||
  !!process.env.TF_BUILD ||
  !!process.env.AZURE_PIPELINES;

// ============================================================================
// ANSI COLOR PALETTE  — all disabled in CI for clean pipeline output
// ============================================================================
const C = {
  reset: IS_CI ? '' : '\x1b[0m',
  bold: IS_CI ? '' : '\x1b[1m',
  dim: IS_CI ? '' : '\x1b[2m',
  green: IS_CI ? '' : '\x1b[32m',
  yellow: IS_CI ? '' : '\x1b[33m',
  blue: IS_CI ? '' : '\x1b[34m',
  magenta: IS_CI ? '' : '\x1b[35m',
  cyan: IS_CI ? '' : '\x1b[36m',
  white: IS_CI ? '' : '\x1b[97m',
  red: IS_CI ? '' : '\x1b[91m',
  gray: IS_CI ? '' : '\x1b[90m',
  bgRed: IS_CI ? '' : '\x1b[41m',
};

// Fixed-width 9-char labels — all log columns stay aligned
const LABEL: Record<string, string> = {
  TC_START: '[TC_START]',
  TC_END: '[TC_END  ]',
  STEP: '[STEP    ]',
  PASS: '[PASS    ]',
  FAIL: '[FAIL    ]',
  ERROR: '[ERROR   ]',
  WARN: '[WARN    ]',
  SECTION: '[SECTION ]',
  VALIDATE: '[VALIDATE]',
  DATA: '[DATA    ]',
  FILE: '[FILE    ]',
  API: '[API     ]',
  TABLE: '[TABLE   ]',
  INFO: '[INFO    ]',
  DEBUG: '[DEBUG   ]',
};

const COLOR: Record<string, string> = {
  TC_START: C.cyan + C.bold,
  TC_END: C.cyan + C.bold,
  STEP: C.blue + C.bold,
  PASS: C.green + C.bold,
  FAIL: C.red + C.bold,
  ERROR: C.red + C.bold,
  WARN: C.yellow + C.bold,
  SECTION: C.magenta + C.bold,
  VALIDATE: C.magenta,
  DATA: C.cyan,
  FILE: C.cyan,
  API: C.blue,
  TABLE: C.white,
  INFO: C.white,
  DEBUG: C.gray + C.dim,
};

// Log level priority — lower = more severe = always shown
const PRIORITY: Record<string, number> = {
  TC_START: 0, TC_END: 0,
  ERROR: 1, FAIL: 1,
  WARN: 2,
  STEP: 3, PASS: 3, SECTION: 3,
  VALIDATE: 3, DATA: 3, FILE: 3,
  API: 3, TABLE: 3, INFO: 3,
  DEBUG: 4,
};

const SEP_DOUBLE = '═'.repeat(72);
const SEP_SINGLE = '─'.repeat(72);

// ============================================================================
// UNIVERSAL QA LOGGER
// ============================================================================
export class Logger {

  private static instance: Logger;

  // ── File output ────────────────────────────────────────────────────────────
  private readonly logDir: string;
  private readonly logFile: string;

  // ── Test state ─────────────────────────────────────────────────────────────
  private ctx: TestContext | null = null;
  private stepCount = 0;
  private stepStart = Date.now();
  private testActive = false;
  private passCount = 0;
  private failCount = 0;
  private warnCount = 0;

  // ── Level gate ─────────────────────────────────────────────────────────────
  private readonly minPriority: number;

  private constructor() {
    this.logDir = 'logs';
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    const today = this.istTimestamp().split('T')[0];
    this.logFile = path.join(this.logDir, `test-run-${today}.log`);

    const envLevel = (process.env.LOG_LEVEL ?? 'DEBUG').toUpperCase();
    this.minPriority = PRIORITY[envLevel] ?? PRIORITY['DEBUG'];
  }

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  // ============================================================================
  // PRIVATE CORE
  // ============================================================================

  /** IST timestamp: 2026-06-22T11:47:11 */
  private istTimestamp(): string {
    return new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}),\s*/, '$3-$2-$1T').replace(/\s/g, '');
  }

  /** Strip all ANSI escape codes — for clean file output */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /** Build TC + Step context tags */
  private contextTags(forFile = false): string {
    const tc = this.ctx
      ? forFile
        ? ` [TC:${this.ctx.testFile}]`
        : ` ${C.cyan}[TC:${this.ctx.testFile}]${C.reset}`
      : '';
    const st = this.stepCount > 0
      ? forFile
        ? ` [Step:${this.stepCount}]`
        : ` ${C.gray}[Step:${this.stepCount}]${C.reset}`
      : '';
    return tc + st;
  }

  /**
   * Core emit — writes one logical line to both console and file.
   * Console: colored, no timestamp.
   * File:    IST timestamp, plain text, ANSI stripped.
   */
  private emit(level: string, message: string): void {
    if ((PRIORITY[level] ?? 99) > this.minPriority) return;

    const label = LABEL[level] ?? `[${level.padEnd(9)}]`;
    const color = COLOR[level] ?? '';

    // ── Console line ──────────────────────────────────────────────────────────
    const consoleLine =
      `${color}${label}${C.reset}` +
      this.contextTags(false) +
      ` ${message}`;
    console.log(consoleLine);

    // ── File line (strip ANSI from both the message and built line) ───────────
    const ts = this.istTimestamp().replace('T', ' ');
    const fileLine =
      `${ts} ${label}` +
      this.contextTags(true) +
      ` ${this.stripAnsi(message)}`;
    this.appendFile(fileLine);

    // ── Internal counters ─────────────────────────────────────────────────────
    if (level === 'PASS') this.passCount++;
    if (level === 'FAIL' || level === 'ERROR') this.failCount++;
    if (level === 'WARN') this.warnCount++;
  }

  private appendFile(line: string): void {
    fs.appendFileSync(this.logFile, line + '\n');
  }

  /** Write a raw line to file only (for banners) */
  private fileOnly(line: string): void {
    this.appendFile(this.stripAnsi(line));
  }

  // ============================================================================
  // TEST LIFECYCLE
  // ============================================================================

  /**
   * Start a test case — prints banner with TC ID, title, environment.
   * @example log.tcStart('REG_TS01_TC01', 'should add members via bulk import');
   */
  tcStart(id: string, title: string): void {
    const env = (process.env.ENVIRONMENT || process.env.NODE_ENV || 'local').toUpperCase();
    this.testStart({ testName: title, testFile: id, environment: env });
  }

  /**
   * Internal — also accepts full context for advanced usage.
   */
  testStart(ctx: Omit<TestContext, 'startTime'>): void {
    const now = Date.now();
    this.ctx = { ...ctx, startTime: now };
    this.stepCount = 0;
    this.stepStart = now;
    this.testActive = true;
    this.passCount = 0;
    this.failCount = 0;
    this.warnCount = 0;

    const suite = ctx.suiteName && ctx.suiteName !== path.basename(ctx.testFile)
      ? ctx.suiteName
      : undefined;

    const consoleLines = [
      '',
      `${C.cyan}${C.bold}${SEP_DOUBLE}${C.reset}`,
      `${C.cyan}${C.bold}[TC_START] [TC:${ctx.testFile}] TEST CASE START  ►  ${ctx.testName}${C.reset}`,
      suite ? `${C.gray}           Suite   : ${suite}${C.reset}` : null,
      `${C.gray}           Env     : ${ctx.environment.toUpperCase()}${C.reset}`,
      ctx.browser ? `${C.gray}           Browser : ${ctx.browser}${C.reset}` : null,
      ctx.dataSet ? `${C.gray}           Dataset : ${ctx.dataSet}${C.reset}` : null,
      `${C.cyan}${C.bold}${SEP_DOUBLE}${C.reset}`,
      '',
    ].filter(Boolean).join('\n');

    console.log(consoleLines);

    const ts = this.istTimestamp().replace('T', ' ');
    [
      '',
      SEP_DOUBLE,
      `${ts} [TC_START] [TC:${ctx.testFile}] TEST CASE START  ►  ${ctx.testName}`,
      suite ? `           Suite   : ${suite}` : null,
      `           Env     : ${ctx.environment.toUpperCase()}`,
      ctx.browser ? `           Browser : ${ctx.browser}` : null,
      ctx.dataSet ? `           Dataset : ${ctx.dataSet}` : null,
      SEP_DOUBLE,
      '',
    ].filter(Boolean).forEach(l => this.appendFile(l as string));
  }

  /**
   * End a test case — prints banner with status, duration, step + pass/fail counts.
   * @example log.tcEnd('PASS');
   * @example log.tcEnd('FAIL');
   */
  tcEnd(status: string): void {
    const s = status.toLowerCase();
    const mapped = (s === 'pass' || s === 'passed') ? 'passed'
      : (s === 'fail' || s === 'failed') ? 'failed'
        : 'skipped';
    this.testEnd(mapped as 'passed' | 'failed' | 'skipped');
  }

  testEnd(status: 'passed' | 'failed' | 'skipped'): void {
    if (!this.ctx) return;

    const durationMs = Date.now() - this.ctx.startTime;
    const duration = (durationMs / 1000).toFixed(2);
    const statusLabel = status === 'passed' ? 'PASS'
      : status === 'skipped' ? 'SKIP' : 'FAIL';
    const statusColor = status === 'passed' ? C.green
      : status === 'skipped' ? C.yellow : C.red;

    const consoleLines = [
      '',
      `${C.cyan}${C.bold}${SEP_DOUBLE}${C.reset}`,
      `${statusColor}${C.bold}[TC_END  ] [TC:${this.ctx.testFile}] TEST CASE END    ◄  ${this.ctx.testName}${C.reset}`,
      `           Status : ${statusColor}${C.bold}${statusLabel}${C.reset}   ${C.gray}Duration : ${duration}s${C.reset}`,
      `${C.cyan}${C.bold}${SEP_DOUBLE}${C.reset}`,
      '',
    ].join('\n');

    console.log(consoleLines);

    const ts = this.istTimestamp().replace('T', ' ');
    [
      '',
      SEP_DOUBLE,
      `${ts} [TC_END  ] [TC:${this.ctx.testFile}] TEST CASE END    ◄  ${this.ctx.testName}`,
      `           Status : ${statusLabel}   Duration : ${duration}s`,
      SEP_DOUBLE,
      '',
    ].forEach(l => this.appendFile(l));

    this.ctx = null;
    this.stepCount = 0;
    this.stepStart = Date.now();
    this.testActive = false;
    this.passCount = 0;
    this.failCount = 0;
    this.warnCount = 0;
  }

  // ============================================================================
  // STEP LOGGING  — reserved for SPEC FILES only (business-level boundaries)
  // basePage action methods must use log.info() / log.pass() not log.step()
  // ============================================================================

  /**
   * Log a business step boundary. Increments step counter, shows elapsed time.
   * Call ONLY in spec files for high-level step descriptions.
   * @example log.step('STEP 1: Login to application');
   * @example log.step('STEP 4: Upload census with partial member data');
   */
  step(message: string): void {
    if (!this.testActive) { this.stepStart = Date.now(); this.testActive = true; }

    this.stepCount++;
    const now = Date.now();
    const elapsed = ((now - this.stepStart) / 1000).toFixed(2);
    this.stepStart = now;

    // Step gets its own visual separator for readability
    const consoleLine =
      `${C.blue}${C.bold}${LABEL['STEP']}${C.reset}` +
      this.contextTags(false) +
      ` ${C.blue}${C.bold}► ${message}${C.reset}  ${C.gray}+${elapsed}s${C.reset}`;
    console.log(consoleLine);

    const ts = this.istTimestamp().replace('T', ' ');
    this.appendFile(`${ts} ${LABEL['STEP']}${this.contextTags(true)} ► ${message}  +${elapsed}s`);
  }

  /**
   * Log successful step completion.
   * @example log.stepPass('STEP 1: Login successful');
   */
  stepPass(message: string): void {
    this.passCount++;
    const consoleLine =
      `${C.green}${C.bold}${LABEL['PASS']}${C.reset}` +
      this.contextTags(false) +
      ` ${C.green}${C.bold}✔ ${message}${C.reset}`;
    console.log(consoleLine);

    const ts = this.istTimestamp().replace('T', ' ');
    this.appendFile(`${ts} ${LABEL['PASS']}${this.contextTags(true)} ✔ ${message}`);
  }

  /**
   * Log step failure with screenshot capture.
   * @example await log.stepFail(page, 'STEP 3: Failed to generate runtime data');
   */
  async stepFail(page: Page, message: string): Promise<void> {
    this.failCount++;
    const screenshotPath = await this.captureScreenshot(page, `fail-step${this.stepCount}`);

    const consoleLine =
      `${C.red}${C.bold}${LABEL['FAIL']}${C.reset}` +
      this.contextTags(false) +
      ` ${C.red}${C.bold}✘ STEP FAILED: ${message}${C.reset}`;
    console.log(consoleLine);
    console.log(`  ${C.yellow}[Screenshot] ${screenshotPath}${C.reset}`);

    const ts = this.istTimestamp().replace('T', ' ');
    this.appendFile(`${ts} ${LABEL['FAIL']}${this.contextTags(true)} ✘ STEP FAILED: ${message}`);
    this.appendFile(`  [Screenshot] ${screenshotPath}`);
  }

  // ============================================================================
  // SECTION — visual grouping for related log blocks (email loop, report loop)
  // ============================================================================

  /**
   * Open a named section — visually groups related log lines.
   * @example log.section('Verifying Member 1 — Test49470');
   * @example log.section('Attachment Excel verification');
   */
  section(title: string): void {
    const consoleLine =
      `${C.magenta}${C.bold}${LABEL['SECTION']}${C.reset}` +
      this.contextTags(false) +
      ` ${C.magenta}${C.bold}┌─ ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}${C.reset}`;
    console.log(consoleLine);

    const ts = this.istTimestamp().replace('T', ' ');
    this.appendFile(`${ts} ${LABEL['SECTION']}${this.contextTags(true)} ┌─ ${title}`);
  }

  /**
   * Close a named section.
   * @example log.sectionEnd('Verifying Member 1 — Test49470');
   */
  sectionEnd(title: string): void {
    const consoleLine =
      `${C.magenta}${LABEL['SECTION']}${C.reset}` +
      this.contextTags(false) +
      ` ${C.magenta}└─ ${title} — done${C.reset}`;
    console.log(consoleLine);

    const ts = this.istTimestamp().replace('T', ' ');
    this.appendFile(`${ts} ${LABEL['SECTION']}${this.contextTags(true)} └─ ${title} — done`);
  }

  // ============================================================================
  // SPECIALISED QA LOG METHODS
  // ============================================================================

  /**
   * Log a named data value — runtime values, captured fields, member details.
   * Accepts string, number, or object (auto JSON-serialised).
   * @example log.data('Member 1', 'Sysla Test49470 | EmpNo: EMP147933');
   * @example log.data('Loan Amount', '$300,000');
   * @example log.data('Runtime Data', { firstName: 'Sysla', lastName: 'Test49470' });
   */
  data(label: string, value: string | number | Record<string, unknown>): void {
    const formatted = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
    this.emit('DATA', `${label}: ${formatted}`);
  }

  /**
   * Log a file operation — downloads, uploads, saves.
   * @example log.file('Downloaded: ImportMembers_22-6-2026.xlsx (130 KB)');
   * @example log.file('Saved to: C:\\path\\downloads\\MemberList.xlsx');
   * @example log.file('Census file uploaded: ImportMembers_22-6-2026.xlsx');
   */
  file(message: string): void {
    this.emit('FILE', message);
  }

  /**
   * Log a validation check — expected vs actual with PASS/FAIL verdict.
   * ANSI colors are stripped before writing to log file.
   * @example log.validate('Last Name',   'Test49470', 'Test49470', true);
   * @example log.validate('Employee No', 'EMP147933', 'EMP147933', true);
   * @example log.validate('Marital Status', 'Married', 'Single',   false);
   * @example log.validate('Row Count', 3, 3); // no verdict
   */
  validate(
    field: string,
    expected: string | number,
    actual: string | number,
    passed?: boolean
  ): void {
    const verdictConsole = passed === undefined ? ''
      : passed ? `  ${C.green}${C.bold}✔ PASS${C.reset}` : `  ${C.red}${C.bold}✘ FAIL${C.reset}`;
    const verdictFile = passed === undefined ? ''
      : passed ? '  ✔ PASS' : '  ✘ FAIL';

    const label = LABEL['VALIDATE'];
    const color = COLOR['VALIDATE'];
    const ctxCon = this.contextTags(false);
    const ctxFile = this.contextTags(true);
    const core = `${field} | Expected: "${expected}" | Actual: "${actual}"`;
    const ts = this.istTimestamp().replace('T', ' ');

    console.log(`${color}${label}${C.reset}${ctxCon} ${core}${verdictConsole}`);
    this.appendFile(`${ts} ${label}${ctxFile} ${core}${verdictFile}`);

    if (passed === true) this.passCount++;
    if (passed === false) this.failCount++;
  }

  /**
   * Log an API call with endpoint, status code, and optional detail.
   * @example log.api('POST /loans/create', 201, 'loanId: 52935a6b');
   * @example log.api('GET /token', 200);
   * @example log.api('GET /members', 404, 'Member not found');
   */
  api(endpoint: string, status?: number, detail?: string): void {
    const parts: string[] = [endpoint];
    if (status !== undefined) parts.push(`Status: ${status}`);
    if (detail) parts.push(detail);
    this.emit('API', parts.join(' | '));
  }

  /**
   * Log a structured table — for validation summaries, member field comparisons.
   * Columns auto-sized to content width.
   * @example
   * log.table([
   *   { Field: 'Last Name',   Expected: 'Test49470', Actual: 'Test49470', Result: 'PASS' },
   *   { Field: 'Employee No', Expected: 'EMP147933', Actual: 'EMP147933', Result: 'PASS' },
   *   { Field: 'Marital',     Expected: 'Married',   Actual: 'Single',    Result: 'FAIL' },
   * ]);
   */
  table(rows: Record<string, string | number>[]): void {
    if (!rows.length) return;

    const cols = Object.keys(rows[0]);
    const widths = cols.map(c =>
      Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length))
    );

    const divider = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
    const header = '| ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';

    const lines: string[] = [divider, header, divider];
    for (const row of rows) {
      const result = String(row['Result'] ?? row['result'] ?? '');
      const isPass = result.toUpperCase() === 'PASS';
      const isFail = result.toUpperCase() === 'FAIL';
      const rowColor = isFail ? C.red : isPass ? C.green : C.white;

      const cells = cols.map((c, i) => String(row[c] ?? '').padEnd(widths[i]));
      lines.push(`${rowColor}| ${cells.join(' | ')} |${C.reset}`);
    }
    lines.push(divider);

    const label = LABEL['TABLE'];
    const ctxCon = this.contextTags(false);
    const ctxFile = this.contextTags(true);
    const ts = this.istTimestamp().replace('T', ' ');

    for (const line of lines) {
      console.log(`${C.white}${label}${C.reset}${ctxCon} ${line}`);
      this.appendFile(`${ts} ${label}${ctxFile} ${this.stripAnsi(line)}`);
    }
  }

  /**
   * Print end-of-test summary — total pass, fail, warn counts.
   * Call just before log.tcEnd() for a full execution report.
   * @example log.summary();
   */
  summary(): void {
    if (!this.ctx) return;

    const durationMs = Date.now() - this.ctx.startTime;
    const duration = (durationMs / 1000).toFixed(2);

    const lines = [
      `${C.gray}${SEP_SINGLE}${C.reset}`,
      `${C.white}${C.bold}  TEST EXECUTION SUMMARY${C.reset}`,
      `${C.gray}${SEP_SINGLE}${C.reset}`,
      `  ${C.green}✔ Passed   : ${this.passCount}${C.reset}`,
      `  ${C.red}✘ Failed   : ${this.failCount}${C.reset}`,
      `  ${C.yellow}⚠ Warnings : ${this.warnCount}${C.reset}`,
      `  ${C.gray}  Steps    : ${this.stepCount}${C.reset}`,
      `  ${C.gray}  Duration : ${duration}s${C.reset}`,
      `${C.gray}${SEP_SINGLE}${C.reset}`,
    ];

    lines.forEach(l => console.log(l));

    const ts = this.istTimestamp().replace('T', ' ');
    [
      SEP_SINGLE,
      `${ts}   TEST EXECUTION SUMMARY`,
      SEP_SINGLE,
      `  ✔ Passed   : ${this.passCount}`,
      `  ✘ Failed   : ${this.failCount}`,
      `  ⚠ Warnings : ${this.warnCount}`,
      `    Steps    : ${this.stepCount}`,
      `    Duration : ${duration}s`,
      SEP_SINGLE,
    ].forEach(l => this.appendFile(l));
  }

  /**
   * Add a blank line to both console and log file for visual breathing room.
   * @example log.blank();
   */
  blank(): void {
    console.log('');
    this.appendFile('');
  }

  /**
   * Log elapsed time since test start without incrementing step counter.
   * @example log.elapsed('After member import upload');
   */
  elapsed(label?: string): void {
    if (!this.ctx) return;
    const ms = Date.now() - this.ctx.startTime;
    const sec = (ms / 1000).toFixed(2);
    this.emit('DEBUG', `⏱ ${label ? label + ' — ' : ''}elapsed: ${sec}s`);
  }

  // ============================================================================
  // STANDARD LOG METHODS
  // ============================================================================

  /**
   * General informational log.
   * Used by basePage for UI action logs (Click, Fill, Navigate etc.)
   * @example log.info('Click → Login Button');
   * @example log.info('Dropdown selected: "Show in Pending Tasks"');
   */
  info(msg: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    this.emit('INFO', msg + suffix);
  }

  /**
   * Warning log — non-fatal issues, skipped steps, auto-heal notifications.
   * @example log.warn('Config icon not visible — skipping configuration');
   */
  warn(msg: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    this.emit('WARN', msg + suffix);
  }

  /**
   * Error log — errors captured before throw.
   * Automatically extracts stack trace if an Error object is passed.
   * @example log.error('FAILURE in [REG_TS01_TC01]: element not found');
   * @example log.error('Upload failed', error);
   */
  error(msg: string, err?: unknown): void {
    this.emit('ERROR', msg);
    if (err instanceof Error && err.stack) {
      // Log stack trace indented, without incrementing any counters
      const label = LABEL['ERROR'];
      const ctxCon = this.contextTags(false);
      const ctxFile = this.contextTags(true);
      const ts = this.istTimestamp().replace('T', ' ');
      const stack = err.stack.split('\n').slice(1, 4).map(l => `    ${l.trim()}`).join('\n');
      console.log(`${C.red}${label}${C.reset}${ctxCon} ${C.dim}${stack}${C.reset}`);
      this.appendFile(`${ts} ${label}${ctxFile} ${stack}`);
    }
  }

  /**
   * Pass log — action-level pass confirmations from basePage.
   * @example log.pass('Clicked → Login Button');
   * @example log.pass('Navigated → https://demo.benefitnet.com/');
   */
  pass(msg: string): void {
    this.emit('PASS', `✔ ${msg}`);
  }

  /**
   * Fail log — inline failure marking without screenshot.
   * @example log.fail('Validation comment mismatch for Member 2');
   */
  fail(msg: string): void {
    this.emit('FAIL', `✘ ${msg}`);
  }

  /**
   * Debug log — verbose diagnostic output.
   * Only shown when LOG_LEVEL=DEBUG (default).
   * Automatically hidden when LOG_LEVEL=INFO or higher.
   * @example log.debug('Wait: loadState → load');
   * @example log.debug('LoadState reached (load) in 1934ms');
   */
  debug(msg: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    this.emit('DEBUG', msg + suffix);
  }

  getLogFile(): string { return this.logFile; }

  // ============================================================================
  // SCREENSHOTS & FAILURE CAPTURE
  // ============================================================================

  /**
   * Capture a full-page screenshot.
   * @returns Absolute path of the saved screenshot file.
   * @example const filePath = await log.captureScreenshot(page, 'fail-step3');
   */
  async captureScreenshot(page: Page, name = 'screenshot'): Promise<string> {
    const dir = path.join(process.cwd(), FILE_PATHS.SCREENSHOTS);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const filePath = path.join(dir, `${safeName}-${Date.now()}.png`);

    try {
      await page.screenshot({ path: filePath, fullPage: true });
      this.emit('FILE', `[Screenshot saved] ${filePath}`);
    } catch (e) {
      this.warn(`[Screenshot failed] ${(e as Error).message}`);
    }
    return filePath;
  }

  /**
   * Capture full failure context — error, stack trace, screenshot, video and trace paths.
   * Call in the outer catch block of each spec test.
   * @example await log.captureOnFailure(page, TC_TITLE, e);
   */
  async captureOnFailure(page: Page, methodName: string, error: unknown): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.error(`FAILURE in [${methodName}]: ${errorMsg}`, error);

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

    console.log(`  ${C.yellow}[Screenshot] ${screenshotPath}${C.reset}`);
    attachments.forEach(a => console.log(`  ${C.gray}[Attachment] ${a}${C.reset}`));

    this.appendFile(`  [Screenshot] ${screenshotPath}`);
    attachments.forEach(a => this.appendFile(`  [Attachment] ${a}`));
  }

  // ============================================================================
  // AUTO-HEAL NOTIFICATION
  // ============================================================================

  /**
   * Log an auto-heal event when a locator is recovered.
   * Guides engineers to update the POM file with the healed locator.
   */
  heal(
    elementName: string,
    originalLocator: string,
    healedLocator: string,
    strategy: string
  ): void {
    this.emit('WARN', `[AutoHeal] Element healed — ${elementName}`);
    this.emit('WARN', `  Original : ${originalLocator}`);
    this.emit('WARN', `  Healed   : ${healedLocator}`);
    this.emit('WARN', `  Strategy : ${strategy}`);
    this.emit('WARN', `  Action   : Update this locator in your POM file`);
  }

  // ============================================================================
  // STATIC SHORTHAND — for use in static contexts
  // ============================================================================
  static async stepInfo(message: string): Promise<void> {
    Logger.getInstance().info(message);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
export const logger = Logger.getInstance();