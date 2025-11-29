import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import postsSlice from './slices/postsSlice';
import messagesSlice from './slices/messagesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    posts: postsSlice,
    messages: messagesSlice
  }
});