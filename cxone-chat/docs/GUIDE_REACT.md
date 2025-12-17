# React Integration Guide

How to use CXone Chat with React.

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

Import directly in your hook:

```typescript
// Direct ESM import
import { CXOneChat } from '/cxone-chat/cxone-chat.esm.js'

// Or with a bundler (after npm install)
import { CXOneChat } from '@cxone/chat'
```

---

## Create Hook

Create `hooks/useCXoneWebchat.ts`:

### ESM Version (Recommended)

```typescript
import { useState, useCallback, useRef } from 'react'
import { CXOneChat } from '@cxone/chat'
// Or: import { CXOneChat } from '/cxone-chat/cxone-chat.esm.js'

type Status = 'idle' | 'loading' | 'ready' | 'error'
type ChatInstance = Awaited<ReturnType<typeof CXOneChat.init>>

const DEFAULT_ENDPOINT = 'https://your-cognigy-endpoint.com/...'

// Singleton state (shared across hook instances)
let globalInstance: ChatInstance | null = null
let globalStatus: Status = 'idle'
let initPromise: Promise<ChatInstance> | null = null

export function useCXoneWebchat() {
  const [status, setStatus] = useState<Status>(globalStatus)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<ChatInstance | null>(globalInstance)

  const init = useCallback(async (options: Parameters<typeof CXOneChat.init>[0]) => {
    if (globalInstance) return globalInstance
    if (initPromise) return initPromise

    globalStatus = 'loading'
    setStatus('loading')
    setError(null)

    initPromise = (async () => {
      try {
        const instance = await CXOneChat.init({
          endpoint: options.endpoint || DEFAULT_ENDPOINT,
          context: options.context || 'demo',
          ...options,
        })

        globalInstance = instance
        instanceRef.current = instance
        globalStatus = 'ready'
        setStatus('ready')
        return instance
      } catch (err) {
        globalStatus = 'error'
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Init failed')
        initPromise = null
        throw err
      }
    })()

    return initPromise
  }, [])

  const open = useCallback(() => instanceRef.current?.open(), [])
  const close = useCallback(() => instanceRef.current?.close(), [])
  const toggle = useCallback(() => instanceRef.current?.toggle(), [])
  const sendMessage = useCallback(
    (text: string, data?: Record<string, unknown>) =>
      instanceRef.current?.sendMessage(text, data),
    []
  )
  const showNotification = useCallback(
    (message: string) => instanceRef.current?.showNotification(message),
    []
  )
  const startConversation = useCallback(() => instanceRef.current?.startConversation(), [])
  const endSession = useCallback(() => instanceRef.current?.endSession(), [])
  const registerAnalyticsService = useCallback(
    (handler: (event: unknown) => void) =>
      instanceRef.current?.registerAnalyticsService(handler),
    []
  )

  return {
    status,
    error,
    instance: instanceRef.current,
    init,
    open,
    close,
    toggle,
    sendMessage,
    showNotification,
    startConversation,
    endSession,
    registerAnalyticsService,
  }
}
```

### Script Tag Version (with dynamic loading)

If using script tag approach, the hook needs to load the script first:

```typescript
import { useState, useCallback, useRef } from 'react'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const SCRIPT_URL = '/cxone-chat/cxone-chat.min.js'

let globalInstance: any = null
let globalStatus: Status = 'idle'
let initPromise: Promise<any> | null = null

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
  const [status, setStatus] = useState<Status>(globalStatus)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<any>(globalInstance)

  const init = useCallback(async (options: any = {}) => {
    if (globalInstance) return globalInstance
    if (initPromise) return initPromise

    globalStatus = 'loading'
    setStatus('loading')
    setError(null)

    initPromise = (async () => {
      try {
        await loadScript(SCRIPT_URL)

        const instance = await (window as any).CXOneChat.init({
          endpoint: options.endpoint,
          context: options.context || 'demo',
          ...options,
        })

        globalInstance = instance
        instanceRef.current = instance
        globalStatus = 'ready'
        setStatus('ready')
        return instance
      } catch (err) {
        globalStatus = 'error'
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Init failed')
        initPromise = null
        throw err
      }
    })()

    return initPromise
  }, [])

  return {
    status, error, instance: instanceRef.current, init,
    open: useCallback(() => instanceRef.current?.open(), []),
    close: useCallback(() => instanceRef.current?.close(), []),
    toggle: useCallback(() => instanceRef.current?.toggle(), []),
    sendMessage: useCallback((text: string, data?: any) =>
      instanceRef.current?.sendMessage(text, data), []),
    // ... other methods
  }
}
```

---

## Basic Usage

```tsx
import { useEffect } from 'react'
import { useCXoneWebchat } from './hooks/useCXoneWebchat'

function App() {
  const { status, init, open, sendMessage } = useCXoneWebchat()

  useEffect(() => {
    init({
      endpoint: 'https://your-cognigy-endpoint.com/...',
      context: 'my-app',
    })
  }, [init])

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={open} disabled={status !== 'ready'}>
        Open Chat
      </button>
      <button
        onClick={() => sendMessage('Hello!')}
        disabled={status !== 'ready'}
      >
        Send Message
      </button>
    </div>
  )
}
```

---

## Embedded Mode (Sidebar)

```tsx
import { useState, useCallback } from 'react'
import { useCXoneWebchat } from './hooks/useCXoneWebchat'

function ChatSidebar() {
  const { status, init } = useCXoneWebchat()
  const [isOpen, setIsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const toggleSidebar = useCallback(async () => {
    const willOpen = !isOpen
    setIsOpen(willOpen)

    if (willOpen && !initialized) {
      setInitialized(true)

      // Small delay to ensure container is rendered
      await new Promise(r => setTimeout(r, 0))

      await init({
        container: '#chat-container',
        embedded: true,
        onEmbeddedClose: () => setIsOpen(false),
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
  }, [isOpen, initialized, init])

  return (
    <>
      <button onClick={toggleSidebar}>
        {isOpen ? 'Close' : 'Open'} Chat
      </button>

      {isOpen && (
        <aside className="sidebar">
          <div id="chat-container" />
        </aside>
      )}

      <style>{`
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
      `}</style>
    </>
  )
}
```

---

## Analytics Events

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCXoneWebchat } from './hooks/useCXoneWebchat'

function ChatWithAnalytics() {
  const { init, registerAnalyticsService } = useCXoneWebchat()
  const navigate = useNavigate()

  useEffect(() => {
    async function setup() {
      await init({ endpoint: '...', context: 'app' })

      registerAnalyticsService((event: any) => {
        if (event.type === 'webchat/incoming-message') {
          const data = event.payload?.data

          // Handle custom actions from bot
          if (data?.navigateTo) {
            navigate(data.navigateTo)
          }
          if (data?.showChart) {
            // Trigger chart display
          }
        }
      })
    }

    setup()
  }, [init, registerAnalyticsService, navigate])

  return <div>Chat with analytics</div>
}
```

---

## Key Points

| Pattern | Description |
|---------|-------------|
| **Singleton Pattern** | Global state ensures single instance across components |
| **useCallback** | Memoize functions to prevent unnecessary re-renders |
| **Ref for Instance** | Use `useRef` for instance to avoid stale closures |
| **Init Guard** | Check initialized state before calling init again |
| **Container Timing** | Add small delay before init in embedded mode |

---

## TypeScript Types

Create `types/cxone-chat.d.ts` for global type definitions:

```typescript
declare global {
  interface Window {
    CXOneChat: CXOneChatGlobal
  }
}

interface CXOneChatGlobal {
  init: (config: CXOneChatConfig) => Promise<CXOneChatInstance>
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  isInitialized: () => boolean
}

interface CXOneChatConfig {
  endpoint: string
  context: string
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
  conversationStarters?: ConversationStarter[]
}

interface ConversationStarter {
  title: string
  payload?: string
}

interface CXOneChatInstance {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  getSessionId: () => string
  registerAnalyticsService: (handler: (event: AnalyticsEvent) => void) => void
  showNotification: (message: string) => void
  startConversation: () => void
  endSession: () => void
}

interface AnalyticsEvent {
  type: string
  payload?: {
    text?: string
    data?: Record<string, unknown>
    [key: string]: unknown
  }
}

export {}
```

See the main [README](../README.md) for complete API documentation.
