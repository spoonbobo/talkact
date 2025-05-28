/*
Map 3rd party login to App Login.
*/

"use client"

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser, setLastOpenedTeam } from '@/store/features/userSlice'; // Adjust import path as needed
import { useTranslations } from 'next-intl'; // If you're using next-intl for translations
import { useParams } from 'next/navigation';
import { toaster } from '@/components/ui/toaster';
import Loading from '@/components/loading';

export default function ThirdPartyLoginRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const t = useTranslations('Auth'); // Adjust namespace as needed
    const params = useParams();
    const locale = params.locale as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const email = searchParams.get('email');
    const avatarUrl = searchParams.get('avatarUrl');

    useEffect(() => {
        async function handleAuthRedirect() {
            try {
                if (!email) {
                    throw new Error('Email not provided in redirect');
                }

                // Fetch user data from your API
                const response = await fetch(`/api/user/get_user?email=${encodeURIComponent(email)}`);
                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 404) {
                        router.push(`/${locale}/signup/new_profile?email=${encodeURIComponent(email)}`);
                        return;
                    }
                    // Other errors
                    throw new Error(data.error || 'Failed to fetch user data');
                }

                if (data.exists && data.user) {
                    // Store user in Redux
                    dispatch(setUser(data.user));
                    const user_locale = data.user.settings?.general?.language || locale;

                    // Show success toast
                    toaster.create({
                        title: t('signin_success'),
                        description: t('signin_success_description'),
                        type: "info"
                    });

                    let teamId = null;
                    // Redirect users to join/ create a team
                    // user cannot login without a team
                    console.log("data.user", data.user);
                    const teams = data.user.teams || [];
                    if (!teams || teams.length === 0) {
                        router.push(`/${locale}/signup/new_team`);
                        return;
                    } else {
                        // Check if user has a lastOpenedTeam and it's in their teams list
                        if (data.user.lastOpenedTeam && teams.includes(data.user.lastOpenedTeam)) {
                            teamId = data.user.lastOpenedTeam;
                        } else {
                            // Otherwise use the first team
                            teamId = teams[0];
                        }

                        // Store the selected teamId in Redux
                        dispatch(setLastOpenedTeam(teamId));
                    }

                    // Redirect to dashboard or home with locale
                    router.push(`/${user_locale || locale}/${teamId}`);
                } else {
                    router.push(`/${locale}/signup/new_profile?email=${encodeURIComponent(email)}&avatarUrl=${avatarUrl}`);
                }
            } catch (err) {
                setError((err as Error).message);

                toaster.create({
                    title: 'Authentication Error.',
                    description: (err as Error).message
                });
            } finally {
                setLoading(false);
            }
        }

        handleAuthRedirect();
    }, [dispatch, router, searchParams, t, locale, email, avatarUrl]);

    // Loading state
    if (loading) {
        return <Loading
            message={t('loading_authentication')}
            description={t('please_wait_while_we_verify_your_account')}
        />;
    }

    // Error state
    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="error-icon mb-4">❌</div>
                    <h2 className="text-xl font-bold mb-2">{t('authentication_error')}</h2>
                    <p className="text-red-500">{error}</p>
                    <button
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                        onClick={() => router.push(`/${locale}/signin`)}
                    >
                        {t('back_to_signin')}
                    </button>
                </div>
            </div>
        );
    }

    // This should rarely be seen as we redirect on success
    return null;
}