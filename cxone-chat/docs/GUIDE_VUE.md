# Vue 3 Integration Guide

How to use CXone Chat with Vue 3 Composition API.

## Installation

### Option A: Script Tag (IIFE)

Add to your `index.html`:

```html
<!-- Production -->
<script src="/cxone-chat/cxone-chat.min.js"></script>

<!-- Development/debugging -->
<script src="/cxone-chat/cxone-chat.bundle.js"></script>
```

### Option B: ESM Import

Import directly in your composable:

```typescript
// Direct ESM import
import { CXOneChat } from '/cxone-chat/cxone-chat.esm.js'

// Or with a bundler (after npm install)
import { CXOneChat } from '@cxone/chat'
```

---

## Create Composable

Create `composables/useCXoneWebchat.ts`:

### ESM Version (Recommended)

```typescript
import { ref, shallowRef } from 'vue'
import { CXOneChat } from '@cxone/chat'
// Or: import { CXOneChat } from '/cxone-chat/cxone-chat.esm.js'

type Status = 'idle' | 'loading' | 'ready' | 'error'

// Shared state across all usages
const status = ref<Status>('idle')
const error = ref<string | null>(null)
const instance = shallowRef<Awaited<ReturnType<typeof CXOneChat.init>> | null>(null)

const DEFAULT_ENDPOINT = 'https://your-cognigy-endpoint.com/...'

export function useCXoneWebchat() {
  async function init(options: Parameters<typeof CXOneChat.init>[0]) {
    if (status.value === 'loading' || status.value === 'ready') {
      return instance.value
    }

    status.value = 'loading'
    error.value = null

    try {
      instance.value = await CXOneChat.init({
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
    status,
    error,
    instance,
    init,
    open: () => instance.value?.open(),
    close: () => instance.value?.close(),
    toggle: () => instance.value?.toggle(),
    sendMessage: (text: string, data?: Record<string, unknown>) =>
      instance.value?.sendMessage(text, data),
    getUserId: () => instance.value?.getUserId() ?? '',
    getSessionId: () => instance.value?.getSessionId() ?? '',
    showNotification: (msg: string) => instance.value?.showNotification(msg),
    startConversation: () => instance.value?.startConversation(),
    endSession: () => instance.value?.endSession(),
    registerAnalyticsService: (handler: (event: unknown) => void) =>
      instance.value?.registerAnalyticsService(handler),
  }
}
```

### Script Tag Version (with dynamic loading)

If using script tag approach, the composable needs to load the script first:

```typescript
import { ref, shallowRef } from 'vue'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const status = ref<Status>('idle')
const error = ref<string | null>(null)
const instance = shallowRef<any>(null)

const SCRIPT_URL = '/cxone-chat/cxone-chat.min.js'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).CXOneChat) {
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
  async function init(options: any = {}) {
    if (status.value === 'loading' || status.value === 'ready') {
      return instance.value
    }

    status.value = 'loading'
    error.value = null

    try {
      await loadScript(SCRIPT_URL)

      instance.value = await (window as any).CXOneChat.init({
        endpoint: options.endpoint,
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
    status, error, instance, init,
    open: () => instance.value?.open(),
    close: () => instance.value?.close(),
    toggle: () => instance.value?.toggle(),
    sendMessage: (text: string, data?: Record<string, unknown>) =>
      instance.value?.sendMessage(text, data),
    // ... other methods
  }
}
```

---

## Basic Usage

```vue
<script setup lang="ts">
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
</script>

<template>
  <div>
    <p>Status: {{ status }}</p>
    <button @click="open" :disabled="status !== 'ready'">Open Chat</button>
    <button @click="handleSend" :disabled="status !== 'ready'">Send Message</button>
  </div>
</template>
```

---

## Embedded Mode (Sidebar)

```vue
<script setup lang="ts">
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
</script>

<template>
  <div>
    <button @click="toggleSidebar">
      {{ isSidebarOpen ? 'Close' : 'Open' }} Chat
    </button>

    <aside v-show="isSidebarOpen" class="sidebar">
      <div id="chat-container"></div>
    </aside>
  </div>
</template>

<style scoped>
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
</style>
```

---

## Analytics Events

```vue
<script setup lang="ts">
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
</script>
```

---

## Key Points

| Pattern | Description |
|---------|-------------|
| **Shared State** | Status and instance are shared across components using module-level refs |
| **Lazy Init** | Call `init()` when you need the chat, not on app mount |
| **Embedded Mode** | Use `container` + `embedded` for sidebar integration |
| **Wait for Container** | Use `nextTick()` before init when container uses `v-show` |
| **Analytics** | Use `registerAnalyticsService` for bot message handling |

---

## TypeScript Types

The composable exports these types for use in your components:

```typescript
type Status = 'idle' | 'loading' | 'ready' | 'error'

interface InitOptions {
  endpoint?: string
  context?: string
  userId?: string
  container?: HTMLElement | string
  embedded?: boolean
  onEmbeddedClose?: () => void
  homeScreen?: HomeScreenConfig
}

interface HomeScreenConfig {
  welcomeText?: string
  subtitle?: string
  suggestionsLabel?: string
  inputPlaceholder?: string
  conversationStarters?: Array<{ title: string; payload?: string }>
}
```

See the main [README](../README.md) for complete API documentation.
