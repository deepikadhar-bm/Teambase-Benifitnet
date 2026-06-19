import * as fs   from 'fs';
import * as path from 'path';

export type InputType = 'text' | 'dropdown' | 'checkbox' | 'formula';

export interface ColumnSchema {
    excelHeader:    string;
    fieldKey:       string;
    mandatory:      boolean;
    inputType:      InputType;
    referenceSheet: string | null;
    allowedValues?: string[];
    notes:          string | null;
}

export interface TestProfile {
    profileName: string;
    description: string;
    memberData:  Record<string, string>;
    notes:       string | null;
}

export interface BenefitNetTemplate {
    templateName:       string;
    company:            string;
    policy:             string;
    createdAt:          string;
    description:        string;
    columns:            ColumnSchema[];
    testProfiles:       TestProfile[];
    defaultFieldValues: Record<string, string>;
}

interface NameEntry {
    lastName: string;
    gender:   'Male' | 'Female';
}

function generateUniqueDOB(): string {
    const year  = Math.floor(Math.random() * (2000 - 1970 + 1)) + 1970;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day   = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

function generateUniqueNationalId(): string {
    const digits = Math.floor(Math.random() * 900_000_000) + 100_000_000;
    return `NID${digits}`;
}

function generateUniqueEmployeeNumber(): string {
    return `EMP${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
}

function generateUniqueUidNumber(): string {
    // BenefitNet constraint: minimum 4 digits, number digits only — no letters or symbols
    const digits = Math.floor(Math.random() * 900_000_000) + 100_000_000;
    return String(digits);
}

function generateUniqueFileNumber(): string {
    // BenefitNet likely shares same digits-only constraint as UID Number
    const digits = Math.floor(Math.random() * 900_000_000) + 100_000_000;
    return String(digits);
}

function generateUniquePassportNumber(): string {
    // Standard UAE passport format: 1 letter + 7 digits e.g. A1234567
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix  = letters[Math.floor(Math.random() * letters.length)];
    const digits  = Math.floor(Math.random() * 9_000_000) + 1_000_000;
    return `${prefix}${digits}`;
}

function generateUniquePhoneNumber(): string {
    // UAE mobile format: 05XXXXXXXX (10 digits, no + prefix)
    const digits = Math.floor(Math.random() * 90_000_000) + 10_000_000;
    return `05${digits}`;
}

function generateUniqueEstablishmentId(): string {
    // Digits only — no prefix in case BenefitNet enforces same numeric-only rule
    const digits = Math.floor(Math.random() * 900_000) + 100_000;
    return String(digits);
}

function generateEmail(_firstName: string, _lastName: string): string {
    const threeDigits = Math.floor(Math.random() * 900) + 100;
    return `syslatech${threeDigits}@yopmail.com`;
}

function getCurrentIndianDate(): string {
    return new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric',
    });
}

function currentTimestamp(): string {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12:   false,
        year:     'numeric',
        month:    '2-digit',
        day:      '2-digit',
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
    }) + ' IST';
}

export interface RuntimeData {
    firstName:        string;
    lastName:         string;
    gender:           'Male' | 'Female';
    email:            string;
    dob:              string;
    additionDate:     string;
    employeeNumber:   string;
    nationalIdNumber: string;
    uidNumber:        string;
    fileNumber:       string;
    passportNumber:   string;
    phoneNumber:      string;
    establishmentId:  string;
    timestamp:        string;
}

class TestDataManagerClass {

    private template: BenefitNetTemplate;

    private readonly validationErrorToFieldKey: Record<string, string> = {
        'Gender':                 'gender',
        'First Name':             'firstName',
        'Last Name':              'lastName',
        'Date Of Birth':          'dateOfBirth',
        'Email':                  'email',
        'Marital Status':         'maritalStatus',
        'Nationality':            'nationality',
        'Relation':               'relation',
        'Category':               'category',
        'Sub-Member Type':        'subMemberType',
        'Employee Number':        'employeeNumber',
        'Country of Residence':   'countryOfResidence',
        'National ID Number':     'nationalIdNumber',
        'Visa Issuance Location': 'visaIssuanceLocation',
        'Work City':              'workCity',
        'Work Area':              'workArea',
        'Residential City':       'residentialCity',
        'Residential Area':       'residentialArea',
        'UID Number':             'uidNumber',
        'File Number':            'fileNumber',
        'Passport Number':        'passportNumber',
        'Phone Number':           'phoneNumber',
        'Commission Based':       'commissionBased',
        'Salary Bracket':         'salaryBracket',
        'Salary Type':            'salaryType',
        'Salary Currency':        'salaryCurrency',
        'Annual Salary':          'annualSalary',
        'Addition Date':          'additionDate',
        'Establishment Type':     'establishmentType',
        'Establishment ID':       'establishmentId',
        'Member Type':            'memberType',
    };

    private readonly dynamicFieldKeys = new Set([
        'firstName', 'lastName', 'gender', 'email',
        'dob', 'additionDate', 'employeeNumber', 'nationalIdNumber',
        'uidNumber', 'fileNumber', 'passportNumber', 'phoneNumber',
        'establishmentId',
    ]);

    constructor() {
        const candidatePaths = [
            path.resolve(process.cwd(), 'test-data', 'json-files', 'benefitnet_test_data.json'),
        ];
        const filePath = candidatePaths.find(p => fs.existsSync(p));
        if (!filePath) {
            throw new Error(`TestDataManager: Cannot locate JSON file.\nTried:\n${candidatePaths.join('\n')}`);
        }
        try {
            const raw              = fs.readFileSync(filePath, 'utf-8');
            const parsed: BenefitNetTemplate[] = JSON.parse(raw);
            this.template          = parsed[0];
        } catch (e) {
            throw new Error(`TestDataManager: Cannot load JSON → ${filePath}\n${e}`);
        }
    }

    getCompany():   string { return this.template.company; }
    getPolicy():    string { return this.template.policy; }
    getCreatedAt(): string { return this.template.createdAt; }

    static buildCreatedAtIST(): string {
        return new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata', hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }) + ' IST';
    }

    getAllColumns():        ColumnSchema[]  { return this.template.columns; }
    getMandatoryColumns(): ColumnSchema[]  { return this.template.columns.filter(c => c.mandatory); }
    getDropdownColumns():  ColumnSchema[]  { return this.template.columns.filter(c => c.inputType === 'dropdown' && c.allowedValues?.length); }
    getColumn(fieldKey: string): ColumnSchema | undefined { return this.template.columns.find(c => c.fieldKey === fieldKey); }
    getExcelHeader(fieldKey: string): string | undefined  { return this.getColumn(fieldKey)?.excelHeader; }

    getProfile(profileName: string): TestProfile {
        const profile = this.template.testProfiles.find(p => p.profileName === profileName);
        if (!profile) {
            throw new Error(
                `BenefitNetTestDataManager: Profile not found → "${profileName}"\n` +
                `Available:\n  ${this.template.testProfiles.map(p => p.profileName).join('\n  ')}`
            );
        }
        return profile;
    }

    listProfileNames(): string[] { return this.template.testProfiles.map(p => p.profileName); }

    getDefaultFieldValues(): Record<string, string> { return this.template.defaultFieldValues; }
    getDefaultValue(fieldKey: string): string | undefined { return this.template.defaultFieldValues[fieldKey]; }

    generateRuntimeData(): RuntimeData {
        const digits    = Math.floor(Math.random() * 90000) + 10000;
        const lastName  = `Test${digits}`;
        const gender    = Math.random() < 0.5 ? 'Female' : 'Male' as 'Male' | 'Female';
        const firstName = 'Sysla';
        return this.buildRuntimeData(firstName, lastName, gender);
    }

    generateRuntimeDataForGender(gender: 'Male' | 'Female'): RuntimeData {
        const digits    = Math.floor(Math.random() * 90000) + 10000;
        const lastName  = `Test${digits}`;
        const firstName = 'Sysla';
        return this.buildRuntimeData(firstName, lastName, gender);
    }

    private buildRuntimeData(firstName: string, lastName: string, gender: 'Male' | 'Female'): RuntimeData {
        return {
            firstName,
            lastName,
            gender,
            email:            generateEmail(firstName, lastName),
            dob:              generateUniqueDOB(),
            additionDate:     getCurrentIndianDate(),
            employeeNumber:   generateUniqueEmployeeNumber(),
            nationalIdNumber: generateUniqueNationalId(),
            uidNumber:        generateUniqueUidNumber(),
            fileNumber:       generateUniqueFileNumber(),
            passportNumber:   generateUniquePassportNumber(),
            phoneNumber:      generateUniquePhoneNumber(),
            establishmentId:  generateUniqueEstablishmentId(),
            timestamp:        currentTimestamp(),
        };
    }

    resolvePlaceholders(
        profileData:    Record<string, string>,
        runtimeData:    RuntimeData,
        policyCategory: string = ''
    ): Record<string, string> {
        const resolved: Record<string, string> = {};

        const replacements: Record<string, string> = {
            '__DYNAMIC__firstName':         runtimeData.firstName,
            '__DYNAMIC__lastName':          runtimeData.lastName,
            '__DYNAMIC__gender':            runtimeData.gender,
            '__DYNAMIC__email':             runtimeData.email,
            '__DYNAMIC__dob':               runtimeData.dob,
            '__DYNAMIC__additionDate':      runtimeData.additionDate,
            '__DYNAMIC__employeeNumber':    runtimeData.employeeNumber,
            '__DYNAMIC__nationalIdNumber':  runtimeData.nationalIdNumber,
            '__DYNAMIC__uidNumber':         runtimeData.uidNumber,
            '__DYNAMIC__fileNumber':        runtimeData.fileNumber,
            '__DYNAMIC__passportNumber':    runtimeData.passportNumber,
            '__DYNAMIC__phoneNumber':       runtimeData.phoneNumber,
            '__DYNAMIC__establishmentId':   runtimeData.establishmentId,
            '__POLICY_CATEGORY__':          policyCategory,
        };

        for (const [key, value] of Object.entries(profileData)) {
            if (replacements[value] !== undefined) {
                resolved[key] = replacements[value];
            } else if (value.startsWith('__DYNAMIC__')) {
                resolved[key] = replacements[value] ?? value;
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }

    buildExcelRow(memberData: Record<string, string>): Record<string, string> {
        const excelRow: Record<string, string> = {};
        for (const [fieldKey, value] of Object.entries(memberData)) {
            const col = this.getColumn(fieldKey);
            if (!col)                        continue;
            if (col.inputType === 'formula') continue;
            if (!value)                      continue;
            excelRow[col.excelHeader] = value;
        }
        return excelRow;
    }

    resolveMissingFields(
        missingDisplayNames: string[],
        overrides:           Record<string, string> = {},
        policyCategory:      string = '',
        runtimeData?:        RuntimeData
    ): Record<string, string> {
        const result: Record<string, string> = {};

        for (const displayName of missingDisplayNames) {
            const fieldKey = this.validationErrorToFieldKey[displayName];
            if (!fieldKey) continue;

            const col = this.getColumn(fieldKey);
            if (!col) continue;

            let value: string | undefined;

            if (overrides[fieldKey]) {
                value = overrides[fieldKey];
            } else if (fieldKey === 'category') {
                value = policyCategory;
            } else if (this.dynamicFieldKeys.has(fieldKey) && runtimeData) {
                const runtimeMap: Record<string, string> = {
                    firstName:        runtimeData.firstName,
                    lastName:         runtimeData.lastName,
                    gender:           runtimeData.gender,
                    email:            runtimeData.email,
                    dob:              runtimeData.dob,
                    additionDate:     runtimeData.additionDate,
                    employeeNumber:   runtimeData.employeeNumber,
                    nationalIdNumber: runtimeData.nationalIdNumber,
                    uidNumber:        runtimeData.uidNumber,
                    fileNumber:       runtimeData.fileNumber,
                    passportNumber:   runtimeData.passportNumber,
                    phoneNumber:      runtimeData.phoneNumber,
                    establishmentId:  runtimeData.establishmentId,
                };
                value = runtimeMap[fieldKey];
            } else {
                value = this.template.defaultFieldValues[fieldKey];
            }

            if (value) result[col.excelHeader] = value;
        }

        return result;
    }

    isValidDropdownValue(fieldKey: string, value: string): boolean {
        const col = this.getColumn(fieldKey);
        if (!col || !col.allowedValues) return true;
        return col.allowedValues.includes(value);
    }

    getAllowedValues(fieldKey: string): string[] | undefined {
        return this.getColumn(fieldKey)?.allowedValues;
    }
}

export const testDataManager = new TestDataManagerClass();