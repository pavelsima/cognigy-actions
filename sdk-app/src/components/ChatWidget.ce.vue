<script setup lang="ts">
/**
 * Chat Widget Component
 *
 * Simplified widget matching goal.png design.
 * Features: Simple header, Tab navigation (Chat/History), Simple input
 * Real-time WebSocket communication with backend
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { QueryObserver } from '@tanstack/query-core'
import { getQueryClient } from '../sdk-core/queryClient.ts'
import { getConversationHistoryQuery } from '../sdk-core/queries.ts'
import type { Message, ConversationHistoryItem } from '../sdk-core/types.ts'
import { ChatSocket } from '../sdk-core/websocket'
import type {
  InitAckPayload,
  AssistantMessageStartedPayload,
  AssistantTokenPayload,
  AssistantMessageFinishedPayload,
  ErrorPayload,
  ConnectionState,
  BackendMessage,
  AppEventPayload,
} from '../sdk-core/websocket/types'
import type { ConversationMetadata } from '../sdk-core/websocket/types'
import { ConversationsApi } from '../sdk-core/api/conversationsApi'
import { emitGlobalEvent } from '../sdk-core/utils/globalEvents'
import { filterThinkingTags } from '../sdk-core/utils/textFilter'

// Import design system components
import { TypingIndicator } from './atoms'
import BotMessage from './molecules/BotMessage.vue'
import UserMessage from './molecules/UserMessage.vue'
import SimpleHeader from './molecules/SimpleHeader.vue'
import SimpleInput from './molecules/SimpleInput.vue'
import ConversationList from './molecules/ConversationList.vue'
import DataQueryBubble from './molecules/DataQueryBubble.vue'
import AppEvent from './molecules/AppEvent.vue'
import type { TabId } from './molecules/SimpleHeader.vue'

// Props
const props = defineProps<{
  token: string
}>()

// Unique instance ID for this component (survives HMR)
const instanceId = `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`

// WebSocket client
const chatSocket = new ChatSocket({
  serverUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

// Conversations API client for REST endpoints
const conversationsApi = new ConversationsApi({
  serverUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
})

// State
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(true)
const isSending = ref(false)
const isTyping = ref(false)
const error = ref<string | null>(null)
const activeTab = ref<TabId>('chat')
const connectionState = ref<ConnectionState>('disconnected')
const conversationId = ref<string>('')

// Cognigy HTTP mode (when token is 'custom-chat-token')
const isCognigyMode = computed(() => props.token === 'custom-chat-token')
const cognigyUserId = ref<string>('')
const cognigySessionId = ref<string>('')

// Cognigy endpoint configuration
const COGNIGY_ENDPOINT = 'https://endpoint-dev.cognigy.ai/ea50316a5a49e574da804c75175ce5ea671ba2e15ddd228076dd0d6e339af6c6'
const COGNIGY_COOKIE = '_752f8=6c0e089d4f25a36d'

// Initialize Cognigy session IDs
function initCognigySession() {
  // Get or create userId from localStorage (persists across refreshes)
  const storedUserId = localStorage.getItem('cognigy_userId')

  if (storedUserId) {
    cognigyUserId.value = storedUserId
  } else {
    cognigyUserId.value = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('cognigy_userId', cognigyUserId.value)
  }

  // Always create a new session ID on every refresh/page load
  cognigySessionId.value = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

// Streaming message state
const streamingMessageId = ref<string | null>(null)
const streamingContent = ref<string>('')

// Tool / app events grouped by groupId for richer UI (e.g. DataQuery)
interface DataQueryGroup {
  groupId: string
  result?: {
    toolName: string
    result: any
  }
  streamingText: string
  isStreaming: boolean
  quickAction?: {
    label: string
    actionType: string
    payload: Record<string, unknown>
  }
  timestamp: Date
}

const dataQueryGroups = ref<Record<string, DataQueryGroup>>({})

// General app events (non-data-query events) with timestamps
interface AppEventWithTimestamp {
  payload: AppEventPayload
  timestamp: Date
}

const appEvents = ref<AppEventWithTimestamp[]>([])

// Conversation history from REST API
const conversationHistory = ref<ConversationHistoryItem[]>([])
const historyLoading = ref(false)

// Reference to messages container for auto-scroll
const messagesContainer = ref<HTMLElement | null>(null)

// Load conversations from REST API
async function loadConversations() {
  if (!props.token) return

  try {
    historyLoading.value = true
    const conversations = await conversationsApi.getConversations(props.token)

    // Transform backend ConversationMetadata to ConversationHistoryItem
    conversationHistory.value = conversations.map((conv: ConversationMetadata) => ({
      id: conv.id,
      title: conv.title,
      timestamp: new Date(conv.updatedAt),
      lastMessage: conv.lastMessage || 'No messages yet',
      unread: false,
      messageCount: conv.messageCount,
    }))
  } catch (err) {
    console.error('[ChatWidget] Failed to load conversations:', err)
  } finally {
    historyLoading.value = false
  }
}

// Computed: Transform messages for components
const transformedMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  }))
})

// Computed: Create a unified timeline of messages, dataQueryGroups, and appEvents
interface TimelineItem {
  type: 'message' | 'dataQuery' | 'appEvent'
  timestamp: Date
  data: any
}

const timeline = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  
  // Add messages
  transformedMessages.value.forEach(msg => {
    items.push({
      type: 'message',
      timestamp: msg.timestamp,
      data: msg
    })
  })
  
  // Add dataQueryGroups
  Object.values(dataQueryGroups.value).forEach(group => {
    items.push({
      type: 'dataQuery',
      timestamp: group.timestamp,
      data: group
    })
  })
  
  // Add appEvents (with their captured timestamps)
  appEvents.value.forEach(event => {
    items.push({
      type: 'appEvent',
      timestamp: event.timestamp,
      data: event.payload
    })
  })
  
  // Sort by timestamp
  return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
})

// Helper: Convert backend message to SDK message format
function backendMessageToSDK(backendMsg: BackendMessage): Message {
  // Map backend role to SDK sender
  const sender = backendMsg.role === 'assistant' ? 'bot' : 'user'

  return {
    id: backendMsg.id,
    conversationId: conversationId.value,
    text: backendMsg.content,
    sender,
    timestamp: new Date(backendMsg.createdAt),
    status: 'sent',
  }
}

// Helper to add message only if it doesn't already exist
function addMessageIfNotExists(message: Message): boolean {
  const exists = messages.value.some(m => m.id === message.id)
  if (!exists) {
    messages.value.push(message)
    scrollToBottom()
    return true
  }
  return false
}

// Scroll to bottom of messages container
function scrollToBottom(smooth = true): void {
  if (messagesContainer.value) {
    const scrollOptions: ScrollToOptions = {
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    }
    messagesContainer.value.scrollTo(scrollOptions)
  }
}

// Initialize WebSocket connection and session
async function initialize() {
  if (!props.token) {
    error.value = 'No token provided'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    error.value = null

    // If in Cognigy mode, skip WebSocket initialization
    if (isCognigyMode.value) {
      initCognigySession()
      conversationId.value = cognigySessionId.value
      connectionState.value = 'connected'
      isLoading.value = false
      return
    }

    // Setup WebSocket event handlers
    chatSocket.setEventHandlers({
      onInitAck: handleInitAck,
      onAssistantMessageStarted: handleAssistantMessageStarted,
      onAssistantToken: handleAssistantToken,
      onAssistantMessageFinished: handleAssistantMessageFinished,
      onError: handleSocketError,
      onConnectionStateChange: handleConnectionStateChange,
      onAppEvent: handleAppEvent,
    })

    // Connect to WebSocket
    await chatSocket.connect()

    // Initialize session with cxoneToken
    await chatSocket.init(props.token)

    // Load conversation list
    await loadConversations()
  } catch (err) {
    console.error('[ChatWidget] Initialization error:', err)
    error.value = 'Failed to connect to chat service'
  } finally {
    isLoading.value = false
  }
}

// Process outputStack items and create messages
function processOutputStack(outputStack: any[]): Message[] {
  if (!Array.isArray(outputStack)) {
    return []
  }

  // Group items by messageId, items without messageId form separate groups
  const messageGroups = new Map<string, any[]>()
  let noIdGroupCounter = 0
  
  for (const item of outputStack) {
    const messageId = item?.data?._cognigy?._messageId
    
    if (!messageId) {
      // Group items without messageId together if they're sequential
      // Check if last item also had no messageId to group them
      const lastKey = Array.from(messageGroups.keys())[messageGroups.size - 1]
      if (lastKey && lastKey.startsWith('no-id-')) {
        // Add to existing no-id group
        messageGroups.get(lastKey)!.push(item)
      } else {
        // Create new no-id group
        const noIdKey = `no-id-${noIdGroupCounter++}`
        messageGroups.set(noIdKey, [item])
      }
    } else {
      if (!messageGroups.has(messageId)) {
        messageGroups.set(messageId, [])
      }
      messageGroups.get(messageId)!.push(item)
    }
  }

  const messages: Message[] = []

  // Process each group
  for (const [messageId, items] of messageGroups.entries()) {
    let combinedText = ''
    let quickReplies: Message['quickReplies'] | undefined = undefined
    let hasContent = false

    // First pass: Combine all text from items in this group (without filtering)
    // This allows us to properly handle thinking tags that span multiple messages
    for (const item of items) {
      // Extract text content
      let text = item.text || ''
      
      // Handle null explicitly
      if (item.text === null) {
        text = ''
      }
      
      // Handle text as array
      if (Array.isArray(item.text)) {
        text = item.text.join('')
      }
      
      // Handle text in data.text array
      if (!text && item.data?.text && Array.isArray(item.data.text)) {
        text = item.data.text.join('')
      } else if (!text && item.data?.text && typeof item.data.text === 'string') {
        text = item.data.text
      }

      // Check if this is a quickReplies item
      const isQuickRepliesItem = item.data?.type === 'quickReplies'
      
      // Try to extract quick replies data
      const quickRepliesData = 
        item.data?._data?._cognigy?._default?._quickReplies ||
        item.data?._cognigy?._default?._quickReplies ||
        item._data?._cognigy?._default?._quickReplies

      // If text is null/empty but we have quickReplies data, use text from quickReplies
      if ((!text || text === null) && quickRepliesData?.text) {
        text = quickRepliesData.text
      }

      // Extract quick replies if present
      if (isQuickRepliesItem || quickRepliesData) {
        if (quickRepliesData?.quickReplies && Array.isArray(quickRepliesData.quickReplies)) {
          quickReplies = {
            quickReplies: quickRepliesData.quickReplies.map((qr: any) => ({
              id: qr.id ?? Math.random(),
              title: qr.title || '',
              imageUrl: qr.imageUrl,
              imageAltText: qr.imageAltText,
              contentType: qr.contentType || 'postback',
              payload: qr.payload || qr.title || '',
            }))
          }
        }
      }

      // Combine text with previous items in group (before filtering)
      // This ensures thinking tags that span multiple messages are properly handled
      // Join items with newlines to preserve markdown formatting and line breaks
      if (text && text.trim()) {
        if (combinedText) {
          combinedText += '\n' + text.trim()
        } else {
          combinedText = text.trim()
        }
        hasContent = true
      }
    }

    // Now filter thinking tags from the combined text
    // This handles cases where thinking tags span multiple messages with the same messageId
    combinedText = filterThinkingTags(combinedText || '')
    
    // Update hasContent based on whether text remains after filtering
    if (!combinedText || combinedText.trim() === '') {
      hasContent = false
    }

    // After processing all items, check if we need to add text from quickReplies
    // Append quickReplies text if it exists and we have content, or use it if we have no content
    if (quickReplies) {
      // Find text in quickReplies data from any item in the group
      for (const item of items) {
        const quickRepliesData = 
          item.data?._data?._cognigy?._default?._quickReplies ||
          item.data?._cognigy?._default?._quickReplies ||
          item._data?._cognigy?._default?._quickReplies

        if (quickRepliesData?.text) {
          const quickRepliesText = filterThinkingTags(quickRepliesData.text)
          if (hasContent && combinedText.trim()) {
            // Append to existing content
            combinedText += '\n\n' + quickRepliesText
          } else {
            // Use as primary content
            combinedText = quickRepliesText
            hasContent = true
          }
          break
        }
      }
    }

    // Create message if there's actual content or quick replies
    if (hasContent && combinedText.trim()) {
      const botMessage: Message = {
        id: `bot-${messageId.startsWith('no-id') ? Date.now() : messageId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversationId: conversationId.value || cognigySessionId.value,
        text: combinedText.trim(),
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
        isHtml: false, // Render as markdown to support markdown formatting
        quickReplies,
      }

      messages.push(botMessage)
    } else if (quickReplies && quickReplies.quickReplies.length > 0) {
      // Create message with just quick replies if no text but quick replies exist
      const botMessage: Message = {
        id: `bot-${messageId.startsWith('no-id') ? Date.now() : messageId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversationId: conversationId.value || cognigySessionId.value,
        text: '', // Empty text, just quick replies
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
        isHtml: false,
        quickReplies,
      }

      messages.push(botMessage)
    }
  }

  return messages
}

// Process data flags from outputStack items (similar to webchat analytics handler)
function processDataFlags(outputStack: any[]) {
  if (!Array.isArray(outputStack)) {
    return
  }

  for (const item of outputStack) {
    const itemData = item?.data
    
    if (!itemData || typeof itemData !== 'object') {
      continue
    }

    const payloadData = itemData as Record<string, unknown>

    // Check for hasTableData flag
    const hasTablePayload = payloadData.hasTableData === true

    if (hasTablePayload) {
      console.log('[ChatWidget] hasTableData flag detected')
      const pluginData =
        payloadData._plugin &&
        typeof payloadData._plugin === 'object'
          ? (payloadData._plugin as Record<string, unknown>).data
          : undefined

      console.log('[ChatWidget] storing table data from outputStack', pluginData)
      
      // Dispatch event for parent app to handle
      window.dispatchEvent(new CustomEvent('cognigy:tableData', {
        detail: { data: pluginData ?? null },
        bubbles: true,
        composed: true
      }))
    }

    // Check for createChart flag
    const shouldCreateChart = payloadData.createChart === true

    if (shouldCreateChart) {
      console.log('[ChatWidget] createChart flag detected')

      const chartConfigPayload =
        payloadData.chartConfig &&
        typeof payloadData.chartConfig === 'object'
          ? payloadData.chartConfig
          : null

      console.log('[ChatWidget] storing chart configuration from outputStack', chartConfigPayload)
      
      // Dispatch event for parent app to handle
      window.dispatchEvent(new CustomEvent('cognigy:createChart', {
        detail: { 
          chartConfig: chartConfigPayload,
        },
        bubbles: true,
        composed: true
      }))
    }

    // Check for createEmailDraft flag
    const shouldCreateEmailDraft = payloadData.createEmailDraft === true

    if (shouldCreateEmailDraft) {
      console.log('[ChatWidget] createEmailDraft flag detected')
      
      // Dispatch event for parent app to handle
      window.dispatchEvent(new CustomEvent('cognigy:createEmailDraft', {
        detail: {},
        bubbles: true,
        composed: true
      }))
    }

    // Check for retrieveRoute flag
    const hasRetrieveRouteFlag = 
      payloadData.retrieveRoute === true ||
      payloadData.retreiveRoute === true

    if (hasRetrieveRouteFlag) {
      console.log('[ChatWidget] retrieveRoute flag detected')
      
      // Request current route from parent app
      window.dispatchEvent(new CustomEvent('cognigy:retrieveRoute', {
        detail: {},
        bubbles: true,
        composed: true
      }))
      
      // Listen for route response and send it back to Cognigy
      const routeHandler = async (event: Event) => {
        const customEvent = event as CustomEvent<{ route: string }>
        if (customEvent.detail?.route) {
          console.log('[ChatWidget] received route from parent, sending to Cognigy:', customEvent.detail.route)
          
          // Send route back to Cognigy endpoint
          try {
            await fetch(COGNIGY_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': COGNIGY_COOKIE,
              },
              body: JSON.stringify({
                userId: cognigyUserId.value,
                sessionId: cognigySessionId.value,
                text: '', // Empty text, route is in data
                data: {
                  currentRoute: customEvent.detail.route
                }
              }),
            })
            console.log('[ChatWidget] Route sent to Cognigy successfully')
          } catch (err) {
            console.error('[ChatWidget] Failed to send route to Cognigy:', err)
          }
          
          window.removeEventListener('cognigy:routeResponse', routeHandler)
        }
      }
      
      window.addEventListener('cognigy:routeResponse', routeHandler)
    }
  }
}

// Send message via Cognigy HTTP endpoint
async function sendMessageToCognigy(text: string, messageId: string) {
  try {
    isTyping.value = true
    scrollToBottom(true)

    const response = await fetch(COGNIGY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': COGNIGY_COOKIE,
      },
      body: JSON.stringify({
        userId: cognigyUserId.value,
        sessionId: cognigySessionId.value,
        text: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Process outputStack instead of just using data.text
    const outputStack = data.outputStack || []
    
    // Process data flags (createChart, createEmailDraft, hasTableData, etc.)
    processDataFlags(outputStack)
    
    const botMessages = processOutputStack(outputStack)

    // Add all processed messages
    for (const botMessage of botMessages) {
      messages.value.push(botMessage)
      
      // Emit global event for each message
      emitGlobalEvent('message:received:complete', {
        messageId: botMessage.id,
        content: botMessage.text,
        timestamp: Date.now(),
      })
    }

    // If no messages were created from outputStack, fall back to data.text
    if (botMessages.length === 0 && data.text) {
      const fallbackText = filterThinkingTags(data.text)
      if (fallbackText.trim()) {
        const botMessage: Message = {
          id: `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conversationId: conversationId.value || cognigySessionId.value,
          text: fallbackText.trim(),
          sender: 'bot',
          timestamp: new Date(),
          status: 'sent',
          isHtml: false, // Render as markdown to support markdown formatting
        }
        messages.value.push(botMessage)
        emitGlobalEvent('message:received:complete', {
          messageId: botMessage.id,
          content: botMessage.text,
          timestamp: Date.now(),
        })
      }
    }

    scrollToBottom(true)
  } catch (err) {
    console.error('[ChatWidget] Cognigy request error:', err)
    error.value = 'Failed to get response from chat service'

    // Create error message
    const errorMessage: Message = {
      id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      conversationId: conversationId.value || cognigySessionId.value,
      text: 'Sorry, I encountered an error while processing your message. Please try again.',
      sender: 'bot',
      timestamp: new Date(),
      status: 'sent',
    }
    messages.value.push(errorMessage)
    scrollToBottom(true)
  } finally {
    isTyping.value = false
  }
}

// Send message via WebSocket or Cognigy HTTP
async function sendMessage() {
  const text = inputMessage.value.trim()
  if (!text || isSending.value) return

  // In Cognigy mode, we don't need conversationId check
  if (!isCognigyMode.value && !conversationId.value) return

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Emit global event - message sending
  emitGlobalEvent('message:sending', {
    messageId,
    content: text,
    timestamp: Date.now(),
  })

  // Optimistic update - add user message immediately
  const optimisticMessage: Message = {
    id: messageId,
    conversationId: conversationId.value || cognigySessionId.value,
    text,
    sender: 'user',
    timestamp: new Date(),
    status: 'sending'
  }
  messages.value.push(optimisticMessage)
  inputMessage.value = ''
  isSending.value = true

  // Scroll to bottom to show user's message
  scrollToBottom(true)

  try {
    if (isCognigyMode.value) {
      // Send via Cognigy HTTP endpoint
      await sendMessageToCognigy(text, messageId)

      // Mark user message as sent
      const index = messages.value.findIndex(m => m.id === messageId)
      if (index !== -1) {
        messages.value[index].status = 'sent'
      }

      // Emit global event - message sent
      emitGlobalEvent('message:sent', {
        messageId,
        content: text,
        timestamp: Date.now(),
      })
    } else {
      // Send via WebSocket (original behavior)
      await chatSocket.sendUserMessage(messageId, text)

      // Mark as sent
      const index = messages.value.findIndex(m => m.id === messageId)
      if (index !== -1) {
        messages.value[index].status = 'sent'
      }

      // Emit global event - message sent
      emitGlobalEvent('message:sent', {
        messageId,
        content: text,
        timestamp: Date.now(),
      })
    }
  } catch (err) {
    console.error('[ChatWidget] Send message error:', err)
    // Mark as failed
    const index = messages.value.findIndex(m => m.id === messageId)
    if (index !== -1) {
      messages.value[index].status = 'failed'
    }
    error.value = 'Failed to send message'

    // Emit global event - message failed
    emitGlobalEvent('message:failed', {
      messageId,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: Date.now(),
    })
  } finally {
    isSending.value = false
  }
}

function handleSend() {
  sendMessage()
}

function retry() {
  if (isCognigyMode.value) {
    // In Cognigy mode, just reinitialize session IDs
    initCognigySession()
    error.value = null
  } else {
    initialize()
  }
}

async function handleSelectConversation(id: string) {
  console.log('[ChatWidget] Selected conversation:', id)

  try {
    // Clear current messages and events
    messages.value = []
    appEvents.value = []
    dataQueryGroups.value = {}

    // Re-initialize with specific conversation
    await chatSocket.init(props.token, id)

    // Emit global event
    emitGlobalEvent('conversation:switched', {
      conversationId: id,
      timestamp: Date.now(),
    })

    // Switch to chat tab
    activeTab.value = 'chat'
  } catch (err) {
    console.error('[ChatWidget] Failed to switch conversation:', err)
    error.value = 'Failed to load conversation'
  }
}

async function handleNewConversation() {
  console.log('[ChatWidget] Handling new conversation request')

  try {
    // First, reload conversation list to get latest state
    await loadConversations()

    // Check if there's already an empty conversation (no messages)
    const emptyConversation = conversationHistory.value.find(conv => conv.messageCount === 0)

    if (emptyConversation) {
      console.log('[ChatWidget] Found existing empty conversation, switching to it:', emptyConversation.id)
      // Switch to existing empty conversation
      await handleSelectConversation(emptyConversation.id)
    } else {
      console.log('[ChatWidget] No empty conversation found, creating new one')
      // Create new conversation via API
      const newConv = await conversationsApi.createConversation(props.token, 'New Conversation')

      // Emit global event
      emitGlobalEvent('conversation:created', {
        conversationId: newConv.id,
        timestamp: Date.now(),
      })

      // Reload conversation list
      await loadConversations()

      // Switch to new conversation
      await handleSelectConversation(newConv.id)
    }
  } catch (err) {
    console.error('[ChatWidget] Failed to handle new conversation:', err)
    error.value = 'Failed to create new conversation'
  }
}

// WebSocket Event Handlers

function handleInitAck(payload: InitAckPayload) {
  console.log('[ChatWidget] Session initialized, conversation:', payload.conversationId)

  // Set conversation ID from backend response
  conversationId.value = payload.conversationId

  // Clear app events when loading a conversation
  appEvents.value = []
  dataQueryGroups.value = {}

  // Load conversation history from backend
  const backendMessages = payload.conversation.messages || []

  // Process messages and reconstruct app events from tool messages
  const sdkMessages: Message[] = []
  const reconstructedGroups: Record<string, DataQueryGroup> = {}
  const reconstructedEvents: AppEventWithTimestamp[] = []
  const skipMessageIds = new Set<string>() // Track which assistant messages to skip

  for (let i = 0; i < backendMessages.length; i++) {
    const backendMsg = backendMessages[i]
    
    if (backendMsg.role === 'tool') {
      // Parse tool message to reconstruct app events
      try {
        const toolResult = JSON.parse(backendMsg.content)
        const timestamp = new Date(backendMsg.createdAt)
        
        // Check if this is a data query result
        if (toolResult.structuredResult) {
          const groupId = toolResult.structuredResult?.meta?.historyItemId || 
                         toolResult.historyItemId || 
                         `tool-${backendMsg.id}`
          
          // Look for the next assistant message - that's the description
          let descriptionText = ''
          for (let j = i + 1; j < backendMessages.length; j++) {
            const nextMsg = backendMessages[j]
            if (nextMsg.role === 'assistant') {
              descriptionText = nextMsg.content
              skipMessageIds.add(nextMsg.id) // Mark this message to skip rendering
              console.log('[ChatWidget] Found assistant description for group:', groupId, 'messageId:', nextMsg.id)
              break
            }
            // Stop looking if we hit another user message or tool message
            if (nextMsg.role === 'user' || nextMsg.role === 'tool') {
              break
            }
          }
          
          // Reconstruct DataQueryGroup from history
          reconstructedGroups[groupId] = {
            groupId,
            result: {
              toolName: 'dataQuery_runQuery',
              result: toolResult,
            },
            streamingText: descriptionText, // Include the assistant's description
            isStreaming: false, // Historical data is not streaming
            timestamp,
            // Optionally reconstruct the quick action for historical data
            quickAction: {
              label: 'Use this data to prepare email draft',
              actionType: 'quick_message',
              payload: {
                groupId,
                toolName: 'dataQuery_runQuery',
                historyItemId: toolResult.structuredResult?.meta?.historyItemId || toolResult.historyItemId,
                sql: toolResult.sql,
              },
            },
          }
          
          console.log('[ChatWidget] Reconstructed DataQuery group from history:', groupId, 'with description')
        }
        // Handle other tool types if needed (email_createDraft, knowledge_createArticle)
        else if (toolResult.draftId) {
          reconstructedEvents.push({
            payload: {
              eventType: 'email_draft_created',
              data: { draftId: toolResult.draftId },
            },
            timestamp,
          })
          console.log('[ChatWidget] Reconstructed email draft event from history')
        } else if (toolResult.articleId) {
          reconstructedEvents.push({
            payload: {
              eventType: 'knowledge_article_created',
              data: { articleId: toolResult.articleId },
            },
            timestamp,
          })
          console.log('[ChatWidget] Reconstructed knowledge article event from history')
        }
      } catch (err) {
        console.warn('[ChatWidget] Failed to parse tool message:', err)
      }
      // Don't add tool messages to regular message list
      continue
    }
    
    // Skip assistant messages that are already included in DataQueryGroups
    if (skipMessageIds.has(backendMsg.id)) {
      console.log('[ChatWidget] Skipping assistant message (already in DataQueryGroup):', backendMsg.id)
      continue
    }
    
    // Convert regular messages (user, assistant, system) to SDK format
    sdkMessages.push(backendMessageToSDK(backendMsg))
  }

  // Deduplicate messages by ID
  const uniqueMessages = new Map<string, Message>()
  for (const msg of sdkMessages) {
    uniqueMessages.set(msg.id, msg)
  }

  messages.value = Array.from(uniqueMessages.values())
  dataQueryGroups.value = reconstructedGroups
  appEvents.value = reconstructedEvents
  
  console.log('[ChatWidget] Loaded', messages.value.length, 'messages,', Object.keys(reconstructedGroups).length, 'data query groups,', reconstructedEvents.length, 'app events from conversation', payload.conversation.title)

  // Scroll to bottom after loading history (without smooth scroll)
  setTimeout(() => scrollToBottom(false), 100)
}

function handleAssistantMessageStarted(payload: AssistantMessageStartedPayload) {
  console.log('[ChatWidget] Assistant started responding to message:', payload.messageId)

  // Show typing indicator
  isTyping.value = true

  // Initialize streaming state
  streamingMessageId.value = payload.messageId
  streamingContent.value = ''

  // Scroll to show typing indicator
  setTimeout(() => scrollToBottom(true), 100)
}

function handleAssistantToken(payload: AssistantTokenPayload) {
  // Hide typing indicator as soon as first token arrives
  // (message is now visibly streaming, no need for dots)
  if (isTyping.value) {
    isTyping.value = false
  }

  // If this token is part of a grouped event (e.g., DataQuery), route it there
  if (payload.groupId) {
    console.log('[ChatWidget] Token with groupId:', payload.groupId, 'delta:', payload.delta)
    const groupId = payload.groupId
    const current = dataQueryGroups.value[groupId]
    
    if (current) {
      dataQueryGroups.value[groupId] = {
        ...current,
        streamingText: current.streamingText + payload.delta,
        isStreaming: true,
      }
    } else {
      // Create group if it doesn't exist (shouldn't happen but handle it)
      console.warn('[ChatWidget] Group not found for token, creating:', groupId)
      dataQueryGroups.value[groupId] = {
        groupId,
        streamingText: payload.delta,
        isStreaming: true,
        timestamp: new Date(),
      }
    }
    
    // Auto-scroll to bottom while streaming
    scrollToBottom(true)
    return
  }

  // Otherwise, handle as a normal message
  // Append token to streaming content
  streamingContent.value += payload.delta

  // Find or create the streaming message
  const existingIndex = messages.value.findIndex(
    m => m.id === `streaming-${payload.messageId}`
  )

  if (existingIndex !== -1) {
    // Update existing streaming message - create new object to trigger reactivity
    messages.value[existingIndex] = {
      ...messages.value[existingIndex],
      text: streamingContent.value,
      status: 'streaming'
    }
  } else {
    // Create new streaming message
    const streamingMessage: Message = {
      id: `streaming-${payload.messageId}`,
      conversationId: conversationId.value,
      text: streamingContent.value,
      sender: 'bot',
      timestamp: new Date(),
      status: 'streaming',
    }
    messages.value.push(streamingMessage)
  }

  // Auto-scroll to bottom while streaming
  scrollToBottom(true)
}

function handleAssistantMessageFinished(payload: AssistantMessageFinishedPayload) {
  console.log('[ChatWidget] Assistant finished responding:', payload.messageId, 'groupId:', payload.groupId)

  // Hide typing indicator
  isTyping.value = false

  // If this message is part of a grouped event, mark streaming as complete
  if (payload.groupId) {
    console.log('[ChatWidget] Marking streaming complete for group:', payload.groupId)
    const groupId = payload.groupId
    const current = dataQueryGroups.value[groupId]
    if (current) {
      dataQueryGroups.value[groupId] = {
        ...current,
        isStreaming: false,
      }
      console.log('[ChatWidget] DataQuery groups after finished:', dataQueryGroups.value)
    } else {
      console.warn('[ChatWidget] Group not found:', groupId)
    }
    // Don't create a message - the content is already in the group
    return
  }

  // Otherwise, handle as a normal message
  // Replace streaming message with final message
  const streamingIndex = messages.value.findIndex(
    m => m.id === `streaming-${payload.messageId}`
  )

  if (streamingIndex !== -1) {
    // Replace with final message
    messages.value[streamingIndex] = {
      id: payload.messageId,
      conversationId: conversationId.value,
      text: payload.content,
      sender: 'bot',
      timestamp: new Date(),
      status: 'sent',
    }
  } else {
    // Streaming message not found, add final message
    const finalMessage: Message = {
      id: payload.messageId,
      conversationId: conversationId.value,
      text: payload.content,
      sender: 'bot',
      timestamp: new Date(),
      status: 'sent',
    }
    addMessageIfNotExists(finalMessage)
  }

  // Clear streaming state
  streamingMessageId.value = null
  streamingContent.value = ''
}

function handleSocketError(payload: ErrorPayload) {
  console.error('[ChatWidget] WebSocket error:', payload.message)
  error.value = payload.message
  isTyping.value = false
}

function handleConnectionStateChange(state: ConnectionState) {
  connectionState.value = state
  console.log('[ChatWidget] Connection state changed:', state)

  if (state === 'error' || state === 'disconnected') {
    error.value = 'Connection lost. Reconnecting...'
  } else if (state === 'connected') {
    error.value = null
  }
}

// Handle quick reply button clicks
function handleQuickReplyClick(payload: string) {
  // Set input message and trigger send
  inputMessage.value = payload
  sendMessage()
}

async function handleQuickAction(groupId: string, quickAction: { label: string; actionType: string; payload: Record<string, unknown> }) {
  if (!conversationId.value) return

  const text = 'Use the previous data query result to prepare an email draft.'
  const messageId = `quick-${groupId}-${Date.now()}`

  emitGlobalEvent('message:sending', {
    messageId,
    content: text,
    timestamp: Date.now(),
  })

  const optimisticMessage: Message = {
    id: messageId,
    conversationId: conversationId.value,
    text,
    sender: 'user',
    timestamp: new Date(),
    status: 'sending',
    metadata: {
      type: 'quick_message',
      groupId,
      source: quickAction.actionType,
      payload: quickAction.payload,
    } as any,
  }

  messages.value.push(optimisticMessage)
  scrollToBottom(true)

  try {
    await chatSocket.sendUserMessage(messageId, text, optimisticMessage.metadata as any)
    const index = messages.value.findIndex(m => m.id === messageId)
    if (index !== -1) {
      messages.value[index].status = 'sent'
    }
    emitGlobalEvent('message:sent', {
      messageId,
      content: text,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[ChatWidget] Quick action send error:', err)
    const index = messages.value.findIndex(m => m.id === messageId)
    if (index !== -1) {
      messages.value[index].status = 'failed'
    }
    emitGlobalEvent('message:failed', {
      messageId,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: Date.now(),
    })
  }
}

function handleAppEventAction(actionType: string, data: any) {
  console.log('[ChatWidget] App event action triggered:', actionType, data)

  // Handle specific action types
  if (actionType === 'open_draft' && data.draftId) {
    // Emit event for draft opening
    emitGlobalEvent('draft:opened', {
      draftId: data.draftId,
      timestamp: Date.now(),
    })
    // You can add more logic here, like opening a modal or navigating
  } else if (actionType === 'quick_message') {
    // Handle quick message action from app events
    handleQuickAction(data.groupId || 'app-event', {
      label: data.label || 'Action',
      actionType,
      payload: data,
    })
  }
}

function handleAppEvent(payload: AppEventPayload) {
  console.log('[ChatWidget] Received app event:', payload.eventType, 'groupId:', payload.groupId, 'data:', payload.data)
  
  // Handle data query events separately (grouped by groupId)
  if (payload.groupId && payload.eventType.startsWith('data_query')) {
    const groupId = payload.groupId
    const current = dataQueryGroups.value[groupId]

    if (payload.eventType === 'data_query_result') {
      console.log('[ChatWidget] Setting up data query group:', groupId)
      dataQueryGroups.value[groupId] = {
        groupId,
        result: {
          toolName: payload.data.toolName,
          result: payload.data.result,
        },
        streamingText: current?.streamingText || '',
        isStreaming: true, // Initialize streaming state - we expect streaming to follow
        timestamp: new Date(), // Capture when this group was created
      }
      console.log('[ChatWidget] DataQuery groups after result:', dataQueryGroups.value)
      scrollToBottom(true)
    } else if (payload.eventType === 'data_query_quick_action') {
      console.log('[ChatWidget] Adding quick action to group:', groupId)
      if (current) {
        dataQueryGroups.value[groupId] = {
          ...current,
          quickAction: {
            label: payload.data.label,
            actionType: payload.data.actionType,
            payload: payload.data.payload || {},
          },
        }
      }
      console.log('[ChatWidget] DataQuery groups after action:', dataQueryGroups.value)
      scrollToBottom(true)
    }
  } else {
    // Handle all other app events (email drafts, knowledge articles, etc.)
    console.log('[ChatWidget] Adding app event to timeline:', payload.eventType)
    appEvents.value.push({
      payload,
      timestamp: new Date(), // Capture when this event was received
    })
    scrollToBottom(true)
  }
}

// Listen for SDK sendMessage events (external API)
function handleSdkMessage(event: CustomEvent) {
  if (event.detail?.message) {
    inputMessage.value = event.detail.message
    sendMessage()
  }
}

// Listen for SDK switchConversation events (external API)
function handleSdkSwitchConversation(event: CustomEvent) {
  if (event.detail?.conversationId) {
    handleSelectConversation(event.detail.conversationId)
  }
}

// Watch for tab changes to refresh conversation list when switching to history
watch(activeTab, (newTab) => {
  // Emit global event for tab change
  emitGlobalEvent('ui:tab:changed', {
    tab: newTab,
    timestamp: Date.now(),
  })

  if (newTab === 'history') {
    console.log('[ChatWidget] Switched to history tab, reloading conversations...')
    loadConversations()
  }
})

// Watch for new messages and auto-scroll to bottom
watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    // Only scroll if a new message was added (not removed)
    if (newLength > (oldLength || 0)) {
      // Use nextTick to ensure DOM has updated before scrolling
      nextTick(() => {
        scrollToBottom(true)
      })
    }
  }
)

onMounted(() => {
  console.log('[ChatWidget] Mounted, initializing...')

  // Initialize WebSocket connection
  initialize()

  // Listen for SDK events (external API)
  const host = document.querySelector('my-chat-widget')
  if (host) {
    const sdkMessageHandler = handleSdkMessage as EventListener
    const sdkSwitchConversationHandler = handleSdkSwitchConversation as EventListener

    host.addEventListener('sdk:sendMessage', sdkMessageHandler)
    host.addEventListener('sdk:switchConversation', sdkSwitchConversationHandler)

    // Store handlers for cleanup
    ;(host as any).__sdkMessageHandler = sdkMessageHandler
    ;(host as any).__sdkSwitchConversationHandler = sdkSwitchConversationHandler
  }
})

onUnmounted(() => {
  console.log('[ChatWidget] Unmounting, cleaning up...')

  // Disconnect WebSocket only if not in Cognigy mode
  if (!isCognigyMode.value) {
    chatSocket.disconnect()
  }

  // Remove SDK event listeners
  const host = document.querySelector('my-chat-widget')
  if (host) {
    if ((host as any).__sdkMessageHandler) {
      host.removeEventListener('sdk:sendMessage', (host as any).__sdkMessageHandler)
      delete (host as any).__sdkMessageHandler
    }
    if ((host as any).__sdkSwitchConversationHandler) {
      host.removeEventListener('sdk:switchConversation', (host as any).__sdkSwitchConversationHandler)
      delete (host as any).__sdkSwitchConversationHandler
    }
  }
})
</script>

<template>
  <div class="chat-widget">
    <!-- Header with title and action buttons -->
    <SimpleHeader
      title="CXOne WebChat"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
      @new-chat="handleNewConversation"
    />

    <div class="chat-body">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <span>Connecting...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <span class="error-message">{{ error }}</span>
        <button type="button" class="retry-btn" @click="retry">
          Retry
        </button>
      </div>

      <!-- Chat/History Content -->
      <template v-else>
        <!-- Chat Tab Content -->
        <template v-if="activeTab === 'chat'">
          <div ref="messagesContainer" class="messages-container">
            <!-- Empty State Banner -->
            <div v-if="messages.length === 0 && !isTyping" class="empty-chat-banner">
              <div class="empty-chat-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M9 10h.01"/>
                  <path d="M15 10h.01"/>
                  <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
                </svg>
              </div>
              <h3>Start a conversation</h3>
              <p>Ask me anything! I'm here to help you with your questions.</p>
            </div>

            <!-- Timeline: Messages, DataQuery groups, and App Events in chronological order -->
            <template v-for="(item, index) in timeline" :key="`timeline-${index}-${item.type}`">
              <!-- Regular Message -->
              <template v-if="item.type === 'message'">
                <template v-if="item.data.sender === 'bot'">
                  <BotMessage
                    :message="{
                      id: item.data.id,
                      text: item.data.text,
                      timestamp: item.data.timestamp,
                      isHtml: item.data.isHtml,
                      status: item.data.status,
                      quickReplies: item.data.quickReplies
                    }"
                    :show-avatar="true"
                    :show-timestamp="true"
                    :show-rating="false"
                    @quick-reply="handleQuickReplyClick"
                  />
                </template>
                <UserMessage
                  v-else
                  :message="{
                    id: item.data.id,
                    text: item.data.text,
                    timestamp: item.data.timestamp,
                    status: (item.data.status === 'streaming' ? 'sent' : item.data.status) as 'sending' | 'sent' | 'delivered' | 'failed' | undefined
                  }"
                  :show-avatar="false"
                  :show-timestamp="true"
                />
              </template>

              <!-- DataQuery Grouped Bubble -->
              <DataQueryBubble
                v-else-if="item.type === 'dataQuery'"
                :group-id="item.data.groupId"
                :structured-result="item.data.result?.result?.structuredResult || item.data.result?.result"
                :streaming-text="item.data.streamingText"
                :is-streaming="item.data.isStreaming"
                :quick-action-label="item.data.quickAction?.label"
              >
                <template #actions>
                  <button
                    v-if="item.data.quickAction"
                    type="button"
                    class="dq-quick-action-btn"
                    @click="handleQuickAction(item.data.groupId, item.data.quickAction)"
                  >
                    {{ item.data.quickAction.label }}
                  </button>
                </template>
              </DataQueryBubble>

              <!-- General App Event -->
              <AppEvent
                v-else-if="item.type === 'appEvent'"
                :event="item.data"
                @action="handleAppEventAction"
              />
            </template>

            <!-- Typing Indicator -->
            <div v-if="isTyping" class="typing-wrapper">
              <TypingIndicator size="md" />
            </div>
          </div>

          <!-- Simple Input -->
          <SimpleInput
            v-model="inputMessage"
            placeholder="Text Message"
            :disabled="isSending"
            @send="handleSend"
          />
        </template>

        <!-- History Tab Content -->
        <template v-else>
          <ConversationList
            :conversations="conversationHistory"
            :loading="historyLoading"
            @select="handleSelectConversation"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
.chat-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.typing-wrapper {
  display: flex;
  align-items: flex-start;
}

.dq-quick-action-btn {
  margin-top: 8px;
  align-self: flex-start;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid #4f46e5;
  background: transparent;
  color: #4f46e5;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #4f46e5;
    color: #ffffff;
  }
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #3B5EFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
}

.retry-btn {
  padding: 8px 16px;
  background: #3B5EFF;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: #2D4FDB;
  }
}

.empty-chat-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  flex: 1;
  color: #6B7280;

  .empty-chat-icon {
    margin-bottom: 16px;
    color: #9CA3AF;

    svg {
      display: block;
    }
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1F2937;
  }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    max-width: 280px;
  }
}
</style>
