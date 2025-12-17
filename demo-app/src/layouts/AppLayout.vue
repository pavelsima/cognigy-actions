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
      homeScreen: {
        welcomeText: 'Welcome',
        subtitle: 'How can I help you Today?',
        suggestionsLabel: 'Here are some things Copilot can help you do:',
        inputPlaceholder: 'Ask a question or request...',
        conversationStarters: [
          { title: 'What is the most used category?' },
          { title: 'Which agents had adherence issues last month and what was the root cause?' },
          { title: 'What is the average ASA of Team A, B and C from past month?' },
          { title: 'How many calls with Campaign A were refused yesterday?' },
        ],
      },
    })
  }
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-open': isSidebarOpen }">
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
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.app-shell.sidebar-open {
  margin-right: 500px;
}

.main-layout {
  display: flex;
  gap: 0;
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
  border-radius: 0;
}

.chat-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  border-radius: 0;
  border-left: 1px solid #d1d1d1;
  background: #fff;
}

.chat-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.token-input {
  font-family: inherit;
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid #d1d1d1;
  border-radius: 3px;
  background: #fff;
  color: #333;
  min-width: 180px;
  max-width: 250px;
}

.token-input::placeholder {
  color: #999;
}

.token-input:focus {
  outline: 1px solid #0066cc;
  border-color: #0066cc;
}

/* Responsive: stack on smaller screens */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }

  .app-shell.sidebar-open {
    margin-right: 0;
  }

  .chat-sidebar {
    width: 100%;
    height: 100dvh;
  }
}
</style>
