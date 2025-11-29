import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  CodeIcon,
  LinkIcon,
  ImageIcon,
  VideoIcon,
  SmileIcon,
  HashIcon,
  AtSignIcon,
  ListIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  SaveIcon,
  SendIcon,
  ClockIcon,
  GlobeIcon,
  UsersIcon,
  LockIcon,
  EyeIcon
} from 'lucide-react';

const AdvancedPostEditor = ({ onPost, initialDraft, editMode = false }) => {
  const [content, setContent] = useState(initialDraft?.content || '');
  const [title, setTitle] = useState(initialDraft?.title || '');
  const [format, setFormat] = useState('rich');
  const [media, setMedia] = useState(initialDraft?.media || []);
  const [privacy, setPrivacy] = useState(initialDraft?.privacy || 'public');
  const [scheduled, setScheduled] = useState(null);
  const [tags, setTags] = useState(initialDraft?.tags || []);
  const [mentions, setMentions] = useState([]);
  const [location, setLocation] = useState(null);
  const [poll, setPoll] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const editorRef = useRef(null);
  const autoSaveTimer = useRef(null);
  
  const formats = {
    rich: 'Rich Text',
    markdown: 'Markdown',
    code: 'Code',
    plain: 'Plain Text'
  };
  
  const privacyOptions = [
    { value: 'public', icon: <GlobeIcon size={16} />, label: 'Public' },
    { value: 'friends', icon: <UsersIcon size={16} />, label: 'Friends' },
    { value: 'private', icon: <LockIcon size={16} />, label: 'Private' },
    { value: 'custom', icon: <EyeIcon size={16} />, label: 'Custom' }
  ];

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = content.length;
    setWordCount(words);
    setCharCount(chars);
    
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    
    setAutoSaveStatus('saving...');
    autoSaveTimer.current = setTimeout(() => {
      saveDraft();
    }, 2000);
    
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, title, media, tags, privacy]);

  const saveDraft = async () => {
    try {
      await axios.post('/api/posts/drafts', {
        title,
        content,
        media,
        tags,
        privacy,
        format,
        scheduled
      });
      setAutoSaveStatus('saved');
    } catch (error) {
      setAutoSaveStatus('error');
      console.error('Draft save error:', error);
    }
  };

  const handleFormat = (type) => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (!selectedText) return;
    
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    let newText = content;
    
    switch(format) {
      case 'rich':
        document.execCommand(type, false, null);
        break;
        
      case 'markdown':
        switch(type) {
          case 'bold':
            newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
            break;
          case 'italic':
            newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
            break;
          case 'code':
            newText = content.substring(0, start) + `\`${selectedText}\`` + content.substring(end);
            break;
          case 'link':
            newText = content.substring(0, start) + `[${selectedText}](url)` + content.substring(end);
            break;
        }
        setContent(newText);
        break;
        
      default:
        break;
    }
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        return {
          type: file.type.startsWith('image') ? 'image' : 'video',
          url: response.data.url,
          thumbnail: response.data.thumbnail,
          name: file.name,
          size: file.size
        };
      });
      
      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia([...media, ...uploadedMedia]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji) => {
    setContent(content + emoji);
    setShowEmojiPicker(false);
  };

  const detectLinks = useCallback(async (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    
    if (urls && urls.length > 0) {
      try {
        const response = await axios.post('/api/posts/link-preview', { url: urls[0] });
        setLinkPreview(response.data);
      } catch (error) {
        console.error('Link preview error:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (content) {
      detectLinks(content);
    }
  }, [content, detectLinks]);

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) {
      alert('Post cannot be empty');
      return;
    }
    
    try {
      const postData = {
        title,
        content,
        media,
        tags,
        privacy,
        format,
        scheduled,
        location,
        poll,
        mentions,
        linkPreview
      };
      
      const response = await axios.post('/api/posts', postData);
      
      if (onPost) onPost(response.data);
      
      setContent('');
      setTitle('');
      setMedia([]);
      setTags([]);
      setMentions([]);
      setLinkPreview(null);
      setPoll(null);
      setLocation(null);
    } catch (error) {
      console.error('Post error:', error);
      alert('Failed to create post');
    }
  };

  const handleSchedule = () => {
    const scheduledDate = prompt('Enter schedule date/time (YYYY-MM-DD HH:MM):');
    if (scheduledDate) {
      setScheduled(new Date(scheduledDate));
    }
  };

  const addPoll = () => {
    setPoll({
      question: '',
      options: ['', ''],
      multiple: false,
      expiresIn: 24
    });
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...poll.options];
    newOptions[index] = value;
    setPoll({ ...poll, options: newOptions });
  };

  const addPollOption = () => {
    setPoll({ ...poll, options: [...poll.options, ''] });
  };

  const insertCodeBlock = () => {
    const code = `\n\`\`\`${codeLanguage}\n// Your code here\n\`\`\`\n`;
    setContent(content + code);
  };

  return (
    <EditorContainer fullscreen={isFullscreen}>
      <EditorHeader>
        <FormatSelector>
          {Object.entries(formats).map(([key, label]) => (
            <FormatButton
              key={key}
              active={format === key}
              onClick={() => setFormat(key)}
            >
              {label}
            </FormatButton>
          ))}
        </FormatSelector>
        
        <HeaderActions>
          <StatusIndicator status={autoSaveStatus}>
            {autoSaveStatus}
          </StatusIndicator>
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? '⇲' : '⇱'}
          </IconButton>
        </HeaderActions>
      </EditorHeader>
      
      {title !== null && (
        <TitleInput
          type="text"
          placeholder="Post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      )}
      
      <AnimatePresence>
        {showFormatBar && (
          <FormatToolbar
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ToolbarGroup>
              <ToolButton onClick={() => handleFormat('bold')} title="Bold">
                <BoldIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => handleFormat('italic')} title="Italic">
                <ItalicIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => handleFormat('underline')} title="Underline">
                <UnderlineIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => handleFormat('code')} title="Code">
                <CodeIcon size={18} />
              </ToolButton>
            </ToolbarGroup>
            
            <ToolbarDivider />
            
            <ToolbarGroup>
              <ToolButton onClick={() => document.execCommand('justifyLeft')} title="Align Left">
                <AlignLeftIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => document.execCommand('justifyCenter')} title="Align Center">
                <AlignCenterIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => document.execCommand('justifyRight')} title="Align Right">
                <AlignRightIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => document.execCommand('insertUnorderedList')} title="Bullet List">
                <ListIcon size={18} />
              </ToolButton>
            </ToolbarGroup>
            
            <ToolbarDivider />
            
            <ToolbarGroup>
              <ToolButton onClick={() => handleFormat('link')} title="Insert Link">
                <LinkIcon size={18} />
              </ToolButton>
              <FileInput htmlFor="media-upload">
                <ImageIcon size={18} />
                <input
                  id="media-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  style={{ display: 'none' }}
                />
              </FileInput>
              <ToolButton onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji">
                <SmileIcon size={18} />
              </ToolButton>
              <ToolButton onClick={() => setShowAdvanced(!showAdvanced)} title="Advanced">
                ⚙
              </ToolButton>
            </ToolbarGroup>
          </FormatToolbar>
        )}
      </AnimatePresence>
      
      <ContentArea
        ref={editorRef}
        contentEditable={format === 'rich'}
        placeholder="What's on your mind?"
        value={format !== 'rich' ? content : undefined}
        onChange={format !== 'rich' ? (e) => setContent(e.target.value) : undefined}
        onInput={format === 'rich' ? (e) => setContent(e.target.innerHTML) : undefined}
        suppressContentEditableWarning
        markdown={format === 'markdown'}
      />
      
      {showEmojiPicker && (
        <EmojiPicker>
          {['😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🚀', '💡', '📝', '🎨'].map(emoji => (
            <EmojiButton key={emoji} onClick={() => insertEmoji(emoji)}>
              {emoji}
            </EmojiButton>
          ))}
        </EmojiPicker>
      )}
      
      {media.length > 0 && (
        <MediaPreview>
          {media.map((item, index) => (
            <MediaItem key={index}>
              {item.type === 'image' ? (
                <img src={item.url} alt="" />
              ) : (
                <video src={item.url} controls />
              )}
              <RemoveButton onClick={() => removeMedia(index)}>×</RemoveButton>
            </MediaItem>
          ))}
        </MediaPreview>
      )}
      
      {linkPreview && (
        <LinkPreviewCard>
          {linkPreview.image && <PreviewImage src={linkPreview.image} alt="" />}
          <PreviewContent>
            <PreviewTitle>{linkPreview.title}</PreviewTitle>
            <PreviewDescription>{linkPreview.description}</PreviewDescription>
            <PreviewUrl>{linkPreview.url}</PreviewUrl>
          </PreviewContent>
          <CloseButton onClick={() => setLinkPreview(null)}>×</CloseButton>
        </LinkPreviewCard>
      )}
      
      {poll && (
        <PollBuilder>
          <PollInput
            type="text"
            placeholder="Poll question..."
            value={poll.question}
            onChange={(e) => setPoll({ ...poll, question: e.target.value })}
          />
          {poll.options.map((option, index) => (
            <PollOptionInput
              key={index}
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updatePollOption(index, e.target.value)}
            />
          ))}
          <AddOptionButton onClick={addPollOption}>+ Add Option</AddOptionButton>
        </PollBuilder>
      )}
      
      {showAdvanced && (
        <AdvancedOptions>
          <OptionButton onClick={insertCodeBlock}>
            <CodeIcon size={16} />
            Code Block
          </OptionButton>
          <OptionButton onClick={addPoll}>
            📊 Poll
          </OptionButton>
          <OptionButton onClick={() => alert('Location picker coming soon')}>
            📍 Location
          </OptionButton>
        </AdvancedOptions>
      )}
      
      <EditorFooter>
        <FooterLeft>
          <Stats>
            {wordCount} words · {charCount} chars
          </Stats>
        </FooterLeft>
        
        <PrivacySelector>
          {privacyOptions.map(option => (
            <PrivacyButton
              key={option.value}
              active={privacy === option.value}
              onClick={() => setPrivacy(option.value)}
            >
              {option.icon}
              {option.label}
            </PrivacyButton>
          ))}
        </PrivacySelector>
        
        <FooterActions>
          <ActionButton onClick={saveDraft}>
            <SaveIcon size={18} />
            Save Draft
          </ActionButton>
          <ActionButton onClick={handleSchedule}>
            <ClockIcon size={18} />
            Schedule
          </ActionButton>
          <PrimaryButton onClick={handlePost} disabled={isUploading}>
            <SendIcon size={18} />
            {scheduled ? 'Schedule Post' : 'Post'}
          </PrimaryButton>
        </FooterActions>
      </EditorFooter>
    </EditorContainer>
  );
};

const EditorContainer = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e1e8ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  ${props => props.fullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    border-radius: 0;
  `}
`;

const EditorHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FormatSelector = styled.div`
  display: flex;
  gap: 4px;
`;

const FormatButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.active ? '#1877f2' : '#e1e8ed'};
  background: ${props => props.active ? '#1877f2' : '#ffffff'};
  color: ${props => props.active ? '#ffffff' : '#65676b'};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #1877f2;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatusIndicator = styled.span`
  font-size: 12px;
  color: ${props => props.status === 'saved' ? '#42b72a' : props.status === 'error' ? '#fa3e3e' : '#65676b'};
`;

const IconButton = styled.button`
  padding: 6px;
  border: none;
  background: transparent;
  color: #65676b;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const TitleInput = styled.input`
  padding: 16px 20px;
  border: none;
  border-bottom: 1px solid #e1e8ed;
  font-size: 24px;
  font-weight: 600;
  outline: none;
  
  &::placeholder {
    color: #bcc0c4;
  }
`;

const FormatToolbar = styled(motion.div)`
  padding: 12px 16px;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const ToolbarGroup = styled.div`
  display: flex;
  gap: 4px;
`;

const ToolbarDivider = styled.div`
  width: 1px;
  height: 24px;
  background: #e1e8ed;
`;

const ToolButton = styled.button`
  padding: 8px;
  border: none;
  background: transparent;
  color: #65676b;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const FileInput = styled.label`
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #65676b;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  min-height: 200px;
  max-height: ${props => props.fullscreen ? 'none' : '400px'};
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.6;
  outline: none;
  font-family: ${props => props.markdown ? 'monospace' : 'inherit'};
  
  &:empty:before {
    content: attr(placeholder);
    color: #bcc0c4;
  }
`;

const EmojiPicker = styled.div`
  padding: 12px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const EmojiButton = styled.button`
  padding: 8px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  border-radius: 6px;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const MediaPreview = styled.div`
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  border-top: 1px solid #e1e8ed;
`;

const MediaItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 20px;
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const LinkPreviewCard = styled.div`
  margin: 16px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const PreviewContent = styled.div`
  padding: 12px;
`;

const PreviewTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const PreviewDescription = styled.div`
  font-size: 14px;
  color: #65676b;
  margin-bottom: 4px;
`;

const PreviewUrl = styled.div`
  font-size: 12px;
  color: #8a8d91;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 20px;
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const PollBuilder = styled.div`
  padding: 16px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PollInput = styled.input`
  padding: 12px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  outline: none;
  
  &:focus {
    border-color: #1877f2;
  }
`;

const PollOptionInput = styled.input`
  padding: 10px 12px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  
  &:focus {
    border-color: #1877f2;
  }
`;

const AddOptionButton = styled.button`
  padding: 10px;
  border: 1px dashed #e1e8ed;
  background: transparent;
  color: #1877f2;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const AdvancedOptions = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  gap: 8px;
`;

const OptionButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #e1e8ed;
  background: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const EditorFooter = styled.div`
  padding: 16px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Stats = styled.span`
  font-size: 13px;
  color: #65676b;
`;

const PrivacySelector = styled.div`
  display: flex;
  gap: 4px;
`;

const PrivacyButton = styled.button`
  padding: 8px 12px;
  border: 1px solid ${props => props.active ? '#1877f2' : '#e1e8ed'};
  background: ${props => props.active ? '#e7f3ff' : '#ffffff'};
  color: ${props => props.active ? '#1877f2' : '#65676b'};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  
  &:hover {
    border-color: #1877f2;
  }
`;

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 10px 16px;
  border: 1px solid #e1e8ed;
  background: #ffffff;
  color: #65676b;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: #f0f2f5;
  }
`;

const PrimaryButton = styled.button`
  padding: 10px 24px;
  border: none;
  background: #1877f2;
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  
  &:hover:not(:disabled) {
    background: #166fe5;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default AdvancedPostEditor;
