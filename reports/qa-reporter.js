// ============================================================================
//  QA REPORTER — Playwright custom reporter
//  Runs after every test suite completes (local + CI).
//  Generates a ZIP of the HTML report and optionally sends an email.
//
//  Email trigger:
//    AUTO_SEND_EMAIL=true  → ZIP created + email sent automatically
//    AUTO_SEND_EMAIL=false → ZIP created, run manually:
//                            node reports/send-email.js
// ============================================================================

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const path = require("path");
const sendEmail = require(path.join(__dirname, "./send-email"));

class QAReporter {

    /**
     * Called by Playwright after all tests complete.
     * @param {import('@playwright/test/reporter').FullResult} result
     */
    async onEnd(result) {
        try {
            const autoSend = process.env.AUTO_SEND_EMAIL === "true";

            // console.log("\n" + "─".repeat(60));
            // console.log("  QA REPORTER");
            // console.log("─".repeat(60));
            // console.log(`  Run Status    : ${result.status.toUpperCase()}`);
            // console.log(`  Email Mode    : ${autoSend ? "AUTO — ZIP + email" : "MANUAL — ZIP only"}`);
            // if (!autoSend) {
            // console.log("  Send manually : node reports/send-email.js");
            // }
            // console.log("─".repeat(60));

            // Generate ZIP (always) + send email (if AUTO_SEND_EMAIL=true)
            await sendEmail(autoSend);

        } catch (error) {
            console.error("[QAReporter] Failed:", error.message || error);
            // Do NOT throw — reporter failure must not affect test exit code
        }
    }
}

module.exports = QAReporter;