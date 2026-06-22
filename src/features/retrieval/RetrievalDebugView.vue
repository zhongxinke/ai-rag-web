<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { RefreshCw, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { knowledgeBaseApi } from '@/api/knowledgeBaseApi'
import { retrievalApi } from '@/api/retrievalApi'
import type { KnowledgeBase, RetrievalResult, RetrievalSearchResponse } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import MetadataViewer from '@/components/MetadataViewer.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAppStore } from '@/stores/appStore'
import { resolveErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const routeKnowledgeBaseId = computed(() => route.params.id?.toString() || '')
const loadingKnowledgeBases = ref(false)
const searching = ref(false)
const searched = ref(false)
const errorMessage = ref('')
const knowledgeBases = ref<KnowledgeBase[]>([])
const searchResponse = ref<RetrievalSearchResponse | null>(null)

const form = reactive({
  knowledgeBaseId: '',
  query: '',
  topK: 5,
  minScore: 0,
})

const results = computed(() => searchResponse.value?.results ?? [])
const selectedKnowledgeBase = computed(
  () => knowledgeBases.value.find((item) => item.id === form.knowledgeBaseId) || null,
)
const canSearch = computed(() => Boolean(form.knowledgeBaseId && form.query.trim()) && !searching.value)
const resultTitle = computed(() => {
  if (searching.value) {
    return '检索中'
  }
  if (!searched.value) {
    return '等待检索'
  }
  return `${results.value.length} 个命中`
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

    const preferredId = routeKnowledgeBaseId.value || form.knowledgeBaseId || appStore.lastKnowledgeBaseId
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

function handleKnowledgeBaseChange(id: string) {
  searchResponse.value = null
  searched.value = false

  if (!id) {
    void router.replace('/retrieval')
    return
  }

  appStore.rememberKnowledgeBase(id)
  if (routeKnowledgeBaseId.value !== id) {
    void router.replace(`/knowledge-bases/${id}/retrieval`)
  }
}

function resetSearch() {
  form.query = ''
  searchResponse.value = null
  searched.value = false
}

async function search() {
  const query = form.query.trim()
  if (!form.knowledgeBaseId) {
    ElMessage.warning('请选择知识库。')
    return
  }
  if (!query) {
    ElMessage.warning('请输入检索内容。')
    return
  }

  searching.value = true
  try {
    searchResponse.value = await retrievalApi.search({
      knowledgeBaseId: form.knowledgeBaseId,
      query,
      topK: form.topK,
      minScore: form.minScore,
    })
    searched.value = true
    appStore.rememberKnowledgeBase(form.knowledgeBaseId)
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    searching.value = false
  }
}

function sourceFileName(result: RetrievalResult) {
  const value = result.metadata?.fileName
  return typeof value === 'string' && value.trim() ? value : '未知文档'
}

function sourceChunkLabel(result: RetrievalResult) {
  const value = result.metadata?.chunkIndex
  if (typeof value === 'number' || typeof value === 'string') {
    return `Chunk ${value}`
  }
  return result.chunkId.slice(0, 8)
}

function scoreLabel(score: number) {
  return `${(score * 100).toFixed(1)}%`
}

function scoreTagType(score: number) {
  if (score >= 0.8) {
    return 'success'
  }
  if (score >= 0.5) {
    return 'warning'
  }
  return 'info'
}

function formatScoreTooltip(value: number) {
  return value.toFixed(2)
}

watch(routeKnowledgeBaseId, async (id) => {
  if (!id || id === form.knowledgeBaseId) {
    return
  }

  form.knowledgeBaseId = id
  searchResponse.value = null
  searched.value = false
  appStore.rememberKnowledgeBase(id)

  if (!knowledgeBases.value.some((item) => item.id === id)) {
    await loadKnowledgeBases()
  }
})

onMounted(loadKnowledgeBases)
</script>

<template>
  <section>
    <PageHeader
      title="检索调试"
      :description="selectedKnowledgeBase ? `知识库：${selectedKnowledgeBase.name}` : '选择知识库后执行 TopK 向量检索。'"
    >
      <template #actions>
        <el-button v-if="selectedKnowledgeBase" @click="router.push(`/knowledge-bases/${selectedKnowledgeBase.id}`)">
          返回知识库
        </el-button>
        <el-button :icon="RefreshCw" @click="loadKnowledgeBases">刷新知识库</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadKnowledgeBases" />

    <div v-else class="retrieval-layout">
      <div class="page-band retrieval-panel">
        <div class="page-band__header">
          <div>
            <strong>查询条件</strong>
            <div class="muted panel-subtitle">基础向量检索参数。</div>
          </div>
        </div>
        <div class="page-band__body">
          <el-form label-position="top" class="search-form" @submit.prevent="search">
            <el-form-item label="知识库" required>
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

            <el-form-item label="查询内容" required>
              <el-input
                v-model="form.query"
                type="textarea"
                :rows="8"
                maxlength="4000"
                show-word-limit
                resize="vertical"
                placeholder="输入要检索的问题或关键词"
              />
            </el-form-item>

            <div class="control-grid">
              <el-form-item label="TopK">
                <el-input-number v-model="form.topK" :min="1" :max="50" controls-position="right" />
              </el-form-item>
              <el-form-item label="最低分数">
                <el-slider
                  v-model="form.minScore"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :format-tooltip="formatScoreTooltip"
                />
              </el-form-item>
            </div>

            <div class="search-actions">
              <el-button type="primary" :icon="Search" :loading="searching" :disabled="!canSearch" @click="search">
                开始检索
              </el-button>
              <el-button @click="resetSearch">清空</el-button>
            </div>
          </el-form>
        </div>
      </div>

      <div class="page-band results-panel">
        <div class="page-band__header">
          <div>
            <strong>检索结果</strong>
            <div class="muted panel-subtitle">
              {{ searchResponse?.query ? `Query: ${searchResponse.query}` : '命中结果会按相似度排序。' }}
            </div>
          </div>
          <span class="result-count">{{ resultTitle }}</span>
        </div>

        <div class="page-band__body">
          <EmptyState
            v-if="!searched && !searching"
            title="等待检索"
            description="输入查询内容后可查看命中 chunk、分数和 metadata。"
          />

          <EmptyState
            v-else-if="searched && !searching && results.length === 0"
            title="暂无命中"
            description="可以降低最低分数，或确认知识库文档已经完成向量索引。"
          />

          <el-table v-else v-loading="searching" :data="results" row-key="chunkId" table-layout="fixed">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="result-expand">
                  <div>
                    <div class="result-expand__title">内容</div>
                    <div class="content-preview mono">{{ row.content }}</div>
                  </div>
                  <div>
                    <div class="result-expand__title">Metadata</div>
                    <MetadataViewer :value="row.metadata" />
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="分数" width="110">
              <template #default="{ row }">
                <el-tag :type="scoreTagType(row.score)">{{ scoreLabel(row.score) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="来源" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="result-source">
                  <strong>{{ sourceFileName(row) }}</strong>
                  <span>{{ sourceChunkLabel(row) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容预览" min-width="360" show-overflow-tooltip />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button size="small" @click="router.push(`/documents/${row.documentId}`)">文档</el-button>
                  <el-button size="small" @click="router.push(`/documents/${row.documentId}/chunks`)">Chunk</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.retrieval-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.retrieval-panel {
  position: sticky;
  top: calc(var(--app-header-height) + 18px);
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.search-form {
  display: grid;
  gap: 4px;
}

.control-grid {
  display: grid;
  grid-template-columns: minmax(120px, 140px) minmax(0, 1fr);
  gap: 16px;
  align-items: end;
}

.search-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
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

.result-count {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.result-source {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.result-source strong,
.result-source span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-source strong {
  color: var(--app-text);
  font-weight: 800;
}

.result-source span {
  color: var(--app-text-muted);
  font-family: "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.result-expand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
  padding: 8px 16px 18px;
}

.result-expand__title {
  margin-bottom: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

@media (max-width: 1080px) {
  .retrieval-layout {
    grid-template-columns: 1fr;
  }

  .retrieval-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .control-grid,
  .result-expand {
    grid-template-columns: 1fr;
  }
}
</style>
