// ============================================================================
//  DATA FILTER UTILITY v3
//  - AUTO-DISCOVERS all JSON files from test-data/json-files/ folder
//  - No fileName needed — drop a JSON file in the folder and it's picked up
//  - Non-test-data JSON files (no "sets":[]) are silently skipped
//  - Supports multiple filter types and comparison metrics
//  - Validates data files exist with clear error messages
//  - Logs every file loaded and which sets will run
//  - Supports env override: TEST_SETS=Set2,Set3 npx playwright test
//  - Supports file override: TEST_FILE=loginTestData npx playwright test
//
//  USAGE:
//    // Auto-load ALL JSON files in test-data/json-files/ — no args needed
//    const data = loadTestData<LoginTestCase>();
//
//    // Load only one specific file
//    const data = loadTestData<LoginTestCase>({ fileName: 'loginTestData' });
//
//    // Load with comparison filter
//    const data = loadTestData<LoginTestCase>({
//      fileName:   'loginTestData',
//      comparison: 'between',
//      from:       'Valid credentials',
//      to:         'Empty password only',
//    });
// ============================================================================

import * as fs   from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterType       = 'setName' | 'index';
export type ComparisonMetric = 'between' | 'equalTo' | 'greaterThan' | 'lessThan' | 'all';

export interface DataFilterOptions {
    fileName?:    string;          // optional — omit to auto-load ALL JSON files
    filterType?:  FilterType;
    comparison?:  ComparisonMetric;
    from?:        string | number;
    to?:          string | number;
    onlyEnabled?: boolean;
}

// ─── Constant — single source of truth for the data folder ───────────────────
//     All JSON files in this folder are auto-discovered.
//     Files without a "sets":[] array (e.g. benefitnet_test_data.json) are
//     silently skipped — no changes needed to those files.

const TEST_DATA_DIR = path.resolve(process.cwd(), 'test-data', 'json-files');

// ─── Main export ──────────────────────────────────────────────────────────────

export function loadTestData<T extends { setName: string; enabled: boolean }>(
    options: DataFilterOptions = {}
): T[] {

    const {
        filterType  = 'setName',
        comparison  = 'all',
        from,
        to,
        onlyEnabled = true,
    } = options;

    // ── Validate the data folder exists ───────────────────────────────────────
    if (!fs.existsSync(TEST_DATA_DIR)) {
        throw new Error(
            `[loadTestData] Data folder not found:\n` +
            `  Expected : test-data/json-files/\n` +
            `  Full path: ${TEST_DATA_DIR}\n` +
            `  Fix      : Create the folder and place your JSON files inside it.`
        );
    }

    // ── ENV FILE OVERRIDE — TEST_FILE=loginTestData npx playwright test ───────
    const envFile = process.env.TEST_FILE ?? options.fileName;

    // ── Resolve which JSON files to load ──────────────────────────────────────
    let filesToLoad: string[] = [];

    if (envFile) {
        // Single file mode
        const singlePath = path.join(TEST_DATA_DIR, `${envFile}.json`);
        if (!fs.existsSync(singlePath)) {
            throw new Error(
                `[loadTestData] File not found: test-data/json-files/${envFile}.json\n` +
                `Available files in folder: ${getAvailableFiles().join(', ') || 'none'}`
            );
        }
        filesToLoad = [singlePath];
        console.log(`[loadTestData] Loading file: ${envFile}.json`);

    } else {
        // Auto-discover mode — load ALL .json files in the folder
        filesToLoad = getAvailableFilePaths();
        if (filesToLoad.length === 0) {
            throw new Error(
                `[loadTestData] No JSON files found in test-data/json-files/\n` +
                `Add at least one .json file with a "sets": [] structure.`
            );
        }
        console.log(`[loadTestData] Auto-discovered ${filesToLoad.length} file(s) in test-data/json-files/:`);
        filesToLoad.forEach(f => console.log(`  → ${path.basename(f)}`));
    }

    // ── Load sets from all resolved files ─────────────────────────────────────
    // Files without a "sets":[] key (e.g. benefitnet_test_data.json) are
    // silently skipped — they are not test-set files.
    let allSets: T[] = [];

    for (const filePath of filesToLoad) {
        const fileName = path.basename(filePath, '.json');
        const sets     = readSetsFromFile<T>(filePath, fileName);
        if (sets.length > 0) {
            console.log(`[loadTestData] "${fileName}.json" → ${sets.length} set(s) loaded`);
        }
        allSets = [...allSets, ...sets];
    }

    if (allSets.length === 0) {
        throw new Error(
            `[loadTestData] No sets found in any loaded file.\n` +
            `Ensure at least one JSON file has a "sets": [] array with entries.`
        );
    }

    // ── ENV SETS OVERRIDE — TEST_SETS=Set1,Set2 npx playwright test ───────────
    const envSets = process.env.TEST_SETS;
    if (envSets) {
        const envNames = envSets.split(',').map(s => s.trim());
        const filtered = allSets.filter(s => envNames.includes(s.setName));
        console.log(`[loadTestData] ENV override TEST_SETS="${envSets}" → ${filtered.length} set(s)`);
        logFinalSets(filtered);
        return filtered;
    }

    // ── Step 1: Apply enabled filter ──────────────────────────────────────────
    if (onlyEnabled) {
        const before  = allSets.length;
        allSets       = allSets.filter(s => s.enabled === true);
        const skipped = before - allSets.length;
        if (skipped > 0) {
            console.log(`[loadTestData] Skipped ${skipped} disabled set(s)`);
        }
    }

    // ── Step 2: Apply comparison filter ───────────────────────────────────────
    if (comparison !== 'all' && (from !== undefined || to !== undefined)) {
        allSets = applyFilter<T>(allSets, filterType, comparison, from, to);
    }

    // ── Validate at least one set remains ─────────────────────────────────────
    if (allSets.length === 0) {
        throw new Error(
            `[loadTestData] No sets matched the filter: ${JSON.stringify(options)}\n` +
            `Check your from/to values match setNames in the JSON.`
        );
    }

    logFinalSets(allSets);
    return allSets;
}

// ─── Private — read sets from a single JSON file ──────────────────────────────
// Returns [] silently if the file has no "sets" array (not a test-set file).

function readSetsFromFile<T extends { setName: string; enabled: boolean }>(
    filePath: string,
    fileName: string
): T[] {
    let raw: any;
    try {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        throw new Error(
            `[loadTestData] Failed to parse "${fileName}.json"\n` +
            `  Error    : ${e}\n` +
            `  Location : ${filePath}\n` +
            `  Fix      : Ensure the file contains valid JSON.`
        );
    }

    // Not a test-set file — skip silently (e.g. benefitnet_test_data.json)
    if (!Array.isArray(raw.sets)) {
        console.log(`[loadTestData] Skipping "${fileName}.json" — no "sets": [] found`);
        return [];
    }

    return raw.sets as T[];
}

// ─── Private — get all .json file paths from the data folder ─────────────────

function getAvailableFilePaths(): string[] {
    return fs
        .readdirSync(TEST_DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(TEST_DATA_DIR, f));
}

function getAvailableFiles(): string[] {
    return fs.existsSync(TEST_DATA_DIR)
        ? fs.readdirSync(TEST_DATA_DIR).filter(f => f.endsWith('.json'))
        : [];
}

// ─── Private — log which sets will run ───────────────────────────────────────

function logFinalSets<T extends { setName: string }>(sets: T[]): void {
    console.log(`[loadTestData] ${sets.length} set(s) will run:`);
    sets.forEach((s, i) => console.log(`  ${i + 1}. ${s.setName}`));
}

// ─── Private — setName / index filter logic ───────────────────────────────────

function applyFilter<T extends { setName: string; enabled: boolean }>(
    sets:       T[],
    filterType: FilterType,
    comparison: ComparisonMetric,
    from?:      string | number,
    to?:        string | number
): T[] {

    if (filterType === 'setName') {
        const names = sets.map(s => s.setName);
        switch (comparison) {

            case 'equalTo':
                return sets.filter(s => s.setName === String(from));

            case 'greaterThan': {
                const i = names.indexOf(String(from));
                return i === -1 ? [] : sets.slice(i + 1);
            }

            case 'lessThan': {
                const i = names.indexOf(String(from));
                return i === -1 ? [] : sets.slice(0, i);
            }

            case 'between': {
                const fi = names.indexOf(String(from));
                const ti = names.indexOf(String(to));
                if (fi === -1) throw new Error(`[loadTestData] "from" set not found: "${from}"`);
                if (ti === -1) throw new Error(`[loadTestData] "to" set not found: "${to}"`);
                return sets.slice(fi, ti + 1);
            }

            default: return sets;
        }

    } else {
        // index-based filter (1-based)
        const f = Number(from);
        const t = Number(to);
        switch (comparison) {
            case 'equalTo':     return sets.filter((_, i) => i + 1 === f);
            case 'greaterThan': return sets.filter((_, i) => i + 1 >   f);
            case 'lessThan':    return sets.filter((_, i) => i + 1 <   f);
            case 'between':     return sets.filter((_, i) => i + 1 >= f && i + 1 <= t);
            default:            return sets;
        }
    }
}