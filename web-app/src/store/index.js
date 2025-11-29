import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import postReducer from './slices/postSlice';
import messageReducer from './slices/messageSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    posts: postReducer,
    messages: messageReducer,
    notifications: notificationReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/connect', 'socket/disconnect'],
        ignoredPaths: ['socket.instance']
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;
