import { request } from '@/api/client'
import type {
  CreateKnowledgeBaseRequest,
  KnowledgeBase,
  KnowledgeBaseIndexResponse,
  PageRequest,
  PageResponse,
  UpdateKnowledgeBaseRequest,
} from '@/api/types'

export const knowledgeBaseApi = {
  list(params: PageRequest = {}) {
    return request<PageResponse<KnowledgeBase>>({
      method: 'GET',
      url: '/api/knowledge-bases',
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort ?? 'createdAt,desc',
      },
    })
  },

  get(id: string) {
    return request<KnowledgeBase>({
      method: 'GET',
      url: `/api/knowledge-bases/${id}`,
    })
  },

  create(data: CreateKnowledgeBaseRequest) {
    return request<KnowledgeBase>({
      method: 'POST',
      url: '/api/knowledge-bases',
      data,
    })
  },

  update(id: string, data: UpdateKnowledgeBaseRequest) {
    return request<KnowledgeBase>({
      method: 'PUT',
      url: `/api/knowledge-bases/${id}`,
      data,
    })
  },

  index(id: string) {
    return request<KnowledgeBaseIndexResponse>({
      method: 'POST',
      url: `/api/knowledge-bases/${id}/index`,
      timeout: 120000,
    })
  },

  remove(id: string) {
    return request<void>({
      method: 'DELETE',
      url: `/api/knowledge-bases/${id}`,
    })
  },
}
