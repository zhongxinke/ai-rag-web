import { request } from '@/api/client'
import type {
  ApiResponse,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatSession,
  ChatStreamEvent,
  ChatUsage,
  CreateChatSessionRequest,
  ListChatMessagesParams,
  ListChatSessionsParams,
  PageResponse,
} from '@/api/types'
import { API_KEY_HEADER, getApiKeyHeader } from '@/utils/auth'
import { ApiClientError } from '@/utils/error'

type ChatStreamOptions = {
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent) => void
}

type RawSseEvent = {
  event: string
  data: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

function apiUrl(path: string) {
  if (!apiBaseUrl) {
    return path
  }

  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'success' in value &&
      'code' in value &&
      'message' in value &&
      'timestamp' in value,
  )
}

function parseJsonObject(value: string): Record<string, unknown> {
  if (!value || value === '[DONE]') {
    return {}
  }

  const parsed = JSON.parse(value) as unknown
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
}

function toUsage(value: unknown): ChatUsage | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const usage = value as Record<string, unknown>
  return {
    promptTokens: typeof usage.promptTokens === 'number' ? usage.promptTokens : undefined,
    completionTokens: typeof usage.completionTokens === 'number' ? usage.completionTokens : undefined,
    totalTokens: typeof usage.totalTokens === 'number' ? usage.totalTokens : undefined,
  }
}

function toStreamEvent(raw: RawSseEvent): ChatStreamEvent | null {
  const parsed = parseJsonObject(raw.data)
  const eventType = raw.event === 'message' && typeof parsed.type === 'string' ? parsed.type : raw.event

  if (raw.data === '[DONE]') {
    return {
      type: 'done',
    }
  }

  if (eventType === 'metadata') {
    return {
      type: 'metadata',
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
      messageId: typeof parsed.messageId === 'string' ? parsed.messageId : undefined,
    }
  }

  if (eventType === 'delta') {
    return {
      type: 'delta',
      content: typeof parsed.content === 'string' ? parsed.content : '',
    }
  }

  if (eventType === 'references') {
    return {
      type: 'references',
      references: Array.isArray(parsed.references) ? (parsed.references as ChatResponse['references']) : [],
    }
  }

  if (eventType === 'done') {
    return {
      type: 'done',
      finishReason: typeof parsed.finishReason === 'string' ? parsed.finishReason : undefined,
      usage: toUsage(parsed.usage),
    }
  }

  if (eventType === 'error') {
    return {
      type: 'error',
      message: typeof parsed.message === 'string' ? parsed.message : 'Streaming chat failed',
    }
  }

  return null
}

function parseSseBlock(block: string): RawSseEvent | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') {
      event = value
    }
    if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  return {
    event,
    data: dataLines.join('\n'),
  }
}

function dispatchSseBlocks(buffer: string, onEvent: (event: ChatStreamEvent) => void) {
  const parts = buffer.split(/\r?\n\r?\n/)
  const remainder = parts.pop() ?? ''

  for (const part of parts) {
    const raw = parseSseBlock(part)
    if (!raw) {
      continue
    }

    const event = toStreamEvent(raw)
    if (event) {
      onEvent(event)
    }
  }

  return remainder
}

async function throwStreamError(response: Response) {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text) as unknown
    if (isApiResponse(parsed)) {
      throw new ApiClientError({
        code: parsed.code || `HTTP_${response.status}`,
        message: parsed.message,
        status: response.status,
        timestamp: parsed.timestamp,
        raw: parsed,
      })
    }
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }
  }

  throw new ApiClientError({
    code: response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'FORBIDDEN' : `HTTP_${response.status}`,
    message: text || response.statusText || 'Streaming chat request failed',
    status: response.status,
    raw: text,
  })
}

export const chatApi = {
  ask(data: ChatRequest) {
    return request<ChatResponse>({
      method: 'POST',
      url: '/api/chat',
      data,
      timeout: 120000,
    })
  },

  createSession(data: CreateChatSessionRequest) {
    return request<ChatSession>({
      method: 'POST',
      url: '/api/chat/sessions',
      data,
    })
  },

  listSessions(params: ListChatSessionsParams = {}) {
    return request<PageResponse<ChatSession>>({
      method: 'GET',
      url: '/api/chat/sessions',
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort ?? 'updatedAt,desc',
        knowledgeBaseId: params.knowledgeBaseId || undefined,
      },
    })
  },

  getSession(id: string) {
    return request<ChatSession>({
      method: 'GET',
      url: `/api/chat/sessions/${id}`,
    })
  },

  listMessages(sessionId: string, params: ListChatMessagesParams = {}) {
    return request<PageResponse<ChatMessage>>({
      method: 'GET',
      url: `/api/chat/sessions/${sessionId}/messages`,
      params: {
        page: params.page ?? 0,
        size: params.size ?? 100,
        sort: params.sort ?? 'createdAt,asc',
      },
    })
  },

  async stream(data: ChatRequest, options: ChatStreamOptions) {
    const apiKey = getApiKeyHeader()
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    }

    if (apiKey) {
      headers[API_KEY_HEADER] = apiKey
    }

    const response = await fetch(apiUrl('/api/chat/stream'), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: options.signal,
    })

    if (!response.ok) {
      await throwStreamError(response)
    }

    if (!response.body) {
      throw new ApiClientError({
        code: 'STREAM_NOT_SUPPORTED',
        message: 'Current browser does not support readable streams',
        status: response.status,
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = dispatchSseBlocks(buffer, options.onEvent)
      }

      buffer += decoder.decode()
      if (buffer.trim()) {
        const raw = parseSseBlock(buffer)
        const event = raw ? toStreamEvent(raw) : null
        if (event) {
          options.onEvent(event)
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}
