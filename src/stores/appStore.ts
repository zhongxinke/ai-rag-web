import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: true,
    pageSize: 20,
    lastKnowledgeBaseId: '',
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    closeSidebar() {
      this.sidebarCollapsed = true
    },
    setPageSize(pageSize: number) {
      this.pageSize = pageSize
    },
    rememberKnowledgeBase(id: string) {
      this.lastKnowledgeBaseId = id
    },
  },
})
