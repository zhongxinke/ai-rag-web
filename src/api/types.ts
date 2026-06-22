export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
  timestamp: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface PageRequest {
  page?: number
  size?: number
  sort?: string
}

export interface AppError {
  code: string
  message: string
  status?: number
  timestamp?: string
  raw?: unknown
}

export type KnowledgeBaseStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

export interface KnowledgeBase {
  id: string
  name: string
  description?: string | null
  status: KnowledgeBaseStatus
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
}

export interface UpdateKnowledgeBaseRequest {
  name?: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
}

export type DocumentStatus =
  | 'UPLOADED'
  | 'PARSING'
  | 'PARSED'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'INDEXED'
  | 'FAILED'
  | 'DELETED'

export interface RagDocument {
  id: string
  knowledgeBaseId: string
  fileName: string
  fileType?: string | null
  fileSize: number
  storagePath: string
  status: DocumentStatus
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentChunk {
  id: string
  knowledgeBaseId: string
  documentId: string
  chunkIndex: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
  tokenCount?: number | null
  createdAt: string
  updatedAt: string
}

export interface ListDocumentsParams extends PageRequest {
  status?: DocumentStatus | ''
}

export interface DocumentIndexFailure {
  documentId: string
  message: string
}

export interface KnowledgeBaseIndexResponse {
  knowledgeBaseId: string
  totalDocuments: number
  indexedDocuments: number
  failedDocuments: number
  failures: DocumentIndexFailure[]
}

export interface RetrievalSearchRequest {
  knowledgeBaseId: string
  query: string
  topK?: number
  minScore?: number
}

export interface RetrievalResult {
  chunkId: string
  documentId: string
  content: string
  score: number
  metadata: Record<string, unknown>
}

export interface RetrievalSearchResponse {
  query: string
  results: RetrievalResult[]
}

export interface ChatRequest {
  knowledgeBaseId?: string
  sessionId?: string
  question: string
  topK?: number
  minScore?: number
}

export interface ChatReference {
  documentId: string
  chunkId: string
  fileName?: string
  score?: number
  contentPreview?: string
}

export interface ChatResponse {
  answer: string
  references: ChatReference[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  sessionId?: string | null
  messageId?: string | null
}

export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export interface ChatSession {
  id: string
  knowledgeBaseId: string
  title: string
  userId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateChatSessionRequest {
  knowledgeBaseId: string
  title?: string
}

export interface ListChatSessionsParams extends PageRequest {
  knowledgeBaseId?: string | ''
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: ChatMessageRole
  content: string
  references: ChatReference[]
  createdAt: string
}

export type ChatStreamEvent =
  | {
      type: 'metadata'
      sessionId?: string
      messageId?: string
    }
  | {
      type: 'delta'
      content: string
    }
  | {
      type: 'references'
      references: ChatReference[]
    }
  | {
      type: 'done'
      finishReason?: string
    }
  | {
      type: 'error'
      message: string
    }
