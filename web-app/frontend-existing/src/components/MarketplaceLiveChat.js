import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { VideoCameraIcon, PhoneIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Video, Mic, MicOff, VideoOff, Phone, MessageCircle } from 'lucide-react';

const Container = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.large};
  z-index: 1000;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
`;

const VideoContainer = styled.div`
  position: relative;
  background: #000;
  height: 300px;
  
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const LocalVideo = styled.video`
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 120px;
  height: 90px;
  border-radius: 8px;
  border: 2px solid white;
  object-fit: cover;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: ${props => props.theme.colors.background};
`;

const ControlButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: ${props => props.danger ? '#ff4444' : props.theme.colors.hover};
  color: ${props => props.danger ? 'white' : props.theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    opacity: 0.8;
  }
`;

const ChatArea = styled.div`
  height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: ${props => props.theme.colors.background};
`;

const Message = styled.div`
  margin-bottom: 12px;
  
  &.own {
    text-align: right;
  }
  
  .bubble {
    display: inline-block;
    padding: 8px 12px;
    border-radius: 12px;
    background: ${props => props.own ? props.theme.colors.primary : props.theme.colors.surface};
    color: ${props => props.own ? 'white' : props.theme.colors.text};
    max-width: 70%;
  }
`;

const InputArea = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const Input = styled.input`
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
`;

const ProductInfo = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  img {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const MarketplaceLiveChat = ({ product, seller, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, text: `Hi! I'm interested in ${product.title}`, own: true },
    { id: 2, text: 'Hello! Sure, what would you like to know?', own: false }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsVideoCall(true);
      setActiveTab('video');
      
      // WebRTC setup would go here
      console.log('Video call started');
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  };

  const endCall = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsVideoCall(false);
    setActiveTab('chat');
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: newMessage,
        own: true
      }]);
      setNewMessage('');
    }
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Header>
        <UserInfo>
          <img src={seller.avatar} alt={seller.name} />
          <div>
            <div style={{ fontWeight: '600' }}>{seller.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Online</div>
          </div>
        </UserInfo>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <XMarkIcon style={{ width: '24px', height: '24px' }} />
        </button>
      </Header>

      <ProductInfo>
        <img src={product.image} alt={product.title} />
        <div>
          <div style={{ fontWeight: '600' }}>{product.title}</div>
          <div style={{ color: '#1877f2', fontWeight: '700' }}>${product.price}</div>
        </div>
      </ProductInfo>

      <TabBar>
        <Tab active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          <MessageCircle size={16} />
          Chat
        </Tab>
        <Tab active={activeTab === 'video'} onClick={startVideoCall}>
          <Video size={16} />
          Video Call
        </Tab>
      </TabBar>

      {activeTab === 'video' && isVideoCall ? (
        <>
          <VideoContainer>
            <video ref={remoteVideoRef} autoPlay playsInline />
            <LocalVideo ref={localVideoRef} autoPlay muted playsInline />
          </VideoContainer>
          
          <Controls>
            <ControlButton onClick={toggleAudio}>
              {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </ControlButton>
            
            <ControlButton onClick={toggleVideo}>
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </ControlButton>
            
            <ControlButton danger onClick={endCall}>
              <Phone size={20} />
            </ControlButton>
          </Controls>
        </>
      ) : (
        <>
          <ChatArea>
            {messages.map(msg => (
              <Message key={msg.id} className={msg.own ? 'own' : ''} own={msg.own}>
                <div className="bubble">{msg.text}</div>
              </Message>
            ))}
          </ChatArea>

          <InputArea>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <SendButton onClick={sendMessage}>Send</SendButton>
          </InputArea>
        </>
      )}
    </Container>
  );
};

export default MarketplaceLiveChat;