<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCustomChat } from '@/composables/useCustomChat'
import router from '@/router'
import { useTableData } from '@/composables/useTableData'

const { isOpen, close } = useCustomChat()
const chatContainer = ref<HTMLElement | null>(null)
const sdkError = ref<string | null>(null)
const sdkLoaded = ref(false)
const { setTableData, setChartConfig, markChartReady } = useTableData()

// Load SDK script dynamically
async function loadSDK() {
  if (sdkLoaded.value) return

  return new Promise<void>((resolve, reject) => {
    // Check if SDK is already loaded
    if (typeof window !== 'undefined' && (window as any).MyChatSDK) {
      sdkLoaded.value = true
      resolve()
      return
    }

    const isDev = import.meta.env.DEV
    const baseUrl = import.meta.env.BASE_URL || '/'
    
    // Determine SDK URL based on environment
    // Note: The SDK uses `vite build --watch` for dev, so we load from dist in both modes
    // Make sure to run `cd sdk-app && npm run dev` first to build the SDK
    // You can also configure a custom dev server URL via VITE_SDK_DEV_URL env var
    // For production builds, use the base URL (e.g., /cognigy-actions/ for GitHub Pages)
    const sdkUrl = isDev && import.meta.env.VITE_SDK_DEV_URL
      ? import.meta.env.VITE_SDK_DEV_URL
      : `${baseUrl}sdk-app/dist/sdk.esm.js`

    console.log('[CustomChatModal] Loading SDK from:', sdkUrl)

    // Use script tag approach to avoid Vite trying to resolve imports at build time
    const script = document.createElement('script')
    script.type = 'module'
    script.src = sdkUrl
    
    let attempts = 0
    const maxAttempts = 100 // 10 seconds max
    let scriptLoaded = false
    let timeoutId: number | null = null
    
    const checkSDK = () => {
      attempts++
      console.log(`[CustomChatModal] Checking for SDK (attempt ${attempts}/${maxAttempts})...`)
      
      if ((window as any).MyChatSDK) {
        console.log('[CustomChatModal] SDK found!')
        sdkLoaded.value = true
        if (timeoutId) clearTimeout(timeoutId)
        resolve()
      } else if (attempts < maxAttempts) {
        setTimeout(checkSDK, 100)
      } else {
        // Timeout reached
        if (timeoutId) clearTimeout(timeoutId)
        const errorMsg = scriptLoaded
          ? 'SDK script loaded but SDK not available on window object. Check browser console for errors.'
          : 'SDK script failed to load. Make sure sdk-app is built (cd sdk-app && npm run dev or npm run build).'
        console.error('[CustomChatModal]', errorMsg)
        reject(new Error(errorMsg))
      }
    }
    
    // Set overall timeout
    timeoutId = window.setTimeout(() => {
      if (!sdkLoaded.value) {
        const errorMsg = 'SDK loading timeout. Make sure sdk-app is built and the file is accessible.'
        console.error('[CustomChatModal]', errorMsg)
        reject(new Error(errorMsg))
      }
    }, maxAttempts * 100 + 1000) // Add 1 second buffer
    
    script.onload = () => {
      console.log('[CustomChatModal] Script loaded, waiting for SDK...')
      scriptLoaded = true
      // Start checking for SDK availability immediately
      checkSDK()
    }
    
    script.onerror = (error) => {
      console.error('[CustomChatModal] Script load error:', error)
      if (timeoutId) clearTimeout(timeoutId)
      const errorMsg = isDev
        ? `Failed to load SDK from ${sdkUrl}. Make sure sdk-app is built first (cd sdk-app && npm run dev or npm run build). Check browser console for CORS or 404 errors.`
        : `Failed to load SDK script from ${sdkUrl}. Please ensure sdk-app is built (cd sdk-app && npm run build).`
      reject(new Error(errorMsg))
    }
    
    // Start checking immediately (in case SDK is already available)
    checkSDK()
    
    document.head.appendChild(script)
  })
}

// Initialize chat widget
async function initChat() {
  if (!chatContainer.value) {
    console.warn('[CustomChatModal] chatContainer not available yet')
    return
  }

  console.log('[CustomChatModal] Initializing chat...')

  try {
    sdkError.value = null
    await loadSDK()

    const MyChatSDK = (window as any).MyChatSDK
    if (!MyChatSDK) {
      sdkError.value = 'SDK not available. Please ensure sdk-app is built.'
      console.error('[CustomChatModal] SDK not available')
      return
    }

    console.log('[CustomChatModal] SDK loaded, creating widget...')

    // Clear any existing widget
    const existingWidget = chatContainer.value.querySelector('my-chat-widget')
    if (existingWidget) {
      existingWidget.remove()
    }

    // Create new widget instance
    // Use a dummy token since we're bypassing the backend
    MyChatSDK.create({
      token: 'custom-chat-token',
      element: chatContainer.value,
    })

    // Verify widget was created
    setTimeout(() => {
      const widget = chatContainer.value?.querySelector('my-chat-widget')
      if (widget) {
        console.log('[CustomChatModal] Widget element found:', widget)
      } else {
        console.warn('[CustomChatModal] Widget element not found after creation')
        sdkError.value = 'Widget was created but element not found. Check browser console for details.'
      }
    }, 500)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize chat'
    sdkError.value = errorMessage
    console.error('[CustomChatModal] Failed to initialize chat:', error)
  }
}

// Initialize when modal opens
watch(isOpen, (newValue) => {
  console.log('[CustomChatModal] Modal open state changed:', newValue)
  if (newValue) {
    // Wait for next tick to ensure DOM is ready
    setTimeout(() => {
      if (chatContainer.value) {
        initChat()
      } else {
        console.warn('[CustomChatModal] chatContainer still not available after delay')
      }
    }, 100)
  }
})

// Handle Cognigy SDK events for data flags
function handleCognigyTableData(event: Event) {
  const customEvent = event as CustomEvent<{ data: unknown }>
  console.log('[CustomChatModal] Received cognigy:tableData event', customEvent.detail)
  setTableData(customEvent.detail?.data ?? null)
}

function handleCognigyCreateChart(event: Event) {
  const customEvent = event as CustomEvent<{ chartConfig: unknown }>
  console.log('[CustomChatModal] Received cognigy:createChart event', customEvent.detail)
  
  const chartConfigPayload = customEvent.detail?.chartConfig
  
  if (chartConfigPayload && typeof chartConfigPayload === 'object') {
    console.log('[CustomChatModal] Storing chart configuration', chartConfigPayload)
    setChartConfig(chartConfigPayload)
  } else {
    console.warn('[CustomChatModal] Invalid chart configuration, clearing config')
    setChartConfig(null)
  }
  
  markChartReady()
  if (router.currentRoute.value.path !== '/insights') {
    console.log('[CustomChatModal] Redirecting to /insights')
    router.push('/insights')
  }
}

function handleCognigyCreateEmailDraft() {
  console.log('[CustomChatModal] Received cognigy:createEmailDraft event')
  if (router.currentRoute.value.path !== '/email') {
    console.log('[CustomChatModal] Redirecting to /email')
    router.push('/email')
  }
}

function handleCognigyRetrieveRoute() {
  console.log('[CustomChatModal] Received cognigy:retrieveRoute event')
  
  const currentRoute = router.currentRoute.value
  const routeDescriptor =
    currentRoute?.fullPath ??
    currentRoute?.path ??
    (typeof currentRoute?.name === 'string' ? currentRoute.name : null) ??
    '/'
  
  console.log('[CustomChatModal] Sending route response:', routeDescriptor)
  
  // Send route back to SDK
  window.dispatchEvent(new CustomEvent('cognigy:routeResponse', {
    detail: { route: routeDescriptor },
    bubbles: true,
    composed: true
  }))
}

function handleCognigySendRoute(event: Event) {
  // Note: This handler may need implementation to actually send route to Cognigy
  // Currently just logging for debugging
  const customEvent = event as CustomEvent<{ route: string; userId: string; sessionId: string }>
  console.log('[CustomChatModal] Received cognigy:sendRoute event', customEvent.detail)
  
  // Send route to Cognigy endpoint
  // This would need to be implemented to send the route back to Cognigy
  // For now, we'll just log it - the SDK might need to handle this differently
  // since it requires the Cognigy endpoint and session info
  console.log('[CustomChatModal] Route to send to Cognigy:', customEvent.detail?.route)
}

// Handle escape key to close modal
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}


onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  
  // Listen for Cognigy SDK events
  window.addEventListener('cognigy:tableData', handleCognigyTableData)
  window.addEventListener('cognigy:createChart', handleCognigyCreateChart)
  window.addEventListener('cognigy:createEmailDraft', handleCognigyCreateEmailDraft)
  window.addEventListener('cognigy:retrieveRoute', handleCognigyRetrieveRoute)
  window.addEventListener('cognigy:sendRoute', handleCognigySendRoute)
  
  if (isOpen.value && chatContainer.value) {
    initChat()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  
  // Remove Cognigy SDK event listeners
  window.removeEventListener('cognigy:tableData', handleCognigyTableData)
  window.removeEventListener('cognigy:createChart', handleCognigyCreateChart)
  window.removeEventListener('cognigy:createEmailDraft', handleCognigyCreateEmailDraft)
  window.removeEventListener('cognigy:retrieveRoute', handleCognigyRetrieveRoute)
  window.removeEventListener('cognigy:sendRoute', handleCognigySendRoute)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="custom-chat-widget"
    >
      <div class="custom-chat-widget-container">
        <div v-if="sdkError" class="sdk-error">
          <p>{{ sdkError }}</p>
          <p class="sdk-error-hint">Please run <code>npm run dev</code> or <code>npm run build</code> in the sdk-app directory.</p>
        </div>
        <div v-else ref="chatContainer" class="custom-chat-container">
          <div v-if="!sdkLoaded && !sdkError" class="loading-sdk">
            <div class="spinner"></div>
            <p>Loading chat SDK...</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-chat-widget {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1000;
  width: 500px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.custom-chat-widget-container {
  background: #fff;
  border-left: 1px solid #d1d1d1;
  border-radius: 0;
  box-shadow: none;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.custom-chat-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Ensure the custom element fills the container */
.custom-chat-container :deep(my-chat-widget) {
  width: 100%;
  height: 100%;
  display: block;
  min-height: 100%;
}

/* Also target the element directly */
.custom-chat-container my-chat-widget {
  width: 100%;
  height: 100%;
  display: block;
  min-height: 100%;
}

.sdk-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  color: #666;
}

.sdk-error p {
  margin: 4px 0;
  font-size: 12px;
}

.sdk-error-hint {
  font-size: 11px;
  margin-top: 8px !important;
}

.sdk-error code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.loading-sdk {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #666;
}

.loading-sdk .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-sdk p {
  margin: 0;
  font-size: 12px;
}
</style>

