import { createRouter, createWebHistory } from 'vue-router'

import AppLayout from '@/components/AppLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          redirect: '/knowledge-bases',
        },
        {
          path: 'knowledge-bases',
          name: 'knowledge-bases',
          component: () => import('@/features/knowledge-base/KnowledgeBaseListView.vue'),
          meta: { title: '知识库' },
        },
        {
          path: 'knowledge-bases/new',
          name: 'knowledge-base-new',
          component: () => import('@/features/knowledge-base/KnowledgeBaseFormView.vue'),
          meta: { title: '创建知识库' },
        },
        {
          path: 'retrieval',
          name: 'retrieval',
          component: () => import('@/features/retrieval/RetrievalDebugView.vue'),
          meta: { title: '检索调试' },
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('@/features/chat/ChatView.vue'),
          meta: { title: 'RAG 问答' },
        },
        {
          path: 'chat/sessions/:sessionId',
          name: 'chat-session',
          component: () => import('@/features/chat/ChatView.vue'),
          meta: { title: '会话问答' },
        },
        {
          path: 'knowledge-bases/:id/retrieval',
          name: 'knowledge-base-retrieval',
          component: () => import('@/features/retrieval/RetrievalDebugView.vue'),
          meta: { title: '检索调试' },
        },
        {
          path: 'knowledge-bases/:id/chat/sessions/:sessionId',
          name: 'knowledge-base-chat-session',
          component: () => import('@/features/chat/ChatView.vue'),
          meta: { title: '会话问答' },
        },
        {
          path: 'knowledge-bases/:id/chat',
          name: 'knowledge-base-chat',
          component: () => import('@/features/chat/ChatView.vue'),
          meta: { title: 'RAG 问答' },
        },
        {
          path: 'knowledge-bases/:id',
          name: 'knowledge-base-detail',
          component: () => import('@/features/knowledge-base/KnowledgeBaseDetailView.vue'),
          meta: { title: '知识库详情' },
        },
        {
          path: 'knowledge-bases/:id/edit',
          name: 'knowledge-base-edit',
          component: () => import('@/features/knowledge-base/KnowledgeBaseFormView.vue'),
          meta: { title: '编辑知识库' },
        },
        {
          path: 'documents/:id',
          name: 'document-detail',
          component: () => import('@/features/document/DocumentDetailView.vue'),
          meta: { title: '文档详情' },
        },
        {
          path: 'documents/:id/chunks',
          name: 'document-chunks',
          component: () => import('@/features/document/DocumentChunksView.vue'),
          meta: { title: '文档切片' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/knowledge-bases',
    },
  ],
})
