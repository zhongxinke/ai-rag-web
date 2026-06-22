<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="permission-state" role="status">
    <div class="permission-state__icon" aria-hidden="true">
      <ShieldAlert :size="26" />
    </div>
    <div class="permission-state__copy">
      <h2>{{ title || '没有访问权限' }}</h2>
      <p>{{ description || '当前令牌无法访问该资源，请确认登录状态或权限范围。' }}</p>
      <div v-if="$slots.actions" class="permission-state__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.permission-state {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1px solid #fecaca;
  border-radius: var(--app-radius);
  background: var(--app-danger-soft);
  padding: 18px;
}

.permission-state__icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-radius);
  background: #fee2e2;
  color: var(--app-danger);
}

.permission-state__copy {
  min-width: 0;
}

h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 16px;
  font-weight: 800;
}

p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.permission-state__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
</style>
