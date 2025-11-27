import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const StoryViewer = ({ stories, initialIndex = 0, onClose }) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState('');
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const currentStory = stories[currentStoryIndex];
  const duration = currentStory?.media?.type === 'video' ? 15000 : 5000;

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            nextStory();
            return 0;
          }
          return prev + (100 / (duration / 100));
        });
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [currentStoryIndex, isPaused]);

  useEffect(() => {
    markAsViewed();
  }, [currentStoryIndex]);

  const markAsViewed = async () => {
    await axios.post(`/api/stories/${currentStory._id}/view`);
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleLike = async () => {
    await axios.post(`/api/interactions/stories/${currentStory._id}/like`);
  };

  const handleReply = async () => {
    await axios.post(`/api/messages`, {
      recipient: currentStory.author._id,
      content: reply,
      replyToStory: currentStory._id
    });
    setReply('');
    setShowReply(false);
  };

  const handleShare = async () => {
    await axios.post(`/api/interactions/stories/${currentStory._id}/share`);
    alert('Story shared!');
  };

  return (
    <Container onClick={onClose}>
      <Content onClick={e => e.stopPropagation()}>
        <ProgressBar>
          {stories.map((_, i) => (
            <Progress key={i}>
              <ProgressFill 
                width={i === currentStoryIndex ? progress : i < currentStoryIndex ? 100 : 0} 
              />
            </Progress>
          ))}
        </ProgressBar>

        <Header>
          <UserInfo onClick={() => navigate(`/profile/${currentStory.author._id}`)}>
            <Avatar src={currentStory.author.avatar || '/default-avatar.png'} />
            <Username>{currentStory.author.username}</Username>
            <Time>{new Date(currentStory.createdAt).toLocaleTimeString()}</Time>
          </UserInfo>
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </Header>

        <MediaContainer 
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <ClickArea left onClick={prevStory} />
          <ClickArea onClick={nextStory} />
          
          {currentStory.media?.type === 'image' ? (
            <Media src={currentStory.media.url} alt="" />
          ) : (
            <Video src={currentStory.media?.url} autoPlay muted loop />
          )}
        </MediaContainer>

        <Actions>
          <ActionBtn onClick={handleLike}>❤️</ActionBtn>
          <ActionBtn onClick={() => setShowReply(!showReply)}>💬</ActionBtn>
          <ActionBtn onClick={handleShare}>📤</ActionBtn>
        </Actions>

        {showReply && (
          <ReplyBox>
            <ReplyInput 
              placeholder="Send message..." 
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleReply()}
            />
            <SendBtn onClick={handleReply}>Send</SendBtn>
          </ReplyBox>
        )}

        <ViewCount>{currentStory.views?.length || 0} views</ViewCount>
      </Content>
    </Container>
  );
};

const Container = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Content = styled.div`
  width: 100%;
  max-width: 500px;
  height: 100vh;
  position: relative;
  background: #000;
`;

const ProgressBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
`;

const Progress = styled.div`
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: white;
  width: ${props => props.width}%;
  transition: width 0.1s linear;
`;

const Header = styled.div`
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  z-index: 10;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid white;
`;

const Username = styled.span`
  color: white;
  font-weight: 600;
`;

const Time = styled.span`
  color: rgba(255,255,255,0.7);
  font-size: 14px;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
`;

const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
`;

const ClickArea = styled.div`
  flex: 1;
  cursor: pointer;
  z-index: 5;
  ${props => props.left && 'order: -1;'}
`;

const Media = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const Video = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const Actions = styled.div`
  position: absolute;
  bottom: 100px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
`;

const ActionBtn = styled.button`
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  font-size: 24px;
  cursor: pointer;
  backdrop-filter: blur(10px);
`;

const ReplyBox = styled.div`
  position: absolute;
  bottom: 20px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 10px;
  z-index: 10;
`;

const ReplyInput = styled.input`
  flex: 1;
  padding: 12px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
  color: white;
  backdrop-filter: blur(10px);
  &::placeholder { color: rgba(255,255,255,0.7); }
`;

const SendBtn = styled.button`
  padding: 12px 24px;
  border-radius: 24px;
  border: none;
  background: #1877f2;
  color: white;
  font-weight: 600;
  cursor: pointer;
`;

const ViewCount = styled.div`
  position: absolute;
  bottom: 20px;
  left: 16px;
  color: white;
  font-size: 14px;
  z-index: 10;
`;

export default StoryViewer;
