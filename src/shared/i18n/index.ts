import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import uk from './locales/uk.json';

const resources = {
  en: { translation: en },
  uk: { translation: uk },
};

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const fallbackLanguage = 'en';

// Guard against Metro Fast Refresh re-running this module and re-initializing the
// already-initialized singleton (i18next logs a warning on every re-init otherwise).
if (!i18n.isInitialized) {
  // i18next's default export also has a named `use` member; eslint-plugin-import can't tell
  // this is the standard i18next.use(...).init(...) chain, not an accidental named import.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: deviceLanguage in resources ? deviceLanguage : fallbackLanguage,
      fallbackLng: fallbackLanguage,
      interpolation: {
        escapeValue: false,
      },
    })
    .catch((error: unknown) => {
      console.error('i18n init failed', error);
    });
}

export default i18n;
