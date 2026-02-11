import en from "../locales/en.json";
import ru from "../locales/ru.json";

export type Locale = "ru" | "en";

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  ru,
  en,
};

export function t(locale: Locale, key: string, vars?: Record<string, string | number>) {
  const template = dictionaries[locale][key] ?? dictionaries.ru[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((acc, [name, value]) => {
    const token = `{{${name}}}`;
    return acc.split(token).join(String(value));
  }, template);
}
