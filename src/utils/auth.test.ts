import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_TOKEN_STORAGE_KEY,
  getAuthToken,
  getAuthTokenInfo,
  getApiKeyHeader,
  setStoredAuthToken,
} from '@/utils/auth'

describe('auth utilities', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.unstubAllEnvs()
  })

  it('prefers the stored token over the environment token', () => {
    vi.stubEnv('VITE_API_TOKEN', 'env-token')

    setStoredAuthToken(' page-token ')

    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('page-token')
    expect(getAuthToken()).toBe('page-token')
    expect(getAuthTokenInfo()).toEqual({
      token: 'page-token',
      source: 'stored',
    })
    expect(getApiKeyHeader()).toBe('page-token')
  })

  it('falls back to the environment token after clearing the stored token', () => {
    vi.stubEnv('VITE_API_TOKEN', 'env-token')

    setStoredAuthToken('page-token')
    setStoredAuthToken('')

    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(getAuthTokenInfo()).toEqual({
      token: 'env-token',
      source: 'env',
    })
    expect(getApiKeyHeader()).toBe('env-token')
  })

  it('uses the configured token as the API key header value', () => {
    setStoredAuthToken('signed-token')

    expect(getApiKeyHeader()).toBe('signed-token')
  })
})
