import { ref } from 'vue'
import router from '@/router'
import { useTableData } from './useTableData'

/**
 * CXone AI Webchat Integration
 *
 * Uses the standalone CXone Chat script for one-liner initialization.
 * The script handles everything: loading Cognigy, backend sync, theming.
 */

// Path to the CXone Chat script
// In production, this would be a CDN URL
const CXONE_CHAT_SCRIPT = '/cxone-chat/cxone-chat.js'

// Default Cognigy endpoint (can be overridden in init)
const DEFAULT_COGNIGY_ENDPOINT = 'https://endpoint-dev.cognigy.ai/ea50316a5a49e574da804c75175ce5ea671ba2e15ddd228076dd0d6e339af6c6'

type LoaderStatus = 'idle' | 'loading' | 'ready' | 'error'

type WebchatAnalyticsEvent = {
  type: string
  payload?: {
    text?: string
    data?: Record<string, unknown>
    [key: string]: unknown
  }
}

interface CXOneChatInstance {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  getSessionId: () => string
  registerAnalyticsService: (handler: (event: WebchatAnalyticsEvent) => void) => void
}

interface ConversationStarter {
  title: string
  payload?: string
}

interface HomeScreenConfig {
  welcomeText?: string
  subtitle?: string
  suggestionsLabel?: string
  inputPlaceholder?: string
  conversationStarters?: ConversationStarter[]
}

interface CXOneChatConfig {
  endpoint: string
  context: string
  userId?: string
  container?: HTMLElement | string
  embedded?: boolean
  onEmbeddedClose?: () => void
  cxoneToken?: string
  homeScreen?: HomeScreenConfig
}

interface CXOneChat {
  init: (config: CXOneChatConfig) => Promise<CXOneChatInstance>
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string, data?: Record<string, unknown>) => void
  getUserId: () => string
  isInitialized: () => boolean
}

declare global {
  interface Window {
    CXOneChat: CXOneChat
  }
}

const status = ref<LoaderStatus>('idle')
const errorMessage = ref<string | null>(null)
let chatInstance: CXOneChatInstance | null = null
let analyticsAttached = false
const { setTableData, setChartConfig, markChartReady } = useTableData()

/**
 * Load the CXone Chat script
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.CXOneChat) {
      resolve()
      return
    }

    if (document.querySelector(`script[src="${src}"]`)) {
      // Script tag exists, wait for it to load
      const checkLoaded = () => {
        if (window.CXOneChat) {
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      // Wait for CXOneChat to be available
      const checkReady = () => {
        if (window.CXOneChat) {
          resolve()
        } else {
          setTimeout(checkReady, 50)
        }
      }
      checkReady()
    }
    script.onerror = () => reject(new Error(`Failed to load CXone Chat script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Attach analytics logger to handle incoming messages
 * Same logic as useCognigyWebchat for handling table data, charts, email drafts, and route retrieval
 */
const attachAnalyticsLogger = (instance: CXOneChatInstance | null) => {
  console.log('[CXone Webchat] attachAnalyticsLogger called', {
    analyticsAttached,
    hasInstance: !!instance,
    hasRegisterAnalyticsService: !!instance?.registerAnalyticsService,
  })

  if (analyticsAttached || !instance?.registerAnalyticsService) {
    console.warn('[CXone Webchat] Skipping analytics attachment', { analyticsAttached })
    return
  }

  console.log('[CXone Webchat] Registering analytics handler...')
  instance.registerAnalyticsService((event) => {
    console.log('[CXone Webchat] analytics event', event)

    if (event.type !== 'webchat/incoming-message') {
      return
    }

    console.log('[CXone Webchat] incoming message event', event)

    const payloadData = event.payload?.data
    console.log('[CXone Webchat] payload data', payloadData)

    const hasTablePayload =
      typeof payloadData === 'object' &&
      payloadData !== null &&
      (payloadData as Record<string, unknown>).hasTableData === true

    if (hasTablePayload) {
      const pluginData =
        typeof payloadData === 'object' &&
        payloadData !== null &&
        (payloadData as Record<string, unknown>)._plugin &&
        typeof (payloadData as Record<string, unknown>)._plugin === 'object'
          ? ((payloadData as Record<string, unknown>)._plugin as Record<string, unknown>).data
          : undefined

      console.log('[CXone Webchat] storing table data from payload data property', pluginData)
      setTableData(pluginData ?? null)
    }

    const shouldCreateChart =
      typeof payloadData === 'object' &&
      payloadData !== null &&
      (payloadData as Record<string, unknown>).createChart === true

    if (shouldCreateChart) {
      console.log('[CXone Webchat] received createChart flag')

      const chartConfigPayload =
        typeof payloadData === 'object' &&
        payloadData !== null &&
        (payloadData as Record<string, unknown>).chartConfig &&
        typeof (payloadData as Record<string, unknown>).chartConfig === 'object'
          ? (payloadData as Record<string, unknown>).chartConfig
          : null

      if (chartConfigPayload) {
        console.log('[CXone Webchat] storing chart configuration from payload data', chartConfigPayload)
        setChartConfig(chartConfigPayload)
      } else {
        console.warn(
          '[CXone Webchat] createChart flag received without a valid chartConfig object. Falling back to local chart configuration.',
        )
        setChartConfig(null)
      }

      markChartReady()
      if (router.currentRoute.value.path !== '/insights') {
        console.log('[CXone Webchat] redirecting to /insights')
        router.push('/insights')
      }
    }

    const shouldCreateEmailDraft =
      typeof payloadData === 'object' &&
      payloadData !== null &&
      (payloadData as Record<string, unknown>).createEmailDraft === true

    if (shouldCreateEmailDraft) {
      console.log('[CXone Webchat] received createEmailDraft flag')
      if (router.currentRoute.value.path !== '/email') {
        console.log('[CXone Webchat] redirecting to /email')
        router.push('/email')
      }
    }

    const hasRetrieveRouteFlag =
      typeof payloadData === 'object' &&
      payloadData !== null &&
      ((payloadData as Record<string, unknown>).retrieveRoute === true ||
        (payloadData as Record<string, unknown>).retreiveRoute === true)

    const shouldReturnRoute = Boolean(hasRetrieveRouteFlag)

    console.log('[CXone Webchat] shouldReturnRoute', shouldReturnRoute)

    if (!shouldReturnRoute) {
      console.debug('[CXone Webchat] no retrieveRoute flag present, skipping reply')
      return
    }

    if (typeof instance.sendMessage !== 'function') {
      console.warn('[CXone Webchat] sendMessage is not available on the webchat instance')
      return
    }

    const currentRoute = router.currentRoute.value
    const routeDescriptor =
      currentRoute?.fullPath ??
      currentRoute?.path ??
      (typeof currentRoute?.name === 'string' ? currentRoute.name : null) ??
      '/'

    console.log('[CXone Webchat] sending currentRoute payload', routeDescriptor)

    instance.sendMessage('', {
      currentRoute: routeDescriptor,
    })

    console.log('[CXone Webchat] sent currentRoute payload', routeDescriptor)
  })

  analyticsAttached = true
  console.log('[CXone Webchat] Analytics handler registered successfully')
}

/**
 * Initialize CXone Webchat
 * @param options Optional configuration for endpoint, container, embedded mode, close callback, and cxoneToken
 */
const init = async (options?: {
  endpoint?: string
  container?: HTMLElement | string
  embedded?: boolean
  onEmbeddedClose?: () => void
  cxoneToken?: string
  homeScreen?: HomeScreenConfig
}) => {
  if (status.value === 'loading' || status.value === 'ready') return

  status.value = 'loading'
  errorMessage.value = null

  try {
    // Load the CXone Chat script
    console.log('[CXone Webchat] Loading CXone Chat script...')
    await loadScript(CXONE_CHAT_SCRIPT)

    // Initialize with container/embedded options if provided
    console.log('[CXone Webchat] Initializing...', options)
    chatInstance = await window.CXOneChat.init({
      endpoint: options?.endpoint || DEFAULT_COGNIGY_ENDPOINT,
      context: 'actions',
      container: options?.container,
      embedded: options?.embedded,
      onEmbeddedClose: options?.onEmbeddedClose,
      cxoneToken: options?.cxoneToken,
      homeScreen: options?.homeScreen,
    })

    // Attach analytics logger for handling events
    attachAnalyticsLogger(chatInstance)

    status.value = 'ready'
    console.log('[CXone Webchat] Ready!')
  } catch (error) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'Failed to initialize CXone Chat'
    console.error('[CXone Webchat] Initialization failed:', error)
  }
}

const open = () => {
  chatInstance?.open()
}

const close = () => {
  chatInstance?.close()
}

const toggle = () => {
  chatInstance?.toggle()
}

const sendMessage = (text: string, data?: Record<string, unknown>) => {
  chatInstance?.sendMessage(text, data)
}

const registerAnalyticsService = (handler: (event: WebchatAnalyticsEvent) => void) => {
  chatInstance?.registerAnalyticsService(handler)
}

const getUserId = () => {
  return chatInstance?.getUserId() ?? ''
}

const getSessionId = () => {
  return chatInstance?.getSessionId() ?? ''
}

export function useCXoneWebchat() {
  return {
    status,
    errorMessage,
    init,
    open,
    close,
    toggle,
    sendMessage,
    registerAnalyticsService,
    getUserId,
    getSessionId,
  }
}
