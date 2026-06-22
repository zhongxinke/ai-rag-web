<script setup lang="ts">
import type { UploadFile, UploadFiles } from 'element-plus'
import { ElMessage } from 'element-plus'
import { UploadCloud } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import { documentApi } from '@/api/documentApi'
import { resolveErrorMessage } from '@/utils/error'
import { supportedFileHint, validateUploadFile } from '@/utils/file'

const props = defineProps<{
  modelValue: boolean
  knowledgeBaseId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  uploaded: []
}>()

const submitting = ref(false)
const selectedFile = ref<File | null>(null)

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      selectedFile.value = null
      submitting.value = false
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function handleChange(uploadFile: UploadFile, uploadFiles: UploadFiles) {
  const raw = uploadFile.raw
  if (!raw) {
    return
  }

  const validation = validateUploadFile(raw)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    uploadFiles.splice(0, uploadFiles.length)
    selectedFile.value = null
    return
  }

  selectedFile.value = raw
}

function handleRemove() {
  selectedFile.value = null
}

async function submit() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择需要上传的文档。')
    return
  }

  submitting.value = true
  try {
    await documentApi.upload(props.knowledgeBaseId, selectedFile.value)
    ElMessage.success('文档上传成功。')
    emit('uploaded')
    close()
  } catch (error) {
    ElMessage.error(resolveErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="上传文档" width="560px" @close="close">
    <el-upload
      drag
      :auto-upload="false"
      :limit="1"
      accept=".pdf,.txt,.md,.markdown,.docx"
      :on-change="handleChange"
      :on-remove="handleRemove"
    >
      <UploadCloud :size="34" />
      <div class="upload-title">拖拽文件到此处，或点击选择</div>
      <template #tip>
        <div class="upload-tip">支持 {{ supportedFileHint() }}，单文件不超过 20MB。</div>
      </template>
    </el-upload>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">上传</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.upload-title {
  margin-top: 10px;
  color: var(--app-text);
  font-weight: 700;
}

.upload-tip {
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
}
</style>
