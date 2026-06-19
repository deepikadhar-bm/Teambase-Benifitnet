export type ErrorField = 'credential' | 'username' | 'password' | 'both' | null;

export interface LoginTestCase {
    testName: string;
    username: string;
    password: string;
    expected: 'success' | 'failure';
    errorField: ErrorField;
    errorMsg?: string;
}

// BenefitNet Login Test Data
export const bnLoginData: LoginTestCase[] = [
    {
        testName: 'Valid credentials',
        username: 'syslatech_broker1',
        password: 'Test@1234567',
        expected: 'success',
        errorField: null,
    },
    {
        testName: 'Wrong username and password',
        username: 'wrong@bn.com',
        password: 'WrongPass',
        expected: 'failure',
        errorField: 'credential',
        errorMsg: 'The user name or password provided is incorrect',
    },
    {
        testName: 'Empty username only',
        username: '',
        password: 'Admin@123',
        expected: 'failure',
        errorField: 'username',
        errorMsg: 'The User name field is required',
    },
    {
        testName: 'Empty password only',
        username: 'admin@benefitnet.com',
        password: '',
        expected: 'failure',
        errorField: 'password',
        errorMsg: 'The Password field is required',
    },
    {
        testName: 'Both fields empty',
        username: '',
        password: '',
        expected: 'failure',
        errorField: 'both', 
        errorMsg: 'The user name or password provided is incorrect',   
    },
    {
        testName: 'User email not specified',
        username: 'notanemail',
        password: 'Admin@123',
        expected: 'failure',
        errorField: 'credential',
        errorMsg: 'User email is not specified',
    },
];

export const timeouts = {
    short: 5000,
    medium: 10000,
    long: 30000,
    extraLong: 60000,
};