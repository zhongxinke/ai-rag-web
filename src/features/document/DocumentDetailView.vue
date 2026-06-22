<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { FileText, Zap } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { documentApi } from '@/api/documentApi'
import type { RagDocument } from '@/api/types'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { resolveErrorMessage } from '@/utils/error'
import { formatDateTime, formatFileSize } from '@/utils/format'
import { canIndexDocument, canParseDocument, canViewChunks, isDocumentBusy } from '@/utils/status'

const route = useRoute()
const router = useRouter()
const documentId = computed(() => route.params.id?.toString() || '')
const documentData = ref<RagDocument | null>(null)
const loading = ref(false)
const parsing = ref(false)
const indexing = ref(false)
const errorMessage = ref('')

async function loadDocument() {
  loading.value = true
  errorMessage.value = ''
  try {
    documentData.value = await documentApi.get(documentId.value)
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function parseDocument() {
  if (!documentData.value) {
    return
  }

  parsing.value = true
  try {
    documentData.value = await documentApi.parse(documentData.value.id)
    ElMessage.success('解析完成。')
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
    await loadDocument()
  } finally {
    parsing.value = false
  }
}

async function indexDocument() {
  if (!documentData.value) {
    return
  }

  indexing.value = true
  try {
    documentData.value = await documentApi.index(documentData.value.id)
    ElMessage.success('向量索引完成。')
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
    await loadDocument()
  } finally {
    indexing.value = false
  }
}

async function removeDocument() {
  if (!documentData.value) {
    return
  }

  try {
    await ElMessageBox.confirm(`确认删除文档“${documentData.value.fileName}”？`, '删除文档', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })

    const knowledgeBaseId = documentData.value.knowledgeBaseId
    await documentApi.remove(documentData.value.id)
    ElMessage.success('文档已删除。')
    await router.push(`/knowledge-bases/${knowledgeBaseId}`)
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    ElMessage.error(resolveErrorMessage(error))
  }
}

onMounted(loadDocument)
</script>

<template>
  <section>
    <PageHeader :title="documentData?.fileName || '文档详情'" description="查看文档元数据、处理状态和解析结果入口。">
      <template #actions>
        <el-button v-if="documentData" @click="router.push(`/knowledge-bases/${documentData.knowledgeBaseId}`)">返回知识库</el-button>
        <el-button
          v-if="documentData"
          type="primary"
          plain
          :loading="parsing"
          :disabled="!canParseDocument(documentData.status) || isDocumentBusy(documentData.status)"
          @click="parseDocument"
        >
          解析
        </el-button>
        <el-button
          v-if="documentData"
          :icon="Zap"
          :loading="indexing"
          :disabled="!canIndexDocument(documentData.status) || isDocumentBusy(documentData.status)"
          @click="indexDocument"
        >
          向量索引
        </el-button>
        <el-button
          v-if="documentData"
          :icon="FileText"
          :disabled="!canViewChunks(documentData.status)"
          @click="router.push(`/documents/${documentData.id}/chunks`)"
        >
          查看 Chunk
        </el-button>
        <el-button v-if="documentData" type="danger" plain @click="removeDocument">删除</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadDocument" />

    <div v-else v-loading="loading" class="page-band">
      <div class="page-band__header">
        <div>
          <strong>文档元数据</strong>
          <div class="muted detail-subtitle">文件、状态、存储路径和处理时间。</div>
        </div>
      </div>
      <div class="page-band__body">
        <el-descriptions v-if="documentData" :column="2" border>
          <el-descriptions-item label="文档 ID">{{ documentData.id }}</el-descriptions-item>
          <el-descriptions-item label="知识库 ID">{{ documentData.knowledgeBaseId }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ documentData.fileName }}</el-descriptions-item>
          <el-descriptions-item label="文件类型">{{ documentData.fileType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(documentData.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <StatusTag :status="documentData.status" kind="document" />
          </el-descriptions-item>
          <el-descriptions-item label="存储路径" :span="2">
            <span class="mono">{{ documentData.storagePath }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="错误消息" :span="2">{{ documentData.errorMessage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(documentData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(documentData.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

:deep(.el-descriptions__body) {
  overflow-x: auto;
}

:deep(.el-descriptions__content) {
  word-break: break-word;
}
</style>
