import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  FaceSmileIcon,
  PaintBrushIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const AdvancedStoryCreator = ({ onClose, onStoryCreated }) => {
  const [mediaType, setMediaType] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textAlignment, setTextAlignment] = useState('center');
  const [fontSize, setFontSize] = useState(32);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [stickers, setStickers] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [interactiveElement, setInteractiveElement] = useState(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showInteractivePicker, setShowInteractivePicker] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(5);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const filters = [
    { id: 'none', name: 'None', filter: 'none' },
    { id: 'vintage', name: 'Vintage', filter: 'sepia(0.5) contrast(1.2)' },
    { id: 'bw', name: 'B&W', filter: 'grayscale(1)' },
    { id: 'vivid', name: 'Vivid', filter: 'saturate(2) contrast(1.3)' },
    { id: 'warm', name: 'Warm', filter: 'sepia(0.3) brightness(1.1)' },
    { id: 'cool', name: 'Cool', filter: 'hue-rotate(180deg) brightness(0.9)' },
    { id: 'dramatic', name: 'Dramatic', filter: 'contrast(1.5) brightness(0.8)' },
    { id: 'blur', name: 'Blur', filter: 'blur(3px)' }
  ];

  const backgroundColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

  const musicTracks = [
    { id: 1, name: 'Upbeat Vibes', artist: 'Various', duration: '0:30' },
    { id: 2, name: 'Chill Beats', artist: 'Lofi', duration: '0:30' },
    { id: 3, name: 'Epic Moments', artist: 'Cinematic', duration: '0:30' },
    { id: 4, name: 'Happy Days', artist: 'Pop', duration: '0:30' },
    { id: 5, name: 'Summer Vibes', artist: 'Tropical', duration: '0:30' }
  ];

  const stickerPacks = [
    { id: 1, emoji: '❤️', category: 'love' },
    { id: 2, emoji: '😂', category: 'emoji' },
    { id: 3, emoji: '🔥', category: 'trending' },
    { id: 4, emoji: '✨', category: 'sparkle' },
    { id: 5, emoji: '🎉', category: 'celebration' },
    { id: 6, emoji: '💯', category: 'trending' },
    { id: 7, emoji: '🌟', category: 'sparkle' },
    { id: 8, emoji: '💕', category: 'love' },
    { id: 9, emoji: '🎵', category: 'music' },
    { id: 10, emoji: '📸', category: 'photo' }
  ];

  const interactiveElements = [
    { id: 'poll', name: 'Poll', icon: '📊', type: 'poll' },
    { id: 'question', name: 'Question', icon: '❓', type: 'question' },
    { id: 'quiz', name: 'Quiz', icon: '🧠', type: 'quiz' },
    { id: 'slider', name: 'Slider', icon: '🎚️', type: 'slider' },
    { id: 'countdown', name: 'Countdown', icon: '⏰', type: 'countdown' },
    { id: 'link', name: 'Link', icon: '🔗', type: 'link' }
  ];

  const handleFileSelect = (type) => {
    setMediaType(type);
    fileInputRef.current.accept = type === 'photo' ? 'image/*' : 'video/*';
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSticker = (sticker) => {
    const newSticker = {
      ...sticker,
      id: Date.now(),
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0
    };
    setStickers([...stickers, newSticker]);
    setShowStickerPicker(false);
  };

  const handleRemoveSticker = (stickerId) => {
    setStickers(stickers.filter(s => s.id !== stickerId));
  };

  const handleAddInteractive = (element) => {
    setInteractiveElement({
      ...element,
      data: element.type === 'poll' ? { question: '', options: ['', ''] } :
            element.type === 'question' ? { question: '' } :
            element.type === 'quiz' ? { question: '', options: ['', '', '', ''], correctAnswer: 0 } :
            element.type === 'slider' ? { question: '', min: 0, max: 100 } :
            element.type === 'countdown' ? { targetDate: new Date() } :
            element.type === 'link' ? { url: '', text: '' } : {}
    });
    setShowInteractivePicker(false);
  };

  const handleCreateStory = async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      if (mediaFile) {
        formData.append('media', mediaFile);
      }
      
      formData.append('text', text);
      formData.append('textColor', textColor);
      formData.append('textAlignment', textAlignment);
      formData.append('fontSize', fontSize);
      formData.append('backgroundColor', backgroundColor);
      formData.append('filter', selectedFilter);
      formData.append('stickers', JSON.stringify(stickers));
      formData.append('music', selectedMusic ? JSON.stringify(selectedMusic) : null);
      formData.append('interactive', interactiveElement ? JSON.stringify(interactiveElement) : null);
      formData.append('duration', duration);

      const response = await axios.post('/api/stories/advanced', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (onStoryCreated) {
        onStoryCreated(response.data);
      }
      onClose();
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Content>
        <TopBar>
          <CloseButton onClick={onClose}>
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </CloseButton>
          <Title>Create Story</Title>
          <CreateButton 
            onClick={handleCreateStory} 
            disabled={!mediaPreview && !backgroundColor}
            isLoading={isUploading}
          >
            {isUploading ? '...' : <CheckIcon style={{ width: 24, height: 24 }} />}
          </CreateButton>
        </TopBar>

        <PreviewArea>
          {!mediaPreview && !backgroundColor && (
            <EmptyState>
              <MediaOptions>
                <MediaButton onClick={() => handleFileSelect('photo')}>
                  <PhotoIcon style={{ width: 48, height: 48 }} />
                  <span>Photo</span>
                </MediaButton>
                <MediaButton onClick={() => handleFileSelect('video')}>
                  <VideoCameraIcon style={{ width: 48, height: 48 }} />
                  <span>Video</span>
                </MediaButton>
              </MediaOptions>
              <OrText>or choose a background color</OrText>
              <ColorGrid>
                {backgroundColors.map(color => (
                  <ColorOption
                    key={color}
                    color={color}
                    onClick={() => setBackgroundColor(color)}
                  />
                ))}
              </ColorGrid>
            </EmptyState>
          )}

          {(mediaPreview || backgroundColor) && (
            <StoryCanvas>
              <CanvasBackground
                style={{
                  backgroundImage: mediaPreview ? `url(${mediaPreview})` : 'none',
                  backgroundColor: backgroundColor || 'transparent',
                  filter: filters.find(f => f.id === selectedFilter)?.filter || 'none'
                }}
              />
              
              {text && (
                <TextOverlay
                  color={textColor}
                  alignment={textAlignment}
                  fontSize={fontSize}
                >
                  {text}
                </TextOverlay>
              )}

              {stickers.map(sticker => (
                <StickerElement
                  key={sticker.id}
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`
                  }}
                >
                  {sticker.emoji}
                  <RemoveStickerBtn onClick={() => handleRemoveSticker(sticker.id)}>
                    <XMarkIcon style={{ width: 12, height: 12 }} />
                  </RemoveStickerBtn>
                </StickerElement>
              ))}

              {interactiveElement && (
                <InteractiveOverlay>
                  <InteractiveIcon>{interactiveElement.icon}</InteractiveIcon>
                  <InteractiveName>{interactiveElement.name}</InteractiveName>
                </InteractiveOverlay>
              )}

              {selectedMusic && (
                <MusicIndicator>
                  <MusicalNoteIcon style={{ width: 16, height: 16 }} />
                  <span>{selectedMusic.name}</span>
                </MusicIndicator>
              )}
            </StoryCanvas>
          )}
        </PreviewArea>

        <ToolBar>
          <ToolButton onClick={() => setShowTextEditor(!showTextEditor)}>
            <span style={{ fontSize: 24 }}>Aa</span>
          </ToolButton>
          <ToolButton onClick={() => setShowFilterPicker(!showFilterPicker)}>
            <SparklesIcon style={{ width: 24, height: 24 }} />
          </ToolButton>
          <ToolButton onClick={() => setShowStickerPicker(!showStickerPicker)}>
            <FaceSmileIcon style={{ width: 24, height: 24 }} />
          </ToolButton>
          <ToolButton onClick={() => setShowMusicPicker(!showMusicPicker)}>
            <MusicalNoteIcon style={{ width: 24, height: 24 }} />
          </ToolButton>
          <ToolButton onClick={() => setShowInteractivePicker(!showInteractivePicker)}>
            <ChartBarIcon style={{ width: 24, height: 24 }} />
          </ToolButton>
        </ToolBar>

        <AnimatePresence>
          {showTextEditor && (
            <EditorPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <EditorTitle>Text</EditorTitle>
              <TextArea
                placeholder="Type your text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <EditorRow>
                <label>Color:</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </EditorRow>
              <EditorRow>
                <label>Size:</label>
                <input
                  type="range"
                  min="16"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                />
              </EditorRow>
              <EditorRow>
                <AlignButton active={textAlignment === 'left'} onClick={() => setTextAlignment('left')}>Left</AlignButton>
                <AlignButton active={textAlignment === 'center'} onClick={() => setTextAlignment('center')}>Center</AlignButton>
                <AlignButton active={textAlignment === 'right'} onClick={() => setTextAlignment('right')}>Right</AlignButton>
              </EditorRow>
            </EditorPanel>
          )}

          {showFilterPicker && (
            <PickerPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <EditorTitle>Filters</EditorTitle>
              <FilterGrid>
                {filters.map(filter => (
                  <FilterOption
                    key={filter.id}
                    active={selectedFilter === filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                  >
                    <FilterPreview filter={filter.filter} />
                    <FilterName>{filter.name}</FilterName>
                  </FilterOption>
                ))}
              </FilterGrid>
            </PickerPanel>
          )}

          {showStickerPicker && (
            <PickerPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <EditorTitle>Stickers</EditorTitle>
              <StickerGrid>
                {stickerPacks.map(sticker => (
                  <StickerOption
                    key={sticker.id}
                    onClick={() => handleAddSticker(sticker)}
                  >
                    {sticker.emoji}
                  </StickerOption>
                ))}
              </StickerGrid>
            </PickerPanel>
          )}

          {showMusicPicker && (
            <PickerPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <EditorTitle>Music</EditorTitle>
              <MusicList>
                {musicTracks.map(track => (
                  <MusicItem
                    key={track.id}
                    active={selectedMusic?.id === track.id}
                    onClick={() => setSelectedMusic(track)}
                  >
                    <MusicalNoteIcon style={{ width: 20, height: 20 }} />
                    <div>
                      <MusicName>{track.name}</MusicName>
                      <MusicArtist>{track.artist} · {track.duration}</MusicArtist>
                    </div>
                  </MusicItem>
                ))}
              </MusicList>
            </PickerPanel>
          )}

          {showInteractivePicker && (
            <PickerPanel
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <EditorTitle>Interactive</EditorTitle>
              <InteractiveGrid>
                {interactiveElements.map(element => (
                  <InteractiveOption
                    key={element.id}
                    onClick={() => handleAddInteractive(element)}
                  >
                    <span style={{ fontSize: 32 }}>{element.icon}</span>
                    <span>{element.name}</span>
                  </InteractiveOption>
                ))}
              </InteractiveGrid>
            </PickerPanel>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </Content>
    </Container>
  );
};

const Container = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Content = styled.div`
  width: 100%;
  max-width: 500px;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h2`
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const CreateButton = styled.button`
  background: ${props => props.disabled ? '#555' : '#1877f2'};
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PreviewArea = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
`;

const MediaOptions = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
`;

const MediaButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 32px;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }

  span {
    font-weight: 600;
  }
`;

const OrText = styled.div`
  color: rgba(255, 255, 255, 0.6);
  margin: 16px 0;
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 16px;
`;

const ColorOption = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid white;
  background: ${props => props.color};
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const StoryCanvas = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const CanvasBackground = styled.div`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
`;

const TextOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: ${props => props.alignment};
  padding: 40px;
  color: ${props => props.color};
  font-size: ${props => props.fontSize}px;
  font-weight: 700;
  text-align: ${props => props.alignment};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  white-space: pre-wrap;
  word-break: break-word;
`;

const StickerElement = styled.div`
  position: absolute;
  font-size: 48px;
  cursor: move;
  user-select: none;

  &:hover button {
    opacity: 1;
  }
`;

const RemoveStickerBtn = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(0, 0, 0, 0.8);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
`;

const InteractiveOverlay = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InteractiveIcon = styled.span`
  font-size: 24px;
`;

const InteractiveName = styled.span`
  font-weight: 600;
  color: #333;
`;

const MusicIndicator = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
`;

const ToolBar = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
`;

const ToolButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
`;

const EditorPanel = styled(motion.div)`
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  padding: 24px;
  border-radius: 16px 16px 0 0;
  max-height: 50vh;
  overflow-y: auto;
`;

const PickerPanel = styled(EditorPanel)``;

const EditorTitle = styled.h3`
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
  resize: none;
  min-height: 100px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const EditorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  color: white;

  label {
    font-weight: 500;
  }

  input[type="range"] {
    flex: 1;
  }

  input[type="color"] {
    width: 48px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
`;

const AlignButton = styled.button`
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid ${props => props.active ? '#1877f2' : 'rgba(255,255,255,0.2)'};
  background: ${props => props.active ? '#1877f2' : 'rgba(255,255,255,0.1)'};
  color: white;
  cursor: pointer;
  font-weight: 500;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
`;

const FilterOption = styled.div`
  cursor: pointer;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? '#1877f2' : 'transparent'};
  background: rgba(255, 255, 255, 0.05);
`;

const FilterPreview = styled.div`
  width: 100%;
  height: 60px;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  filter: ${props => props.filter};
  margin-bottom: 8px;
`;

const FilterName = styled.div`
  color: white;
  font-size: 12px;
  font-weight: 500;
`;

const StickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
`;

const StickerOption = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 32px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }
`;

const MusicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MusicItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, ${props => props.active ? 0.2 : 0.05});
  border: 1px solid ${props => props.active ? '#1877f2' : 'transparent'};
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MusicName = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const MusicArtist = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

const InteractiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const InteractiveOption = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  span:last-child {
    font-size: 12px;
    font-weight: 500;
  }
`;

export default AdvancedStoryCreator;
