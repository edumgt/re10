<template>
  <div class="p-6 flex flex-col space-y-4 bg-gray-100 min-h-screen">
    <!-- 버튼 -->
    <div class="flex justify-center space-x-2">
      <button @click="startCall" class="px-4 py-2 bg-blue-500 text-white rounded">📞 Connect</button>
      <button @click="hangup" class="px-4 py-2 bg-red-500 text-white rounded">❌ Hangup</button>
    </div>

    <div class="flex space-x-6 justify-center">
      <!-- 채팅 -->
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

      <!-- 파일 전송 -->
      <div class="border p-3 rounded w-96 bg-white shadow">
        <h3 class="font-bold mb-2">📂 File Transfer</h3>
        <input type="file" @change="sendFile" class="mb-2"/>
        <ul>
          <li v-for="(file, i) in receivedFiles" :key="i">
            <a :href="file.url" :download="file.name" class="text-blue-600 underline">
              {{ file.name }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"

let pc, ws, chatChannel, fileChannel
const clientId = Math.random().toString(36).substring(2, 10)

// 상태 관리
const chatBox = ref(null)
const messages = ref([])
const chatInput = ref("")
const receivedFiles = ref([])

onMounted(() => {
  initWebSocket()
})

onBeforeUnmount(() => {
  if (ws) ws.close()
  hangup()
})

function initWebSocket() {
  ws = new WebSocket("ws://localhost:3001")

  ws.onopen = () => console.log("✅ WebSocket Connected")

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    if (!pc || data.sender === clientId) return

    try {
      if (data.type === "offer") {
        await pc.setRemoteDescription(data)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        ws.send(JSON.stringify({ ...answer, sender: clientId }))
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(data)
      } else if (data.type === "candidate" && data.candidate) {
        await pc.addIceCandidate(data.candidate)
      }
    } catch (err) {
      console.error("❌ signaling error:", err)
    }
  }
}

async function startCall() {
  pc = new RTCPeerConnection()

  // DataChannel 생성 (Caller)
  chatChannel = pc.createDataChannel("chat")
  fileChannel = pc.createDataChannel("file")

  setupChatChannel(chatChannel)
  setupFileChannel(fileChannel)

  // DataChannel 수신 (Callee)
  pc.ondatachannel = (event) => {
    if (event.channel.label === "chat") {
      chatChannel = event.channel
      setupChatChannel(chatChannel)
    }
    if (event.channel.label === "file") {
      fileChannel = event.channel
      setupFileChannel(fileChannel)
    }
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: "candidate", candidate: event.candidate, sender: clientId }))
    }
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  ws.send(JSON.stringify({ ...offer, sender: clientId }))
}

function setupChatChannel(channel) {
  channel.onopen = () => console.log("✅ Chat channel open")
  channel.onmessage = (e) => {
    messages.value.push(`상대방: ${e.data}`)
    setTimeout(() => {
      chatBox.value.scrollTop = chatBox.value.scrollHeight
    })
  }
}

function setupFileChannel(channel) {
  let receivedBuffer = []
  let fileName = ""

  channel.onmessage = (event) => {
    if (typeof event.data === "string") {
      fileName = event.data
    } else {
      receivedBuffer.push(event.data)
      const file = new Blob(receivedBuffer)
      const url = URL.createObjectURL(file)
      receivedFiles.value.push({ name: fileName, url })
      receivedBuffer = []
    }
  }
}

function sendChat() {
  if (chatInput.value && chatChannel?.readyState === "open") {
    chatChannel.send(chatInput.value)
    messages.value.push(`나: ${chatInput.value}`)
    chatInput.value = ""
  }
}

function sendFile(event) {
  const file = event.target.files[0]
  if (!file || !fileChannel) return
  fileChannel.send(file.name)
  file.arrayBuffer().then(buffer => {
    fileChannel.send(buffer)
  })
}

function hangup() {
  if (pc) {
    pc.close()
    pc = null
  }
}
</script>
