import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  FaceSmileIcon,
  MapPinIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { X, Send } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import EmojiPicker from 'emoji-picker-react';

const Container = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  font-family: inherit;
  background: transparent;
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const MediaPreview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 16px 0;
`;

const MediaItem = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 150px;
    object-fit: cover;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.7);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.theme.colors.primary};
  }
`;

const PostButton = styled.button`
  padding: 8px 24px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: #166fe5;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrivacySelector = styled.select`
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.surface};
  cursor: pointer;
`;

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  z-index: 1000;
`;

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [privacy, setPrivacy] = useState('public');
  const [location, setLocation] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    onDrop: (acceptedFiles) => {
      const newMedia = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image'
      }));
      setMedia(prev => [...prev, ...newMedia]);
    }
  });

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const onEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) return;
    
    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('privacy', privacy);
      if (location) formData.append('location', location);
      
      media.forEach((item, index) => {
        formData.append('media', item.file);
      });

      // API call would go here
      console.log('Posting...', { content, media, privacy, location });
      
      // Reset form
      setContent('');
      setMedia([]);
      setLocation('');
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Container>
      <UserInfo>
        <Avatar src="/default-avatar.png" alt="User" />
        <div>
          <h4>What's on your mind?</h4>
        </div>
      </UserInfo>

      <TextArea
        placeholder="Share your thoughts..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {media.length > 0 && (
        <MediaPreview>
          {media.map((item, index) => (
            <MediaItem key={index}>
              {item.type === 'video' ? (
                <video src={item.preview} />
              ) : (
                <img src={item.preview} alt="Preview" />
              )}
              <RemoveButton onClick={() => removeMedia(index)}>
                <X size={12} />
              </RemoveButton>
            </MediaItem>
          ))}
        </MediaPreview>
      )}

      <div {...getRootProps()} style={{ 
        border: isDragActive ? '2px dashed #1877f2' : 'none',
        borderRadius: '8px',
        padding: isDragActive ? '20px' : '0',
        textAlign: 'center',
        color: '#1877f2'
      }}>
        <input {...getInputProps()} />
        {isDragActive && <p>Drop files here...</p>}
      </div>

      <Actions>
        <ActionButtons>
          <ActionButton onClick={() => fileInputRef.current?.click()}>
            <PhotoIcon />
            Photo/Video
          </ActionButton>
          
          <ActionButton>
            <VideoCameraIcon />
            Live Video
          </ActionButton>
          
          <ActionButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FaceSmileIcon />
            Feeling
          </ActionButton>
          
          <ActionButton>
            <MapPinIcon />
            Check In
          </ActionButton>
        </ActionButtons>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <PrivacySelector value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
            <option value="public">🌍 Public</option>
            <option value="friends">👥 Friends</option>
            <option value="private">🔒 Only Me</option>
          </PrivacySelector>
          
          <PostButton onClick={handlePost} disabled={isPosting}>
            <Send size={16} />
            {isPosting ? 'Posting...' : 'Post'}
          </PostButton>
        </div>
      </Actions>

      {showEmojiPicker && (
        <EmojiPickerContainer>
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </EmojiPickerContainer>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files);
          const newMedia = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('video') ? 'video' : 'image'
          }));
          setMedia(prev => [...prev, ...newMedia]);
        }}
      />
    </Container>
  );
};

export default CreatePost;