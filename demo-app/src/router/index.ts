import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/docs',
    },
    {
      path: '/docs',
      name: 'docs',
      component: () => import('@/views/DocsView.vue'),
    },
    {
      path: '/vue-example',
      name: 'vue-example',
      component: () => import('@/views/VueExampleView.vue'),
    },
    {
      path: '/react-example',
      name: 'react-example',
      component: () => import('@/views/ReactExampleView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
