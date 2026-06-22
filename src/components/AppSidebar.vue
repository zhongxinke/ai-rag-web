<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Activity, BookOpen, Database, Files, MessageSquare, Search } from 'lucide-vue-next'

import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
const route = useRoute()

const classes = computed(() => ({
  'app-sidebar--collapsed': appStore.sidebarCollapsed,
}))

const retrievalTarget = computed(() => {
  if (appStore.lastKnowledgeBaseId) {
    return `/knowledge-bases/${appStore.lastKnowledgeBaseId}/retrieval`
  }

  return '/retrieval'
})

const chatTarget = computed(() => {
  if (appStore.lastKnowledgeBaseId) {
    return `/knowledge-bases/${appStore.lastKnowledgeBaseId}/chat`
  }

  return '/chat'
})

const activeMain = computed(() => {
  if (route.path.startsWith('/documents')) {
    return 'knowledge'
  }
  if (route.path.startsWith('/chat') || route.path.includes('/chat')) {
    return 'chat'
  }
  if (route.path.includes('retrieval')) {
    return 'retrieval'
  }
  return 'knowledge'
})
</script>

<template>
  <aside class="app-sidebar" :class="classes">
    <RouterLink class="app-sidebar__brand" to="/knowledge-bases" aria-label="返回知识库列表" @click="appStore.closeSidebar">
      <span class="app-sidebar__brand-mark">
        <Database :size="20" />
      </span>
      <span class="app-sidebar__brand-copy">
        <strong>AI RAG Web</strong>
        <small>Knowledge Ops</small>
      </span>
    </RouterLink>

    <nav class="app-sidebar__nav" aria-label="主导航">
      <div class="app-sidebar__nav-label">主工作区</div>
      <RouterLink
        class="app-sidebar__link"
        :class="{ active: activeMain === 'knowledge' }"
        to="/knowledge-bases"
        @click="appStore.closeSidebar"
      >
        <BookOpen :size="18" />
        <span>知识库</span>
      </RouterLink>
      <RouterLink
        class="app-sidebar__link"
        :class="{ active: activeMain === 'retrieval' }"
        :to="retrievalTarget"
        @click="appStore.closeSidebar"
      >
        <Search :size="18" />
        <span>检索调试</span>
      </RouterLink>
      <RouterLink
        class="app-sidebar__link"
        :class="{ active: activeMain === 'chat' }"
        :to="chatTarget"
        @click="appStore.closeSidebar"
      >
        <MessageSquare :size="18" />
        <span>RAG 问答</span>
      </RouterLink>
      <div class="app-sidebar__link disabled" aria-disabled="true">
        <Files :size="18" />
        <span>运行监控</span>
        <small>待开放</small>
      </div>
    </nav>

    <div class="app-sidebar__footer">
      <div class="app-sidebar__footer-title">
        <Activity :size="14" />
        <span>阶段 7</span>
      </div>
      <div class="app-sidebar__footer-text">当前开放知识库、文档、切片、检索调试、会话问答和流式输出。</div>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  width: var(--app-sidebar-width);
  height: 100vh;
  flex: 0 0 var(--app-sidebar-width);
  flex-direction: column;
  border-right: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.92);
  padding: 18px 14px;
  backdrop-filter: blur(18px);
  transition: transform 220ms ease;
}

.app-sidebar__brand {
  display: inline-flex;
  min-height: 52px;
  cursor: pointer;
  align-items: center;
  gap: 12px;
  border-radius: var(--app-radius);
  color: var(--app-text);
  padding: 6px 8px;
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.app-sidebar__brand:hover {
  background: var(--app-surface-soft);
}

.app-sidebar__brand-mark {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-radius);
  background: var(--app-text);
  color: #ffffff;
  box-shadow: var(--app-shadow-sm);
}

.app-sidebar__brand-copy {
  display: grid;
  gap: 2px;
}

.app-sidebar__brand-copy strong {
  font-size: 15px;
  font-weight: 800;
}

.app-sidebar__brand-copy small {
  color: var(--app-text-subtle);
  font-size: 11px;
  font-weight: 700;
}

.app-sidebar__nav {
  display: grid;
  gap: 8px;
  margin-top: 28px;
}

.app-sidebar__nav-label {
  color: var(--app-text-subtle);
  font-size: 12px;
  font-weight: 800;
  padding: 0 10px 2px;
}

.app-sidebar__link {
  display: flex;
  min-height: 42px;
  cursor: pointer;
  align-items: center;
  gap: 10px;
  border-radius: var(--app-radius);
  border: 1px solid transparent;
  color: var(--app-text-muted);
  padding: 0 10px;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.app-sidebar__link span {
  flex: 1;
  min-width: 0;
}

.app-sidebar__link small {
  border-radius: 999px;
  background: var(--app-surface-muted);
  color: var(--app-text-subtle);
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
}

.app-sidebar__link:hover,
.app-sidebar__link.active {
  border-color: #bfdbfe;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.app-sidebar__link.disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.app-sidebar__link.disabled:hover {
  background: transparent;
  border-color: transparent;
  color: var(--app-text-muted);
}

.app-sidebar__footer {
  margin-top: auto;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background:
    linear-gradient(180deg, #ffffff 0%, var(--app-surface-soft) 100%);
  padding: 12px;
}

.app-sidebar__footer-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
}

.app-sidebar__footer-text {
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    width: min(var(--app-sidebar-width), calc(100vw - 36px));
    box-shadow: var(--app-shadow-lg);
    transform: translateX(-100%);
  }

  .app-sidebar:not(.app-sidebar--collapsed) {
    transform: translateX(0);
  }
}
</style>
