import { request } from '@/api/client'
import type { DocumentChunk, ListDocumentsParams, PageRequest, PageResponse, RagDocument } from '@/api/types'

export const documentApi = {
  upload(knowledgeBaseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return request<RagDocument>({
      method: 'POST',
      url: `/api/knowledge-bases/${knowledgeBaseId}/documents`,
      data: formData,
      timeout: 120000,
    })
  },

  list(knowledgeBaseId: string, params: ListDocumentsParams = {}) {
    return request<PageResponse<RagDocument>>({
      method: 'GET',
      url: `/api/knowledge-bases/${knowledgeBaseId}/documents`,
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort ?? 'createdAt,desc',
        status: params.status || undefined,
      },
    })
  },

  get(id: string) {
    return request<RagDocument>({
      method: 'GET',
      url: `/api/documents/${id}`,
    })
  },

  parse(id: string) {
    return request<RagDocument>({
      method: 'POST',
      url: `/api/documents/${id}/parse`,
      timeout: 120000,
    })
  },

  index(id: string) {
    return request<RagDocument>({
      method: 'POST',
      url: `/api/documents/${id}/index`,
      timeout: 120000,
    })
  },

  listChunks(id: string, params: PageRequest = {}) {
    return request<PageResponse<DocumentChunk>>({
      method: 'GET',
      url: `/api/documents/${id}/chunks`,
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort ?? 'chunkIndex,asc',
      },
    })
  },

  remove(id: string) {
    return request<void>({
      method: 'DELETE',
      url: `/api/documents/${id}`,
    })
  },
}
