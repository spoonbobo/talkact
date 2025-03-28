// if user exists in DB, allows to login
// if not, redirect to profile_create page (different from signup page)

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email;
        const locale = request.nextUrl.searchParams.get('locale');

        return NextResponse.redirect(new URL(`/${locale}/redirect/third_party_login?email=${email}`, request.url));
    } catch (error) {
        console.error("Error in third_party_login redirect:", error);
        return NextResponse.redirect(new URL("/signin", request.url));
    }
}
