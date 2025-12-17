<script setup lang="ts">
// Vue Composable Example Page
</script>

<template>
  <div class="example-view">
    <h1>Vue Composable</h1>
    <p class="subtitle">How to use CXone Chat with Vue 3 Composition API</p>

    <section class="doc-section">
      <h2>Installation</h2>
      <pre class="code-block"><code>&lt;!-- Add CXone Chat script to your index.html --&gt;
&lt;script src="/cxone-chat/cxone-chat.min.js"&gt;&lt;/script&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Create Composable</h2>
      <p>Create <code>composables/useCXoneWebchat.ts</code>:</p>
      <pre class="code-block"><code>import { ref, shallowRef } from 'vue'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface ChatInstance {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) => void
  getUserId: () => string
  getSessionId: () => string
  registerAnalyticsService: (handler: (event: AnalyticsEvent) => void) => void
  connect: () => Promise&lt;void&gt;
  showNotification: (message: string) => void
  startConversation: () => void
  on: (event: string, handler: (data: unknown) => void) => void
  onMessage: (handler: (message: unknown) => void) => void
  updateSettings: (settings: Record&lt;string, unknown&gt;) => void
  endSession: () => void
  webchat: unknown
}

interface InitOptions {
  endpoint?: string
  context?: string
  userId?: string
  container?: HTMLElement | string
  embedded?: boolean
  onEmbeddedClose?: () => void
  homeScreen?: {
    welcomeText?: string
    subtitle?: string
    conversationStarters?: Array&lt;{ title: string; payload?: string }&gt;
  }
}

declare global {
  interface Window {
    CXOneChat: {
      init: (config: InitOptions & { endpoint: string; context: string }) => Promise&lt;ChatInstance&gt;
      open: () => void
      close: () => void
      toggle: () => void
      sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) => void
      isInitialized: () => boolean
    }
  }
}

// Shared state across all usages
const status = ref&lt;Status&gt;('idle')
const error = ref&lt;string | null&gt;(null)
const instance = shallowRef&lt;ChatInstance | null&gt;(null)

const SCRIPT_URL = '/cxone-chat/cxone-chat.min.js'
const DEFAULT_ENDPOINT = 'https://your-cognigy-endpoint.com/...'

function loadScript(src: string): Promise&lt;void&gt; {
  return new Promise((resolve, reject) => {
    if (window.CXOneChat) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(script)
  })
}

export function useCXoneWebchat() {
  async function init(options: InitOptions = {}) {
    if (status.value === 'loading' || status.value === 'ready') {
      return instance.value
    }

    status.value = 'loading'
    error.value = null

    try {
      await loadScript(SCRIPT_URL)

      instance.value = await window.CXOneChat.init({
        endpoint: options.endpoint || DEFAULT_ENDPOINT,
        context: options.context || 'demo',
        ...options,
      })

      status.value = 'ready'
      return instance.value
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Init failed'
      throw err
    }
  }

  return {
    // Reactive state
    status,
    error,
    instance,

    // Methods
    init,
    open: () => instance.value?.open(),
    close: () => instance.value?.close(),
    toggle: () => instance.value?.toggle(),
    sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) =>
      instance.value?.sendMessage(text, data),
    getUserId: () => instance.value?.getUserId() ?? '',
    getSessionId: () => instance.value?.getSessionId() ?? '',
    showNotification: (msg: string) => instance.value?.showNotification(msg),
    startConversation: () => instance.value?.startConversation(),
    endSession: () => instance.value?.endSession(),
    registerAnalyticsService: (handler: (event: unknown) => void) =>
      instance.value?.registerAnalyticsService(handler),
  }
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <pre class="code-block"><code>&lt;script setup lang="ts"&gt;
import { onMounted } from 'vue'
import { useCXoneWebchat } from '@/composables/useCXoneWebchat'

const { status, init, open, sendMessage } = useCXoneWebchat()

onMounted(async () => {
  await init({
    endpoint: 'https://your-cognigy-endpoint.com/...',
    context: 'my-app',
  })
})

const handleSend = () => {
  sendMessage('Hello!')
}
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;p&gt;Status: {<!-- -->{ status }}&lt;/p&gt;
    &lt;button @click="open" :disabled="status !== 'ready'"&gt;Open Chat&lt;/button&gt;
    &lt;button @click="handleSend" :disabled="status !== 'ready'"&gt;Send Message&lt;/button&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Embedded Mode (Sidebar)</h2>
      <pre class="code-block"><code>&lt;script setup lang="ts"&gt;
import { ref, nextTick } from 'vue'
import { useCXoneWebchat } from '@/composables/useCXoneWebchat'

const { status, init } = useCXoneWebchat()
const isSidebarOpen = ref(false)
const initialized = ref(false)

async function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value

  if (isSidebarOpen.value && !initialized.value) {
    initialized.value = true
    await nextTick() // Wait for container to render

    await init({
      container: '#chat-container',
      embedded: true,
      onEmbeddedClose: () => {
        isSidebarOpen.value = false
      },
      homeScreen: {
        welcomeText: 'Welcome!',
        subtitle: 'How can I help?',
        conversationStarters: [
          { title: 'Get started' },
          { title: 'Show help' },
        ],
      },
    })
  }
}
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;button @click="toggleSidebar"&gt;
      {<!-- -->{ isSidebarOpen ? 'Close' : 'Open' }} Chat
    &lt;/button&gt;

    &lt;aside v-show="isSidebarOpen" class="sidebar"&gt;
      &lt;div id="chat-container"&gt;&lt;/div&gt;
    &lt;/aside&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;style scoped&gt;
.sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
}

#chat-container {
  width: 100%;
  height: 100%;
}
&lt;/style&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Analytics Events</h2>
      <pre class="code-block"><code>&lt;script setup lang="ts"&gt;
import { useCXoneWebchat } from '@/composables/useCXoneWebchat'
import { useRouter } from 'vue-router'

const { init, registerAnalyticsService } = useCXoneWebchat()
const router = useRouter()

async function setup() {
  await init({ endpoint: '...', context: 'app' })

  registerAnalyticsService((event) => {
    if (event.type === 'webchat/incoming-message') {
      const data = event.payload?.data

      // Handle custom actions from bot
      if (data?.navigateTo) {
        router.push(data.navigateTo)
      }
      if (data?.showChart) {
        // Trigger chart display
      }
    }
  })
}
&lt;/script&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Key Points</h2>
      <ul class="feature-list">
        <li><strong>Shared State</strong> - Status and instance are shared across components</li>
        <li><strong>Lazy Init</strong> - Call init() when you need the chat, not on app mount</li>
        <li><strong>Embedded Mode</strong> - Use container + embedded for sidebar integration</li>
        <li><strong>Wait for Container</strong> - Use nextTick() before init when container is v-show</li>
        <li><strong>Analytics</strong> - Use registerAnalyticsService for bot message handling</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.example-view {
  max-width: 800px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.subtitle {
  color: #666;
  font-size: 12px;
  margin-bottom: 20px;
}

.doc-section {
  margin-bottom: 24px;
}

h2 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #d1d1d1;
}

.code-block {
  background: #f5f5f5;
  color: #333;
  padding: 10px 12px;
  border: 1px solid #d1d1d1;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre;
}

.code-block code {
  color: inherit;
  background: none;
  padding: 0;
}

code {
  background: #f0f0f0;
  color: #0066cc;
  padding: 1px 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

p {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.feature-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.feature-list li {
  padding: 4px 0;
  color: #666;
  font-size: 12px;
}

.feature-list strong {
  color: #333;
}
</style>
