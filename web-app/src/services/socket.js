import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (userId) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    auth: {
      token: localStorage.getItem('token')
    }
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    socket.emit('authenticate', userId);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Message events
export const joinRoom = (roomId) => {
  socket?.emit('join-room', roomId);
};

export const sendMessage = (data) => {
  socket?.emit('send-message', data);
};

export const onReceiveMessage = (callback) => {
  socket?.on('receive-message', callback);
};

export const emitTyping = (roomId, userId) => {
  socket?.emit('typing', { room: roomId, userId });
};

export const onUserTyping = (callback) => {
  socket?.on('user-typing', callback);
};

// Call events
export const callUser = (data) => {
  socket?.emit('call-user', data);
};

export const acceptCall = (data) => {
  socket?.emit('accept-call', data);
};

export const rejectCall = (data) => {
  socket?.emit('reject-call', data);
};

export const onIncomingCall = (callback) => {
  socket?.on('incoming-call', callback);
};

export const onCallAccepted = (callback) => {
  socket?.on('call-accepted', callback);
};

export const onCallRejected = (callback) => {
  socket?.on('call-rejected', callback);
};

// Live streaming events
export const startStream = (data) => {
  socket?.emit('start-stream', data);
};

export const joinStream = (streamId) => {
  socket?.emit('join-stream', streamId);
};

export const sendStreamMessage = (data) => {
  socket?.emit('stream-message', data);
};

export const onStreamStarted = (callback) => {
  socket?.on('stream-started', callback);
};

export const onStreamChatMessage = (callback) => {
  socket?.on('stream-chat-message', callback);
};

// Notification events
export const onNotification = (callback) => {
  socket?.on('notification', callback);
};

// Online status events
export const onUserOnline = (callback) => {
  socket?.on('user-online', callback);
};

export const onUserOffline = (callback) => {
  socket?.on('user-offline', callback);
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  sendMessage,
  onReceiveMessage,
  emitTyping,
  onUserTyping,
  callUser,
  acceptCall,
  rejectCall,
  onIncomingCall,
  onCallAccepted,
  onCallRejected,
  startStream,
  joinStream,
  sendStreamMessage,
  onStreamStarted,
  onStreamChatMessage,
  onNotification,
  onUserOnline,
  onUserOffline
};
