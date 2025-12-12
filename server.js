const WebSocket = require('ws');
const http = require('http');
const express = require('express'); // For serving static files
const app = express();
app.use(express.static('public')); // Serve frontend files from 'public' folder

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {}; // { username: { ws, room } }
let rooms = {}; // { roomName: [usernames] }
let usernames = new Set(); // Track unique usernames

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.type === 'join') {
      const { username, room } = data;
      if (usernames.has(username)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Username already taken.' }));
        return;
      }
      usernames.add(username);
      users[username] = { ws, room };
      if (!rooms[room]) rooms[room] = [];
      rooms[room].push(username);
      
      // Notify others in the room
      broadcastToRoom(room, { type: 'userJoined', username });
      ws.send(JSON.stringify({ type: 'joined', room, users: rooms[room] }));
    } else if (data.type === 'message') {
      const { username, room, text } = data;
      if (!text.trim()) return; // Ignore empty messages
      const timestamp = new Date().toLocaleTimeString();
      broadcastToRoom(room, { type: 'message', username, text, timestamp });
    } else if (data.type === 'createRoom') {
      const { roomName } = data;
      if (!rooms[roomName]) {
        rooms[roomName] = [];
        broadcastAll({ type: 'roomList', rooms: Object.keys(rooms) });
      }
    } else if (data.type === 'leave') {
      const { username } = data;
      const room = users[username]?.room;
      if (room) {
        rooms[room] = rooms[room].filter(u => u !== username);
        delete users[username];
        usernames.delete(username);
        broadcastToRoom(room, { type: 'userLeft', username });
        broadcastAll({ type: 'roomList', rooms: Object.keys(rooms) });
      }
    }
  });

  ws.on('close', () => {
    // Handle disconnection
    for (const [username, info] of Object.entries(users)) {
      if (info.ws === ws) {
        const room = info.room;
        rooms[room] = rooms[room].filter(u => u !== username);
        delete users[username];
        usernames.delete(username);
        broadcastToRoom(room, { type: 'userLeft', username });
        broadcastAll({ type: 'roomList', rooms: Object.keys(rooms) });
        break;
      }
    }
  });
});

function broadcastToRoom(room, data) {
  if (rooms[room]) {
    rooms[room].forEach(username => {
      users[username]?.ws.send(JSON.stringify(data));
    });
  }
}

function broadcastAll(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Send initial room list to new connections
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'roomList', rooms: Object.keys(rooms) }));
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});