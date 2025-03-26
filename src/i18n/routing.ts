import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['en', 'ja', 'zh-HK'],

    // Used when no locale matches
    defaultLocale: 'zh-HK'
});