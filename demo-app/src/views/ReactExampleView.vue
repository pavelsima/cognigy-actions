<script setup lang="ts">
// React Hook Example Page
</script>

<template>
  <div class="example-view">
    <h1>React Hook</h1>
    <p class="subtitle">How to use CXone Chat with React</p>

    <section class="doc-section">
      <h2>Installation</h2>
      <pre class="code-block"><code>&lt;!-- Add CXone Chat script to your index.html --&gt;
&lt;script src="/cxone-chat/cxone-chat.min.js"&gt;&lt;/script&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Create Hook</h2>
      <p>Create <code>hooks/useCXoneWebchat.ts</code>:</p>
      <pre class="code-block"><code>import { useState, useCallback, useRef } from 'react'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface ChatInstance {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) => void
  getUserId: () => string
  getSessionId: () => string
  registerAnalyticsService: (handler: (event: unknown) => void) => void
  showNotification: (message: string) => void
  startConversation: () => void
  endSession: () => void
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
    }
  }
}

const SCRIPT_URL = '/cxone-chat/cxone-chat.min.js'
const DEFAULT_ENDPOINT = 'https://your-cognigy-endpoint.com/...'

// Singleton state (shared across hook instances)
let globalInstance: ChatInstance | null = null
let globalStatus: Status = 'idle'
let initPromise: Promise&lt;ChatInstance&gt; | null = null

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
  const [status, setStatus] = useState&lt;Status&gt;(globalStatus)
  const [error, setError] = useState&lt;string | null&gt;(null)
  const instanceRef = useRef&lt;ChatInstance | null&gt;(globalInstance)

  const init = useCallback(async (options: InitOptions = {}) => {
    // Return existing instance if already initialized
    if (globalInstance) {
      return globalInstance
    }

    // Return pending promise if already initializing
    if (initPromise) {
      return initPromise
    }

    globalStatus = 'loading'
    setStatus('loading')
    setError(null)

    initPromise = (async () => {
      try {
        await loadScript(SCRIPT_URL)

        const instance = await window.CXOneChat.init({
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
    (text: string, data?: Record&lt;string, unknown&gt;) =>
      instanceRef.current?.sendMessage(text, data),
    []
  )

  const showNotification = useCallback(
    (message: string) => instanceRef.current?.showNotification(message),
    []
  )

  const startConversation = useCallback(
    () => instanceRef.current?.startConversation(),
    []
  )

  const endSession = useCallback(
    () => instanceRef.current?.endSession(),
    []
  )

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
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <pre class="code-block"><code>import { useEffect } from 'react'
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
    &lt;div&gt;
      &lt;p&gt;Status: {status}&lt;/p&gt;
      &lt;button onClick={open} disabled={status !== 'ready'}&gt;
        Open Chat
      &lt;/button&gt;
      &lt;button
        onClick={() => sendMessage('Hello!')}
        disabled={status !== 'ready'}
      &gt;
        Send Message
      &lt;/button&gt;
    &lt;/div&gt;
  )
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>Embedded Mode (Sidebar)</h2>
      <pre class="code-block"><code>import { useState, useCallback } from 'react'
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
    &lt;&gt;
      &lt;button onClick={toggleSidebar}&gt;
        {isOpen ? 'Close' : 'Open'} Chat
      &lt;/button&gt;

      {isOpen && (
        &lt;aside className="sidebar"&gt;
          &lt;div id="chat-container" /&gt;
        &lt;/aside&gt;
      )}

      &lt;style&gt;{`
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
      `}&lt;/style&gt;
    &lt;/&gt;
  )
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>Analytics Events</h2>
      <pre class="code-block"><code>import { useEffect } from 'react'
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

  return &lt;div&gt;Chat with analytics&lt;/div&gt;
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>TypeScript Types</h2>
      <pre class="code-block"><code>// types/cxone-chat.d.ts

declare global {
  interface Window {
    CXOneChat: CXOneChatGlobal
  }
}

interface CXOneChatGlobal {
  init: (config: CXOneChatConfig) => Promise&lt;CXOneChatInstance&gt;
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) => void
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
  sendMessage: (text: string, data?: Record&lt;string, unknown&gt;) => void
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
    data?: Record&lt;string, unknown&gt;
    [key: string]: unknown
  }
}

export {}</code></pre>
    </section>

    <section class="doc-section">
      <h2>Key Points</h2>
      <ul class="feature-list">
        <li><strong>Singleton Pattern</strong> - Global state ensures single instance across components</li>
        <li><strong>useCallback</strong> - Memoize functions to prevent unnecessary re-renders</li>
        <li><strong>Ref for Instance</strong> - Use useRef for instance to avoid stale closures</li>
        <li><strong>Init Guard</strong> - Check initialized state before calling init again</li>
        <li><strong>Container Timing</strong> - Add small delay before init in embedded mode</li>
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
