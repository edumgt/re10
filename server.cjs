// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  ws.on("message", (message) => {
    // 받은 메시지를 모든 다른 클라이언트에게 전송
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

console.log("🚀 WebSocket signaling server running on ws://localhost:3001");
