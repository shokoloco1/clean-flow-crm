import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locale files
import commonEn from './locales/en/common.json';
import landingEn from './locales/en/landing.json';
import authEn from './locales/en/auth.json';
import dashboardEn from './locales/en/dashboard.json';
import jobsEn from './locales/en/jobs.json';
import clientsEn from './locales/en/clients.json';
import invoicesEn from './locales/en/invoices.json';
import settingsEn from './locales/en/settings.json';

import commonEs from './locales/es/common.json';
import landingEs from './locales/es/landing.json';
import authEs from './locales/es/auth.json';
import dashboardEs from './locales/es/dashboard.json';
import jobsEs from './locales/es/jobs.json';
import clientsEs from './locales/es/clients.json';
import invoicesEs from './locales/es/invoices.json';
import settingsEs from './locales/es/settings.json';

export const resources = {
  en: {
    common: commonEn,
    landing: landingEn,
    auth: authEn,
    dashboard: dashboardEn,
    jobs: jobsEn,
    clients: clientsEn,
    invoices: invoicesEn,
    settings: settingsEn,
  },
  es: {
    common: commonEs,
    landing: landingEs,
    auth: authEs,
    dashboard: dashboardEs,
    jobs: jobsEs,
    clients: clientsEs,
    invoices: invoicesEs,
    settings: settingsEs,
  },
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇦🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'dashboard', 'jobs', 'clients', 'invoices', 'settings'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'pulcrix-language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

export default i18n;
