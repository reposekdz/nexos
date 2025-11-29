import React, { useState } from 'react';
import styled from 'styled-components';
import { likePost, sharePost, addComment } from '../services/api';

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const Username = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
`;

const Timestamp = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const Content = styled.div`
  padding: 16px;
`;

const MediaContainer = styled.div`
  img, video {
    width: 100%;
    border-radius: 8px;
    margin-top: 12px;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
  
  &.liked {
    color: ${props => props.theme.colors.primary};
  }
`;

const PostCard = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    try {
      const response = await likePost(post._id);
      setLiked(response.liked);
      setLikesCount(response.likesCount);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = async () => {
    try {
      await sharePost(post._id);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  return (
    <Card>
      <Header>
        <Avatar src={post.author?.avatar || '/default-avatar.png'} alt={post.author?.fullName} />
        <UserInfo>
          <Username>{post.author?.fullName}</Username>
          <Timestamp>{new Date(post.createdAt).toLocaleDateString()}</Timestamp>
        </UserInfo>
      </Header>
      
      <Content>
        <p>{post.content}</p>
        <MediaContainer>
          {post.media?.map((media, index) => (
            media.type === 'video' ? (
              <video key={index} controls>
                <source src={media.url} type="video/mp4" />
              </video>
            ) : (
              <img key={index} src={media.url} alt="Post media" />
            )
          ))}
        </MediaContainer>
      </Content>
      
      <Actions>
        <ActionButton className={liked ? 'liked' : ''} onClick={handleLike}>
          ❤️ {likesCount}
        </ActionButton>
        <ActionButton onClick={() => setShowComments(!showComments)}>
          💬 {post.comments?.length || 0}
        </ActionButton>
        <ActionButton onClick={handleShare}>
          📤 Share
        </ActionButton>
      </Actions>
    </Card>
  );
};

export default PostCard;