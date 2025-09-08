<template>
  <div class="p-6 flex flex-col space-y-4 bg-gray-100 min-h-screen">
    <!-- 방 참여 -->
    <div class="flex space-x-2 justify-center">
      <input v-model="roomId" placeholder="Room ID 입력"
             class="border px-2 py-1 rounded w-40"/>
      <button @click="joinRoom" class="px-4 py-2 bg-blue-500 text-white rounded">🚪 Join Room</button>
    </div>

    <!-- 채팅 & 파일 -->
    <div class="flex space-x-6 justify-center" v-if="joined">
      <!-- 채팅 -->
      <div class="border p-3 rounded w-96 bg-white shadow">
        <h3 class="font-bold mb-2">💬 Chat (Room: {{ roomId }})</h3>
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
import { ref } from "vue"

let ws
let peers = new Map()   // { clientId: RTCPeerConnection }
let chatChannels = new Map()
let fileChannels = new Map()

const clientId = Math.random().toString(36).substring(2, 10)
const roomId = ref("")
const joined = ref(false)

const chatBox = ref(null)
const messages = ref([])
const chatInput = ref("")
const receivedFiles = ref([])

function joinRoom() {
  ws = new WebSocket("ws://localhost:3001")

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join-room", roomId: roomId.value, sender: clientId }))
    joined.value = true
    console.log(`✅ Joined room ${roomId.value}`)
  }

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    if (data.sender === clientId) return

    if (data.type === "new-peer") {
      console.log("새 피어 발견:", data.sender)
      connectToPeer(data.sender) // 오퍼 보내기
    } else if (data.type === "offer") {
      const pc = createPeer(data.sender)
      await pc.setRemoteDescription(data)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      ws.send(JSON.stringify({ ...answer, type: "answer", roomId: roomId.value, sender: clientId }))
    } else if (data.type === "answer") {
      await peers.get(data.sender)?.setRemoteDescription(data)
    } else if (data.type === "candidate" && data.candidate) {
      await peers.get(data.sender)?.addIceCandidate(data.candidate)
    }
  }
}

function createPeer(remoteId) {
  const pc = new RTCPeerConnection()
  peers.set(remoteId, pc)

  // 채널 수신
  pc.ondatachannel = (event) => {
    if (event.channel.label === "chat") {
      chatChannels.set(remoteId, event.channel)
      setupChatChannel(event.channel)
    } else if (event.channel.label === "file") {
      fileChannels.set(remoteId, event.channel)
      setupFileChannel(event.channel)
    }
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "candidate",
        candidate: event.candidate,
        roomId: roomId.value,
        sender: clientId
      }))
    }
  }

  return pc
}

async function connectToPeer(remoteId) {
  const pc = createPeer(remoteId)
  const chatChannel = pc.createDataChannel("chat")
  const fileChannel = pc.createDataChannel("file")

  chatChannels.set(remoteId, chatChannel)
  fileChannels.set(remoteId, fileChannel)

  setupChatChannel(chatChannel)
  setupFileChannel(fileChannel)

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  ws.send(JSON.stringify({ ...offer, type: "offer", roomId: roomId.value, sender: clientId }))
}

function setupChatChannel(channel) {
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
  if (!chatInput.value) return
  messages.value.push(`나: ${chatInput.value}`)
  chatChannels.forEach((ch) => {
    if (ch.readyState === "open") ch.send(chatInput.value)
  })
  chatInput.value = ""
}

function sendFile(event) {
  const file = event.target.files[0]
  if (!file) return
  fileChannels.forEach((ch) => {
    if (ch.readyState === "open") {
      ch.send(file.name)
      file.arrayBuffer().then(buffer => ch.send(buffer))
    }
  })
}
</script>
