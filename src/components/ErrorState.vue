<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

defineProps<{
  message: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="error-state">
    <span class="error-state__icon">
      <TriangleAlert :size="26" />
    </span>
    <div class="error-state__message">{{ message }}</div>
    <el-button type="primary" plain @click="$emit('retry')">重试</el-button>
  </div>
</template>

<style scoped>
.error-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  border: 1px solid #fecaca;
  border-radius: var(--app-radius);
  background:
    linear-gradient(180deg, #ffffff 0%, var(--app-danger-soft) 100%);
  color: var(--app-danger);
  padding: 28px;
  text-align: center;
}

.error-state__icon {
  display: inline-flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  border: 1px solid #fecaca;
  border-radius: var(--app-radius);
  background: #ffffff;
}

.error-state__message {
  margin: 12px 0 18px;
  color: var(--app-text);
  font-weight: 700;
}
</style>
