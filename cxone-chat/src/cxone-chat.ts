/**
 * CXone Chat - One-liner initialization script
 *
 * Usage:
 <script src="cxone-chat.js"></script>
  <script>
    CXOneChat.init({ context: 'actions' });
   </script>
 */

// ============================================================================
// Configuration (hardcoded - managed by CXone team)
// ============================================================================

const CONFIG = {
  // Cognigy Webchat (injected at build time - uses our server in prod, GitHub in dev)
  WEBCHAT_SCRIPT: process.env.WEBCHAT_URL,
  WEBCHAT_ENDPOINT: 'https://cognigy-endpoint-na1.nicecxone.com/ac0b6002f0960b5dffcb867a93477f5271be0e57f2abb55bb1e4e5676473a30e',

  // Backend for conversation persistence (injected at build time)
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

// ============================================================================
// Types
// ============================================================================

export interface CXOneChatConfig {
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

async function saveMessage(
  userId: string,
  sessionId: string,
  message: { id: string; text: string; source: string; timestamp: number; data?: unknown }
): Promise<void> {
  try {
    await fetch(`${CONFIG.BACKEND_URL}/api/conversations/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, message }),
    });
  } catch (error) {
    console.warn('[CXOneChat] Failed to save message:', error);
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
   * CXOneChat.init({ context: 'actions' });
   *
   * @example
   * // With custom userId
   * CXOneChat.init({ context: 'actions', userId: 'user-123' });
   */
  async init(config: CXOneChatConfig): Promise<CXOneChatInstance> {
    if (instance) {
      console.warn('[CXOneChat] Already initialized');
      return instance;
    }

    const { context, userId, container, embedded, onEmbeddedClose } = config;

    if (!context) {
      throw new Error('[CXOneChat] context is required');
    }

    currentContext = context;
    currentUserId = userId || detectUserId();

    console.log(`[CXOneChat] Initializing for context: ${currentContext}, userId: ${currentUserId}${embedded ? ', embedded mode' : ''}`);

    try {
      const endpointToken = extractEndpointToken(CONFIG.WEBCHAT_ENDPOINT);

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
      webchatInstance = await window.initWebchat(CONFIG.WEBCHAT_ENDPOINT, {
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
      webchatInstance.registerAnalyticsService((event) => {
        const sessionId = webchatInstance?.store?.getState()?.options?.sessionId || '';
        const typedEvent = event as WebchatAnalyticsEvent;

        // Internal: message persistence to backend
        if (event.type === 'webchat/incoming-message' && event.payload) {
          const payload = event.payload as { id?: string; text?: string; source?: string; data?: unknown };
          saveMessage(currentUserId, sessionId, {
            id: payload.id || `msg-${Date.now()}`,
            text: payload.text || '',
            source: payload.source || 'bot',
            timestamp: Date.now(),
            data: payload.data as Record<string, unknown> | undefined,
          });
        }

        if (event.type === 'webchat/outgoing-message' && event.payload) {
          const payload = event.payload as { text?: string; data?: unknown };
          saveMessage(currentUserId, sessionId, {
            id: `msg-${Date.now()}`,
            text: payload.text || '',
            source: 'user',
            timestamp: Date.now(),
            data: payload.data as Record<string, unknown> | undefined,
          });
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
