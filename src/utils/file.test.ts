import { describe, expect, it } from 'vitest'

import { getFileExtension, validateUploadFile } from '@/utils/file'

function createFile(name: string, size: number): File {
  return new File([new Uint8Array(size)], name)
}

describe('file utilities', () => {
  it('detects file extensions', () => {
    expect(getFileExtension('guide.MD')).toBe('md')
    expect(getFileExtension('archive')).toBe('')
  })

  it('validates supported non-empty files', () => {
    expect(validateUploadFile(createFile('guide.md', 10)).valid).toBe(true)
    expect(validateUploadFile(createFile('empty.txt', 0)).valid).toBe(false)
    expect(validateUploadFile(createFile('script.exe', 10)).valid).toBe(false)
  })
})
