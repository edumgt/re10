<template>
  <div class="p-6 flex flex-col space-y-4 bg-gray-100 min-h-screen">
    <!-- 방 참여 -->
    <div class="flex space-x-2 justify-center">
      <input v-model="roomId" placeholder="Room ID 입력"
             class="border px-2 py-1 rounded w-40"/>
      <button @click="joinRoom" class="px-4 py-2 bg-blue-500 text-white rounded">🚪 Join Room</button>
    </div>

    <!-- 화이트보드 -->
    <Whiteboard v-if="joined" :webrtc="webrtc" />

    <!-- 채팅 & 파일 -->
    <div class="flex space-x-6 justify-center" v-if="joined">
      <ChatBox :webrtc="webrtc" />
      <FileBox :webrtc="webrtc" />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import Whiteboard from "./components/Whiteboard.vue"
import ChatBox from "./components/ChatBox.vue"
import FileBox from "./components/FileBox.vue"
import useWebRTC from "./composables/useWebRTC"

const roomId = ref("")
const joined = ref(false)

const { joinRoom, webrtc } = useWebRTC(roomId, joined)
</script>
