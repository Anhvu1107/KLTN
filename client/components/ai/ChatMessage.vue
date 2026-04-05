<script setup lang="ts">
/**
 * Chat Message Bubble
 * AURA ARCHIVE - Individual message display with markdown rendering
 */
import { marked } from 'marked'

marked.setOptions({ breaks: true })

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  appearance: {
    botBgColor: string
    botTextColor: string
    userBgColor: string
    userTextColor: string
  }
}>()

const { sanitize } = useSanitizeHtml()

const autoLinkPaths = (text: string): string => {
  return text.replace(/(?<!\]\()(?<!\()(\/shop\/[\w-]+)/g, '[Xem sản phẩm]($1)')
}

const renderedContent = computed(() => {
  const linked = autoLinkPaths(props.content)
  const raw = marked.parse(linked, { async: false }) as string
  return sanitize(raw)
})

const bubbleStyle = computed(() =>
  props.role === 'user'
    ? { backgroundColor: props.appearance.userBgColor, color: props.appearance.userTextColor }
    : { backgroundColor: props.appearance.botBgColor, color: props.appearance.botTextColor }
)
</script>

<template>
  <div class="flex" :class="role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] px-4 py-2 rounded-lg"
      :style="bubbleStyle"
    >
      <div class="text-body-sm chat-markdown" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<style scoped>
.chat-markdown :deep(p) {
  margin: 0 0 0.25rem 0;
  color: inherit !important;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(strong) {
  font-weight: 700;
  color: inherit !important;
}
.chat-markdown :deep(em) {
  font-style: italic;
}
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.125rem;
  color: inherit !important;
}
.chat-markdown :deep(a) {
  color: inherit;
  text-decoration: underline;
}
</style>
