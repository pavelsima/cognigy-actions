<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCXoneWebchat } from '@/composables/useCXoneWebchat'
import { useCXoneToken } from '@/composables/useCXoneToken'

const {
  status,
  init,
  open,
  close,
  toggle,
  sendMessage,
  showNotification,
  startConversation,
  endSession,
} = useCXoneWebchat()

const { token, setToken, clearToken, loadToken } = useCXoneToken()

const isSidebarOpen = ref(false)
const cxoneInitialized = ref(false)
const tokenInput = ref('')
const tokenSaved = ref(false)

// Load token from localStorage on mount
onMounted(() => {
  const savedToken = loadToken()
  if (savedToken) {
    tokenInput.value = savedToken
  }
})

const tabs = [
  { label: 'API Docs', to: '/docs' },
  { label: 'Vue Example', to: '/vue-example' },
  { label: 'React Example', to: '/react-example' },
]

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const handleToggleChat = async () => {
  isSidebarOpen.value = !isSidebarOpen.value

  if (isSidebarOpen.value && !cxoneInitialized.value) {
    cxoneInitialized.value = true
    await nextTick()
    void init({
      container: '#cxone-chat-sidebar',
      embedded: true,
      onEmbeddedClose: closeSidebar,
      cxoneToken: token.value || undefined,
      homeScreen: {
        welcomeText: 'Welcome',
        subtitle: 'How can I help you today?',
        conversationStarters: [
          { title: 'What can you help me with?' },
          { title: 'Show me an example' },
        ],
      },
    })
  }
}

const handleSaveToken = () => {
  setToken(tokenInput.value)
  tokenSaved.value = true
  setTimeout(() => {
    tokenSaved.value = false
  }, 2000)
}

const handleClearToken = () => {
  tokenInput.value = ''
  clearToken()
}

const handleTokenInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSaveToken()
  }
}

const handleSendMessage = () => {
  sendMessage('Hello from control button!')
}

const handleNotification = () => {
  showNotification('This is a test notification')
}

const handleNewConversation = () => {
  startConversation()
}

const handleEndSession = () => {
  endSession()
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-open': isSidebarOpen }">
    <header class="app-header">
      <div class="branding">
        <span class="brand-mark"></span>
        <div>
          <p class="eyebrow">CXone Chat</p>
          <strong>Demo App</strong>
        </div>
      </div>
      <div class="header-actions">
        <div class="token-input-group">
          <input
            v-model="tokenInput"
            type="text"
            class="token-input"
            placeholder="CXone Token"
            @keydown="handleTokenInputKeydown"
            @blur="handleSaveToken"
          />
          <button
            v-if="tokenInput"
            class="btn-icon"
            type="button"
            @click="handleClearToken"
            title="Clear token"
          >
            ×
          </button>
          <span v-if="tokenSaved" class="token-saved-indicator">Saved</span>
        </div>
        <button class="btn" type="button" @click="handleToggleChat">
          {{ isSidebarOpen ? 'Close Chat' : 'Open Chat' }}
        </button>
      </div>
    </header>

    <div class="main-layout">
      <main class="content-panel">
        <nav class="primary-tabs">
          <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab-link">
            {{ tab.label }}
          </RouterLink>
        </nav>
        <slot />
      </main>

      <aside v-show="isSidebarOpen" class="chat-sidebar">
        <div class="chat-controls">
          <span class="status-badge" :class="status">{{ status }}</span>
          <button class="btn-sm" @click="open" :disabled="status !== 'ready'">Open</button>
          <button class="btn-sm" @click="close" :disabled="status !== 'ready'">Close</button>
          <button class="btn-sm" @click="toggle" :disabled="status !== 'ready'">Toggle</button>
          <button class="btn-sm" @click="handleSendMessage" :disabled="status !== 'ready'">Send Msg</button>
          <button class="btn-sm" @click="handleNotification" :disabled="status !== 'ready'">Notify</button>
          <button class="btn-sm" @click="handleNewConversation" :disabled="status !== 'ready'">New Conv</button>
          <button class="btn-sm" @click="handleEndSession" :disabled="status !== 'ready'">End</button>
        </div>
        <div id="cxone-chat-sidebar" class="chat-container"></div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell.sidebar-open {
  margin-right: 500px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d1d1d1;
}

.branding {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-mark {
  width: 24px;
  height: 24px;
  background: #0C3985;
  border-radius: 4px;
}

.eyebrow {
  font-size: 10px;
  color: #666;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.branding strong {
  font-size: 14px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.token-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.token-input {
  font-family: inherit;
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid #d1d1d1;
  border-radius: 3px;
  background: #fff;
  color: #333;
  width: 200px;
}

.token-input:focus {
  outline: none;
  border-color: #0C3985;
}

.token-input::placeholder {
  color: #999;
}

.btn-icon {
  font-family: inherit;
  font-size: 16px;
  line-height: 1;
  padding: 2px 6px;
  border: 1px solid #d1d1d1;
  border-radius: 3px;
  background: #fff;
  color: #666;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f0f0f0;
  color: #333;
}

.token-saved-indicator {
  font-size: 10px;
  color: #155724;
  background: #d4edda;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.btn {
  font-family: inherit;
  font-size: 12px;
  padding: 6px 12px;
  border: 1px solid #d1d1d1;
  border-radius: 3px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.btn:hover {
  background: #f0f0f0;
}

.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.content-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.primary-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #d1d1d1;
  margin-bottom: 12px;
}

.tab-link {
  padding: 8px 16px;
  font-size: 12px;
  color: #666;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-link:hover {
  color: #333;
}

.tab-link.router-link-active {
  color: #0C3985;
  border-bottom-color: #0C3985;
}

.chat-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #d1d1d1;
  background: #fff;
}

.chat-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #d1d1d1;
  align-items: center;
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: 600;
}

.status-badge.idle {
  background: #e5e5e5;
  color: #666;
}

.status-badge.loading {
  background: #fff3cd;
  color: #856404;
}

.status-badge.ready {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.btn-sm {
  font-family: inherit;
  font-size: 10px;
  padding: 3px 6px;
  border: 1px solid #d1d1d1;
  border-radius: 2px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.btn-sm:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

@media (max-width: 900px) {
  .app-shell.sidebar-open {
    margin-right: 0;
  }

  .chat-sidebar {
    width: 100%;
  }
}
</style>
