import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Posts API
export const getPosts = async () => {
  const response = await api.get('/posts/feed');
  return response.data;
};

export const createPost = async (postData) => {
  const response = await api.post('/posts', postData);
  return response.data;
};

export const likePost = async (postId) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

export const sharePost = async (postId) => {
  const response = await api.post(`/posts/${postId}/share`);
  return response.data;
};

export const addComment = async (postId, text) => {
  const response = await api.post(`/posts/${postId}/comment`, { text });
  return response.data;
};

// Stories API
export const getStories = async () => {
  const response = await api.get('/stories');
  return response.data;
};

export const createStory = async (storyData) => {
  const response = await api.post('/stories', storyData);
  return response.data;
};

// Reels API
export const getReels = async () => {
  const response = await api.get('/reels');
  return response.data;
};

export const createReel = async (reelData) => {
  const response = await api.post('/reels', reelData);
  return response.data;
};

// Messages API
export const getMessages = async (userId) => {
  const response = await api.get(`/messages/${userId}`);
  return response.data;
};

export const sendMessage = async (messageData) => {
  const response = await api.post('/messages', messageData);
  return response.data;
};

// Groups API
export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/groups', groupData);
  return response.data;
};

// Marketplace API
export const getMarketplaceItems = async () => {
  const response = await api.get('/marketplace');
  return response.data;
};

export const createMarketplaceItem = async (itemData) => {
  const response = await api.post('/marketplace', itemData);
  return response.data;
};

export default api;