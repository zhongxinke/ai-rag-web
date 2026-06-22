import { defineStore } from 'pinia'

import { getAuthTokenInfo, setStoredAuthToken, type AuthTokenSource } from '@/utils/auth'

export const useAppStore = defineStore('app', {
  state: () => {
    const authTokenInfo = getAuthTokenInfo()

    return {
      sidebarCollapsed: true,
      pageSize: 20,
      lastKnowledgeBaseId: '',
      authToken: authTokenInfo.token,
      authTokenSource: authTokenInfo.source as AuthTokenSource,
    }
  },
  getters: {
    hasAuthToken: (state) => Boolean(state.authToken.trim()),
  },
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
    setAuthToken(token: string) {
      setStoredAuthToken(token)
      this.refreshAuthToken()
    },
    refreshAuthToken() {
      const authTokenInfo = getAuthTokenInfo()

      this.authToken = authTokenInfo.token
      this.authTokenSource = authTokenInfo.source
    },
  },
})
