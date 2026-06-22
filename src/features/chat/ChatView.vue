<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ExternalLink, Plus, RefreshCw, RotateCcw, Search, SendHorizontal, Square } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { chatApi } from '@/api/chatApi'
import { knowledgeBaseApi } from '@/api/knowledgeBaseApi'
import type { ChatMessage, ChatReference, ChatResponse, ChatSession, KnowledgeBase } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAppStore } from '@/stores/appStore'
import { resolveErrorMessage } from '@/utils/error'
import { formatDateTime, truncateText } from '@/utils/format'

type MessageView = ChatMessage & {
  pending?: boolean
  error?: boolean
  usage?: ChatResponse['usage']
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const routeKnowledgeBaseId = computed(() => route.params.id?.toString() || '')
const routeSessionId = computed(() => route.params.sessionId?.toString() || '')

const loadingKnowledgeBases = ref(false)
const loadingSessions = ref(false)
const loadingMessages = ref(false)
const creatingSession = ref(false)
const streaming = ref(false)
const initialized = ref(false)
const errorMessage = ref('')
const streamError = ref('')
const knowledgeBases = ref<KnowledgeBase[]>([])
const sessions = ref<ChatSession[]>([])
const currentSession = ref<ChatSession | null>(null)
const messages = ref<ChatMessage[]>([])
const transientMessages = ref<MessageView[]>([])
const abortController = ref<AbortController | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const form = reactive({
  knowledgeBaseId: '',
  question: '',
  topK: 5,
  minScore: 0,
})

const selectedKnowledgeBase = computed(
  () => knowledgeBases.value.find((item) => item.id === form.knowledgeBaseId) || null,
)
const displayMessages = computed<MessageView[]>(() => [...messages.value, ...transientMessages.value])
const canCreateSession = computed(() => Boolean(form.knowledgeBaseId) && !creatingSession.value && !streaming.value)
const canAsk = computed(
  () => Boolean((currentSession.value?.id || form.knowledgeBaseId) && form.question.trim()) && !streaming.value,
)
const pageDescription = computed(() => {
  if (currentSession.value) {
    return `${sessionTitle(currentSession.value)} · ${selectedKnowledgeBase.value?.name || '当前知识库'}`
  }
  if (selectedKnowledgeBase.value) {
    return `知识库：${selectedKnowledgeBase.value.name}`
  }
  return '选择知识库后开始会话问答。'
})

async function loadKnowledgeBases() {
  loadingKnowledgeBases.value = true
  errorMessage.value = ''

  try {
    const page = await knowledgeBaseApi.list({
      page: 0,
      size: 100,
      sort: 'updatedAt,desc',
    })
    const items = [...page.content]

    if (routeKnowledgeBaseId.value && !items.some((item) => item.id === routeKnowledgeBaseId.value)) {
      items.unshift(await knowledgeBaseApi.get(routeKnowledgeBaseId.value))
    }

    knowledgeBases.value = items

    const preferredId =
      routeKnowledgeBaseId.value ||
      currentSession.value?.knowledgeBaseId ||
      form.knowledgeBaseId ||
      appStore.lastKnowledgeBaseId
    const hasPreferred = preferredId && items.some((item) => item.id === preferredId)
    form.knowledgeBaseId = hasPreferred ? preferredId : items[0]?.id || ''

    if (form.knowledgeBaseId) {
      appStore.rememberKnowledgeBase(form.knowledgeBaseId)
    }
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loadingKnowledgeBases.value = false
  }
}

async function loadSessions() {
  loadingSessions.value = true

  try {
    const page = await chatApi.listSessions({
      page: 0,
      size: 50,
      sort: 'updatedAt,desc',
      knowledgeBaseId: form.knowledgeBaseId,
    })
    sessions.value = page.content
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    loadingSessions.value = false
  }
}

async function loadSessionAndMessages(sessionId: string) {
  loadingMessages.value = true
  errorMessage.value = ''

  try {
    const [session, page] = await Promise.all([
      chatApi.getSession(sessionId),
      chatApi.listMessages(sessionId, {
        page: 0,
        size: 100,
        sort: 'createdAt,asc',
      }),
    ])

    currentSession.value = session
    form.knowledgeBaseId = session.knowledgeBaseId
    appStore.rememberKnowledgeBase(session.knowledgeBaseId)
    messages.value = page.content
    transientMessages.value = []

    if (!knowledgeBases.value.some((item) => item.id === session.knowledgeBaseId)) {
      await loadKnowledgeBases()
    }

    await loadSessions()
    await scrollToBottom()
  } catch (error) {
    currentSession.value = null
    messages.value = []
    transientMessages.value = []
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loadingMessages.value = false
  }
}

async function refreshPage() {
  await loadKnowledgeBases()

  if (routeSessionId.value) {
    await loadSessionAndMessages(routeSessionId.value)
    return
  }

  currentSession.value = null
  messages.value = []
  transientMessages.value = []
  await loadSessions()
}

async function handleKnowledgeBaseChange(id: string) {
  if (streaming.value) {
    ElMessage.warning('流式输出过程中不能切换知识库。')
    return
  }

  currentSession.value = null
  messages.value = []
  transientMessages.value = []
  streamError.value = ''

  if (!id) {
    await router.replace('/chat')
    await loadSessions()
    return
  }

  appStore.rememberKnowledgeBase(id)
  await router.replace(`/knowledge-bases/${id}/chat`)
  await loadSessions()
}

async function createSession() {
  if (!form.knowledgeBaseId) {
    ElMessage.warning('请选择知识库。')
    return
  }

  creatingSession.value = true
  try {
    const session = await chatApi.createSession({
      knowledgeBaseId: form.knowledgeBaseId,
      title: '新会话',
    })
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)]
    currentSession.value = session
    messages.value = []
    transientMessages.value = []
    await router.push(sessionPath(session))
    await loadSessionAndMessages(session.id)
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    creatingSession.value = false
  }
}

async function openSession(session: ChatSession) {
  if (streaming.value) {
    ElMessage.warning('请先结束当前流式输出。')
    return
  }

  await router.push(sessionPath(session))
}

function resetQuestion() {
  form.question = ''
  streamError.value = ''
}

function stopStreaming() {
  abortController.value?.abort()
}

async function ask() {
  const question = form.question.trim()
  if (!currentSession.value?.id && !form.knowledgeBaseId) {
    ElMessage.warning('请选择知识库。')
    return
  }
  if (!question) {
    ElMessage.warning('请输入问题。')
    return
  }

  const controller = new AbortController()
  const requestSessionId = currentSession.value?.id || routeSessionId.value || undefined
  const userMessage = reactive(createLocalMessage('USER', question)) as MessageView
  const assistantMessage = reactive(createLocalMessage('ASSISTANT', '')) as MessageView
  let responseSessionId = requestSessionId
  let eventError = ''

  abortController.value = controller
  streaming.value = true
  streamError.value = ''
  transientMessages.value = [userMessage, assistantMessage]
  form.question = ''
  await scrollToBottom()

  try {
    await chatApi.stream(
      {
        sessionId: requestSessionId,
        knowledgeBaseId: requestSessionId ? undefined : form.knowledgeBaseId,
        question,
        topK: form.topK,
        minScore: form.minScore,
      },
      {
        signal: controller.signal,
        onEvent(event) {
          if (event.type === 'metadata') {
            responseSessionId = event.sessionId || responseSessionId
            assistantMessage.id = event.messageId || assistantMessage.id
          }

          if (event.type === 'delta') {
            assistantMessage.content += event.content
            void scrollToBottom()
          }

          if (event.type === 'references') {
            assistantMessage.references = event.references
          }

          if (event.type === 'error') {
            eventError = event.message
            assistantMessage.error = true
            assistantMessage.content ||= event.message
          }
        },
      },
    )

    if (eventError) {
      throw new Error(eventError)
    }

    if (responseSessionId) {
      await loadSessionAndMessages(responseSessionId)
      const session = currentSession.value
      if (session && routeSessionId.value !== session.id) {
        await router.replace(sessionPath(session))
      }
    } else {
      messages.value = [...messages.value, ...transientMessages.value]
      transientMessages.value = []
      await scrollToBottom()
    }

    await loadSessions()
  } catch (error) {
    assistantMessage.error = true

    if (isAbortError(error)) {
      assistantMessage.content ||= '已中断流式输出。'
      streamError.value = '已中断流式输出。'
      ElMessage.info(streamError.value)
      return
    }

    streamError.value = resolveErrorMessage(error)
    assistantMessage.content ||= streamError.value
    ElMessage.error(streamError.value)
  } finally {
    streaming.value = false
    abortController.value = null
  }
}

function createLocalMessage(role: ChatMessage['role'], content: string): MessageView {
  return {
    id: `local-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sessionId: currentSession.value?.id || routeSessionId.value || 'pending',
    role,
    content,
    references: [],
    createdAt: new Date().toISOString(),
    pending: true,
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function sessionTitle(session: ChatSession) {
  return session.title?.trim() || `会话 ${shortId(session.id)}`
}

function sessionPath(session: ChatSession) {
  return `/knowledge-bases/${session.knowledgeBaseId}/chat/sessions/${session.id}`
}

function knowledgeBaseName(id: string) {
  return knowledgeBases.value.find((item) => item.id === id)?.name || `知识库 ${shortId(id)}`
}

function messageRoleLabel(role: ChatMessage['role']) {
  if (role === 'USER') {
    return '用户'
  }
  if (role === 'ASSISTANT') {
    return '助手'
  }
  return '系统'
}

function referenceTitle(reference: ChatReference) {
  return reference.fileName?.trim() || `文档 ${shortId(reference.documentId)}`
}

function scoreLabel(score?: number) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return ''
  }
  return `${(score * 100).toFixed(1)}%`
}

function scoreTagType(score?: number) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return 'info'
  }
  if (score >= 0.8) {
    return 'success'
  }
  if (score >= 0.5) {
    return 'warning'
  }
  return 'info'
}

function goToReference(reference: ChatReference) {
  void router.push({
    path: `/documents/${reference.documentId}/chunks`,
    query: {
      chunkId: reference.chunkId,
    },
  })
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(
  () => [routeKnowledgeBaseId.value, routeSessionId.value] as const,
  async ([knowledgeBaseId, sessionId]) => {
    if (!initialized.value) {
      return
    }

    if (sessionId) {
      await loadSessionAndMessages(sessionId)
      return
    }

    if (streaming.value) {
      return
    }

    currentSession.value = null
    messages.value = []
    transientMessages.value = []
    streamError.value = ''

    if (knowledgeBaseId && knowledgeBaseId !== form.knowledgeBaseId) {
      form.knowledgeBaseId = knowledgeBaseId
      appStore.rememberKnowledgeBase(knowledgeBaseId)
    }

    await loadSessions()
  },
)

onMounted(async () => {
  await refreshPage()
  initialized.value = true
})
</script>

<template>
  <section>
    <PageHeader title="RAG 问答" :description="pageDescription">
      <template #actions>
        <el-button v-if="selectedKnowledgeBase" @click="router.push(`/knowledge-bases/${selectedKnowledgeBase.id}`)">
          返回知识库
        </el-button>
        <el-button
          v-if="selectedKnowledgeBase"
          :icon="Search"
          @click="router.push(`/knowledge-bases/${selectedKnowledgeBase.id}/retrieval`)"
        >
          检索调试
        </el-button>
        <el-button :icon="Plus" type="primary" :loading="creatingSession" :disabled="!canCreateSession" @click="createSession">
          新建会话
        </el-button>
        <el-button :icon="RefreshCw" @click="refreshPage">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="refreshPage" />

    <div v-else class="chat-shell">
      <aside class="page-band sessions-panel">
        <div class="page-band__header">
          <div>
            <strong>会话</strong>
            <div class="muted panel-subtitle">按知识库筛选。</div>
          </div>
          <el-button :icon="RefreshCw" circle aria-label="刷新会话" :loading="loadingSessions" @click="loadSessions" />
        </div>

        <div class="page-band__body sessions-body">
          <el-form label-position="top" class="session-filter">
            <el-form-item label="知识库">
              <el-select
                v-model="form.knowledgeBaseId"
                filterable
                :loading="loadingKnowledgeBases"
                placeholder="选择知识库"
                @change="handleKnowledgeBaseChange"
              >
                <el-option v-for="item in knowledgeBases" :key="item.id" :label="item.name" :value="item.id">
                  <div class="kb-option">
                    <span>{{ item.name }}</span>
                    <small>{{ item.embeddingModel }}</small>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-form>

          <el-button class="new-session-button" :icon="Plus" :loading="creatingSession" :disabled="!canCreateSession" @click="createSession">
            新建会话
          </el-button>

          <div v-loading="loadingSessions" class="session-list">
            <EmptyState
              v-if="sessions.length === 0"
              title="暂无会话"
              description="新建会话或直接发送问题后会出现在这里。"
            />

            <button
              v-for="session in sessions"
              v-else
              :key="session.id"
              type="button"
              class="session-item"
              :class="{ active: currentSession?.id === session.id }"
              @click="openSession(session)"
            >
              <span class="session-item__title">{{ sessionTitle(session) }}</span>
              <span class="session-item__meta">{{ knowledgeBaseName(session.knowledgeBaseId) }}</span>
              <span class="session-item__meta">{{ formatDateTime(session.updatedAt) }}</span>
            </button>
          </div>
        </div>
      </aside>

      <main class="conversation-column">
        <div class="page-band messages-panel">
          <div class="page-band__header messages-header">
            <div>
              <strong>{{ currentSession ? sessionTitle(currentSession) : '新问题' }}</strong>
              <div class="muted panel-subtitle">
                {{ currentSession ? `Session ${shortId(currentSession.id)}` : selectedKnowledgeBase ? selectedKnowledgeBase.name : '未选择知识库' }}
              </div>
            </div>
            <el-tag :type="streaming ? 'warning' : 'info'">{{ streaming ? '流式输出中' : '就绪' }}</el-tag>
          </div>

          <div ref="messageListRef" v-loading="loadingMessages" class="messages-body">
            <EmptyState
              v-if="displayMessages.length === 0"
              title="暂无消息"
              description="输入问题后会展示多轮消息、引用来源和流式回答。"
            />

            <div v-else class="message-list">
              <article
                v-for="message in displayMessages"
                :key="message.id"
                class="message-item"
                :class="[`message-item--${message.role.toLowerCase()}`, { 'message-item--error': message.error }]"
              >
                <div class="message-item__header">
                  <span>{{ messageRoleLabel(message.role) }}</span>
                  <small>{{ message.pending ? '处理中' : formatDateTime(message.createdAt) }}</small>
                </div>

                <div class="message-content">
                  {{ message.content || (message.role === 'ASSISTANT' && streaming ? '正在生成回答...' : '无内容。') }}
                </div>

                <div v-if="message.role === 'ASSISTANT' && message.references.length > 0" class="reference-list">
                  <article v-for="reference in message.references" :key="reference.chunkId" class="reference-item">
                    <div class="reference-item__header">
                      <div class="reference-title">
                        <strong>{{ referenceTitle(reference) }}</strong>
                        <span class="mono">Chunk {{ shortId(reference.chunkId) }}</span>
                      </div>
                      <el-tag v-if="scoreLabel(reference.score)" :type="scoreTagType(reference.score)">
                        {{ scoreLabel(reference.score) }}
                      </el-tag>
                    </div>

                    <p class="reference-preview">{{ truncateText(reference.contentPreview || '无内容预览。', 220) }}</p>

                    <div class="reference-actions">
                      <el-button size="small" :icon="ExternalLink" @click="router.push(`/documents/${reference.documentId}`)">
                        文档
                      </el-button>
                      <el-button size="small" type="primary" plain :icon="ExternalLink" @click="goToReference(reference)">
                        Chunk
                      </el-button>
                    </div>
                  </article>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div class="page-band composer-panel">
          <div class="page-band__body">
            <el-alert v-if="streamError" class="stream-alert" type="warning" :closable="false" :title="streamError" />

            <el-form label-position="top" class="composer-form" @submit.prevent="ask">
              <el-form-item label="问题" required>
                <el-input
                  v-model="form.question"
                  type="textarea"
                  :rows="4"
                  maxlength="4000"
                  show-word-limit
                  resize="vertical"
                  placeholder="输入要基于知识库回答的问题"
                  :disabled="streaming"
                />
              </el-form-item>

              <div class="control-grid">
                <el-form-item label="TopK">
                  <el-input-number v-model="form.topK" :min="1" :max="50" controls-position="right" :disabled="streaming" />
                </el-form-item>
                <el-form-item label="最低分数">
                  <el-slider v-model="form.minScore" :min="0" :max="1" :step="0.05" :disabled="streaming" />
                </el-form-item>
              </div>

              <div class="composer-actions">
                <el-button v-if="!streaming" type="primary" :icon="SendHorizontal" :disabled="!canAsk" @click="ask">
                  发送
                </el-button>
                <el-button v-else type="warning" :icon="Square" @click="stopStreaming">中断</el-button>
                <el-button :icon="RotateCcw" :disabled="streaming" @click="resetQuestion">清空</el-button>
              </div>
            </el-form>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.sessions-panel {
  position: sticky;
  top: calc(var(--app-header-height) + 18px);
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.sessions-body {
  display: grid;
  gap: 14px;
}

.session-filter {
  display: grid;
}

.new-session-button {
  width: 100%;
}

.session-list {
  display: grid;
  min-height: 160px;
  gap: 8px;
}

.session-item {
  display: grid;
  width: 100%;
  cursor: pointer;
  gap: 4px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-surface);
  color: var(--app-text-muted);
  padding: 12px;
  text-align: left;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.session-item:hover,
.session-item.active {
  border-color: #bfdbfe;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.session-item__title,
.session-item__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item__title {
  color: var(--app-text);
  font-weight: 800;
}

.session-item__meta {
  font-size: 12px;
}

.kb-option {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kb-option span,
.kb-option small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-option small {
  color: var(--app-text-subtle);
  font-size: 11px;
}

.conversation-column {
  display: grid;
  gap: 18px;
}

.messages-panel {
  min-height: 520px;
}

.messages-header {
  align-items: flex-start;
}

.messages-body {
  height: min(62vh, 720px);
  min-height: 420px;
  overflow: auto;
  padding: 20px;
}

.message-list {
  display: grid;
  gap: 16px;
}

.message-item {
  display: grid;
  max-width: min(820px, 92%);
  gap: 10px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  padding: 14px;
}

.message-item--user {
  justify-self: end;
  background: var(--app-primary-soft);
}

.message-item--assistant,
.message-item--system {
  justify-self: start;
}

.message-item--error {
  border-color: #fecaca;
  background: var(--app-danger-soft);
}

.message-item__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.message-item__header small {
  color: var(--app-text-subtle);
  font-weight: 700;
  white-space: nowrap;
}

.message-content {
  color: var(--app-text);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.reference-list {
  display: grid;
  gap: 10px;
}

.reference-item {
  display: grid;
  gap: 10px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-surface-soft);
  padding: 12px;
}

.reference-item__header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.reference-title {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.reference-title strong,
.reference-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-title strong {
  color: var(--app-text);
  font-weight: 800;
}

.reference-title span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.reference-preview {
  max-height: 90px;
  overflow: auto;
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.reference-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stream-alert {
  margin-bottom: 14px;
}

.composer-form {
  display: grid;
  gap: 4px;
}

.control-grid {
  display: grid;
  grid-template-columns: minmax(120px, 140px) minmax(0, 1fr);
  gap: 16px;
  align-items: end;
}

.composer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 1120px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .sessions-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .messages-body {
    height: auto;
    max-height: none;
    min-height: 360px;
    padding: 14px;
  }

  .message-item {
    max-width: 100%;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
