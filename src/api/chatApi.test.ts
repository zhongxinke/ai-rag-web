import { afterEach, describe, expect, it, vi } from 'vitest'

import { chatApi } from '@/api/chatApi'
import type { ChatStreamEvent } from '@/api/types'

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    },
  )
}

describe('chatApi.stream', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('dispatches streamed chat events split across response chunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        'event: metadata\ndata: {"sessionId":"session-1","messageId":"message-1"}\n\n',
        'event: delta\ndata: {"content":"Hel',
        'lo"}\n\n',
        'event: references\ndata: {"references":[{"documentId":"doc-1","chunkId":"chunk-1","score":0.92}]}\n\n',
        'event: done\ndata: {"finishReason":"stop","usage":{"promptTokens":7,"completionTokens":11,"totalTokens":18}}\n\n',
      ]),
    )
    const events: ChatStreamEvent[] = []

    vi.stubGlobal('fetch', fetchMock)

    await chatApi.stream(
      {
        knowledgeBaseId: 'kb-1',
        question: 'What changed?',
        topK: 5,
        minScore: 0.2,
      },
      {
        onEvent(event) {
          events.push(event)
        },
      },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/stream',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          knowledgeBaseId: 'kb-1',
          question: 'What changed?',
          topK: 5,
          minScore: 0.2,
        }),
      }),
    )
    expect(events).toEqual([
      {
        type: 'metadata',
        sessionId: 'session-1',
        messageId: 'message-1',
      },
      {
        type: 'delta',
        content: 'Hello',
      },
      {
        type: 'references',
        references: [
          {
            documentId: 'doc-1',
            chunkId: 'chunk-1',
            score: 0.92,
          },
        ],
      },
      {
        type: 'done',
        finishReason: 'stop',
        usage: {
          promptTokens: 7,
          completionTokens: 11,
          totalTokens: 18,
        },
      },
    ])
  })

  it('supports typed message events and done sentinels', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(['data: {"type":"delta","content":"typed"}\n\n', 'data: [DONE]\n\n']),
    )
    const events: ChatStreamEvent[] = []

    vi.stubGlobal('fetch', fetchMock)

    await chatApi.stream(
      {
        sessionId: 'session-1',
        question: 'Continue',
      },
      {
        onEvent(event) {
          events.push(event)
        },
      },
    )

    expect(events).toEqual([
      {
        type: 'delta',
        content: 'typed',
      },
      {
        type: 'done',
      },
    ])
  })
})
