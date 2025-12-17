<script setup lang="ts">
/**
 * Simple Input Component
 * Clean input with mic and send - matches goal.png design
 */

import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  placeholder: 'Text Message',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const hasContent = computed(() => props.modelValue.trim().length > 0)
const canSend = computed(() => hasContent.value && !props.disabled)

function updateValue(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && canSend.value) {
    event.preventDefault()
    emit('send')
  }
}

function handleSend() {
  if (canSend.value) {
    emit('send')
  }
}
</script>

<template>
  <div class="simple-input-wrapper">
    <div class="input-container">
      <input
        ref="inputRef"
        type="text"
        class="text-input"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="updateValue"
        @keydown="handleKeydown"
      />

      <button
        type="button"
        class="send-btn"
        :class="{ active: canSend }"
        :disabled="!canSend"
        aria-label="Send message"
        @click="handleSend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$primary-blue: #3B5EFF;
$border-color: #E5E7EB;
$text-color: #1F2937;
$placeholder-color: #9CA3AF;
$icon-color: #6B7280;

.simple-input-wrapper {
  padding: 12px 16px 16px;
  background: #fff;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: 1px solid $border-color;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: $primary-blue;
  }
}

.text-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: $text-color;
  background: transparent;
  min-width: 0;

  &::placeholder {
    color: $placeholder-color;
  }

  &:disabled {
    opacity: 0.5;
  }
}

.mic-btn,
.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: $icon-color;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
    color: darken($icon-color, 20%);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.send-btn {
  &.active {
    color: $primary-blue;

    &:hover:not(:disabled) {
      background: rgba($primary-blue, 0.1);
    }
  }
}
</style>
