<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Save } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { knowledgeBaseApi } from '@/api/knowledgeBaseApi'
import type { CreateKnowledgeBaseRequest } from '@/api/types'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { resolveErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

const isEdit = computed(() => route.name === 'knowledge-base-edit')
const knowledgeBaseId = computed(() => route.params.id?.toString() || '')

const form = reactive<CreateKnowledgeBaseRequest>({
  name: '',
  description: '',
  chunkSize: 800,
  chunkOverlap: 100,
  embeddingModel: 'text-embedding-3-small',
})

const rules: FormRules<CreateKnowledgeBaseRequest> = {
  name: [
    { required: true, message: '请输入知识库名称。', trigger: 'blur' },
    { max: 128, message: '名称最多 128 个字符。', trigger: 'blur' },
  ],
  description: [{ max: 2000, message: '描述最多 2000 个字符。', trigger: 'blur' }],
  chunkSize: [
    { required: true, message: '请输入 chunkSize。', trigger: 'blur' },
    { type: 'number', min: 1, message: 'chunkSize 必须大于 0。', trigger: 'blur' },
  ],
  chunkOverlap: [
    { required: true, message: '请输入 chunkOverlap。', trigger: 'blur' },
    { type: 'number', min: 0, message: 'chunkOverlap 必须大于等于 0。', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (Number(value) >= Number(form.chunkSize)) {
          callback(new Error('chunkOverlap 必须小于 chunkSize。'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  embeddingModel: [{ max: 128, message: '模型名最多 128 个字符。', trigger: 'blur' }],
}

async function loadKnowledgeBase() {
  if (!isEdit.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const data = await knowledgeBaseApi.get(knowledgeBaseId.value)
    form.name = data.name
    form.description = data.description || ''
    form.chunkSize = data.chunkSize
    form.chunkOverlap = data.chunkOverlap
    form.embeddingModel = data.embeddingModel
  } catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function submit() {
  await formRef.value?.validate()

  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      chunkSize: Number(form.chunkSize),
      chunkOverlap: Number(form.chunkOverlap),
      embeddingModel: form.embeddingModel?.trim() || undefined,
    }

    const saved = isEdit.value
      ? await knowledgeBaseApi.update(knowledgeBaseId.value, payload)
      : await knowledgeBaseApi.create(payload)

    ElMessage.success(isEdit.value ? '知识库已更新。' : '知识库已创建。')
    await router.push(`/knowledge-bases/${saved.id}`)
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

onMounted(loadKnowledgeBase)
</script>

<template>
  <section>
    <PageHeader :title="isEdit ? '编辑知识库' : '创建知识库'" description="配置知识库基础信息和默认切片参数。">
      <template #actions>
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" :icon="Save" :loading="submitting" @click="submit">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="loadKnowledgeBase" />

    <div v-else v-loading="loading" class="page-band">
      <div class="page-band__header">
        <div>
          <strong>基础配置</strong>
          <div class="muted form-subtitle">名称、描述和默认切片参数。</div>
        </div>
      </div>
      <div class="page-band__body form-shell">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="知识库名称" prop="name">
            <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="例如：产品知识库" />
          </el-form-item>

          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              maxlength="2000"
              show-word-limit
              :rows="5"
              placeholder="说明知识库的用途、文档范围或维护人。"
            />
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="Chunk Size" prop="chunkSize">
              <el-input-number v-model="form.chunkSize" :min="1" :step="100" controls-position="right" />
            </el-form-item>

            <el-form-item label="Chunk Overlap" prop="chunkOverlap">
              <el-input-number v-model="form.chunkOverlap" :min="0" :step="20" controls-position="right" />
            </el-form-item>
          </div>

          <el-form-item label="Embedding 模型" prop="embeddingModel">
            <el-input v-model="form.embeddingModel" maxlength="128" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.form-subtitle {
  margin-top: 4px;
  font-size: 12px;
}

.form-shell {
  max-width: 760px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

:deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 680px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
