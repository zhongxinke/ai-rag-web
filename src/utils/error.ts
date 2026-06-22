import type { AppError } from '@/api/types'

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: '参数校验失败，请检查表单。',
  KNOWLEDGE_BASE_NOT_FOUND: '知识库不存在或已删除。',
  KNOWLEDGE_BASE_INACTIVE: '知识库不可用。',
  KNOWLEDGE_BASE_NAME_DUPLICATE: '知识库名称已存在。',
  DOCUMENT_NOT_FOUND: '文档不存在或已删除。',
  DOCUMENT_FILE_EMPTY: '文件为空，无法上传。',
  DOCUMENT_TYPE_UNSUPPORTED: '文件类型不支持。',
  DOCUMENT_SIZE_EXCEEDED: '文件超过大小限制。',
  DOCUMENT_STORAGE_FAILED: '文件保存失败。',
  DOCUMENT_STATUS_TRANSITION_INVALID: '当前状态不允许执行该操作。',
  DOCUMENT_PROCESSING_FAILED: '文档处理失败。',
  DOCUMENT_INDEXING_FAILED: '文档向量索引失败。',
  DOCUMENT_INDEXING_IN_PROGRESS: '文档正在向量化，请稍后再试。',
  RETRIEVAL_FAILED: '检索失败，请稍后重试。',
  INTERNAL_ERROR: '服务异常，请稍后重试。',
  NETWORK_ERROR: '无法连接后端服务，请确认服务已启动。',
}

export class ApiClientError extends Error implements AppError {
  code: string
  status?: number
  timestamp?: string
  raw?: unknown

  constructor(error: AppError) {
    super(resolveErrorMessage(error))
    this.name = 'ApiClientError'
    this.code = error.code
    this.status = error.status
    this.timestamp = error.timestamp
    this.raw = error.raw
  }
}

export function resolveErrorMessage(error: Partial<AppError> | unknown): string {
  if (isAppError(error)) {
    return ERROR_MESSAGES[error.code] || error.message || '请求失败。'
  }

  if (error instanceof Error) {
    return error.message
  }

  return '请求失败。'
}

export function isAppError(error: unknown): error is AppError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as AppError).code === 'string',
  )
}
