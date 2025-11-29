import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon,
  PhotoIcon,
  FaceSmileIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { MoreVertical, Smile, Paperclip } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const Container = styled.div`
  display: flex;
  height: calc(100vh - 60px);
  background: ${props => props.theme.colors.background};
`;

const Sidebar = styled.div`
  width: 320px;
  background: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  background: ${props => props.theme.colors.background};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  
  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const ConversationsList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ConversationItem = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary + '10' : 'transparent'};
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

const Avatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
`;

const ConversationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.h4`
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
`;

const LastMessage = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OnlineIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.theme.colors.success};
  border: 2px solid white;
  position: absolute;
  bottom: 2px;
  right: 2px;
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ChatUserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ChatActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme.colors.hover};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.border};
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: ${props => props.theme.colors.primary};
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  gap: 4px;
`;

const Message = styled(motion.div)`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${props => props.isOwn ? props.theme.colors.primary : props.theme.colors.hover};
  color: ${props => props.isOwn ? 'white' : props.theme.colors.text};
  word-wrap: break-word;
`;

const MessageInput = styled.div`
  padding: 16px 20px;
  background: ${props => props.theme.colors.surface};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InputContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: ${props => props.theme.colors.background};
  border-radius: 20px;
  padding: 8px 16px;
`;

const TextInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const SendButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    background: #166fe5;
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: white;
  }
`;

const Messages = () => {
  const [conversations] = useState([
    {
      id: 1,
      user: { name: 'John Doe', avatar: '/avatar1.jpg', isOnline: true },
      lastMessage: 'Hey, how are you doing?',
      timestamp: '2m ago'
    },
    {
      id: 2,
      user: { name: 'Jane Smith', avatar: '/avatar2.jpg', isOnline: false },
      lastMessage: 'Thanks for the help!',
      timestamp: '1h ago'
    },
    {
      id: 3,
      user: { name: 'Mike Johnson', avatar: '/avatar3.jpg', isOnline: true },
      lastMessage: 'See you tomorrow',
      timestamp: '3h ago'
    }
  ]);

  const [activeConversation, setActiveConversation] = useState(conversations[0]);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hey there!', isOwn: false, timestamp: new Date() },
    { id: 2, text: 'Hi! How are you?', isOwn: true, timestamp: new Date() },
    { id: 3, text: 'I\'m doing great, thanks for asking!', isOwn: false, timestamp: new Date() }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      text: newMessage,
      isOwn: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <h2 style={{ margin: '0 0 16px 0' }}>Messages</h2>
          <SearchContainer>
            <MagnifyingGlassIcon />
            <SearchInput placeholder="Search conversations..." />
          </SearchContainer>
        </SidebarHeader>
        
        <ConversationsList>
          {conversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              active={activeConversation?.id === conversation.id}
              onClick={() => setActiveConversation(conversation)}
              whileHover={{ x: 4 }}
            >
              <AvatarContainer>
                <Avatar src={conversation.user.avatar} alt={conversation.user.name} />
                {conversation.user.isOnline && <OnlineIndicator />}
              </AvatarContainer>
              <ConversationInfo>
                <UserName>{conversation.user.name}</UserName>
                <LastMessage>{conversation.lastMessage}</LastMessage>
              </ConversationInfo>
            </ConversationItem>
          ))}
        </ConversationsList>
      </Sidebar>

      <ChatArea>
        {activeConversation ? (
          <>
            <ChatHeader>
              <ChatUserInfo>
                <AvatarContainer>
                  <Avatar src={activeConversation.user.avatar} alt={activeConversation.user.name} />
                  {activeConversation.user.isOnline && <OnlineIndicator />}
                </AvatarContainer>
                <div>
                  <UserName>{activeConversation.user.name}</UserName>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {activeConversation.user.isOnline ? 'Active now' : 'Last seen 1h ago'}
                  </span>
                </div>
              </ChatUserInfo>
              
              <ChatActions>
                <ActionButton>
                  <PhoneIcon />
                </ActionButton>
                <ActionButton>
                  <VideoCameraIcon />
                </ActionButton>
                <ActionButton>
                  <InformationCircleIcon />
                </ActionButton>
              </ChatActions>
            </ChatHeader>

            <MessagesContainer>
              {messages.map(message => (
                <MessageGroup key={message.id} isOwn={message.isOwn}>
                  <Message
                    isOwn={message.isOwn}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {message.text}
                  </Message>
                </MessageGroup>
              ))}
              <div ref={messagesEndRef} />
            </MessagesContainer>

            <MessageInput>
              <ActionButton>
                <Paperclip size={18} />
              </ActionButton>
              
              <InputContainer>
                <TextInput
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                />
                <ActionButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Smile size={18} />
                </ActionButton>
              </InputContainer>
              
              <SendButton onClick={sendMessage}>
                <PaperAirplaneIcon />
              </SendButton>
              
              {showEmojiPicker && (
                <div style={{ position: 'absolute', bottom: '100%', right: '20px' }}>
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </MessageInput>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#666'
          }}>
            Select a conversation to start messaging
          </div>
        )}
      </ChatArea>
    </Container>
  );
};

export default Messages;