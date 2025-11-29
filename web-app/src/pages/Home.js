import React, { useState } from 'react';
import styled from 'styled-components';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import StoriesBar from '../components/StoriesBar';
import { useQuery } from 'react-query';
import { getPosts } from '../services/api';

const HomeContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Home = () => {
  const { data: posts, isLoading } = useQuery('posts', getPosts);

  return (
    <HomeContainer>
      <StoriesBar />
      <CreatePost />
      {isLoading ? (
        <div>Loading posts...</div>
      ) : (
        posts?.map(post => (
          <PostCard key={post._id} post={post} />
        ))
      )}
    </HomeContainer>
  );
};

export default Home;