import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  VideoCameraIcon, 
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  EyeIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { Settings, Monitor, Gift, Users } from 'lucide-react';

const StudioContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  height: 600px;
`;

const VideoContainer = styled.div`
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StreamOverlay = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const LiveBadge = styled.div`
  background: #ff4444;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const StreamStats = styled.div`
  display: flex;
  gap: 16px;
  color: white;
  font-size: 14px;
  font-weight: 600;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0,0,0,0.5);
  padding: 4px 8px;
  border-radius: 12px;
`;

const Controls = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
`;

const ControlButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: ${props => props.danger ? '#ff4444' : 'rgba(255,255,255,0.2)'};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: ${props => props.danger ? '#cc0000' : 'rgba(255,255,255,0.3)'};
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ChatPanel = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const ChatMessage = styled(motion.div)`
  margin-bottom: 12px;
  
  .username {
    font-weight: 600;
    color: ${props => props.theme.colors.primary};
    font-size: 12px;
  }
  
  .message {
    font-size: 14px;
    margin-top: 2px;
  }
`;

const ChatInput = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  gap: 8px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  outline: none;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  
  &:hover {
    background: #166fe5;
  }
`;

const ReactionOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const FloatingReaction = styled(motion.div)`
  position: absolute;
  font-size: 24px;
  pointer-events: none;
`;

const StreamSettings = styled.div`
  position: absolute;
  top: 60px;
  right: 16px;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 16px;
  box-shadow: ${props => props.theme.shadows.large};
  min-width: 200px;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  
  select {
    padding: 4px 8px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 4px;
    background: ${props => props.theme.colors.background};
  }
`;

const LiveStreamingStudio = () => {
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reactions, setReactions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [streamSettings, setStreamSettings] = useState({
    quality: '720p',
    audio: true,
    video: true
  });
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isLive) {
      // Simulate viewer count changes
      const interval = setInterval(() => {
        setViewers(prev => prev + Math.floor(Math.random() * 5) - 2);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: streamSettings.audio
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      streamRef.current = stream;
      setIsLive(true);
      setViewers(1);
      
      // Simulate initial chat messages
      setChatMessages([
        { id: 1, username: 'viewer1', message: 'Hello! 👋' },
        { id: 2, username: 'viewer2', message: 'Great stream!' }
      ]);
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsLive(false);
    setViewers(0);
    setChatMessages([]);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        username: 'You',
        message: newMessage
      };
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const addReaction = (emoji) => {
    const reaction = {
      id: Date.now(),
      emoji,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    };
    setReactions(prev => [...prev, reaction]);
    setLikes(prev => prev + 1);
    
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  return (
    <StudioContainer>
      <VideoContainer>
        <VideoElement ref={videoRef} autoPlay muted />
        
        {isLive && (
          <StreamOverlay>
            <LiveBadge>
              LIVE
            </LiveBadge>
            
            <StreamStats>
              <StatItem>
                <EyeIcon style={{ width: '16px', height: '16px' }} />
                {viewers}
              </StatItem>
              <StatItem>
                <HeartIcon style={{ width: '16px', height: '16px' }} />
                {likes}
              </StatItem>
            </StreamStats>
          </StreamOverlay>
        )}
        
        <Controls>
          <ControlButton onClick={() => setStreamSettings({...streamSettings, audio: !streamSettings.audio})}>
            <MicrophoneIcon />
          </ControlButton>
          
          <ControlButton onClick={() => setStreamSettings({...streamSettings, video: !streamSettings.video})}>
            <VideoCameraIcon />
          </ControlButton>
          
          {isLive ? (
            <ControlButton danger onClick={stopStream}>
              <StopIcon />
            </ControlButton>
          ) : (
            <ControlButton onClick={startStream}>
              <PlayIcon />
            </ControlButton>
          )}
          
          <ControlButton onClick={() => setShowSettings(!showSettings)}>
            <Settings size={24} />
          </ControlButton>
          
          <ControlButton>
            <ShareIcon />
          </ControlButton>
        </Controls>
        
        <ReactionOverlay>
          {reactions.map(reaction => (
            <FloatingReaction
              key={reaction.id}
              initial={{ opacity: 1, y: 0, x: `${reaction.x}%` }}
              animate={{ opacity: 0, y: -100 }}
              transition={{ duration: 3 }}
              style={{ left: `${reaction.x}%`, top: `${reaction.y}%` }}
            >
              {reaction.emoji}
            </FloatingReaction>
          ))}
        </ReactionOverlay>
        
        {showSettings && (
          <StreamSettings>
            <h4>Stream Settings</h4>
            <SettingItem>
              <span>Quality</span>
              <select 
                value={streamSettings.quality}
                onChange={(e) => setStreamSettings({...streamSettings, quality: e.target.value})}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </SettingItem>
          </StreamSettings>
        )}
      </VideoContainer>
      
      <ChatPanel>
        <ChatHeader>
          <h4>Live Chat</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => addReaction('❤️')}>❤️</button>
            <button onClick={() => addReaction('👍')}>👍</button>
            <button onClick={() => addReaction('😂')}>😂</button>
            <button onClick={() => addReaction('😮')}>😮</button>
          </div>
        </ChatHeader>
        
        <ChatMessages>
          {chatMessages.map(msg => (
            <ChatMessage
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="username">{msg.username}</div>
              <div className="message">{msg.message}</div>
            </ChatMessage>
          ))}
        </ChatMessages>
        
        <ChatInput>
          <MessageInput
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <SendButton onClick={sendMessage}>Send</SendButton>
        </ChatInput>
      </ChatPanel>
    </StudioContainer>
  );
};

export default LiveStreamingStudio;