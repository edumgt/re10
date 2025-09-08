const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3001 });

// 방 구조: { roomId: Set of sockets }
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    const { type, roomId, sender } = msg;

    if (type === "join-room") {
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);
      ws.roomId = roomId;
      ws.clientId = sender;
      console.log(`👥 Client ${sender} joined room ${roomId}`);

      // 같은 방의 기존 클라이언트에게 "새 피어 등장" 알림
      rooms.get(roomId).forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "new-peer",
            roomId,
            sender
          }));
        }
      });
      return;
    }

    // 같은 방의 다른 사용자에게 signaling 메시지 전달
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
      if (rooms.get(ws.roomId).size === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

console.log("🚀 Signaling server running ws://localhost:3001");
