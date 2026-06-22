const SUPPORTED_EXTENSIONS = ['pdf', 'txt', 'md', 'markdown', 'docx']
const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024

export interface FileValidationResult {
  valid: boolean
  message?: string
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() || '' : ''
}

export function validateUploadFile(file: File, maxSize = DEFAULT_MAX_FILE_SIZE): FileValidationResult {
  if (file.size <= 0) {
    return { valid: false, message: '文件为空，无法上传。' }
  }

  if (file.size > maxSize) {
    return { valid: false, message: '文件超过 20MB，请压缩或拆分后再上传。' }
  }

  const extension = getFileExtension(file.name)
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return { valid: false, message: '仅支持 PDF、TXT、Markdown、DOCX 文件。' }
  }

  return { valid: true }
}

export function supportedFileHint(): string {
  return SUPPORTED_EXTENSIONS.join(', ')
}
