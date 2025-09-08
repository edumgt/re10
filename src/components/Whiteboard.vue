<template>
  <div class="flex justify-center">
    <canvas ref="board" width="600" height="400"
            class="border bg-white"
            @mousedown="startDraw"
            @mousemove="drawing"
            @mouseup="endDraw"
            @mouseleave="endDraw">
    </canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const props = defineProps({ webrtc: Object })
const board = ref(null)
let ctx, drawingFlag = false

onMounted(() => {
  ctx = board.value.getContext("2d")
  ctx.lineWidth = 2
  ctx.strokeStyle = "black"

  // 원격 드로잉 이벤트 적용
  props.webrtc.onDraw((data) => {
    if (data.type === "start") {
      ctx.beginPath()
      ctx.moveTo(data.x, data.y)
    } else if (data.type === "draw") {
      ctx.lineTo(data.x, data.y)
      ctx.stroke()
    } else if (data.type === "end") {
      ctx.closePath()
    }
  })
})

function startDraw(e) {
  drawingFlag = true
  ctx.beginPath()
  ctx.moveTo(e.offsetX, e.offsetY)
  props.webrtc.broadcastDraw({ type: "start", x: e.offsetX, y: e.offsetY })
}
function drawing(e) {
  if (!drawingFlag) return
  ctx.lineTo(e.offsetX, e.offsetY)
  ctx.stroke()
  props.webrtc.broadcastDraw({ type: "draw", x: e.offsetX, y: e.offsetY })
}
function endDraw() {
  if (!drawingFlag) return
  drawingFlag = false
  props.webrtc.broadcastDraw({ type: "end" })
}
</script>
