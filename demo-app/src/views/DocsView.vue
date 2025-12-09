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
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary, #1F2937);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary, #6B7280);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.doc-section {
  margin-bottom: 2.5rem;
}

h2 {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #E5E7EB);
}

h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
  margin-bottom: 0.5rem;
}

.code-block {
  background: #1E293B;
  color: #E2E8F0;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.code-block code {
  color: inherit;
  background: none;
  padding: 0;
}

code {
  background: #F1F5F9;
  color: #0C3985;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.9em;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.api-table th,
.api-table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #E5E7EB);
}

.api-table th {
  background: #F8FAFC;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
}

.api-table td {
  color: var(--text-secondary, #4B5563);
}

.api-table td:first-child {
  font-weight: 500;
}

.method {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #F8FAFC;
  border-radius: 8px;
  border: 1px solid var(--border-color, #E5E7EB);
}

.method h3 {
  margin-top: 0;
}

.method p {
  margin: 0.5rem 0;
  color: var(--text-secondary, #4B5563);
}

.method .code-block {
  margin-top: 0.75rem;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--text-secondary, #4B5563);
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.85rem;
  width: 8px;
  height: 8px;
  background: #0C3985;
  border-radius: 50%;
}

.feature-list strong {
  color: var(--text-primary, #1F2937);
}
</style>
