import { create } from 'zustand'
import { ptBR, type Dictionary } from './locales/pt-BR'

export type Locale = 'pt-BR'

const dictionaries: Record<Locale, Dictionary> = {
  'pt-BR': ptBR,
}

type Path<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? `${K}.${Path<T[K]>}` : K }[keyof T & string]
  : never

export type TranslationKey = Path<Dictionary>

function resolve(dict: Dictionary, key: string): string | undefined {
  const parts = key.split('.')
  let node: unknown = dict
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  )
}

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: 'pt-BR',
  setLocale: (locale) => set({ locale }),
}))

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const value = resolve(dictionaries[locale], key)
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  return interpolate(value, vars)
}

export function useTranslation() {
  const locale = useI18nStore((s) => s.locale)
  const setLocale = useI18nStore((s) => s.setLocale)
  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  return { t, locale, setLocale }
}
