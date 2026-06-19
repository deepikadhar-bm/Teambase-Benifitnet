pipeline {
    agent any

    environment {
        PATH = "C:/Program Files/nodejs/;${env.PATH}"
        CI   = "true"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 40, unit: 'MINUTES')
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/sairaj4271/Syslatech_Playwright.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                bat 'npx playwright install --with-deps'
            }
        }

        stage('Run Playwright Tests') {
            steps {
                // Mark build as UNSTABLE if tests fail, but continue pipeline
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    bat 'npx playwright test --retries=2'
                }
            }
        }

        stage('Generate Allure Report (CLI if available)') {
            steps {
                script {
                    try {
                        bat '''
                            if exist allure-report rmdir /s /q allure-report
                            allure generate allure-results --clean -o allure-report
                        '''
                    } catch (Exception e) {
                        echo "⚠ Allure CLI not found, using Jenkins plugin instead"
                    }
                }
            }
        }

        stage('Archive Reports') {
            steps {
                script {
                    // JUnit XML (Playwright → reports/results.xml)
                    try {
                        junit allowEmptyResults: true, testResults: 'reports/results.xml'
                    } catch (Exception e) {
                        echo "⚠ JUnit report archiving failed: ${e.message}"
                    }

                    // Raw artifacts
                    archiveArtifacts artifacts: 'allure-results/**',    allowEmptyArchive: true
                    archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'test-results/**',      allowEmptyArchive: true
                }
            }
        }

        stage('Publish Allure Report (Plugin)') {
            steps {
                script {
                    try {
                        allure includeProperties: false,
                               jdk: '',
                               results: [[path: 'allure-results']]
                    } catch (Exception e) {
                        echo "⚠ Allure plugin publish failed: ${e.message}"
                    }
                }
            }
        }
    }

    post {

        // Runs for ALL builds (SUCCESS / FAILURE / UNSTABLE)
        always {
            script {
                echo "Collecting test summary..."

                def testResultSummary = junit(testResults: 'reports/results.xml',
                                              allowEmptyResults: true)

                env.TEST_TOTAL    = testResultSummary.totalCount?.toString() ?: "0"
                env.TEST_FAILED   = testResultSummary.failCount?.toString()  ?: "0"
                env.TEST_SKIPPED  = testResultSummary.skipCount?.toString()  ?: "0"
                env.TEST_PASSED   = testResultSummary.passCount?.toString()  ?: "0"
                env.BUILD_DURATION = currentBuild.durationString.replace(' and counting', '')
                env.BUILD_STATUS   = currentBuild.currentResult ?: "UNKNOWN"

                echo "Total:   ${env.TEST_TOTAL}"
                echo "Passed:  ${env.TEST_PASSED}"
                echo "Failed:  ${env.TEST_FAILED}"
                echo "Skipped: ${env.TEST_SKIPPED}"
                echo "Status:  ${env.BUILD_STATUS}"

                echo "Creating playwright-report.zip..."

                // ZIP using built-in tar.exe (no PowerShell needed)
                bat '''
                    @echo off
                    if exist playwright-report (
                        tar -a -cf playwright-report.zip playwright-report
                        echo ZIP created
                    ) else (
                        echo No playwright-report directory, skipping ZIP.
                    )
                '''

                archiveArtifacts artifacts: 'playwright-report.zip', allowEmptyArchive: true
            }
        }

        // =======================
        // SUCCESS EMAIL (HTML)
        // =======================
        success {
            script {
                withCredentials([usernamePassword(
                    credentialsId: 'gmail-app-password',
                    usernameVariable: 'SMTP_USER',
                    passwordVariable: 'SMTP_PASS'
                )]) {
                    emailext(
                        to: 'kandalsairaj4271@gmail.com',
                        from: "${SMTP_USER}",
                        replyTo: "${SMTP_USER}",
                        subject: "✅ Playwright CI — SUCCESS — Build #${env.BUILD_NUMBER}",
                        mimeType: 'text/html',
                        body: """
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; }
  h2 { color: #1a9c33; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 10px;
  }
  th, td {
    padding: 8px 12px;
    border: 1px solid #ddd;
    font-size: 13px;
    text-align: left;
  }
  th {
    background-color: #f4f4f4;
  }
</style>
</head>
<body>

<h2>🎭 Playwright Test Execution Report</h2>
<p><b>Status:</b> <span style="color:#1a9c33;font-weight:bold;">PASSED</span></p>

<h3>📊 Test Summary</h3>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Build Status</td><td>${env.BUILD_STATUS}</td></tr>
<tr><td>Build Number</td><td>#${env.BUILD_NUMBER}</td></tr>
<tr><td>Job Name</td><td>${env.JOB_NAME}</td></tr>
<tr><td>Total Tests</td><td>${env.TEST_TOTAL}</td></tr>
<tr><td>Passed</td><td>${env.TEST_PASSED}</td></tr>
<tr><td>Failed</td><td>${env.TEST_FAILED}</td></tr>
<tr><td>Skipped</td><td>${env.TEST_SKIPPED}</td></tr>
<tr><td>Browser</td><td>chromium</td></tr>
<tr><td>Duration</td><td>${env.BUILD_DURATION}</td></tr>
</table>

<h3>📄 View Reports</h3>
<ul>
  <li><a href="${env.BUILD_URL}artifact/playwright-report/index.html">📊 HTML Report</a></li>
  <li><a href="${env.BUILD_URL}allure">📈 Allure Report</a></li>
  <li><a href="${env.BUILD_URL}artifact">📁 All Artifacts</a></li>
  <li><a href="${env.BUILD_URL}console">🖥️ Console Log</a></li>
</ul>

<hr>
<p style="font-size:12px;color:#888;">Jenkins Automated Notification</p>

</body>
</html>
                        """
                    )
                }

                echo "✅ SUCCESS email sent"
            }
        }

        // =======================
        // FAILURE EMAIL (HTML + LOG + ZIP)
        // =======================
        failure {
            script {
                withCredentials([usernamePassword(
                    credentialsId: 'gmail-app-password',
                    usernameVariable: 'SMTP_USER',
                    passwordVariable: 'SMTP_PASS'
                )]) {

                    emailext(
                        to: 'kandalsairaj4271@gmail.com',
                        from: "${SMTP_USER}",
                        replyTo: "${SMTP_USER}",
                        subject: "❌ Playwright CI — FAILED — Build #${env.BUILD_NUMBER}",
                        mimeType: 'text/html',
                        attachLog: true,
                        compressLog: true,
                        attachmentsPattern: 'playwright-report.zip, test-results/**/*.zip, test-results/**/*.png',
                        body: """
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; }
  h2 { color: #d52828; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 10px;
  }
  th, td {
    padding: 8px 12px;
    border: 1px solid #ddd;
    font-size: 13px;
    text-align: left;
  }
  th {
    background-color: #fbeaea;
  }
</style>
</head>
<body>

<h2>❌ Playwright Test Execution Report</h2>
<p><b>Status:</b> <span style="color:#d52828;font-weight:bold;">FAILED</span></p>

<h3>📊 Test Summary</h3>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Build Status</td><td>${env.BUILD_STATUS}</td></tr>
<tr><td>Build Number</td><td>#${env.BUILD_NUMBER}</td></tr>
<tr><td>Job Name</td><td>${env.JOB_NAME}</td></tr>
<tr><td>Total Tests</td><td>${env.TEST_TOTAL}</td></tr>
<tr><td>Passed</td><td>${env.TEST_PASSED}</td></tr>
<tr><td>Failed</td><td>${env.TEST_FAILED}</td></tr>
<tr><td>Skipped</td><td>${env.TEST_SKIPPED}</td></tr>
<tr><td>Browser</td><td>chromium</td></tr>
<tr><td>Duration</td><td>${env.BUILD_DURATION}</td></tr>
</table>

<h3>🧪 Quick Investigation Links</h3>
<ul>
  <li><a href="${env.BUILD_URL}allure">📈 Allure Report</a></li>
  <li><a href="${env.BUILD_URL}artifact/playwright-report/index.html">📊 HTML Report</a></li>
  <li><a href="${env.BUILD_URL}artifact">📁 All Artifacts (screenshots / traces / videos)</a></li>
  <li><a href="${env.BUILD_URL}console">🖥️ Console Log</a></li>
</ul>

<h3>📦 Attachments</h3>
<ul>
  <li>🧾 Jenkins Console Log (compressed)</li>
  <li>📦 playwright-report.zip (if ZIP created)</li>
  <li>🖼️ Screenshots / trace.zip (if generated)</li>
</ul>

<hr>
<p style="font-size:12px;color:#888;">Jenkins Automated Notification</p>

</body>
</html>
                        """
                    )
                }

                echo "📩 FAILURE email sent"
            }
        }

        // =======================
        // UNSTABLE EMAIL (PARTIAL FAILURES)
        // =======================
        unstable {
            script {
                withCredentials([usernamePassword(
                    credentialsId: 'gmail-app-password',
                    usernameVariable: 'SMTP_USER',
                    passwordVariable: 'SMTP_PASS'
                )]) {

                    emailext(
                        to: 'kandalsairaj4271@gmail.com',
                        from: "${SMTP_USER}",
                        replyTo: "${SMTP_USER}",
                        subject: "⚠️ Playwright CI — UNSTABLE — Build #${env.BUILD_NUMBER}",
                        mimeType: 'text/html',
                        attachLog: true,
                        compressLog: true,
                        attachmentsPattern: 'playwright-report.zip',
                        body: """
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; }
  h2 { color: #d58f00; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 10px;
  }
  th, td {
    padding: 8px 12px;
    border: 1px solid #ddd;
    font-size: 13px;
    text-align: left;
  }
  th {
    background-color: #fff7e0;
  }
</style>
</head>
<body>

<h2>⚠️ Playwright Test Execution Report</h2>
<p><b>Status:</b> <span style="color:#d58f00;font-weight:bold;">UNSTABLE (Some tests failed)</span></p>

<h3>📊 Test Summary</h3>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Build Status</td><td>${env.BUILD_STATUS}</td></tr>
<tr><td>Build Number</td><td>#${env.BUILD_NUMBER}</td></tr>
<tr><td>Job Name</td><td>${env.JOB_NAME}</td></tr>
<tr><td>Total Tests</td><td>${env.TEST_TOTAL}</td></tr>
<tr><td>Passed</td><td>${env.TEST_PASSED}</td></tr>
<tr><td>Failed</td><td>${env.TEST_FAILED}</td></tr>
<tr><td>Skipped</td><td>${env.TEST_SKIPPED}</td></tr>
<tr><td>Browser</td><td>chromium</td></tr>
<tr><td>Duration</td><td>${env.BUILD_DURATION}</td></tr>
</table>

<h3>📄 View Reports</h3>
<ul>
  <li><a href="${env.BUILD_URL}allure">📈 Allure Report</a></li>
  <li><a href="${env.BUILD_URL}artifact/playwright-report/index.html">📊 HTML Report</a></li>
  <li><a href="${env.BUILD_URL}artifact">📁 All Artifacts</a></li>
  <li><a href="${env.BUILD_URL}console">🖥️ Console Log</a></li>
</ul>

<h3>📦 Attachments</h3>
<ul>
  <li>🧾 Jenkins Console Log (compressed)</li>
  <li>📦 playwright-report.zip (if exists)</li>
</ul>

<hr>
<p style="font-size:12px;color:#888;">Jenkins Automated Notification</p>

</body>
</html>
                        """
                    )
                }

                echo "📩 UNSTABLE email sent"
            }
        }
    }
}
