import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  FaceSmileIcon,
  MapPinIcon,
  ChartBarIcon,
  GifIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { X, Send, Pin, Archive, Edit3 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const CreatorContainer = styled(motion.div)`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
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

const MediaGrid = styled.div`
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

const PollContainer = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
`;

const PollOption = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  margin-bottom: 8px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ActionBar = styled.div`
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

const PostOptions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const PrivacySelect = styled.select`
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.surface};
  cursor: pointer;
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

const HashtagSuggestions = styled.div`
  position: absolute;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows.medium};
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
`;

const HashtagItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

const AdvancedPostCreator = () => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showEmoji, setShowEmoji] = useState(false);
  const [privacy, setPrivacy] = useState('public');
  const [location, setLocation] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const fileInputRef = useRef(null);

  const reactions = [
    { name: 'like', emoji: '👍' },
    { name: 'love', emoji: '❤️' },
    { name: 'wow', emoji: '😮' },
    { name: 'haha', emoji: '😂' },
    { name: 'sad', emoji: '😢' },
    { name: 'angry', emoji: '😠' }
  ];

  const hashtagSuggestions = ['#technology', '#travel', '#food', '#fitness', '#photography'];

  const handleMediaUpload = (files) => {
    const newMedia = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));
    setMedia(prev => [...prev, ...newMedia]);
  };

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    setPollOptions(prev => [...prev, '']);
  };

  const updatePollOption = (index, value) => {
    setPollOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  };

  const onEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
    setShowEmoji(false);
  };

  const handleHashtagClick = (hashtag) => {
    setContent(prev => prev + hashtag + ' ');
    setShowHashtagSuggestions(false);
  };

  const handlePost = async () => {
    const postData = {
      content,
      media,
      poll: showPoll ? { options: pollOptions.filter(opt => opt.trim()) } : null,
      privacy,
      location,
      isPinned,
      hashtags,
      reactions: reactions.map(r => ({ ...r, count: 0 }))
    };
    
    console.log('Creating advanced post:', postData);
    
    // Reset form
    setContent('');
    setMedia([]);
    setShowPoll(false);
    setPollOptions(['', '']);
    setLocation('');
    setIsPinned(false);
    setHashtags([]);
  };

  return (
    <CreatorContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <TextArea
        placeholder="What's on your mind? Use # for hashtags, @ to mention friends..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {media.length > 0 && (
        <MediaGrid>
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
        </MediaGrid>
      )}

      <AnimatePresence>
        {showPoll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PollContainer>
              <h4>Create Poll</h4>
              {pollOptions.map((option, index) => (
                <PollOption
                  key={index}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                />
              ))}
              <button onClick={addPollOption}>+ Add Option</button>
            </PollContainer>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionBar>
        <ActionButtons>
          <ActionButton onClick={() => fileInputRef.current?.click()}>
            <PhotoIcon />
            Photo/Video
          </ActionButton>
          
          <ActionButton onClick={() => setShowPoll(!showPoll)}>
            <ChartBarIcon />
            Poll
          </ActionButton>
          
          <ActionButton onClick={() => setShowEmoji(!showEmoji)}>
            <FaceSmileIcon />
            Emoji
          </ActionButton>
          
          <ActionButton onClick={() => setShowHashtagSuggestions(!showHashtagSuggestions)}>
            <HashtagIcon />
            Hashtag
          </ActionButton>
          
          <ActionButton>
            <MapPinIcon />
            Location
          </ActionButton>
          
          <ActionButton>
            <GifIcon />
            GIF
          </ActionButton>
        </ActionButtons>

        <PostOptions>
          <ActionButton onClick={() => setIsPinned(!isPinned)}>
            <Pin size={16} color={isPinned ? '#1877f2' : '#666'} />
          </ActionButton>
          
          <PrivacySelect value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
            <option value="public">🌍 Public</option>
            <option value="friends">👥 Friends</option>
            <option value="private">🔒 Only Me</option>
            <option value="custom">⚙️ Custom</option>
          </PrivacySelect>
          
          <PostButton onClick={handlePost}>
            <Send size={16} />
            Post
          </PostButton>
        </PostOptions>
      </ActionBar>

      {showEmoji && (
        <div style={{ position: 'absolute', zIndex: 1000 }}>
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}

      {showHashtagSuggestions && (
        <HashtagSuggestions>
          {hashtagSuggestions.map(hashtag => (
            <HashtagItem key={hashtag} onClick={() => handleHashtagClick(hashtag)}>
              {hashtag}
            </HashtagItem>
          ))}
        </HashtagSuggestions>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleMediaUpload(e.target.files)}
      />
    </CreatorContainer>
  );
};

export default AdvancedPostCreator;