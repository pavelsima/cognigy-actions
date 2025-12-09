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

const CONFIG = {
  // Cognigy Webchat script URL (injected at build time)
  WEBCHAT_SCRIPT: process.env.WEBCHAT_URL,

  // Backend for conversation persistence (injected at build time, empty = same origin)
  BACKEND_URL: process.env.BACKEND_URL,

  // CXone Theming
  THEME: {
    primaryColor: '#0C3985',
    secondaryColor: '#3B5EFF',
    chatInterfaceColor: '#0C3985',
    botMessageColor: '#F1F5F9',
    userMessageColor: '#0C3985',
    textColor: '#1F2937',
    textLinkColor: '#3B5EFF',
    greyColor: '#E5E7EB',
    greyContrastColor: '#4B5563',
    botMessageTextColor: '#1F2937',
    userMessageTextColor: '#FFFFFF',
  },
} as const;

// Runtime endpoint (set during init)
let currentEndpoint: string = '';

// ============================================================================
// Types
// ============================================================================

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
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, data?: Record<string, unknown>) => void;
  registerAnalyticsService: (handler: (event: { type: string; payload?: unknown }) => void) => void;
  store?: {
    getState: () => {
      options?: {
        userId?: string;
        sessionId?: string;
      };
    };
  };
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
    console.log('[CXOneChat] Using userId from localStorage (cxone-user-id)');
    return cxoneUserId;
  }

  // 2. Try common auth storage keys
  const authKeys = ['userId', 'user_id', 'uid', 'sub', 'user'];
  for (const key of authKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`[CXOneChat] Using userId from localStorage (${key})`);
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
          console.log(`[CXOneChat] Using userId from localStorage JSON (${key})`);
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
      console.log(`[CXOneChat] Using userId from cookie (${name})`);
      return decodeURIComponent(value);
    }
  }

  // 5. Generate new ID and store it
  const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem('cxone-user-id', newUserId);
  console.log('[CXOneChat] Generated new userId:', newUserId);
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
  try {
    const response = await fetch(
      `${CONFIG.BACKEND_URL}/api/conversations?userId=${encodeURIComponent(userId)}`
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

    await fetch(`${CONFIG.BACKEND_URL}/api/conversations/sync`, {
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
  try {
    await fetch(`${CONFIG.BACKEND_URL}/api/conversations/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId }),
    });
  } catch (error) {
    console.warn('[CXOneChat] Failed to create session:', error);
  }
}

// ============================================================================
// Script Loader
// ============================================================================

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
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
      console.warn('[CXOneChat] Already initialized');
      return instance;
    }

    const { endpoint, context, userId, container, embedded, onEmbeddedClose } = config;

    if (!endpoint) {
      throw new Error('[CXOneChat] endpoint is required');
    }

    if (!context) {
      throw new Error('[CXOneChat] context is required');
    }

    currentEndpoint = endpoint;
    currentContext = context;
    currentUserId = userId || detectUserId();

    console.log(`[CXOneChat] Initializing for context: ${currentContext}, userId: ${currentUserId}${embedded ? ', embedded mode' : ''}`);

    try {
      const endpointToken = extractEndpointToken(currentEndpoint);

      // Step 1: Pre-load conversations from backend
      console.log('[CXOneChat] Loading previous conversations...');
      const conversations = await fetchConversations(currentUserId);
      if (conversations.length > 0) {
        console.log(`[CXOneChat] Loaded ${conversations.length} conversations`);
        writeConversationsToStorage(currentUserId, endpointToken, conversations);
      }

      // Ensure userId is stored for webchat
      localStorage.setItem('visitorIdentifier', JSON.stringify({ visitorIdentifier: currentUserId }));

      // Step 2: Load Cognigy Webchat script
      console.log('[CXOneChat] Loading webchat...');
      await loadScript(CONFIG.WEBCHAT_SCRIPT);

      // Wait for initWebchat to be available
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (typeof window.initWebchat === 'function') {
            resolve();
          } else if (attempts++ > 50) {
            reject(new Error('initWebchat not available'));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      // Step 3: Initialize webchat with CXone theme
      console.log('[CXOneChat] Configuring webchat...');
      webchatInstance = await window.initWebchat(currentEndpoint, {
        userId: currentUserId,
        container,
        embedded,
        onEmbeddedClose,
        settings: {
          colorScheme: 'light',
          designTemplate: 1,
          colors: CONFIG.THEME,
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
            welcomeText: `Welcome to CXone ${currentContext.charAt(0).toUpperCase() + currentContext.slice(1)}`,
            textColor: '#1F2937',
            background: '#F9FAFB',
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
      webchatInstance.sendMessage('', { _cxoneContext: { app: currentContext } });

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
        open: () => webchatInstance?.open(),
        close: () => webchatInstance?.close(),
        toggle: () => webchatInstance?.toggle(),
        sendMessage: (text, data) => webchatInstance?.sendMessage(text, data),
        getUserId: () => currentUserId,
        getSessionId: () => webchatInstance?.store?.getState()?.options?.sessionId || '',
        registerAnalyticsService: (handler) => {
          analyticsHandlers.push(handler);
        },
      };

      // Step 7: Auto-open in embedded mode (since there's no FAB button)
      if (embedded) {
        console.log('[CXOneChat] Embedded mode - auto-opening webchat');
        webchatInstance.open();
      }

      console.log('[CXOneChat] Ready!');
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
};

// Expose globally
if (typeof window !== 'undefined') {
  window.CXOneChat = CXOneChat;
}

export { CXOneChat };
export default CXOneChat;
