/**
 * CXone Chat - One-liner initialization script
 *
 * Usage:
 * <script src="cxone-chat.js"></script>
 * <script>
 *   CXOneChat.init({
 *     endpoint: 'https://your-cognigy-endpoint.com/...',
 *     context: 'actions'
 *   });
 * </script>
 */

// ============================================================================
// Configuration
// ============================================================================

// CXone Theming - Following CXone Conversation UI Guidelines
// Property names must match webchat's IWebchatTheme interface
const THEME = {
  primaryColor: '#0C3985',
  secondaryColor: '#3B5EFF',
  // CXone: Grey background for AI/bot messages, white for user messages
  backgroundBotMessage: '#F2F2F2',
  backgroundUserMessage: '#FFFFFF',
  textLink: '#3B5EFF',
  greyColor: '#E5E7EB',
  greyContrastColor: '#4B5563',
} as const;

// Runtime endpoint (set during init)
let currentEndpoint: string = '';

// Runtime sync URL (set during init, empty = syncing disabled)
let currentSyncUrl: string = '';

// ============================================================================
// Types
// ============================================================================

/** Conversation starter button configuration */
export interface ConversationStarter {
  /** Button title displayed to user */
  title: string;
  /** Payload sent when clicked (defaults to title if not provided) */
  payload?: string;
}

/** Home screen configuration */
export interface HomeScreenConfig {
  /** Welcome message (e.g., "Welcome, John") */
  welcomeText?: string;
  /** Subtitle below welcome text (e.g., "How can I help you Today?") */
  subtitle?: string;
  /** Label above suggestion cards (e.g., "Here are some things Copilot can help you do:") */
  suggestionsLabel?: string;
  /** Placeholder for input field */
  inputPlaceholder?: string;
  /** Conversation starter suggestions */
  conversationStarters?: ConversationStarter[];
}

export interface CXOneChatConfig {
  /** Required: Cognigy webchat endpoint URL */
  endpoint: string;
  /** Required: Application context (e.g., 'actions', 'dashboard', 'admin') */
  context: string;
  /** Optional: User ID. If not provided, will be auto-detected from cookies/localStorage */
  userId?: string;
  /** Optional: Container element or CSS selector to embed webchat into. If not provided, appends to document.body */
  container?: HTMLElement | string;
  /** Optional: When true, webchat uses relative positioning instead of fixed (for embedding in sidebars/panels) */
  embedded?: boolean;
  /** Optional: Callback when close button is clicked in embedded mode (e.g., to close sidebar) */
  onEmbeddedClose?: () => void;
  /** Optional: CXone Bearer token to send to Cognigy at conversation start */
  cxoneToken?: string;
  /** Optional: Home screen configuration */
  homeScreen?: HomeScreenConfig;
  /** Optional: Backend URL for conversation persistence. If not provided, syncing is disabled and webchat uses only localStorage */
  syncUrl?: string;
}

export interface WebchatAnalyticsEvent {
  type: string;
  payload?: {
    text?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface CXOneChatInstance {
  // === Core methods (original facade) ===
  /** Open the chat widget */
  open: () => void;
  /** Close the chat widget */
  close: () => void;
  /** Toggle the chat widget */
  toggle: () => void;
  /** Send a message */
  sendMessage: (text: string, data?: Record<string, unknown>) => void;
  /** Get current user ID */
  getUserId: () => string;
  /** Get current session ID */
  getSessionId: () => string;
  /** Register analytics service handler - same API as Cognigy webchat */
  registerAnalyticsService: (handler: (event: WebchatAnalyticsEvent) => void) => void;

  // === Extended methods (from original Webchat) ===
  /** Reconnect to the websocket */
  connect: () => Promise<void>;
  /** Display a toast notification */
  showNotification: (message: string) => void;
  /** Programmatically start a new conversation (shows chat screen) */
  startConversation: () => void;
  /** Listen to socket events (e.g., 'typingStatus', 'finalPing') */
  on: (event: string, handler: (data: unknown) => void) => void;
  /** Listen to incoming bot messages */
  onMessage: (handler: (message: unknown) => void) => void;
  /** Update webchat settings at runtime */
  updateSettings: (settings: Record<string, unknown>) => void;
  /** End current session and start fresh */
  endSession: () => void;

  // === Raw access (for power users) ===
  /** Access underlying Cognigy webchat instance (use with caution) */
  readonly webchat: WebchatInstance | null;
}

interface Conversation {
  sessionId: string;
  messages: Array<{
    id: string;
    text: string;
    source: 'user' | 'bot';
    timestamp: number;
    data?: Record<string, unknown>;
  }>;
  rating?: { hasGivenRating: boolean };
}

interface WebchatInstance {
  // Core methods
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, data?: Record<string, unknown>, options?: unknown) => void;
  registerAnalyticsService: (handler: (event: { type: string; payload?: unknown }) => void) => void;

  // Extended methods
  connect: () => Promise<void>;
  showNotification: (message: string) => void;
  startConversation: () => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  onMessage: (handler: (message: unknown) => void) => void;
  updateSettings: (settings: unknown) => void;
  endSession: () => void;

  // Internal access
  store?: {
    getState: () => {
      options?: {
        userId?: string;
        sessionId?: string;
      };
    };
  };
  client?: unknown;
  analytics?: unknown;
}

declare global {
  interface Window {
    initWebchat: (endpoint: string, options?: unknown) => Promise<WebchatInstance>;
    CXOneChat: typeof CXOneChat;
  }
}

// ============================================================================
// User ID Detection
// ============================================================================

/**
 * Try to detect user ID from various sources
 */
function detectUserId(): string {
  // 1. Try localStorage (CXone standard key)
  const cxoneUserId = localStorage.getItem('cxone-user-id');
  if (cxoneUserId) {
    return cxoneUserId;
  }

  // 2. Try common auth storage keys
  const authKeys = ['userId', 'user_id', 'uid', 'sub', 'user'];
  for (const key of authKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  // 3. Try to parse JSON auth objects
  const jsonAuthKeys = ['auth', 'user', 'session', 'currentUser'];
  for (const key of jsonAuthKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        const id = parsed.userId || parsed.user_id || parsed.id || parsed.sub || parsed.uid;
        if (id) {
          return String(id);
        }
      } catch {
        // Not JSON, skip
      }
    }
  }

  // 4. Try cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (['userId', 'user_id', 'uid'].includes(name) && value) {
      return decodeURIComponent(value);
    }
  }

  // 5. Generate new ID and store it
  const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem('cxone-user-id', newUserId);
  return newUserId;
}

// ============================================================================
// Storage Utilities
// ============================================================================

function extractEndpointToken(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.pathname.split('/').pop() || 'default';
  } catch {
    return endpoint.split('/').pop() || 'default';
  }
}

function getWebchatStorageKey(userId: string, sessionId: string, endpointToken: string): string {
  return JSON.stringify(['webchat-client', userId, sessionId, endpointToken]);
}

function writeConversationsToStorage(
  userId: string,
  endpointToken: string,
  conversations: Conversation[]
): void {
  conversations.forEach((conv) => {
    const key = getWebchatStorageKey(userId, conv.sessionId, endpointToken);
    const value = JSON.stringify({
      messages: conv.messages,
      rating: conv.rating || { hasGivenRating: false },
    });
    localStorage.setItem(key, value);
  });
}

// ============================================================================
// Backend API
// ============================================================================

async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!currentSyncUrl) {
    return [];
  }
  try {
    const response = await fetch(
      `${currentSyncUrl}/api/conversations?userId=${encodeURIComponent(userId)}`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn('[CXOneChat] Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Sync current localStorage conversation state to backend
 * This is more reliable than capturing individual events since localStorage is the source of truth
 */
async function syncConversationToBackend(userId: string, sessionId: string): Promise<void> {
  if (!currentSyncUrl) {
    return;
  }
  try {
    const endpointToken = extractEndpointToken(currentEndpoint);
    const storageKey = getWebchatStorageKey(userId, sessionId, endpointToken);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    const data = JSON.parse(stored);
    if (!data.messages || !Array.isArray(data.messages)) {
      return;
    }

    await fetch(`${currentSyncUrl}/api/conversations/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionId,
        messages: data.messages,
        rating: data.rating,
      }),
    });
  } catch (error) {
    console.warn('[CXOneChat] Failed to sync conversation:', error);
  }
}

async function createSession(userId: string, sessionId: string): Promise<void> {
  if (!currentSyncUrl) {
    return;
  }
  try {
    await fetch(`${currentSyncUrl}/api/conversations/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId }),
    });
  } catch (error) {
    console.warn('[CXOneChat] Failed to create session:', error);
  }
}

// ============================================================================
// Main CXOneChat Object
// ============================================================================

let instance: CXOneChatInstance | null = null;
let webchatInstance: WebchatInstance | null = null;
let currentUserId: string = '';
let currentContext: string = '';

// Array to hold external analytics handlers (supports multiple registrations)
const analyticsHandlers: Array<(event: WebchatAnalyticsEvent) => void> = [];

const CXOneChat = {
  /**
   * Initialize CXone Chat
   *
   * @example
   * CXOneChat.init({
   *   endpoint: 'https://your-cognigy-endpoint.com/...',
   *   context: 'actions'
   * });
   *
   * @example
   * // With custom userId and embedded mode
   * CXOneChat.init({
   *   endpoint: 'https://your-cognigy-endpoint.com/...',
   *   context: 'actions',
   *   userId: 'user-123',
   *   embedded: true,
   *   container: '#chat-sidebar'
   * });
   */
  async init(config: CXOneChatConfig): Promise<CXOneChatInstance> {
    if (instance) {
      return instance;
    }

    const { endpoint, context, userId, container, embedded, onEmbeddedClose, cxoneToken, homeScreen: homeScreenConfig, syncUrl } = config;

    if (!endpoint) {
      throw new Error('[CXOneChat] endpoint is required');
    }

    if (!context) {
      throw new Error('[CXOneChat] context is required');
    }

    currentEndpoint = endpoint;
    currentContext = context;
    currentUserId = userId || detectUserId();
    currentSyncUrl = syncUrl || '';

    try {
      const endpointToken = extractEndpointToken(currentEndpoint);

      // Step 1: Pre-load conversations from backend (if syncing enabled)
      if (currentSyncUrl) {
        const conversations = await fetchConversations(currentUserId);
        if (conversations.length > 0) {
          writeConversationsToStorage(currentUserId, endpointToken, conversations);
        }
      }

      // Ensure userId is stored for webchat
      localStorage.setItem('visitorIdentifier', JSON.stringify({ visitorIdentifier: currentUserId }));

      // Step 2: Verify webchat is bundled
      if (typeof window.initWebchat !== 'function') {
        throw new Error('[CXOneChat] initWebchat not available. Ensure webchat is bundled with cxone-chat.');
      }

      // Step 3: Initialize webchat with CXone theme
      webchatInstance = await window.initWebchat(currentEndpoint, {
        userId: currentUserId,
        container,
        embedded,
        onEmbeddedClose,
        settings: {
          colorScheme: 'light',
          designTemplate: 1,
          colors: THEME,
          layout: {
            title: 'CXone AI Assistant',
            disableToggleButton: true,
            watermark: 'none',
            inputPlaceholder: 'Ask me anything...',
            enableConnectionStatusIndicator: true,
          },
          behavior: {
            enableTypingIndicator: true,
            messageDelay: 500,
          },
          homeScreen: {
            enabled: true,
            welcomeText: homeScreenConfig?.welcomeText || 'Welcome',
            subtitle: homeScreenConfig?.subtitle || 'How can I help you Today?',
            suggestionsLabel: homeScreenConfig?.suggestionsLabel || 'Here are some things Copilot can help you do:',
            inputPlaceholder: homeScreenConfig?.inputPlaceholder || 'Ask a question or request...',
            textColor: '#1F2937',
            background: '#FFFFFF',
            previousConversations: {
              enabled: true,
              buttonText: 'Previous Conversations',
              title: 'Your Conversations',
            },
            startConversationButton: {
              text: 'Start Conversation',
              textColor: '#FFFFFF',
              backgroundColor: '#0C3985',
            },
            conversationStarters: {
              enabled: (homeScreenConfig?.conversationStarters?.length ?? 0) > 0,
              starters: (homeScreenConfig?.conversationStarters || []).map(s => ({
                type: 'postback' as const,
                title: s.title,
                payload: s.payload || s.title,
              })),
            },
          },
          rating: {
            enabled: true,
            title: 'How was your experience?',
            submitButtonText: 'Submit',
          },
          unreadMessages: {
            enableIndicator: true,
            enableBadge: true,
            enablePreview: true,
            enableSound: false,
          },
          fileAttachment: {
            enabled: false,
          },
          startBehavior: 'none',
        },
      });

      // Step 4: Send context to Cognigy
      const initialData: Record<string, unknown> = { _cxoneContext: { app: currentContext } };
      if (cxoneToken) {
        initialData.cxoneToken = cxoneToken;
      }
      webchatInstance.sendMessage('', initialData);

      // Step 5: Set up analytics service (single registration, fans out to all handlers)
      // Debounce sync to avoid too many requests during streaming
      let syncTimeout: ReturnType<typeof setTimeout> | null = null;

      webchatInstance.registerAnalyticsService((event) => {
        const sessionId = webchatInstance?.store?.getState()?.options?.sessionId || '';
        const typedEvent = event as WebchatAnalyticsEvent;

        // On any message event, sync localStorage to backend (debounced)
        // This is more reliable than capturing individual events since localStorage is the source of truth
        if (event.type === 'webchat/incoming-message' || event.type === 'webchat/outgoing-message') {
          // Debounce: wait 500ms after last message event before syncing
          if (syncTimeout) {
            clearTimeout(syncTimeout);
          }
          syncTimeout = setTimeout(() => {
            syncConversationToBackend(currentUserId, sessionId);
            syncTimeout = null;
          }, 500);
        }

        if (event.type === 'webchat/switch-session' && event.payload) {
          createSession(currentUserId, String(event.payload));
        }

        // Fan out to all external handlers
        analyticsHandlers.forEach((handler) => {
          try {
            handler(typedEvent);
          } catch (error) {
            console.error('[CXOneChat] Analytics handler error:', error);
          }
        });
      });

      // Step 6: Build instance
      instance = {
        // === Core methods (original facade) ===
        open: () => webchatInstance?.open(),
        close: () => webchatInstance?.close(),
        toggle: () => webchatInstance?.toggle(),
        sendMessage: (text, data) => webchatInstance?.sendMessage(text, data),
        getUserId: () => currentUserId,
        getSessionId: () => webchatInstance?.store?.getState()?.options?.sessionId || '',
        registerAnalyticsService: (handler) => {
          analyticsHandlers.push(handler);
        },

        // === Extended methods (from original Webchat) ===
        connect: async () => {
          await webchatInstance?.connect();
        },
        showNotification: (message) => {
          webchatInstance?.showNotification(message);
        },
        startConversation: () => {
          webchatInstance?.startConversation();
        },
        on: (event, handler) => {
          webchatInstance?.on(event, handler);
        },
        onMessage: (handler) => {
          webchatInstance?.onMessage(handler);
        },
        updateSettings: (settings) => {
          webchatInstance?.updateSettings(settings);
        },
        endSession: () => {
          webchatInstance?.endSession();
        },

        // === Raw access (for power users) ===
        get webchat() {
          return webchatInstance;
        },
      };

      // Step 7: Auto-open in embedded mode (since there's no FAB button)
      if (embedded) {
        webchatInstance.open();
      }

      return instance;
    } catch (error) {
      console.error('[CXOneChat] Initialization failed:', error);
      throw error;
    }
  },

  /** Open the chat widget */
  open(): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.open();
  },

  /** Close the chat widget */
  close(): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.close();
  },

  /** Toggle the chat widget */
  toggle(): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.toggle();
  },

  /** Send a message */
  sendMessage(text: string, data?: Record<string, unknown>): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.sendMessage(text, data);
  },

  /** Get current user ID */
  getUserId(): string {
    return currentUserId;
  },

  /** Check if initialized */
  isInitialized(): boolean {
    return instance !== null;
  },

  // === Extended methods (from original Webchat) ===

  /** Reconnect to the websocket */
  async connect(): Promise<void> {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    await instance.connect();
  },

  /** Display a toast notification */
  showNotification(message: string): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.showNotification(message);
  },

  /** Programmatically start a new conversation (shows chat screen) */
  startConversation(): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.startConversation();
  },

  /** Listen to socket events */
  on(event: string, handler: (data: unknown) => void): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.on(event, handler);
  },

  /** Listen to incoming bot messages */
  onMessage(handler: (message: unknown) => void): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.onMessage(handler);
  },

  /** Update webchat settings at runtime */
  updateSettings(settings: Record<string, unknown>): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.updateSettings(settings);
  },

  /** End current session and start fresh */
  endSession(): void {
    if (!instance) {
      console.warn('[CXOneChat] Not initialized. Call CXOneChat.init() first.');
      return;
    }
    instance.endSession();
  },

  /** Get the underlying webchat instance (for power users) */
  getWebchat(): WebchatInstance | null {
    return webchatInstance;
  },
};

// Expose globally
if (typeof window !== 'undefined') {
  window.CXOneChat = CXOneChat;
}

export { CXOneChat };
export default CXOneChat;
