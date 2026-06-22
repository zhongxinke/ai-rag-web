<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--app-border);
  padding-bottom: 18px;
}

.page-header__copy {
  min-width: 0;
}

h1 {
  margin: 0;
  color: var(--app-text);
  font-family: "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

p {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.page-header__actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  min-width: fit-content;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 14px;
  }

  .page-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
