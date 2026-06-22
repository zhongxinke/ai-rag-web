<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { KeyRound, Menu, Server } from 'lucide-vue-next'

import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const appStore = useAppStore()
const emit = defineEmits<{
  (event: 'open-auth-token-dialog'): void
}>()

const title = computed(() => route.meta.title?.toString() || 'AI RAG Web')
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '同源 / Vite 代理'
</script>

<template>
  <header class="app-header">
    <button class="app-header__menu" type="button" aria-label="切换导航" @click="appStore.toggleSidebar">
      <Menu :size="18" />
    </button>
    <div class="app-header__copy">
      <div class="app-header__title">{{ title }}</div>
      <div class="app-header__sub">RAG 管理工作台</div>
    </div>
    <div class="app-header__endpoint" aria-label="后端地址">
      <Server :size="15" />
      <span>{{ apiBaseUrl }}</span>
    </div>
    <button
      class="app-header__auth"
      :class="{ 'app-header__auth--active': appStore.hasAuthToken }"
      type="button"
      aria-label="配置访问令牌"
      @click="emit('open-auth-token-dialog')"
    >
      <KeyRound :size="15" />
      <span>{{ appStore.hasAuthToken ? '已配置令牌' : '访问令牌' }}</span>
    </button>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--app-header-height);
  border-bottom: 1px solid var(--app-border);
  background: rgba(248, 250, 252, 0.88);
  padding: 0 24px;
  backdrop-filter: blur(18px);
}

.app-header__menu {
  display: none;
  width: 36px;
  height: 36px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  color: var(--app-text);
  transition:
    border-color 180ms ease,
    color 180ms ease;
}

.app-header__menu:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.app-header__copy {
  min-width: 0;
}

.app-header__title {
  color: var(--app-text);
  font-size: 15px;
  font-weight: 800;
}

.app-header__sub {
  margin-top: 2px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.app-header__endpoint {
  display: inline-flex;
  max-width: min(420px, 46vw);
  min-height: 34px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(255, 255, 255, 0.78);
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
}

.app-header__endpoint span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__auth {
  display: inline-flex;
  min-height: 34px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(255, 255, 255, 0.78);
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 0 10px;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.app-header__auth:hover,
.app-header__auth--active {
  border-color: #bbf7d0;
  background: var(--app-success-soft);
  color: var(--app-success);
}

@media (max-width: 900px) {
  .app-header {
    padding: 0 16px;
  }

  .app-header__menu {
    display: inline-flex;
  }
}

@media (max-width: 620px) {
  .app-header__endpoint {
    display: none;
  }

  .app-header__auth span {
    display: none;
  }
}
</style>
