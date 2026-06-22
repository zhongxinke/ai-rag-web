<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { FilePlus, MessageSquare, RefreshCw, Search, Zap } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { documentApi } from '@/api/documentApi'
import { knowledgeBaseApi } from '@/api/knowledgeBaseApi'
import type { DocumentStatus, KnowledgeBase, PageResponse, RagDocument } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import DocumentUploadDialog from '@/features/document/DocumentUploadDialog.vue'
import { useAppStore } from '@/stores/appStore'
import { resolveErrorMessage } from '@/utils/error'
import { formatDateTime, formatFileSize } from '@/utils/format'
import { canIndexDocument, canParseDocument, canViewChunks, documentStatusOptions, isDocumentBusy } from '@/utils/status'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const knowledgeBaseId = computed(() => route.params.id?.toString() || '')
const loadingKnowledgeBase = ref(false)
const loadingDocuments = ref(false)
const parsingId = ref('')
const indexingId = ref('')
const indexingKnowledgeBase = ref(false)
const errorMessage = ref('')
const uploadVisible = ref(false)
const knowledgeBase = ref<KnowledgeBase | null>(null)
const statusFilter = ref<DocumentStatus | ''>('')

const page = reactive({
  page: 0,
  size: 20,
})

const documents = ref<PageResponse<RagDocument>>({
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
})

async function loadKnowledgeBase() {
  loadingKnowledgeBase.value = true
  errorMessage.value = ''
  try {
    knowledgeBase.value = await knowledgeBaseApi.get(knowledgeBaseId.value)
    appStore.rememberKnowledgeBase(knowledgeBaseId.value)
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loadingKnowledgeBase.value = false
  }
}

async function loadDocuments() {
  loadingDocuments.value = true
  try {
    documents.value = await documentApi.list(knowledgeBaseId.value, {
      page: page.page,
      size: page.size,
      status: statusFilter.value,
      sort: 'createdAt,desc',
    })
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    loadingDocuments.value = false
  }
}

async function loadAll() {
  await loadKnowledgeBase()
  if (!errorMessage.value) {
    await loadDocuments()
  }
}

async function parseDocument(row: RagDocument) {
  parsingId.value = row.id
  try {
    await documentApi.parse(row.id)
    ElMessage.success('解析完成。')
    await loadDocuments()
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
    await loadDocuments()
  } finally {
    parsingId.value = ''
  }
}

async function indexDocument(row: RagDocument) {
  indexingId.value = row.id
  try {
    await documentApi.index(row.id)
    ElMessage.success('向量索引完成。')
    await loadDocuments()
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
    await loadDocuments()
  } finally {
    indexingId.value = ''
  }
}

async function indexKnowledgeBase() {
  if (!knowledgeBase.value) {
    return
  }

  indexingKnowledgeBase.value = true
  try {
    const result = await knowledgeBaseApi.index(knowledgeBase.value.id)
    if (result.totalDocuments === 0) {
      ElMessage.warning('没有可索引的已解析文档。')
    } else if (result.failedDocuments > 0) {
      ElMessage.warning(`已索引 ${result.indexedDocuments}/${result.totalDocuments} 个文档，${result.failedDocuments} 个失败。`)
    } else {
      ElMessage.success(`已索引 ${result.indexedDocuments} 个文档。`)
    }
    await loadDocuments()
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
    await loadDocuments()
  } finally {
    indexingKnowledgeBase.value = false
  }
}

async function removeDocument(row: RagDocument) {
  try {
    await ElMessageBox.confirm(`确认删除文档“${row.fileName}”？`, '删除文档', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })

    await documentApi.remove(row.id)
    ElMessage.success('文档已删除。')
    if (documents.value.content.length === 1 && page.page > 0) {
      page.page -= 1
    }
    await loadDocuments()
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    ElMessage.error(resolveErrorMessage(error))
  }
}

function handleStatusChange() {
  page.page = 0
  void loadDocuments()
}

function handlePageChange(currentPage: number) {
  page.page = currentPage - 1
  void loadDocuments()
}

function handleSizeChange(size: number) {
  page.size = size
  page.page = 0
  void loadDocuments()
}

onMounted(loadAll)
</script>

<template>
  <section>
    <PageHeader
      :title="knowledgeBase?.name || '知识库详情'"
      :description="knowledgeBase?.description || '查看知识库配置、上传文档并跟踪处理状态。'"
    >
      <template #actions>
        <el-button @click="router.push('/knowledge-bases')">返回列表</el-button>
        <el-button v-if="knowledgeBase" :icon="Search" @click="router.push(`/knowledge-bases/${knowledgeBase.id}/retrieval`)">
          检索调试
        </el-button>
        <el-button v-if="knowledgeBase" :icon="MessageSquare" @click="router.push(`/knowledge-bases/${knowledgeBase.id}/chat`)">
          RAG 问答
        </el-button>
        <el-button v-if="knowledgeBase" @click="router.push(`/knowledge-bases/${knowledgeBase.id}/edit`)">编辑</el-button>
        <el-button v-if="knowledgeBase" :icon="Zap" :loading="indexingKnowledgeBase" @click="indexKnowledgeBase">重建索引</el-button>
        <el-button type="primary" :icon="FilePlus" @click="uploadVisible = true">上传文档</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadAll" />

    <template v-else>
      <div v-loading="loadingKnowledgeBase" class="page-band kb-summary">
        <div class="page-band__header">
          <div>
            <strong>配置概览</strong>
            <div class="muted summary-subtitle">切片、向量模型和知识库状态。</div>
          </div>
        </div>
        <div class="page-band__body summary-grid">
          <div class="summary-item">
            <div class="summary-label">状态</div>
            <StatusTag v-if="knowledgeBase" :status="knowledgeBase.status" kind="knowledgeBase" />
          </div>
          <div class="summary-item">
            <div class="summary-label">Chunk Size</div>
            <div class="summary-value">{{ knowledgeBase?.chunkSize ?? '-' }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Chunk Overlap</div>
            <div class="summary-value">{{ knowledgeBase?.chunkOverlap ?? '-' }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Embedding</div>
            <div class="summary-value text-ellipsis">{{ knowledgeBase?.embeddingModel ?? '-' }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">更新时间</div>
            <div class="summary-value">{{ formatDateTime(knowledgeBase?.updatedAt) }}</div>
          </div>
        </div>
      </div>

      <div class="page-band documents-band">
        <div class="page-band__header">
          <div>
            <strong>文档</strong>
            <div class="muted documents-subtitle">上传、解析并查看文档切片。</div>
          </div>
          <div class="documents-toolbar">
            <el-select v-model="statusFilter" clearable placeholder="全部状态" style="width: 160px" @change="handleStatusChange">
              <el-option v-for="item in documentStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button :icon="RefreshCw" @click="loadDocuments">刷新</el-button>
          </div>
        </div>

        <div class="page-band__body">
          <EmptyState v-if="!loadingDocuments && documents.content.length === 0" title="暂无文档" description="上传文档后可触发解析并检查 chunk 质量。">
            <el-button type="primary" :icon="FilePlus" @click="uploadVisible = true">上传文档</el-button>
          </EmptyState>

          <template v-else>
            <el-table v-loading="loadingDocuments" :data="documents.content" row-key="id" table-layout="fixed">
              <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-button link type="primary" @click="router.push(`/documents/${row.id}`)">
                    {{ row.fileName }}
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="fileType" label="类型" width="110" />
              <el-table-column label="大小" width="110">
                <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <StatusTag :status="row.status" kind="document" />
                </template>
              </el-table-column>
              <el-table-column prop="errorMessage" label="错误" min-width="180" show-overflow-tooltip />
              <el-table-column label="更新时间" width="170">
                <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="340" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button size="small" @click="router.push(`/documents/${row.id}`)">详情</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      :disabled="!canParseDocument(row.status) || isDocumentBusy(row.status)"
                      :loading="parsingId === row.id"
                      @click="parseDocument(row)"
                    >
                      解析
                    </el-button>
                    <el-button
                      size="small"
                      plain
                      :disabled="!canIndexDocument(row.status) || isDocumentBusy(row.status)"
                      :loading="indexingId === row.id"
                      @click="indexDocument(row)"
                    >
                      索引
                    </el-button>
                    <el-button
                      size="small"
                      :disabled="!canViewChunks(row.status)"
                      @click="router.push(`/documents/${row.id}/chunks`)"
                    >
                      Chunk
                    </el-button>
                    <el-button size="small" type="danger" plain @click="removeDocument(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-row">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next"
                :current-page="page.page + 1"
                :page-size="page.size"
                :page-sizes="[10, 20, 50]"
                :total="documents.totalElements"
                @current-change="handlePageChange"
                @size-change="handleSizeChange"
              />
            </div>
          </template>
        </div>
      </div>
    </template>

    <DocumentUploadDialog v-model="uploadVisible" :knowledge-base-id="knowledgeBaseId" @uploaded="loadDocuments" />
  </section>
</template>

<style scoped>
.kb-summary {
  margin-bottom: 18px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.summary-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.summary-item {
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface-soft);
  padding: 14px;
}

.summary-label {
  margin-bottom: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.summary-value {
  min-width: 0;
  color: var(--app-text);
  font-family: "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-weight: 700;
}

.documents-band {
  margin-top: 18px;
}

.documents-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.documents-toolbar {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 980px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
