import { describe, expect, it } from 'vitest'

import { formatFileSize, truncateText } from '@/utils/format'

describe('format utilities', () => {
  it('formats file sizes with stable units', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1.00 KB')
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB')
  })

  it('truncates long text', () => {
    expect(truncateText('short', 10)).toBe('short')
    expect(truncateText('abcdefghijkl', 6)).toBe('abcdef...')
  })
})
