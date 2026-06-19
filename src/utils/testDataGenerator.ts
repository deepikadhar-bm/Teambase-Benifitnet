/**
 * Test Data Generator Utility
 * Generates random unique values for test data to avoid duplicates across test runs
 * 
 * Usage:
 * import { TestDataGenerator } from '@utils/testDataGenerator';
 * const email = TestDataGenerator.generateRandomEmail();
 * const empNumber = TestDataGenerator.generateRandomEmployeeNumber();
 */

export class TestDataGenerator {
    /**
     * Generate a random email address
     * Format: sysla.test.{timestamp}+{random}@test.com
     */
    static generateRandomEmail(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `sysla.test.${timestamp}+${random}@test.com`;
    }

    /**
     * Generate a random alternative email address
     * Format: sysla.alt.{timestamp}+{random}@test.com
     */
    static generateRandomAlternativeEmail(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `sysla.alt.${timestamp}+${random}@test.com`;
    }

    /**
     * Generate a random employee number
     * Format: EMP{timestamp}{random}
     * Example: EMP17812596874523456
     */
    static generateRandomEmployeeNumber(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `EMP${timestamp}${random}`;
    }

    /**
     * Generate a unique phone number
     * Format: +971501234{random}
     * Makes it look realistic for UAE
     */
    static generateRandomPhoneNumber(): string {
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `+97150123${random}`;
    }

    /**
     * Generate a random last name
     * Format: Test{random}
     * Example: Test4521
     */
    static generateRandomLastName(): string {
        const random = Math.floor(Math.random() * 100000);
        return `Test${random}`;
    }

    /**
     * Generate a random UID number
     * Format: UID{timestamp}{random}
     */
    static generateRandomUIDNumber(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `UID${timestamp}${random}`;
    }

    /**
     * Generate a random file number
     * Format: FILE{timestamp}{random}
     */
    static generateRandomFileNumber(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `FILE${timestamp}${random}`;
    }

    /**
     * Generate a random national ID number
     * Format: NID{timestamp}{random}
     */
    static generateRandomNationalID(): string {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `NID${timestamp}${random}`;
    }

    /**
     * Generate a random passport number
     * Format: P{random}{timestamp}
     */
    static generateRandomPassportNumber(): string {
        const random = Math.floor(Math.random() * 10000000);
        return `P${random}`;
    }

    /**
     * Generate a random establishment ID
     * Format: EST{timestamp}{random}
     */
    static generateRandomEstablishmentID(): string {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `EST${timestamp}${random}`;
    }

    /**
     * Generate a random annual salary within the bracket
     * Returns value between 4,001 and 12,000 AED per month
     */
    static generateRandomAnnualSalary(): string {
        // Monthly salary between 4,001 and 12,000
        const monthlyMin = 4001;
        const monthlyMax = 12000;
        const monthlySalary = Math.floor(Math.random() * (monthlyMax - monthlyMin + 1)) + monthlyMin;
        const annualSalary = monthlySalary * 12;
        return annualSalary.toString();
    }

    /**
     * Generate a complete unique test member record
     * Returns an object with all unique values pre-generated
     */
    static generateUniqueMemberData() {
        return {
            firstName: 'Sysla',
            lastName: this.generateRandomLastName(),
            dateOfBirth: '01/01/1990',
            gender: 'Male',
            email: this.generateRandomEmail(),
            alternativeEmail: this.generateRandomAlternativeEmail(),
            maritalStatus: 'Single',
            nationality: 'United Arab Emirates',
            employeeNumber: this.generateRandomEmployeeNumber(),
            countryOfResidence: 'United Arab Emirates',
            nationalIDNumber: this.generateRandomNationalID(),
            visaIssuanceLocation: 'Dubai',
            workCity: 'Dubai',
            workArea: 'AL KARAMA',
            residentialCity: 'Dubai',
            residentialArea: 'AL BARSHA FIRST',
            uidNumber: this.generateRandomUIDNumber(),
            fileNumber: this.generateRandomFileNumber(),
            passportNumber: this.generateRandomPassportNumber(),
            phoneNumber: this.generateRandomPhoneNumber(),
            commissionBased: 'No',
            salaryBracket: 'Between AED 4,001 and 12,000 per month',
            salaryType: 'Basic',
            salaryCurrency: 'UAE Dirham (AED)',
            annualSalary: this.generateRandomAnnualSalary(),
            additionDate: '11/06/2026',
            establishmentType: 'Establishment',
            establishmentID: this.generateRandomEstablishmentID(),
            memberType: '4 = Expat who\'s residency is issued in Dubai',
            relation: 'Principal',
            subMemberType: 'New Comer',
        };
    }

    /**
     * Get formatted test member data for Excel writing
     * Maps snake_case to Excel column names with (*) 
     */
    static getFormattedMemberDataForExcel() {
        const data = this.generateUniqueMemberData();
        return {
            'First Name (*)': data.firstName,
            'Last Name (*)': data.lastName,
            'Date Of Birth (*)': data.dateOfBirth,
            'Gender (*)': data.gender,
            'Email (*)': data.email,
            'Alternative Email (*)': data.alternativeEmail,
            'Addition Date (*)': data.additionDate,
            'Marital Status (*)': data.maritalStatus,
            'Nationality (*)': data.nationality,
            'Employee Number (*)': data.employeeNumber,
            'Country of Residence (*)': data.countryOfResidence,
            'National ID Number (*)': data.nationalIDNumber,
            'Visa Issuance Location (*)': data.visaIssuanceLocation,
            'Work City (*)': data.workCity,
            'Work Area (*)': data.workArea,
            'Residential City (*)': data.residentialCity,
            'Residential Area (*)': data.residentialArea,
            'UID Number (*)': data.uidNumber,
            'File Number (*)': data.fileNumber,
            'Passport Number (*)': data.passportNumber,
            'Phone Number (*)': data.phoneNumber,
            'Commission Based (*)': data.commissionBased,
            'Salary Bracket (*)': data.salaryBracket,
            'Salary Type (*)': data.salaryType,
            'Salary Currency (*)': data.salaryCurrency,
            'Annual Salary (*)': data.annualSalary,
            'Establishment Type (*)': data.establishmentType,
            'Establishment ID (*)': data.establishmentID,
            'Member Type (*)': data.memberType,
            'Relation (*)': data.relation,
            'Sub-Member Type (*)  (HAAD required)': data.subMemberType,
        };
    }

    /**
     * Log generated data for debugging
     */
    static logGeneratedData(): void {
        const data = this.generateUniqueMemberData();
        console.log('═══════════════════════════════════════');
        console.log('GENERATED UNIQUE TEST MEMBER DATA');
        console.log('═══════════════════════════════════════');
        console.log(`First Name        : ${data.firstName}`);
        console.log(`Last Name         : ${data.lastName}`);
        console.log(`Email             : ${data.email}`);
        console.log(`Alt Email         : ${data.alternativeEmail}`);
        console.log(`Employee Number   : ${data.employeeNumber}`);
        console.log(`National ID       : ${data.nationalIDNumber}`);
        console.log(`Passport Number   : ${data.passportNumber}`);
        console.log(`Phone Number      : ${data.phoneNumber}`);
        console.log(`Annual Salary     : ${data.annualSalary}`);
        console.log('═══════════════════════════════════════');
    }
}