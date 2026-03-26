import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang } from '../i18n/translations';

const LANG_KEY = '@app_language';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export const useLang = () => useContext(Ctx);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(v => {
      if (v && (v === 'en' || v === 'hi' || v === 'gu')) setLangState(v as Lang);
    }).catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const t = useCallback((key: string): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
};
