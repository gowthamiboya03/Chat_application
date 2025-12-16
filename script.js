const ws = new WebSocket('ws://localhost:3000');
let currentRoom = null;
let username = null;

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'roomList') 
  {
    updateRoomList(data.rooms);
  } 
  else if (data.type === 'joined')
  {
    currentRoom = data.room;
    document.getElementById('auth').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    updateRoomList(Object.keys(data.rooms)); // Assuming rooms are sent
  } 
  else if (data.type === 'message') 
  {
    displayMessage(data.username, data.text, data.timestamp);
  } 
  else if (data.type === 'userJoined') 
  {
    displayMessage('System', `${data.username} joined the room.`, new Date().toLocaleTimeString());
  } 
  else if (data.type === 'userLeft') 
  {
    displayMessage('System', `${data.username} left the room.`, new Date().toLocaleTimeString());
  } 
  else if (data.type === 'error') 
  {
    alert(data.message);
  }
};

document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  if (!username) return alert('Enter a username.');
  ws.send(JSON.stringify({ type: 'join', username, room: 'general' })); // Default to 'general' room
};

document.getElementById('createRoomBtn').onclick = () => {
  const roomName = document.getElementById('newRoom').value.trim();
  if (!roomName) return;
  ws.send(JSON.stringify({ type: 'createRoom', roomName }));
  document.getElementById('newRoom').value = '';
};

document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('messageInput').onkeypress = (e) => {
  if (e.key === 'Enter') sendMessage();
};

function sendMessage() {
  const text = document.getElementById('messageInput').value.trim();
  if (!text || !currentRoom) return;
  ws.send(JSON.stringify({ type: 'message', username, room: currentRoom, text }));
  document.getElementById('messageInput').value = '';
}

function updateRoomList(rooms) {
  const list = document.getElementById('roomList');
  list.innerHTML = '';
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.textContent = room;
    li.onclick = () => joinRoom(room);
    list.appendChild(li);
  });
}

function joinRoom(room) {
  if (currentRoom) {
    ws.send(JSON.stringify({ type: 'leave', username }));
  }
  ws.send(JSON.stringify({ type: 'join', username, room }));
}

function displayMessage(username, text, timestamp) {
  const messages = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  
  // Basic formatting: bold (**text**), italics (*text*), links (http://...)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  
  msgDiv.innerHTML = `<span class="username">${username}:</span> ${text} <span class="timestamp">(${timestamp})</span>`;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight; // Auto-scroll
}

// Handle disconnection
ws.onclose = () => {
  alert('Disconnected from server.');
};