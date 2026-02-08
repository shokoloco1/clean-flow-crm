import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { supportedLanguages, type SupportedLanguage } from '@/i18n';

export function useLanguage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const language = i18n.language as SupportedLanguage;

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    // Change the language in i18n
    await i18n.changeLanguage(lang);

    // Persist to localStorage (handled by i18n detector, but we ensure it)
    localStorage.setItem('pulcrix-language', lang);

    // If user is logged in, save preference to their profile
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', user.id);
      } catch (error) {
        // Silently fail - localStorage is the primary storage
        console.warn('Failed to save language preference to profile:', error);
      }
    }
  }, [i18n, user?.id]);

  return {
    language,
    setLanguage,
    t,
    i18n,
    supportedLanguages,
  };
}
