// signaling-server.js
import { WebSocketServer } from "ws"

const wss = new WebSocketServer({ port: 3001 })

wss.on("connection", ws => {
  ws.on("message", message => {
    // 모든 클라이언트에게 브로드캐스트
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        client.send(message.toString())
      }
    })
  })
})

console.log("✅ Signaling server running on ws://localhost:3001")
