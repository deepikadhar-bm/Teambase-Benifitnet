// ============================================================================
//  GENERATE REPORT
//  Zips the Playwright HTML report + test-results + logs into one archive.
//
//  Output: reports/html-reports-zip/<projectName>-<timestamp>.zip
//
//  Included in ZIP:
//    playwright-report/   — full HTML report (open index.html in browser)
//    test-results/        — screenshots, videos, traces
//    logs/                — plain text log files + screenshots from this run
// ============================================================================

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

function getProjectName() {
    if (process.env.PROJECT_NAME) return process.env.PROJECT_NAME;
    try {
        return require(path.join(__dirname, "../package.json")).name || "qa-project";
    } catch {
        return "qa-project";
    }
}

const ROOT_DIR = path.join(__dirname, "..");
const REPORT_SRC = path.join(ROOT_DIR, "playwright-report");
const TEST_RESULTS_DIR = path.join(ROOT_DIR, "test-results");
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const ZIP_OUTPUT_DIR = path.join(__dirname, "html-reports-zip");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTimestamp() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/**
 * Returns an existing ZIP if it was created after the current report was generated.
 * Avoids re-zipping on multiple email sends within the same run.
 */
function findExistingZip(projectName) {
    if (!fs.existsSync(ZIP_OUTPUT_DIR)) return null;

    const indexFile = path.join(REPORT_SRC, "index.html");
    if (!fs.existsSync(indexFile)) return null;

    const reportTime = fs.statSync(indexFile).mtimeMs;

    const zips = fs.readdirSync(ZIP_OUTPUT_DIR)
        .filter(f => f.startsWith(`${projectName}-`) && f.endsWith(".zip"))
        .map(f => ({
            zipFileName: f,
            zipPath: path.join(ZIP_OUTPUT_DIR, f),
            createdAt: fs.statSync(path.join(ZIP_OUTPUT_DIR, f)).mtimeMs,
        }))
        .filter(z => z.createdAt >= reportTime)
        .sort((a, b) => b.createdAt - a.createdAt);

    return zips.length > 0 ? zips[0] : null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a ZIP archive of the current Playwright test run.
 * @param {string} projectName  Used as ZIP filename prefix.
 * @returns {Promise<{ zipFileName: string, zipPath: string }>}
 */
async function generateReport(projectName = getProjectName()) {

    // ── Validate report exists ───────────────────────────────────────────────
    if (!fs.existsSync(REPORT_SRC)) {
        throw new Error(
            `playwright-report/ not found at: ${REPORT_SRC}\n` +
            `Make sure Playwright tests ran with the HTML reporter enabled.`
        );
    }

    const indexFile = path.join(REPORT_SRC, "index.html");
    if (!fs.existsSync(indexFile)) {
        throw new Error(
            `index.html not found at: ${indexFile}\n` +
            `The HTML report did not generate correctly. Check playwright.config.ts reporter settings.`
        );
    }

    // ── Return existing ZIP if already generated for this run ────────────────
    const existing = findExistingZip(projectName);
    if (existing) {
        // console.log(`  Reusing existing ZIP: ${existing.zipFileName}`);
        return existing;
    }

    // ── Create output directory ──────────────────────────────────────────────
    if (!fs.existsSync(ZIP_OUTPUT_DIR)) {
        fs.mkdirSync(ZIP_OUTPUT_DIR, { recursive: true });
    }

    // ── Build ZIP ────────────────────────────────────────────────────────────
    const timestamp = getTimestamp();
    const zipFileName = `${projectName}-${timestamp}.zip`;
    const zipPath = path.join(ZIP_OUTPUT_DIR, zipFileName);
    const runStart = fs.statSync(indexFile).mtimeMs;

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
            // console.log(`  Report ZIP    : ${zipFileName} (${sizeMB} MB)`);
            resolve({ zipFileName, zipPath });
        });

        archive.on("warning", warn => {
            if (warn.code !== "ENOENT") reject(warn);
        });

        archive.on("error", err => {
            console.error(`[generate-report] Archive error: ${err.message}`);
            reject(err);
        });

        archive.pipe(output);

        // 1. Full Playwright HTML report
        archive.directory(REPORT_SRC, "playwright-report");

        // 2. Test results — screenshots, videos, traces (Playwright clears each run)
        if (fs.existsSync(TEST_RESULTS_DIR)) {
            archive.directory(TEST_RESULTS_DIR, "test-results");
        }

        // 3. Logs from this run only (filter by modification time >= report generation)
        if (fs.existsSync(LOGS_DIR)) {
            // Screenshots
            const screenshotsDir = path.join(LOGS_DIR, "screenshots");
            if (fs.existsSync(screenshotsDir)) {
                fs.readdirSync(screenshotsDir)
                    .filter(f => fs.statSync(path.join(screenshotsDir, f)).mtimeMs >= runStart)
                    .forEach(f => archive.file(
                        path.join(screenshotsDir, f),
                        { name: `logs/screenshots/${f}` }
                    ));
            }

            // Log files (.log only — no JSON)
            fs.readdirSync(LOGS_DIR)
                .filter(f =>
                    f.endsWith(".log") &&
                    fs.statSync(path.join(LOGS_DIR, f)).mtimeMs >= runStart
                )
                .forEach(f => archive.file(
                    path.join(LOGS_DIR, f),
                    { name: `logs/${f}` }
                ));
        }

        archive.finalize();
    });
}

module.exports = { generateReport };

// Allow direct execution: node reports/generate-report.js
if (require.main === module) {
    const projectName = getProjectName();
    generateReport(projectName)
        .then(({ zipFileName }) => { }) // console.log
        .catch(err => { console.error(err.message); process.exit(1); });
}