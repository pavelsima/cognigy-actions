# CXOneChat

A wrapper around [Cognigy Webchat](https://github.com/Cognigy/Webchat) that provides simplified initialization, CXone theming, and optional backend conversation sync.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Global Methods](#global-methods)
  - [Instance Methods](#instance-methods)
- [Embedded Mode](#embedded-mode)
- [Home Screen](#home-screen)
- [Analytics Events](#analytics-events)
- [Backend Sync](#backend-sync)
- [Customization Guide](#customization-guide)
- [Original Webchat Reference](#original-webchat-reference)
- [TypeScript Types](#typescript-types)
- [Development](#development)

---

## Quick Start

```html
<script src="/cxone-chat/cxone-chat.js"></script>
<script>
  CXOneChat.init({
    endpoint: 'https://your-cognigy-endpoint.com/...',
    context: 'actions'
  });
</script>
```

---

## Configuration

### `CXOneChatConfig`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `endpoint` | `string` | **Yes** | Cognigy webchat endpoint URL |
| `context` | `string` | **Yes** | Application context sent to Cognigy (e.g., `'actions'`, `'dashboard'`) |
| `userId` | `string` | No | User ID. Auto-detected if not provided |
| `container` | `HTMLElement \| string` | No | Container element or CSS selector. Defaults to `document.body` |
| `embedded` | `boolean` | No | Use relative positioning for sidebar/panel embedding |
| `onEmbeddedClose` | `() => void` | No | Callback when close button clicked in embedded mode |
| `cxoneToken` | `string` | No | CXone Bearer token sent to Cognigy at conversation start |
| `homeScreen` | `HomeScreenConfig` | No | Home screen customization (see below) |
| `syncUrl` | `string` | No | Backend URL for conversation persistence. If omitted, uses localStorage only |

### `HomeScreenConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `welcomeText` | `string` | `'Welcome'` | Main welcome message |
| `subtitle` | `string` | `'How can I help you Today?'` | Subtitle below welcome |
| `suggestionsLabel` | `string` | `'Here are some things...'` | Label above conversation starters |
| `inputPlaceholder` | `string` | `'Ask a question or request...'` | Input field placeholder |
| `conversationStarters` | `ConversationStarter[]` | `[]` | Quick-start buttons |

### `ConversationStarter`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `title` | `string` | **Yes** | Button text displayed to user |
| `payload` | `string` | No | Payload sent when clicked (defaults to `title`) |

---

## API Reference

### Global Methods

All methods are available on the global `CXOneChat` object after the script loads.

#### Initialization

```javascript
// Initialize - must be called first
const chat = await CXOneChat.init(config);

// Check if initialized
CXOneChat.isInitialized(); // boolean
```

#### Core Controls

```javascript
CXOneChat.open();           // Open the chat widget
CXOneChat.close();          // Close the chat widget
CXOneChat.toggle();         // Toggle open/closed state
```

#### Messaging

```javascript
// Send a text message
CXOneChat.sendMessage('Hello');

// Send with custom data payload
CXOneChat.sendMessage('', { action: 'navigate', route: '/dashboard' });
```

#### User & Session

```javascript
CXOneChat.getUserId();      // Get current user ID
```

#### Extended Methods

```javascript
// Reconnect websocket
await CXOneChat.connect();

// Display toast notification
CXOneChat.showNotification('Message saved!');

// Start new conversation (shows chat screen from home)
CXOneChat.startConversation();

// Listen to socket events
CXOneChat.on('typingStatus', (data) => console.log(data));

// Listen to incoming messages
CXOneChat.onMessage((message) => console.log(message));

// End session and clear messages
CXOneChat.endSession();

// Access raw webchat instance (advanced)
const webchat = CXOneChat.getWebchat();
```

### Instance Methods

The instance returned from `init()` provides the same methods plus:

```javascript
const chat = await CXOneChat.init({ ... });

// Get current session ID
chat.getSessionId();

// Register analytics handler (supports multiple registrations)
chat.registerAnalyticsService((event) => {
  console.log(event.type, event.payload);
});

// Access raw webchat instance
chat.webchat;
```

---

## Embedded Mode

Embed the webchat in a sidebar or panel instead of fixed positioning:

```html
<div id="chat-sidebar" style="width: 400px; height: 100vh;"></div>

<script>
CXOneChat.init({
  endpoint: 'https://your-endpoint.com/...',
  context: 'dashboard',
  container: '#chat-sidebar',
  embedded: true,
  onEmbeddedClose: () => {
    document.getElementById('chat-sidebar').style.display = 'none';
  }
});
</script>
```

In embedded mode:
- Chat auto-opens on init (no FAB button)
- Uses relative positioning within container
- Close button triggers `onEmbeddedClose` callback

---

## Home Screen

Configure the home screen with conversation starters:

```javascript
CXOneChat.init({
  endpoint: '...',
  context: 'actions',
  homeScreen: {
    welcomeText: 'Hello, John',
    subtitle: 'How can I assist you today?',
    suggestionsLabel: 'Try asking:',
    inputPlaceholder: 'Type your question...',
    conversationStarters: [
      { title: 'What are my tasks for today?' },
      { title: 'Show sales report', payload: 'SHOW_SALES_REPORT' },
      { title: 'Schedule a meeting' },
    ],
  },
});
```

---

## Analytics Events

Subscribe to webchat events:

```javascript
CXOneChat.onMessage((message) => {
  // Handle incoming bot messages
  console.log('Bot said:', message);
});

// Or use registerAnalyticsService for all events
const chat = await CXOneChat.init({ ... });
chat.registerAnalyticsService((event) => {
  switch (event.type) {
    case 'webchat/incoming-message':
      // Bot message received
      const data = event.payload?.data;
      if (data?.createChart) {
        navigateToCharts();
      }
      break;
    case 'webchat/outgoing-message':
      // User sent message
      break;
    case 'webchat/open':
      // Chat opened
      break;
    case 'webchat/close':
      // Chat closed
      break;
  }
});
```

---

## Backend Sync

Enable conversation persistence across sessions/devices:

```javascript
CXOneChat.init({
  endpoint: '...',
  context: 'actions',
  syncUrl: 'https://your-backend.com',  // Enable sync
});
```

When `syncUrl` is provided:
- Conversations are fetched from backend on init
- Messages are synced to backend (debounced)
- Previous conversations are available across devices

When `syncUrl` is omitted:
- Uses localStorage only
- Conversations persist in browser only

### Backend API Requirements

Your backend must implement:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations?userId=X` | GET | Fetch user's conversations |
| `/api/conversations/sync` | POST | Sync conversation state |
| `/api/conversations/session` | POST | Create new session |

---

## Customization Guide

### What CXOneChat Controls (Can Modify)

| Feature | Location | Notes |
|---------|----------|-------|
| Theme colors | `updateSettings()` or `CONFIG.THEME` | Runtime or rebuild |
| Home screen text | `homeScreen` config | Runtime config |
| Conversation starters | `homeScreen.conversationStarters` | Runtime config |
| Input placeholder | `homeScreen.inputPlaceholder` | Runtime config |
| FAB button | Disabled by default | `disableToggleButton: true` |
| Watermark | Hidden | `watermark: 'none'` |
| File attachments | Disabled | `fileAttachment.enabled: false` |
| Sound notifications | Disabled | `enableSound: false` |

### Changing Theme Colors

```javascript
// Change colors at runtime
CXOneChat.updateSettings({
  colors: {
    primaryColor: '#0C3985',      // Header, buttons
    secondaryColor: '#3B5EFF',    // Links, accents
    backgroundBotMessage: '#F2F2F2',
    backgroundUserMessage: '#FFFFFF',
    textLink: '#3B5EFF',
  },
});
```

### Other Runtime Settings (via `updateSettings`)

```javascript
CXOneChat.updateSettings({
  layout: {
    title: 'My Assistant',
    inputPlaceholder: 'Ask anything...',
  },
  behavior: {
    enableTypingIndicator: true,
    messageDelay: 500,
  },
});
```

### What Cannot Be Changed at Runtime

| Feature | Reason |
|---------|--------|
| `endpoint` | Set at init, requires re-init |
| `userId` | Set at init, requires re-init |
| `embedded` mode | Set at init, requires re-init |
| `container` | Set at init, requires re-init |

---

## Original Webchat Reference

CXOneChat wraps [Cognigy Webchat v3](https://github.com/Cognigy/Webchat). For advanced usage:

### Documentation Links

| Resource | URL |
|----------|-----|
| Webchat GitHub | https://github.com/Cognigy/Webchat |
| Configuration Options | https://github.com/Cognigy/Webchat/blob/master/docs/embedding.md |
| Theming | https://github.com/Cognigy/Webchat/blob/master/docs/theming.md |
| Analytics Events | https://github.com/Cognigy/Webchat/blob/master/docs/analytics-api.md |
| Message Plugins | https://github.com/Cognigy/Webchat/blob/master/docs/plugins.md |

### Accessing Raw Webchat

For features not exposed by CXOneChat:

```javascript
const webchat = CXOneChat.getWebchat();

// Access Redux store
webchat.store.getState();

// Access socket client
webchat.client.on('output', handler);

// Access analytics emitter
webchat.analytics.on('analytics-event', handler);
```

### Native Webchat Methods (via wrapper)

| Method | CXOneChat | Description |
|--------|-----------|-------------|
| `open()` | `CXOneChat.open()` | Open chat |
| `close()` | `CXOneChat.close()` | Close chat |
| `toggle()` | `CXOneChat.toggle()` | Toggle chat |
| `sendMessage()` | `CXOneChat.sendMessage()` | Send message |
| `connect()` | `CXOneChat.connect()` | Reconnect |
| `showNotification()` | `CXOneChat.showNotification()` | Toast |
| `startConversation()` | `CXOneChat.startConversation()` | Start chat |
| `on()` | `CXOneChat.on()` | Socket events |
| `onMessage()` | `CXOneChat.onMessage()` | Message handler |
| `updateSettings()` | `CXOneChat.updateSettings()` | Update config |
| `endSession()` | `CXOneChat.endSession()` | End & clear |

---

## TypeScript Types

```typescript
interface CXOneChatConfig {
  endpoint: string;
  context: string;
  userId?: string;
  container?: HTMLElement | string;
  embedded?: boolean;
  onEmbeddedClose?: () => void;
  cxoneToken?: string;
  homeScreen?: HomeScreenConfig;
  syncUrl?: string;
}

interface HomeScreenConfig {
  welcomeText?: string;
  subtitle?: string;
  suggestionsLabel?: string;
  inputPlaceholder?: string;
  conversationStarters?: ConversationStarter[];
}

interface ConversationStarter {
  title: string;
  payload?: string;
}

interface CXOneChatInstance {
  // Core
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, data?: Record<string, unknown>) => void;
  getUserId: () => string;
  getSessionId: () => string;
  registerAnalyticsService: (handler: (event: WebchatAnalyticsEvent) => void) => void;

  // Extended
  connect: () => Promise<void>;
  showNotification: (message: string) => void;
  startConversation: () => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  onMessage: (handler: (message: unknown) => void) => void;
  updateSettings: (settings: Record<string, unknown>) => void;
  endSession: () => void;

  // Raw access
  readonly webchat: WebchatInstance | null;
}

interface WebchatAnalyticsEvent {
  type: string;
  payload?: {
    text?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
```

---

## User ID Auto-Detection

If `userId` is not provided, CXOneChat tries to detect it from (in order):

1. `localStorage.getItem('cxone-user-id')`
2. Common keys: `userId`, `user_id`, `uid`, `sub`, `user`
3. JSON objects: `auth`, `user`, `session`, `currentUser`
4. Cookies: `userId`, `user_id`, `uid`
5. Generates new UUID if nothing found

---

## License

Internal use only.
