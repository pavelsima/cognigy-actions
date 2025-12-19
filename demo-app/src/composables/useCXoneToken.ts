import { ref } from 'vue'

const STORAGE_KEY = 'cxone-token'

const token = ref<string>('')

/**
 * Composable for managing CXone token in localStorage
 */
export function useCXoneToken() {
  /**
   * Load token from localStorage
   */
  function loadToken() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      token.value = stored
    }
    return token.value
  }

  /**
   * Save token to localStorage
   */
  function setToken(newToken: string) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(STORAGE_KEY, newToken)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /**
   * Clear token from localStorage
   */
  function clearToken() {
    token.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Get current token value
   */
  function getToken(): string {
    return token.value
  }

  return {
    token,
    getToken,
    setToken,
    clearToken,
    loadToken,
  }
}

