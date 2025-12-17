<script setup lang="ts">
// API documentation page for CXOneChat
</script>

<template>
  <div class="docs-view">
    <h1>CXone Chat API</h1>
    <p class="subtitle">One-liner initialization script for embedding CXone AI Assistant webchat</p>

    <section class="doc-section">
      <h2>Quick Start</h2>
      <pre class="code-block"><code>&lt;script src="/cxone-chat/cxone-chat.js"&gt;&lt;/script&gt;
&lt;script&gt;
  CXOneChat.init({
    endpoint: 'https://your-cognigy-endpoint.com/...',
    context: 'actions'
  });
&lt;/script&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Configuration</h2>
      <table class="api-table">
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>endpoint</code></td>
            <td><code>string</code></td>
            <td>Yes</td>
            <td>Cognigy webchat endpoint URL</td>
          </tr>
          <tr>
            <td><code>context</code></td>
            <td><code>string</code></td>
            <td>Yes</td>
            <td>Application context (e.g., 'actions', 'dashboard', 'admin')</td>
          </tr>
          <tr>
            <td><code>userId</code></td>
            <td><code>string</code></td>
            <td>No</td>
            <td>User ID. If not provided, will be auto-detected from cookies/localStorage or generated</td>
          </tr>
          <tr>
            <td><code>container</code></td>
            <td><code>HTMLElement | string</code></td>
            <td>No</td>
            <td>Container element or CSS selector to embed webchat into. If not provided, appends to document.body</td>
          </tr>
          <tr>
            <td><code>embedded</code></td>
            <td><code>boolean</code></td>
            <td>No</td>
            <td>When true, webchat uses relative positioning instead of fixed (for embedding in sidebars/panels)</td>
          </tr>
          <tr>
            <td><code>onEmbeddedClose</code></td>
            <td><code>() =&gt; void</code></td>
            <td>No</td>
            <td>Callback when close button is clicked in embedded mode</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2>API Methods</h2>

      <div class="method">
        <h3><code>CXOneChat.init(config)</code></h3>
        <p>Initialize the webchat. Returns a Promise that resolves to a <code>CXOneChatInstance</code>.</p>
        <pre class="code-block"><code>const chat = await CXOneChat.init({
  endpoint: 'https://cognigy-endpoint-na1.nicecxone.com/...',
  context: 'actions',
  userId: 'user-123',
  embedded: true,
  container: '#chat-sidebar',
  onEmbeddedClose: () => console.log('Chat closed')
});</code></pre>
      </div>

      <div class="method">
        <h3><code>CXOneChat.open()</code></h3>
        <p>Open the chat widget.</p>
      </div>

      <div class="method">
        <h3><code>CXOneChat.close()</code></h3>
        <p>Close the chat widget.</p>
      </div>

      <div class="method">
        <h3><code>CXOneChat.toggle()</code></h3>
        <p>Toggle the chat widget open/closed state.</p>
      </div>

      <div class="method">
        <h3><code>CXOneChat.sendMessage(text, data?)</code></h3>
        <p>Send a message to the bot. Optional data object can include custom payload.</p>
        <pre class="code-block"><code>CXOneChat.sendMessage('Hello');
CXOneChat.sendMessage('', { currentRoute: '/dashboard' });</code></pre>
      </div>

      <div class="method">
        <h3><code>CXOneChat.getUserId()</code></h3>
        <p>Get the current user ID.</p>
      </div>

      <div class="method">
        <h3><code>CXOneChat.isInitialized()</code></h3>
        <p>Check if the webchat has been initialized.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2>Instance Methods</h2>
      <p>The instance returned from <code>CXOneChat.init()</code> provides additional methods:</p>

      <div class="method">
        <h3><code>instance.registerAnalyticsService(handler)</code></h3>
        <p>Register a callback to receive webchat analytics events. Same API as Cognigy webchat.</p>
        <pre class="code-block"><code>const chat = await CXOneChat.init({ ... });

chat.registerAnalyticsService((event) => {
  console.log('Analytics event:', event.type, event.payload);

  if (event.type === 'webchat/incoming-message') {
    // Handle bot message
    const payloadData = event.payload?.data;
    if (payloadData?.createChart) {
      // Navigate to chart view
    }
  }
});</code></pre>
      </div>

      <div class="method">
        <h3><code>instance.getSessionId()</code></h3>
        <p>Get the current session ID.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2>Embedded Mode Example</h2>
      <p>Embed the webchat in a sidebar panel:</p>
      <pre class="code-block"><code>&lt;div id="chat-sidebar" style="width: 400px; height: 100vh;"&gt;&lt;/div&gt;

&lt;script&gt;
CXOneChat.init({
  endpoint: 'https://your-endpoint.com/...',
  context: 'dashboard',
  container: '#chat-sidebar',
  embedded: true,
  onEmbeddedClose: () => {
    document.getElementById('chat-sidebar').style.display = 'none';
  }
});
&lt;/script&gt;</code></pre>
    </section>

    <section class="doc-section">
      <h2>Features</h2>
      <ul class="feature-list">
        <li><strong>Conversation Persistence</strong> - Messages are synced to backend and restored across sessions</li>
        <li><strong>Auto User ID</strong> - Automatically detects or generates user ID from localStorage/cookies</li>
        <li><strong>CXone Theming</strong> - Pre-configured with CXone brand colors</li>
        <li><strong>Previous Conversations</strong> - Users can view and resume previous chat sessions</li>
        <li><strong>Embedded Mode</strong> - Render chat inside any container with relative positioning</li>
        <li><strong>Analytics Events</strong> - Subscribe to webchat events for custom integrations</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.docs-view {
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

h3 {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.code-block {
  background: #f5f5f5;
  color: #333;
  padding: 10px 12px;
  border-radius: 0;
  border: 1px solid #d1d1d1;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
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
  border-radius: 0;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  border: 1px solid #d1d1d1;
}

.api-table th,
.api-table td {
  text-align: left;
  padding: 8px 10px;
  border: 1px solid #d1d1d1;
}

.api-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.api-table td {
  color: #666;
}

.api-table td:first-child {
  font-weight: 500;
}

.method {
  margin-bottom: 12px;
  padding: 10px;
  background: #fafafa;
  border-radius: 0;
  border: 1px solid #d1d1d1;
}

.method h3 {
  margin-top: 0;
}

.method p {
  margin: 4px 0;
  color: #666;
  font-size: 12px;
}

.method .code-block {
  margin-top: 8px;
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
