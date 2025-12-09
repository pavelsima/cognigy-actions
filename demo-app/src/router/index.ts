import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/insights',
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/views/InsightsView.vue'),
    },
    {
      path: '/email',
      name: 'email',
      component: () => import('@/views/EmailView.vue'),
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('@/views/KnowledgeArticleView.vue'),
    },
    {
      path: '/docs',
      name: 'docs',
      component: () => import('@/views/DocsView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
