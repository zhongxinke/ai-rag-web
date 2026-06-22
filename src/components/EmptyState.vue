<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <span class="empty-state__icon">
      <Inbox :size="28" />
    </span>
    <div class="empty-state__title">{{ title }}</div>
    <p v-if="description">{{ description }}</p>
    <div class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  border: 1px dashed var(--app-border-strong);
  border-radius: var(--app-radius);
  background:
    linear-gradient(180deg, #ffffff 0%, var(--app-surface-soft) 100%);
  color: var(--app-text-muted);
  padding: 32px;
  text-align: center;
}

.empty-state__icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.empty-state__title {
  margin-top: 12px;
  color: var(--app-text);
  font-size: 16px;
  font-weight: 800;
}

p {
  max-width: 420px;
  margin: 8px auto 0;
  line-height: 1.6;
}

.empty-state__actions {
  margin-top: 18px;
}
</style>
