import { describe, expect, it } from 'vitest'
import { translate } from './index'

describe('translate', () => {
  it('resolves a nested key', () => {
    expect(translate('pt-BR', 'auth.signIn')).toBe('Entrar')
  })

  it('falls back to the key when missing', () => {
    // @ts-expect-error intentionally invalid key for the fallback test
    expect(translate('pt-BR', 'nope.missing')).toBe('nope.missing')
  })
})
