import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: [],
  loading: false
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    markMessageAsRead: (state, action) => {
      const message = state.messages.find(m => m._id === action.payload);
      if (message) {
        message.isRead = true;
      }
    }
  }
});

export const { 
  setConversations, 
  setActiveConversation, 
  setMessages, 
  addMessage, 
  setOnlineUsers, 
  markMessageAsRead 
} = messagesSlice.actions;
export default messagesSlice.reducer;