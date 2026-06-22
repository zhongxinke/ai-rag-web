<script setup lang="ts">
import { ref } from 'vue'

import AppAuthTokenDialog from '@/components/AppAuthTokenDialog.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
const authTokenDialogVisible = ref(false)
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主内容</a>
  <div class="app-layout" :class="{ 'app-layout--nav-open': !appStore.sidebarCollapsed }">
    <AppSidebar />
    <button class="app-layout__scrim" type="button" aria-label="关闭导航" @click="appStore.closeSidebar" />
    <div class="app-layout__workspace">
      <AppHeader @open-auth-token-dialog="authTokenDialogVisible = true" />
      <main id="main-content" class="app-layout__main" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
  <AppAuthTokenDialog v-model="authTokenDialogVisible" />
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.82) 0, rgba(255, 255, 255, 0) 460px),
    transparent;
}

.app-layout__scrim {
  display: none;
}

.app-layout__workspace {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.app-layout__main {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px;
}

.app-layout__main:focus {
  outline: none;
}

@media (max-width: 900px) {
  .app-layout {
    display: block;
  }

  .app-layout__scrim {
    position: fixed;
    inset: 0;
    z-index: 18;
    display: block;
    pointer-events: none;
    border: 0;
    background: rgba(15, 23, 42, 0);
    opacity: 0;
    transition:
      background-color 180ms ease,
      opacity 180ms ease;
  }

  .app-layout--nav-open .app-layout__scrim {
    pointer-events: auto;
    background: rgba(15, 23, 42, 0.34);
    opacity: 1;
  }

  .app-layout__main {
    padding: 18px 16px 24px;
  }
}
</style>
