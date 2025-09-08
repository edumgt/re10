<template>
  <div class="border p-3 rounded w-96 bg-white shadow">
    <h3 class="font-bold mb-2">💬 Chat</h3>
    <div class="h-40 overflow-y-auto border p-2 mb-2 bg-gray-50" ref="chatBox">
      <div v-for="(msg, i) in messages" :key="i" class="text-sm">
        {{ msg }}
      </div>
    </div>
    <input v-model="chatInput" @keyup.enter="sendChat"
           placeholder="메시지 입력"
           class="border px-2 py-1 w-full rounded" />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue"

const props = defineProps({ webrtc: Object })
const chatBox = ref(null)
const messages = ref([])
const chatInput = ref("")

onMounted(() => {
  props.webrtc.onChat((msg) => {
    messages.value.push(`상대방: ${msg}`)
    nextTick(() => {
      if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
    })
  })
})

function sendChat() {
  if (!chatInput.value) return
  messages.value.push(`나: ${chatInput.value}`)
  props.webrtc.sendChat(chatInput.value)
  chatInput.value = ""
}
</script>
