<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useCognigyWebchat } from '@/composables/useCognigyWebchat'
import { useCustomChat } from '@/composables/useCustomChat'
import { useCXoneWebchat } from '@/composables/useCXoneWebchat'
import CustomChatModal from '@/components/CustomChatModal.vue'

const { status, init, open } = useCognigyWebchat()
const { open: openCustomChat } = useCustomChat()
const { init: initCXone } = useCXoneWebchat()

const isChatReady = computed(() => status.value === 'ready')
const isSidebarOpen = ref(false)
const cxoneInitialized = ref(false)

// Load token from localStorage on mount
const STORAGE_KEY = 'cxoneToken'
const cxoneToken = ref(localStorage.getItem(STORAGE_KEY) || '')

// Save token to localStorage whenever it changes
watch(cxoneToken, (newValue) => {
  if (newValue) {
    localStorage.setItem(STORAGE_KEY, newValue)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
})

const tabs = [
  { label: 'Insights', to: '/insights' },
  { label: 'Email', to: '/email' },
  { label: 'Knowledge Article', to: '/knowledge' },
  { label: 'API Docs', to: '/docs' },
]

onMounted(() => {
  void init()
})

const handleOpenChat = () => {
  open()
}

const handleOpenCustomChat = () => {
  openCustomChat()
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const handleToggleCXoneChat = async () => {
  isSidebarOpen.value = !isSidebarOpen.value

  // Initialize CXone chat on first open (after container is visible)
  if (isSidebarOpen.value && !cxoneInitialized.value) {
    cxoneInitialized.value = true
    await nextTick() // Wait for DOM to update
    void initCXone({
      container: '#cxone-chat-sidebar',
      embedded: true,
      onEmbeddedClose: closeSidebar,
      cxoneToken: cxoneToken.value || undefined,
    })
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header glass-panel">
      <div class="branding">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <p class="eyebrow">CXone</p>
          <strong>Actions Studio</strong>
        </div>
      </div>
      <div class="header-actions">
        <input
          v-model="cxoneToken"
          type="text"
          placeholder="CXone Bearer Token"
          class="token-input"
        />
        <button class="ghost-button" type="button" :disabled="!isChatReady" @click="handleOpenChat">
          {{ isChatReady ? 'Open Webchat' : 'Loading Webchat' }}
        </button>
        <button class="ghost-button" type="button" @click="handleOpenCustomChat">
          Open Custom Chat
        </button>
        <button
          class="ghost-button cxone-chat-btn"
          type="button"
          @click="handleToggleCXoneChat"
        >
          {{ isSidebarOpen ? 'Close CXone Chat' : 'Open CXone Chat' }}
        </button>
      </div>
    </header>

    <div class="main-layout">
      <main class="content-panel glass-panel">
        <nav class="primary-tabs">
          <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab-link">
            {{ tab.label }}
          </RouterLink>
        </nav>
        <slot />
      </main>

      <aside v-show="isSidebarOpen" class="chat-sidebar glass-panel">
        <div id="cxone-chat-sidebar" class="chat-container"></div>
      </aside>
    </div>
    <CustomChatModal />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.main-layout {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.content-panel {
  padding: clamp(1.25rem, 2vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.chat-sidebar {
  width: 500px;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary, #6B7280);
  padding: 0 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary, #1F2937);
}

.chat-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.token-input {
  font-family: inherit;
  font-size: 0.875rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--cxone-ghost-border);
  border-radius: 999px;
  background: var(--cxone-panel-surface);
  color: var(--cxone-text);
  min-width: 200px;
  max-width: 300px;
  transition: border-color 0.2s ease;
}

.token-input::placeholder {
  color: var(--cxone-muted-text);
}

.token-input:focus {
  outline: none;
  border-color: var(--cxone-primary);
}

/* Responsive: stack on smaller screens */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    min-width: 0;
    height: 500px;
  }
}
</style>
