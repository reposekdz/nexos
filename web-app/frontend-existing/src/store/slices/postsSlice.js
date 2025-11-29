import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  posts: [],
  loading: false,
  hasMore: true
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setPosts: (state, action) => {
      state.posts = action.payload;
    },
    addPost: (state, action) => {
      state.posts.unshift(action.payload);
    },
    updatePost: (state, action) => {
      const index = state.posts.findIndex(post => post._id === action.payload._id);
      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
    deletePost: (state, action) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    likePost: (state, action) => {
      const { postId, liked, likesCount } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post) {
        post.isLiked = liked;
        post.likesCount = likesCount;
      }
    }
  }
});

export const { setLoading, setPosts, addPost, updatePost, deletePost, likePost } = postsSlice.actions;
export default postsSlice.reducer;