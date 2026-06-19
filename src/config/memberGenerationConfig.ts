import testData from 'test-data/json-files/benefitnet_test_data.json';

/**
 * Single source of truth for member generation configuration across all test cases
 * Define the number of members and the gender pattern here
 * The pattern will repeat as needed based on the number of members
 */

// ==================== CONFIGURATION ====================
// Number of members to generate for each test
export const NUMBER_OF_MEMBERS = 5;

// Gender pattern - will repeat based on NUMBER_OF_MEMBERS
// Example: ['Male', 'Male', 'Female', 'Female', 'Female', 'Male']
// For 6 members: Male, Male, Female, Female, Female, Male
// For 12 members: Male, Male, Female, Female, Female, Male, Male, Male, Female, Female, Female, Male
export const GENDER_PATTERN = ['Male', 'Male', 'Female', 'Female', 'Female', 'Male'];
// =======================================================

/**
 * Helper function to get the gender for a member at a specific index
 * @param index - The 0-based index of the member
 * @returns The gender ('Male' or 'Female')
 */
export function getGenderForMemberIndex(index: number): 'Male' | 'Female' {
    return GENDER_PATTERN[index % GENDER_PATTERN.length] as 'Male' | 'Female';
}

/**
 * Helper function to get profile name based on gender
 * @param gender - The gender ('Male' or 'Female')
 * @param round - The round number (1 or 2)
 * @param roundType - Type of round ('Partial' or 'Full')
 * @returns The profile name
 */
export function getProfileNameByGender(gender: string, round: number, roundType: 'Partial' | 'Full'): string {
    const profileMap: { [key: string]: { [key: number]: { [key: string]: string } } } = {
        'Male': {
            1: {
                'Partial': 'User Profile 1 - Male Principal Member (Round 1 Partial)',
                'Full': 'User Profile 1 - Male Principal Member (Round 2 Full)'
            },
            2: {
                'Partial': 'User Profile 1 - Male Principal Member (Round 1 Partial)',
                'Full': 'User Profile 1 - Male Principal Member (Round 2 Full)'
            }
        },
        'Female': {
            1: {
                'Partial': 'User Profile 2 - Female Principal Member (Round 1 Partial)',
                'Full': 'User Profile 2 - Female Principal Member (Round 2 Full)'
            },
            2: {
                'Partial': 'User Profile 2 - Female Principal Member (Round 1 Partial)',
                'Full': 'User Profile 2 - Female Principal Member (Round 2 Full)'
            }
        }
    };
    
    return profileMap[gender]?.[round]?.[roundType] || '';
}

/**
 * Returns a uniformly random element from the given array.
 */
export function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns the allowedValues list for a dropdown field from the BenefitNet test data schema.
 * Fields without an allowedValues list (e.g. free-text or reference-sheet-only dropdowns) return [].
 */
export function getDropdownValues(fieldKey: string): string[] {
    const columns: any[] = (testData as any[])[0]?.columns ?? [];
    const col = columns.find((c: any) => c.fieldKey === fieldKey);
    return col?.allowedValues ?? [];
}
