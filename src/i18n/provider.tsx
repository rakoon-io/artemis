"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultLocale, type Locale } from "./config";
import { fr, type Messages } from "./dictionaries/fr";

interface LocaleContextValue {
  dict: Messages;
  locale: Locale;
}

const LocaleContext = createContext<LocaleContextValue>({
  dict: fr,
  locale: defaultLocale,
});

/**
 * Fournit le dictionnaire et la langue courante aux composants clients. Le
 * dictionnaire (donnees pures) est resolu cote serveur puis passe en prop.
 */
export function LocaleProvider({
  dict,
  locale,
  children,
}: {
  dict: Messages;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ dict, locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Dictionnaire courant (composant client). */
export function useDict(): Messages {
  return useContext(LocaleContext).dict;
}

/** Langue courante (composant client). */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
