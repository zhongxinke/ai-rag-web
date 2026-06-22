<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CheckCircle2, Clipboard, Eye, EyeOff } from 'lucide-vue-next'

import { useAppStore } from '@/stores/appStore'
import { onAuthTokenChange } from '@/utils/auth'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const appStore = useAppStore()
const authTokenDraft = ref('')
const authTokenVisible = ref(false)

let stopAuthTokenChange: (() => void) | undefined

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})
const activeAuthToken = computed(() => appStore.authToken.trim())
const authTokenInputType = computed(() => (authTokenVisible.value ? 'text' : 'password'))
const authTokenSourceText = computed(() => {
  if (appStore.authTokenSource === 'stored') {
    return '本机保存'
  }

  if (appStore.authTokenSource === 'env') {
    return '环境变量'
  }

  return '未配置'
})
const authTokenDisplay = computed(() => {
  const token = activeAuthToken.value

  if (!token) {
    return '尚未配置访问令牌'
  }

  if (authTokenVisible.value) {
    return token
  }

  if (token.length <= 12) {
    return '*'.repeat(token.length)
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`
})

function syncAuthTokenDraft() {
  appStore.refreshAuthToken()
  authTokenDraft.value = appStore.authToken
  authTokenVisible.value = false
}

function saveAuthToken() {
  const nextToken = authTokenDraft.value.trim()

  appStore.setAuthToken(nextToken)
  authTokenDraft.value = appStore.authToken
  authTokenVisible.value = false
  dialogVisible.value = false

  if (nextToken) {
    ElMessage.success('访问令牌已保存')
    return
  }

  ElMessage.success(appStore.hasAuthToken ? '已清空页面令牌，当前使用环境变量令牌' : '访问令牌已清空')
}

function clearAuthToken() {
  authTokenDraft.value = ''
  appStore.setAuthToken('')
  authTokenDraft.value = appStore.authToken
  authTokenVisible.value = false
  dialogVisible.value = false
  ElMessage.success(appStore.hasAuthToken ? '已清空页面令牌，当前使用环境变量令牌' : '访问令牌已清空')
}

async function copyAuthToken() {
  const token = activeAuthToken.value

  if (!token) {
    return
  }

  try {
    await navigator.clipboard.writeText(token)
    ElMessage.success('访问令牌已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择令牌')
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      syncAuthTokenDraft()
    }
  },
)

onMounted(() => {
  stopAuthTokenChange = onAuthTokenChange(() => {
    appStore.refreshAuthToken()

    if (!dialogVisible.value) {
      authTokenDraft.value = appStore.authToken
    }
  })
})

onBeforeUnmount(() => {
  stopAuthTokenChange?.()
})
</script>

<template>
  <el-dialog v-model="dialogVisible" title="访问令牌" width="min(480px, calc(100vw - 32px))">
    <div class="auth-token-dialog__current" :class="{ 'auth-token-dialog__current--empty': !appStore.hasAuthToken }">
      <div class="auth-token-dialog__current-main">
        <div class="auth-token-dialog__current-meta">
          <span class="auth-token-dialog__current-label">当前令牌</span>
          <span v-if="appStore.hasAuthToken" class="auth-token-dialog__source">
            <CheckCircle2 :size="14" />
            {{ authTokenSourceText }}
          </span>
        </div>
        <code
          class="auth-token-dialog__token mono"
          :class="{ 'auth-token-dialog__token--visible': authTokenVisible && appStore.hasAuthToken }"
        >
          {{ authTokenDisplay }}
        </code>
      </div>
      <div v-if="appStore.hasAuthToken" class="auth-token-dialog__actions">
        <button
          class="auth-token-dialog__icon-button"
          type="button"
          :aria-label="authTokenVisible ? '隐藏访问令牌' : '显示访问令牌'"
          :title="authTokenVisible ? '隐藏访问令牌' : '显示访问令牌'"
          @click="authTokenVisible = !authTokenVisible"
        >
          <component :is="authTokenVisible ? EyeOff : Eye" :size="16" />
        </button>
        <button
          class="auth-token-dialog__icon-button"
          type="button"
          aria-label="复制访问令牌"
          title="复制访问令牌"
          @click="copyAuthToken"
        >
          <Clipboard :size="16" />
        </button>
      </div>
    </div>
    <el-form label-position="top">
      <el-form-item label="API Key">
        <el-input
          v-model="authTokenDraft"
          class="auth-token-dialog__input"
          :type="authTokenInputType"
          clearable
          placeholder="粘贴后端配置的 API Key"
          autocomplete="off"
          spellcheck="false"
        >
          <template #suffix>
            <button
              class="auth-token-dialog__input-icon-button"
              type="button"
              :aria-label="authTokenVisible ? '隐藏访问令牌' : '显示访问令牌'"
              :title="authTokenVisible ? '隐藏访问令牌' : '显示访问令牌'"
              @click.stop="authTokenVisible = !authTokenVisible"
            >
              <component :is="authTokenVisible ? EyeOff : Eye" :size="15" />
            </button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <p class="auth-token-dialog__help">
      保存后请求会自动携带 X-API-Key 请求头；也可以通过 VITE_API_TOKEN 在构建环境中注入。
    </p>
    <template #footer>
      <el-button @click="clearAuthToken">清空</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveAuthToken">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.auth-token-dialog__help {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.auth-token-dialog__current {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-surface-soft);
  padding: 12px;
}

.auth-token-dialog__current--empty {
  background: var(--app-info-soft);
}

.auth-token-dialog__current-main {
  min-width: 0;
  flex: 1;
}

.auth-token-dialog__current-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.auth-token-dialog__current-label {
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
}

.auth-token-dialog__source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  background: var(--app-success-soft);
  color: var(--app-success);
  font-size: 12px;
  font-weight: 800;
  padding: 3px 8px;
}

.auth-token-dialog__token {
  display: block;
  overflow: hidden;
  color: var(--app-text);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-token-dialog__token--visible {
  max-height: 116px;
  overflow: auto;
  text-overflow: clip;
  white-space: pre-wrap;
  word-break: break-all;
}

.auth-token-dialog__actions {
  display: inline-flex;
  flex: none;
  gap: 6px;
}

.auth-token-dialog__icon-button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-surface);
  color: var(--app-text-muted);
  transition:
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.auth-token-dialog__icon-button:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  box-shadow: var(--app-shadow-sm);
}

.auth-token-dialog__input :deep(.el-input__inner) {
  font-family: "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.auth-token-dialog__input-icon-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--app-radius-xs);
  background: transparent;
  color: var(--app-text-muted);
  padding: 0;
}

.auth-token-dialog__input-icon-button:hover {
  color: var(--app-primary);
}

@media (max-width: 620px) {
  .auth-token-dialog__current {
    align-items: flex-start;
    flex-direction: column;
  }

  .auth-token-dialog__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
