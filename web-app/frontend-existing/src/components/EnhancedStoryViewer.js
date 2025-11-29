import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  PaperAirplaneIcon,
  EllipsisHorizontalIcon,
  MusicalNoteIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const EnhancedStoryViewer = ({ storiesGroup, initialIndex = 0, onClose }) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [showInteractive, setShowInteractive] = useState(false);
  const [interactiveResponse, setInteractiveResponse] = useState('');
  const [pollSelection, setPollSelection] = useState(null);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const stories = storiesGroup.stories || [];
  const currentStory = stories[currentStoryIndex];
  const duration = currentStory?.duration ? currentStory.duration * 1000 : 5000;

  useEffect(() => {
    if (!isPaused && currentStory) {
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
  }, [currentStoryIndex, isPaused, duration]);

  useEffect(() => {
    if (currentStory) {
      markAsViewed();
      setLiked(currentStory.likes?.includes(localStorage.getItem('userId')));
      setLikesCount(currentStory.likes?.length || 0);
      setShowInteractive(!!currentStory.interactive);
    }
  }, [currentStoryIndex]);

  const markAsViewed = async () => {
    try {
      await axios.post(`/api/stories/${currentStory._id}/view`);
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
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
    try {
      const response = await axios.post(`/api/stories/${currentStory._id}/like`);
      setLiked(response.data.liked);
      setLikesCount(response.data.likesCount);
    } catch (error) {
      console.error('Error liking story:', error);
    }
  };

  const handleReply = async () => {
    try {
      await axios.post(`/api/stories/${currentStory._id}/reply`, {
        message: reply
      });
      setReply('');
      setShowReply(false);
      alert('Reply sent!');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleShare = async () => {
    try {
      await axios.post(`/api/stories/${currentStory._id}/share`);
      alert('Story shared!');
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  const handleInteractiveResponse = async () => {
    try {
      const responseData = currentStory.interactive.type === 'poll' 
        ? pollSelection 
        : interactiveResponse;

      await axios.post(`/api/stories/${currentStory._id}/respond`, {
        response: responseData
      });
      setShowInteractive(false);
      alert('Response submitted!');
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  };

  const renderInteractiveElement = () => {
    if (!currentStory.interactive) return null;

    const { type, data } = currentStory.interactive;

    switch (type) {
      case 'poll':
        return (
          <InteractivePoll>
            <PollQuestion>{data.question}</PollQuestion>
            {data.options.map((option, index) => (
              <PollOption
                key={index}
                selected={pollSelection === index}
                onClick={() => setPollSelection(index)}
              >
                {option}
              </PollOption>
            ))}
            <SubmitButton onClick={handleInteractiveResponse}>
              Submit Vote
            </SubmitButton>
          </InteractivePoll>
        );

      case 'question':
        return (
          <InteractiveQuestion>
            <QuestionText>{data.question}</QuestionText>
            <QuestionInput
              placeholder="Type your answer..."
              value={interactiveResponse}
              onChange={(e) => setInteractiveResponse(e.target.value)}
            />
            <SubmitButton onClick={handleInteractiveResponse}>
              Send
            </SubmitButton>
          </InteractiveQuestion>
        );

      case 'quiz':
        return (
          <InteractiveQuiz>
            <QuizQuestion>{data.question}</QuizQuestion>
            {data.options.map((option, index) => (
              <QuizOption
                key={index}
                selected={pollSelection === index}
                onClick={() => setPollSelection(index)}
              >
                {option}
              </QuizOption>
            ))}
            <SubmitButton onClick={handleInteractiveResponse}>
              Submit Answer
            </SubmitButton>
          </InteractiveQuiz>
        );

      case 'slider':
        return (
          <InteractiveSlider>
            <SliderQuestion>{data.question}</SliderQuestion>
            <SliderInput
              type="range"
              min={data.min}
              max={data.max}
              value={interactiveResponse}
              onChange={(e) => setInteractiveResponse(e.target.value)}
            />
            <SliderValue>{interactiveResponse || data.min}</SliderValue>
            <SubmitButton onClick={handleInteractiveResponse}>
              Submit
            </SubmitButton>
          </InteractiveSlider>
        );

      case 'countdown':
        return (
          <InteractiveCountdown>
            <CountdownText>
              {new Date(data.targetDate).toLocaleString()}
            </CountdownText>
          </InteractiveCountdown>
        );

      case 'link':
        return (
          <InteractiveLink href={data.url} target="_blank" rel="noopener noreferrer">
            <LinkIcon>🔗</LinkIcon>
            <LinkText>{data.text || 'Open Link'}</LinkText>
          </InteractiveLink>
        );

      default:
        return null;
    }
  };

  if (!currentStory) return null;

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
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
            <div>
              <Username>
                {currentStory.author.username}
                {currentStory.author.isVerified && <VerifiedBadge>✓</VerifiedBadge>}
              </Username>
              <Time>{new Date(currentStory.createdAt).toLocaleTimeString()}</Time>
            </div>
          </UserInfo>
          <HeaderActions>
            <IconButton onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? '▶️' : '⏸️'}
            </IconButton>
            <IconButton onClick={onClose}>
              <XMarkIcon style={{ width: 24, height: 24 }} />
            </IconButton>
          </HeaderActions>
        </Header>

        <MediaContainer 
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <ClickArea left onClick={prevStory} />
          <ClickArea onClick={nextStory} />
          
          <MediaWrapper 
            style={{
              backgroundColor: currentStory.backgroundColor || 'transparent',
              filter: currentStory.filter || 'none'
            }}
          >
            {currentStory.media?.url && (
              <>
                {currentStory.media.type === 'image' ? (
                  <Media src={currentStory.media.url} alt="" />
                ) : (
                  <Video src={currentStory.media.url} autoPlay muted loop />
                )}
              </>
            )}

            {currentStory.text && (
              <TextOverlay
                color={currentStory.textColor}
                alignment={currentStory.textAlignment}
                fontSize={currentStory.fontSize}
              >
                {currentStory.text}
              </TextOverlay>
            )}

            {currentStory.stickers?.map((sticker, index) => (
              <StickerElement
                key={index}
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`
                }}
              >
                {sticker.emoji}
              </StickerElement>
            ))}
          </MediaWrapper>

          {showInteractive && (
            <InteractiveContainer>
              {renderInteractiveElement()}
            </InteractiveContainer>
          )}

          {currentStory.music && (
            <MusicIndicator>
              <MusicalNoteIcon style={{ width: 16, height: 16 }} />
              <span>{currentStory.music.name} - {currentStory.music.artist}</span>
            </MusicIndicator>
          )}
        </MediaContainer>

        <Actions>
          <ActionColumn>
            <ActionBtn onClick={handleLike}>
              {liked ? (
                <HeartSolidIcon style={{ width: 32, height: 32, color: '#ff4458' }} />
              ) : (
                <HeartIcon style={{ width: 32, height: 32 }} />
              )}
            </ActionBtn>
            {likesCount > 0 && <ActionCount>{likesCount}</ActionCount>}
          </ActionColumn>
          
          <ActionColumn>
            <ActionBtn onClick={() => setShowReply(!showReply)}>
              💬
            </ActionBtn>
          </ActionColumn>
          
          <ActionColumn>
            <ActionBtn onClick={handleShare}>
              <PaperAirplaneIcon style={{ width: 28, height: 28 }} />
            </ActionBtn>
          </ActionColumn>
          
          <ActionColumn>
            <ActionBtn onClick={() => setShowViewers(!showViewers)}>
              👁️
            </ActionBtn>
            <ActionCount onClick={() => setShowViewers(!showViewers)}>
              {currentStory.views?.length || 0}
            </ActionCount>
          </ActionColumn>
        </Actions>

        <AnimatePresence>
          {showReply && (
            <ReplyBox
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <ReplyInput 
                placeholder="Send message..." 
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleReply()}
              />
              <SendBtn onClick={handleReply}>Send</SendBtn>
            </ReplyBox>
          )}

          {showViewers && (
            <ViewersPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <PanelTitle>
                Viewers ({currentStory.views?.length || 0})
              </PanelTitle>
              <ViewersList>
                {currentStory.views?.map((view, index) => (
                  <ViewerItem key={index}>
                    <ViewerAvatar src={view.user?.avatar || '/default-avatar.png'} />
                    <ViewerName>{view.user?.username}</ViewerName>
                    <ViewerTime>
                      {new Date(view.timestamp).toLocaleTimeString()}
                    </ViewerTime>
                  </ViewerItem>
                ))}
              </ViewersList>
            </ViewersPanel>
          )}
        </AnimatePresence>
      </Content>
    </Container>
  );
};

const Container = styled(motion.div)`
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
  gap: 12px;
  cursor: pointer;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid white;
  object-fit: cover;
`;

const Username = styled.div`
  color: white;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VerifiedBadge = styled.span`
  background: #1877f2;
  color: white;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Time = styled.div`
  color: rgba(255,255,255,0.7);
  font-size: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const MediaWrapper = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

const TextOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: ${props => props.alignment};
  padding: 60px 40px;
  color: ${props => props.color};
  font-size: ${props => props.fontSize}px;
  font-weight: 700;
  text-align: ${props => props.alignment};
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);
  white-space: pre-wrap;
  word-break: break-word;
  z-index: 2;
`;

const StickerElement = styled.div`
  position: absolute;
  font-size: 48px;
  pointer-events: none;
  z-index: 3;
`;

const InteractiveContainer = styled.div`
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  z-index: 10;
`;

const InteractivePoll = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px);
`;

const PollQuestion = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
`;

const PollOption = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? '#1877f2' : '#ddd'};
  background: ${props => props.selected ? '#e7f3ff' : 'white'};
  color: #333;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1877f2;
  }
`;

const InteractiveQuestion = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px);
`;

const QuestionText = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
`;

const QuestionInput = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 12px;
  font-size: 14px;
`;

const InteractiveQuiz = styled(InteractivePoll)``;
const QuizQuestion = styled(PollQuestion)``;
const QuizOption = styled(PollOption)``;

const InteractiveSlider = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px);
`;

const SliderQuestion = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
`;

const SliderInput = styled.input`
  width: 100%;
  margin-bottom: 8px;
`;

const SliderValue = styled.div`
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: #1877f2;
  margin-bottom: 12px;
`;

const InteractiveCountdown = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(20px);
`;

const CountdownText = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #333;
`;

const InteractiveLink = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 16px 20px;
  text-decoration: none;
  backdrop-filter: blur(20px);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

const LinkIcon = styled.span`
  font-size: 24px;
`;

const LinkText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #1877f2;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: #1877f2;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #166fe5;
  }
`;

const MusicIndicator = styled.div`
  position: absolute;
  top: 80px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 12px;
  backdrop-filter: blur(10px);
  z-index: 10;
  max-width: 70%;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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

const ActionColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
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
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.3);
    transform: scale(1.1);
  }
`;

const ActionCount = styled.div`
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const ReplyBox = styled(motion.div)`
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
  padding: 12px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
  color: white;
  backdrop-filter: blur(10px);
  
  &::placeholder { 
    color: rgba(255,255,255,0.7); 
  }
`;

const SendBtn = styled.button`
  padding: 12px 24px;
  border-radius: 24px;
  border: none;
  background: #1877f2;
  color: white;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: #166fe5;
  }
`;

const ViewersPanel = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 50vh;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px 16px 0 0;
  padding: 20px;
  z-index: 15;
`;

const PanelTitle = styled.h3`
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
`;

const ViewersList = styled.div`
  max-height: 40vh;
  overflow-y: auto;
`;

const ViewerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: white;
`;

const ViewerAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const ViewerName = styled.div`
  flex: 1;
  font-weight: 500;
`;

const ViewerTime = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
`;

export default EnhancedStoryViewer;
