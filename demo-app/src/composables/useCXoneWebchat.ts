import { ref, shallowRef } from 'vue'

/**
 * Vue Composable for CXOneChat Integration
 *
 * This is a showcase example of how to integrate CXOneChat wrapper
 * into a Vue application using the Composition API.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useCXoneWebchat } from '@/composables/useCXoneWebchat'
 *
 * const { status, init, open, sendMessage } = useCXoneWebchat()
 *
 * onMounted(() => {
 *   init({ endpoint: '...', context: 'myapp' })
 * })
 * </script>
 * ```
 */

// ============================================================================
// Configuration
// ============================================================================

const CXONE_CHAT_SCRIPT = '/cxone-chat/cxone-chat.bundle.js'
const DEFAULT_ENDPOINT = 'https://endpoint-dev.cognigy.ai/ea50316a5a49e574da804c75175ce5ea671ba2e15ddd228076dd0d6e339af6c6'

// ============================================================================
// Types (mirrors CXOneChat types for TypeScript support)
// ============================================================================

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface AnalyticsEvent {
  type: string
  payload?: {
    text?: string
    data?: Record<string, unknown>
    [key: string]: unknown
  }
}

interface ChatInstance {
  // Core methods
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  getSessionId: () => string
  registerAnalyticsService: (handler: (event: AnalyticsEvent) => void) => void
  // Extended methods
  connect: () => Promise<void>
  showNotification: (message: string) => void
  startConversation: () => void
  on: (event: string, handler: (data: unknown) => void) => void
  onMessage: (handler: (message: unknown) => void) => void
  updateSettings: (settings: Record<string, unknown>) => void
  endSession: () => void
  // Raw access
  webchat: unknown
}

interface InitOptions {
  /** Cognigy endpoint URL */
  endpoint?: string
  /** Application context sent to Cognigy */
  context?: string
  /** User ID (auto-detected if not provided) */
  userId?: string
  /** Container element or selector for embedded mode */
  container?: HTMLElement | string
  /** Enable embedded mode (relative positioning) */
  embedded?: boolean
  /** Callback when close button clicked in embedded mode */
  onEmbeddedClose?: () => void
  /** CXone Bearer token */
  cxoneToken?: string
  /** Backend URL for conversation sync (omit to disable) */
  syncUrl?: string
  /** Home screen configuration */
  homeScreen?: {
    welcomeText?: string
    subtitle?: string
    suggestionsLabel?: string
    inputPlaceholder?: string
    conversationStarters?: Array<{ title: string; payload?: string }>
  }
}

interface CXOneChatGlobal {
  init: (config: InitOptions & { endpoint: string; context: string }) => Promise<ChatInstance>
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  isInitialized: () => boolean
  connect: () => Promise<void>
  showNotification: (message: string) => void
  startConversation: () => void
  on: (event: string, handler: (data: unknown) => void) => void
  onMessage: (handler: (message: unknown) => void) => void
  updateSettings: (settings: Record<string, unknown>) => void
  endSession: () => void
  getWebchat: () => unknown
}

declare global {
  interface Window {
    CXOneChat: CXOneChatGlobal
  }
}

// ============================================================================
// State (shared across all usages of this composable)
// ============================================================================

const status = ref<Status>('idle')
const error = ref<string | null>(null)
const instance = shallowRef<ChatInstance | null>(null)

// ============================================================================
// Script Loader
// ============================================================================

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.CXOneChat) {
      resolve()
      return
    }

    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      const waitForLoad = setInterval(() => {
        if (window.CXOneChat) {
          clearInterval(waitForLoad)
          resolve()
        }
      }, 50)
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      const waitForGlobal = setInterval(() => {
        if (window.CXOneChat) {
          clearInterval(waitForGlobal)
          resolve()
        }
      }, 50)
    }
    script.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(script)
  })
}

// ============================================================================
// Composable
// ============================================================================

export function useCXoneWebchat() {
  /**
   * Initialize CXOneChat
   */
  async function init(options: InitOptions = {}) {
    if (status.value === 'loading' || status.value === 'ready') {
      return instance.value
    }

    status.value = 'loading'
    error.value = null

    try {
      await loadScript(CXONE_CHAT_SCRIPT)

      instance.value = await window.CXOneChat.init({
        endpoint: options.endpoint || DEFAULT_ENDPOINT,
        context: options.context || 'demo',
        userId: options.userId,
        container: options.container,
        embedded: options.embedded,
        onEmbeddedClose: options.onEmbeddedClose,
        cxoneToken: options.cxoneToken,
        syncUrl: options.syncUrl,
        homeScreen: options.homeScreen,
      })

      status.value = 'ready'
      return instance.value
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Initialization failed'
      throw err
    }
  }

  // ===========================================================================
  // Core Methods
  // ===========================================================================

  function open() {
    instance.value?.open()
  }

  function close() {
    instance.value?.close()
  }

  function toggle() {
    instance.value?.toggle()
  }

  function sendMessage(text: string, data?: Record<string, unknown>) {
    instance.value?.sendMessage(text, data)
  }

  // ===========================================================================
  // User & Session
  // ===========================================================================

  function getUserId(): string {
    return instance.value?.getUserId() ?? ''
  }

  function getSessionId(): string {
    return instance.value?.getSessionId() ?? ''
  }

  // ===========================================================================
  // Analytics & Events
  // ===========================================================================

  /**
   * Register handler for all webchat analytics events
   * @example
   * registerAnalyticsService((event) => {
   *   if (event.type === 'webchat/incoming-message') {
   *     console.log('Bot message:', event.payload)
   *   }
   * })
   */
  function registerAnalyticsService(handler: (event: AnalyticsEvent) => void) {
    instance.value?.registerAnalyticsService(handler)
  }

  /**
   * Listen to incoming bot messages
   * @example
   * onMessage((message) => console.log('Message:', message))
   */
  function onMessage(handler: (message: unknown) => void) {
    instance.value?.onMessage(handler)
  }

  /**
   * Listen to socket events
   * @example
   * on('typingStatus', (data) => console.log('Typing:', data))
   */
  function on(event: string, handler: (data: unknown) => void) {
    instance.value?.on(event, handler)
  }

  // ===========================================================================
  // Extended Methods
  // ===========================================================================

  /**
   * Reconnect websocket
   */
  async function connect() {
    await instance.value?.connect()
  }

  /**
   * Display toast notification
   */
  function showNotification(message: string) {
    instance.value?.showNotification(message)
  }

  /**
   * Start new conversation (shows chat screen from home)
   */
  function startConversation() {
    instance.value?.startConversation()
  }

  /**
   * Update webchat settings at runtime
   * @example
   * updateSettings({ colors: { primaryColor: '#FF0000' } })
   */
  function updateSettings(settings: Record<string, unknown>) {
    instance.value?.updateSettings(settings)
  }

  /**
   * End current session and clear messages
   */
  function endSession() {
    instance.value?.endSession()
  }

  // ===========================================================================
  // Raw Access
  // ===========================================================================

  /**
   * Get underlying webchat instance for advanced usage
   */
  function getWebchat() {
    return instance.value?.webchat ?? null
  }

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // State (reactive)
    status,
    error,
    instance,

    // Initialization
    init,

    // Core
    open,
    close,
    toggle,
    sendMessage,

    // User & Session
    getUserId,
    getSessionId,

    // Analytics & Events
    registerAnalyticsService,
    onMessage,
    on,

    // Extended
    connect,
    showNotification,
    startConversation,
    updateSettings,
    endSession,

    // Raw access
    getWebchat,
  }
}
