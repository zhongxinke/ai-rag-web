<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Database, Plus, RefreshCw, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { knowledgeBaseApi } from '@/api/knowledgeBaseApi'
import type { KnowledgeBase, PageResponse } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { resolveErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const page = reactive({
  page: 0,
  size: 20,
})
const data = ref<PageResponse<KnowledgeBase>>({
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
})

const pageLabel = computed(() => {
  if (data.value.totalElements === 0) {
    return '-'
  }

  return `${page.page + 1} / ${Math.max(data.value.totalPages, 1)}`
})

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await knowledgeBaseApi.list({
      page: page.page,
      size: page.size,
      sort: 'createdAt,desc',
    })
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function removeKnowledgeBase(row: KnowledgeBase) {
  try {
    await ElMessageBox.confirm(`确认删除知识库“${row.name}”？关联文档也将不可见。`, '删除知识库', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })

    await knowledgeBaseApi.remove(row.id)
    ElMessage.success('知识库已删除。')

    if (data.value.content.length === 1 && page.page > 0) {
      page.page -= 1
    }
    await loadData()
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    ElMessage.error(resolveErrorMessage(error))
  }
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

onMounted(loadData)
</script>

<template>
  <section>
    <PageHeader title="知识库" description="管理 RAG 知识库配置和文档入库流程。">
      <template #actions>
        <el-button :icon="RefreshCw" @click="loadData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/knowledge-bases/new')">创建知识库</el-button>
      </template>
    </PageHeader>

    <div class="overview-strip" aria-label="知识库概览">
      <div class="overview-item">
        <span>知识库总数</span>
        <strong>{{ data.totalElements }}</strong>
      </div>
      <div class="overview-item">
        <span>当前页</span>
        <strong>{{ pageLabel }}</strong>
      </div>
      <div class="overview-item">
        <span>分页大小</span>
        <strong>{{ page.size }}</strong>
      </div>
    </div>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadData" />

    <div v-else class="page-band">
      <div class="page-band__header">
        <div>
          <strong>知识库列表</strong>
          <div class="muted list-subtitle">按最近更新时间展示，可进入详情管理文档。</div>
        </div>
        <span class="list-count">{{ data.content.length }} 条记录</span>
      </div>
      <div class="page-band__body">
        <EmptyState v-if="!loading && data.content.length === 0" title="暂无知识库" description="创建知识库后即可上传文档并检查切片结果。">
          <el-button type="primary" :icon="Database" @click="router.push('/knowledge-bases/new')">创建知识库</el-button>
        </EmptyState>

        <template v-else>
          <el-table v-loading="loading" :data="data.content" row-key="id" table-layout="fixed">
            <el-table-column prop="name" label="名称" min-width="180">
              <template #default="{ row }">
                <el-button link type="primary" @click="router.push(`/knowledge-bases/${row.id}`)">
                  {{ row.name }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <StatusTag :status="row.status" kind="knowledgeBase" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
            <el-table-column prop="chunkSize" label="Chunk" width="110">
              <template #default="{ row }">{{ row.chunkSize }} / {{ row.chunkOverlap }}</template>
            </el-table-column>
            <el-table-column prop="embeddingModel" label="Embedding" min-width="180" show-overflow-tooltip />
            <el-table-column label="更新时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button size="small" @click="router.push(`/knowledge-bases/${row.id}`)">查看</el-button>
                  <el-button size="small" :icon="Search" @click="router.push(`/knowledge-bases/${row.id}/retrieval`)">
                    检索
                  </el-button>
                  <el-button size="small" @click="router.push(`/knowledge-bases/${row.id}/edit`)">编辑</el-button>
                  <el-button size="small" type="danger" plain @click="removeKnowledgeBase(row)">删除</el-button>
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
              :total="data.totalElements"
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
.overview-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.overview-item {
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--app-shadow-sm);
  padding: 14px 16px;
}

.overview-item span {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.overview-item strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-family: "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.list-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.list-count {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 720px) {
  .overview-strip {
    grid-template-columns: 1fr;
  }
}
</style>
