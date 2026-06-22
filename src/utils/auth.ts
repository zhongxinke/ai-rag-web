export const AUTH_TOKEN_STORAGE_KEY = 'ai-rag-web.auth-token'
export const AUTH_TOKEN_CHANGE_EVENT = 'ai-rag-web:auth-token-changed'
export const API_KEY_HEADER = 'X-API-Key'

export type AuthTokenSource = 'stored' | 'env' | 'none'

export interface AuthTokenInfo {
  token: string
  source: AuthTokenSource
}

function readEnvToken() {
  return (import.meta.env.VITE_API_TOKEN || '').trim()
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getStoredAuthToken() {
  if (!canUseStorage()) {
    return ''
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || ''
}

export function getAuthToken() {
  return getAuthTokenInfo().token
}

export function getAuthTokenInfo(): AuthTokenInfo {
  const storedToken = getStoredAuthToken()
  if (storedToken) {
    return {
      token: storedToken,
      source: 'stored',
    }
  }

  const envToken = readEnvToken()
  if (envToken) {
    return {
      token: envToken,
      source: 'env',
    }
  }

  return {
    token: '',
    source: 'none',
  }
}

export function setStoredAuthToken(token: string) {
  if (!canUseStorage()) {
    return
  }

  const normalized = token.trim()
  if (normalized) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalized)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  }

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_CHANGE_EVENT, { detail: normalized }))
}

export function getApiKeyHeader() {
  return getAuthToken()
}

export function onAuthTokenChange(callback: (token: string) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const listener = (event: Event) => {
    callback((event as CustomEvent<string>).detail || getAuthToken())
  }

  window.addEventListener(AUTH_TOKEN_CHANGE_EVENT, listener)
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener(AUTH_TOKEN_CHANGE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
