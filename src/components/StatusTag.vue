<script setup lang="ts">
import { computed } from 'vue'

import type { DocumentStatus, KnowledgeBaseStatus } from '@/api/types'
import { documentStatusMeta, knowledgeBaseStatusMeta } from '@/utils/status'

const props = defineProps<{
  status: DocumentStatus | KnowledgeBaseStatus
  kind: 'document' | 'knowledgeBase'
}>()

const meta = computed(() => {
  if (props.kind === 'document') {
    return documentStatusMeta[props.status as DocumentStatus]
  }

  return knowledgeBaseStatusMeta[props.status as KnowledgeBaseStatus]
})

const statusClass = computed(() => `status-tag--${meta.value.type}`)
</script>

<template>
  <span class="status-tag" :class="statusClass">
    <span class="status-tag__dot" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  padding: 0 10px;
  white-space: nowrap;
}

.status-tag__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.status-tag--success {
  border-color: #bbf7d0;
  background: var(--app-success-soft);
  color: var(--app-success);
}

.status-tag--warning {
  border-color: #fde68a;
  background: var(--app-warning-soft);
  color: var(--app-warning);
}

.status-tag--danger {
  border-color: #fecaca;
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.status-tag--info {
  border-color: #bae6fd;
  background: var(--app-info-soft);
  color: var(--app-info);
}

.status-tag--primary {
  border-color: #bfdbfe;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}
</style>
