import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            // @ts-ignore
            clientId: process.env.GOOGLE_CLIENT_ID,
            // @ts-ignore
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GithubProvider({
            // @ts-ignore
            clientId: process.env.GITHUB_ID,
            // @ts-ignore
            clientSecret: process.env.GITHUB_SECRET,
            checks: ['none'],
        }),
    ],
    // Add these configuration options to fix the state cookie issue
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "none",
                path: "/",
                secure: true,
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: "none",
                path: "/",
                secure: true,
            },
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "none",
                path: "/",
                secure: true,
            },
        },
        pkceCodeVerifier: {
            name: "next-auth.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: "none",
                path: "/",
                secure: true,
                maxAge: 900
            },
        },
        state: {
            name: "next-auth.state",
            options: {
                httpOnly: true,
                sameSite: "none",
                path: "/",
                secure: true,
                maxAge: 900
            },
        },
    },
    // Add this to ensure proper URL handling
    useSecureCookies: true,
    // Add debug mode to see more detailed logs
    debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST }