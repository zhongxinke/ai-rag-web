import { request } from '@/api/client'
import type { RetrievalSearchRequest, RetrievalSearchResponse } from '@/api/types'

export const retrievalApi = {
  search(data: RetrievalSearchRequest) {
    return request<RetrievalSearchResponse>({
      method: 'POST',
      url: '/api/retrieval/search',
      data,
      timeout: 120000,
    })
  },
}
