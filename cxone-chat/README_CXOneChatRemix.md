# CXone Chat API

One-liner initialization script for embedding CXone AI Assistant webchat.

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

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `endpoint` | `string` | Yes | Cognigy webchat endpoint URL |
| `context` | `string` | Yes | Application context (e.g., 'actions', 'dashboard', 'admin') |
| `userId` | `string` | No | User ID. If not provided, will be auto-detected from cookies/localStorage or generated |
| `container` | `HTMLElement \| string` | No | Container element or CSS selector to embed webchat into. If not provided, appends to document.body |
| `embedded` | `boolean` | No | When true, webchat uses relative positioning instead of fixed (for embedding in sidebars/panels) |
| `onEmbeddedClose` | `() => void` | No | Callback when close button is clicked in embedded mode |

## API Methods

### `CXOneChat.init(config)`

Initialize the webchat. Returns a Promise that resolves to a `CXOneChatInstance`.

```javascript
const chat = await CXOneChat.init({
  endpoint: 'https://cognigy-endpoint-na1.nicecxone.com/...',
  context: 'actions',
  userId: 'user-123',
  embedded: true,
  container: '#chat-sidebar',
  onEmbeddedClose: () => console.log('Chat closed')
});
```

### `CXOneChat.open()`

Open the chat widget.

### `CXOneChat.close()`

Close the chat widget.

### `CXOneChat.toggle()`

Toggle the chat widget open/closed state.

### `CXOneChat.sendMessage(text, data?)`

Send a message to the bot. Optional data object can include custom payload.

```javascript
CXOneChat.sendMessage('Hello');
CXOneChat.sendMessage('', { currentRoute: '/dashboard' });
```

### `CXOneChat.getUserId()`

Get the current user ID.

### `CXOneChat.isInitialized()`

Check if the webchat has been initialized.

## Instance Methods

The instance returned from `CXOneChat.init()` provides additional methods:

### `instance.registerAnalyticsService(handler)`

Register a callback to receive webchat analytics events. Same API as Cognigy webchat.

```javascript
const chat = await CXOneChat.init({ ... });

chat.registerAnalyticsService((event) => {
  console.log('Analytics event:', event.type, event.payload);

  if (event.type === 'webchat/incoming-message') {
    // Handle bot message
    const payloadData = event.payload?.data;
    if (payloadData?.createChart) {
      // Navigate to chart view
    }
  }
});
```

### `instance.getSessionId()`

Get the current session ID.

## Embedded Mode Example

Embed the webchat in a sidebar panel:

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

## Features

- **Conversation Persistence** - Messages are synced to backend and restored across sessions
- **Auto User ID** - Automatically detects or generates user ID from localStorage/cookies
- **CXone Theming** - Pre-configured with CXone brand colors
- **Previous Conversations** - Users can view and resume previous chat sessions
- **Embedded Mode** - Render chat inside any container with relative positioning
- **Analytics Events** - Subscribe to webchat events for custom integrations

## User ID Auto-Detection

If `userId` is not provided, the script tries to detect it from:

1. `localStorage.getItem('cxone-user-id')`
2. Common auth keys: `userId`, `user_id`, `uid`, `sub`, `user`
3. JSON auth objects: `auth`, `user`, `session`, `currentUser`
4. Cookies: `userId`, `user_id`, `uid`
5. Generates new UUID if nothing found

## TypeScript Types

```typescript
interface CXOneChatConfig {
  endpoint: string;
  context: string;
  userId?: string;
  container?: HTMLElement | string;
  embedded?: boolean;
  onEmbeddedClose?: () => void;
}

interface CXOneChatInstance {
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, data?: Record<string, unknown>) => void;
  getUserId: () => string;
  getSessionId: () => string;
  registerAnalyticsService: (handler: (event: WebchatAnalyticsEvent) => void) => void;
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

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Build with custom webchat URL
WEBCHAT_URL=/webchat/webchat.js yarn build
```

## Build Output

| File | Size | Description |
|------|------|-------------|
| `dist/cxone-chat.js` | ~16KB | Development build |
| `dist/cxone-chat.min.js` | ~6KB | Production build |
