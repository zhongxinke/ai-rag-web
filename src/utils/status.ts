import type { DocumentStatus, KnowledgeBaseStatus } from '@/api/types'

export interface StatusMeta {
  label: string
  type: 'primary' | 'success' | 'info' | 'warning' | 'danger'
}

export const knowledgeBaseStatusMeta: Record<KnowledgeBaseStatus, StatusMeta> = {
  ACTIVE: { label: '启用', type: 'success' },
  ARCHIVED: { label: '归档', type: 'info' },
  DELETED: { label: '已删除', type: 'danger' },
}

export const documentStatusMeta: Record<DocumentStatus, StatusMeta> = {
  UPLOADED: { label: '已上传', type: 'info' },
  PARSING: { label: '解析中', type: 'warning' },
  PARSED: { label: '已解析', type: 'success' },
  CHUNKING: { label: '切片中', type: 'warning' },
  EMBEDDING: { label: '向量化中', type: 'warning' },
  INDEXED: { label: '已索引', type: 'success' },
  FAILED: { label: '失败', type: 'danger' },
  DELETED: { label: '已删除', type: 'danger' },
}

export const documentStatusOptions = Object.entries(documentStatusMeta).map(([value, meta]) => ({
  value: value as DocumentStatus,
  label: meta.label,
}))

export function canParseDocument(status: DocumentStatus): boolean {
  return status === 'UPLOADED' || status === 'PARSED' || status === 'FAILED'
}

export function canViewChunks(status: DocumentStatus): boolean {
  return status === 'PARSED' || status === 'EMBEDDING' || status === 'INDEXED'
}

export function canIndexDocument(status: DocumentStatus): boolean {
  return status === 'PARSED' || status === 'INDEXED'
}

export function isDocumentBusy(status: DocumentStatus): boolean {
  return status === 'PARSING' || status === 'CHUNKING' || status === 'EMBEDDING'
}
