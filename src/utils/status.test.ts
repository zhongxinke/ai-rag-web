import { describe, expect, it } from 'vitest'

import { canIndexDocument, canParseDocument, canViewChunks, isDocumentBusy } from '@/utils/status'

describe('document status rules', () => {
  it('allows parsing only in recoverable states', () => {
    expect(canParseDocument('UPLOADED')).toBe(true)
    expect(canParseDocument('PARSED')).toBe(true)
    expect(canParseDocument('FAILED')).toBe(true)
    expect(canParseDocument('PARSING')).toBe(false)
  })

  it('separates chunk visibility from busy states', () => {
    expect(canViewChunks('PARSED')).toBe(true)
    expect(canViewChunks('INDEXED')).toBe(true)
    expect(canViewChunks('UPLOADED')).toBe(false)
    expect(isDocumentBusy('EMBEDDING')).toBe(true)
  })

  it('allows indexing only after chunks exist', () => {
    expect(canIndexDocument('PARSED')).toBe(true)
    expect(canIndexDocument('INDEXED')).toBe(true)
    expect(canIndexDocument('UPLOADED')).toBe(false)
    expect(canIndexDocument('FAILED')).toBe(false)
  })
})
