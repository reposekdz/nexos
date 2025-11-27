import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import InfiniteScroll from 'react-infinite-scroll-component';
import PostCard from './PostCard';
import AdCard from './AdCard';
import StoriesBar from './StoriesBar';
import CreatePost from './CreatePost';
import LiveVideoSection from './LiveVideoSection';

const FeedContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px;
  
  &::after {
    content: '';
    width: 20px;
    height: 20px;
    border: 2px solid ${props => props.theme.colors.border};
    border-top: 2px solid ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FeedPanel = () => {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMorePosts = async () => {
    try {
      // Simulate API call
      const newPosts = Array.from({ length: 5 }, (_, i) => ({
        id: posts.length + i + 1,
        type: Math.random() > 0.8 ? 'ad' : 'post',
        author: { name: `User ${posts.length + i + 1}`, avatar: '/avatar.jpg' },
        content: `This is post content ${posts.length + i + 1}`,
        media: Math.random() > 0.5 ? [{ type: 'image', url: '/post-image.jpg' }] : [],
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 10),
        timestamp: new Date()
      }));
      
      setPosts(prev => [...prev, ...newPosts]);
      setPage(prev => prev + 1);
      
      if (posts.length > 50) setHasMore(false);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  useEffect(() => {
    loadMorePosts();
  }, []);

  return (
    <FeedContainer>
      <StoriesBar />
      <CreatePost />
      <LiveVideoSection />
      
      <InfiniteScroll
        dataLength={posts.length}
        next={loadMorePosts}
        hasMore={hasMore}
        loader={<LoadingSpinner />}
        endMessage={<p style={{ textAlign: 'center', color: '#666' }}>No more posts to show</p>}
      >
        {posts.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {item.type === 'ad' ? (
              <AdCard ad={item} />
            ) : (
              <PostCard post={item} />
            )}
          </motion.div>
        ))}
      </InfiniteScroll>
    </FeedContainer>
  );
};

export default FeedPanel;