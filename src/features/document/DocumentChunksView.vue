<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { documentApi } from '@/api/documentApi'
import type { DocumentChunk, PageResponse, RagDocument } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import MetadataViewer from '@/components/MetadataViewer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { resolveErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const documentId = computed(() => route.params.id?.toString() || '')
const highlightedChunkId = computed(() => {
  const value = route.query.chunkId
  return Array.isArray(value) ? value[0]?.toString() || '' : value?.toString() || ''
})
const loading = ref(false)
const locatingHighlighted = ref(false)
const errorMessage = ref('')
const documentData = ref<RagDocument | null>(null)
const page = reactive({
  page: 0,
  size: 20,
})

const chunks = ref<PageResponse<DocumentChunk>>({
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
})

async function loadData(options: { locateHighlighted?: boolean } = {}) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [doc, chunkPage] = await Promise.all([
      documentApi.get(documentId.value),
      documentApi.listChunks(documentId.value, {
        page: page.page,
        size: page.size,
        sort: 'chunkIndex,asc',
      }),
    ])
    documentData.value = doc
    chunks.value = chunkPage
    if (options.locateHighlighted) {
      await locateHighlightedChunk()
    } else {
      await scrollHighlightedChunk()
    }
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function locateHighlightedChunk() {
  const targetId = highlightedChunkId.value
  if (!targetId) {
    return
  }

  if (chunks.value.content.some((item) => item.id === targetId)) {
    await scrollHighlightedChunk()
    return
  }

  locatingHighlighted.value = true
  try {
    for (let nextPage = 0; nextPage < chunks.value.totalPages; nextPage += 1) {
      if (nextPage === page.page) {
        continue
      }

      const chunkPage = await documentApi.listChunks(documentId.value, {
        page: nextPage,
        size: page.size,
        sort: 'chunkIndex,asc',
      })

      if (chunkPage.content.some((item) => item.id === targetId)) {
        page.page = nextPage
        chunks.value = chunkPage
        await scrollHighlightedChunk()
        return
      }
    }

    ElMessage.warning('未在当前文档切片中找到引用 chunk。')
  } finally {
    locatingHighlighted.value = false
  }
}

async function scrollHighlightedChunk() {
  if (!highlightedChunkId.value) {
    return
  }

  await nextTick()
  window.document.querySelector('.el-table__row.is-highlighted-chunk')?.scrollIntoView({
    block: 'center',
    behavior: 'smooth',
  })
}

function chunkRowClassName({ row }: { row: DocumentChunk }) {
  return row.id === highlightedChunkId.value ? 'is-highlighted-chunk' : ''
}

function handlePageChange(currentPage: number) {
  page.page = currentPage - 1
  void loadData()
}

function handleSizeChange(size: number) {
  page.size = size
  page.page = 0
  void loadData()
}

watch([documentId, highlightedChunkId], () => {
  page.page = 0
  void loadData({ locateHighlighted: Boolean(highlightedChunkId.value) })
})

onMounted(() => loadData({ locateHighlighted: Boolean(highlightedChunkId.value) }))
</script>

<template>
  <section>
    <PageHeader :title="documentData?.fileName || '文档切片'" description="检查文档解析后的 chunk 内容、hash、token 估算和来源元数据。">
      <template #actions>
        <el-button v-if="documentData" @click="router.push(`/documents/${documentData.id}`)">文档详情</el-button>
        <el-button v-if="documentData" @click="router.push(`/knowledge-bases/${documentData.knowledgeBaseId}`)">返回知识库</el-button>
        <el-button :icon="RefreshCw" @click="loadData">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadData" />

    <div v-else class="page-band">
      <div class="page-band__header" v-if="documentData">
        <div>
          <strong>Chunk 列表</strong>
          <div class="chunk-header">
            <StatusTag :status="documentData.status" kind="document" />
            <span class="muted">共 {{ chunks.totalElements }} 个 chunk</span>
            <span v-if="highlightedChunkId" class="highlight-status">
              {{ locatingHighlighted ? '定位引用中' : '引用已定位' }}
            </span>
          </div>
        </div>
      </div>

      <div class="page-band__body">
        <EmptyState v-if="!loading && chunks.content.length === 0" title="暂无 Chunk" description="请先在文档详情页触发解析，解析成功后可查看切片结果。" />

        <template v-else>
          <el-table
            v-loading="loading || locatingHighlighted"
            :data="chunks.content"
            row-key="id"
            table-layout="fixed"
            :row-class-name="chunkRowClassName"
          >
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="chunk-expand">
                  <div>
                    <div class="chunk-expand__title">内容</div>
                    <div class="content-preview mono">{{ row.content }}</div>
                  </div>
                  <div>
                    <div class="chunk-expand__title">Metadata</div>
                    <MetadataViewer :value="row.metadata" />
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="chunkIndex" label="序号" width="90" />
            <el-table-column prop="content" label="内容预览" min-width="360" show-overflow-tooltip />
            <el-table-column prop="tokenCount" label="Token" width="100">
              <template #default="{ row }">{{ row.tokenCount ?? '-' }}</template>
            </el-table-column>
            <el-table-column prop="contentHash" label="Hash" min-width="180" show-overflow-tooltip />
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :current-page="page.page + 1"
              :page-size="page.size"
              :page-sizes="[10, 20, 50]"
              :total="chunks.totalElements"
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chunk-header {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.highlight-status {
  border-radius: 999px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
  padding: 3px 8px;
}

.chunk-expand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
  padding: 8px 16px 18px;
}

.chunk-expand__title {
  margin-bottom: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

:deep(.el-table__row.is-highlighted-chunk > td) {
  background: var(--app-primary-soft) !important;
}

@media (max-width: 900px) {
  .chunk-expand {
    grid-template-columns: 1fr;
  }
}
</style>
