export interface ISignupForm {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
}

export interface ISignupErrors {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: string;
}
