import React, { useState } from 'react';
import styled from 'styled-components';
import { Image, Video, Music, MapPin, Users, Smile, Calendar, TrendingUp, Edit3, Sparkles } from 'lucide-react';
import axios from 'axios';

const AdvancedPostCreator = ({ onClose, onPost }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [location, setLocation] = useState(null);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [music, setMusic] = useState(null);
  const [poll, setPoll] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [schedule, setSchedule] = useState(null);
  const [filters, setFilters] = useState([]);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post('/api/content-creation/media/edit', formData);
        return res.data;
      })
    );
    setMedia([...media, ...uploaded]);
  };

  const handlePost = async () => {
    const postData = {
      content,
      media,
      location,
      taggedUsers,
      music,
      poll,
      visibility,
      scheduledFor: schedule
    };
    await axios.post('/api/content-creation/posts/media', postData);
    onPost && onPost();
    onClose && onClose();
  };

  return (
    <Container>
      <Header>
        <Title>Create Post</Title>
        <CloseBtn onClick={onClose}>×</CloseBtn>
      </Header>

      <ContentArea>
        <TextArea 
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {media.length > 0 && (
          <MediaPreview>
            {media.map((m, i) => (
              <MediaItem key={i}>
                {m.type === 'image' && <img src={m.url} alt="" />}
                {m.type === 'video' && <video src={m.url} controls />}
                <RemoveBtn onClick={() => setMedia(media.filter((_, idx) => idx !== i))}>×</RemoveBtn>
              </MediaItem>
            ))}
          </MediaPreview>
        )}

        {poll && (
          <PollPreview>
            <PollQuestion>{poll.question}</PollQuestion>
            {poll.options.map((opt, i) => (
              <PollOption key={i}>{opt}</PollOption>
            ))}
          </PollPreview>
        )}

        {location && (
          <LocationTag>
            <MapPin size={16} />
            {location.name}
          </LocationTag>
        )}

        {music && (
          <MusicTag>
            <Music size={16} />
            {music.title} - {music.artist}
          </MusicTag>
        )}
      </ContentArea>

      <Toolbar>
        <ToolButton onClick={() => document.getElementById('media-upload').click()}>
          <Image size={20} />
          <input 
            id="media-upload" 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            style={{ display: 'none' }}
            onChange={handleMediaUpload}
          />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('video')}>
          <Video size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('music')}>
          <Music size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('location')}>
          <MapPin size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('tag')}>
          <Users size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('poll')}>
          <TrendingUp size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('schedule')}>
          <Calendar size={20} />
        </ToolButton>

        <ToolButton onClick={() => setShowOptions('filters')}>
          <Sparkles size={20} />
        </ToolButton>
      </Toolbar>

      {showOptions === 'poll' && (
        <OptionsPanel>
          <h4>Create Poll</h4>
          <Input placeholder="Ask a question..." onChange={(e) => setPoll({ ...poll, question: e.target.value })} />
          <Input placeholder="Option 1" />
          <Input placeholder="Option 2" />
          <AddOptionBtn>+ Add Option</AddOptionBtn>
        </OptionsPanel>
      )}

      {showOptions === 'music' && (
        <OptionsPanel>
          <h4>Add Music</h4>
          <MusicList>
            <MusicItem onClick={() => setMusic({ title: 'Summer Vibes', artist: 'DJ Cool' })}>
              <Music size={16} />
              Summer Vibes - DJ Cool
            </MusicItem>
            <MusicItem onClick={() => setMusic({ title: 'Chill Beats', artist: 'Lo-Fi' })}>
              <Music size={16} />
              Chill Beats - Lo-Fi
            </MusicItem>
          </MusicList>
        </OptionsPanel>
      )}

      {showOptions === 'filters' && (
        <OptionsPanel>
          <h4>Apply Filters</h4>
          <FilterGrid>
            {['Vintage', 'B&W', 'Warm', 'Cool', 'Bright', 'Dark'].map(f => (
              <FilterBtn key={f} onClick={() => setFilters([...filters, f])}>
                {f}
              </FilterBtn>
            ))}
          </FilterGrid>
        </OptionsPanel>
      )}

      <Footer>
        <VisibilitySelect value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="public">Public</option>
          <option value="friends">Friends</option>
          <option value="private">Private</option>
        </VisibilitySelect>

        <PostButton onClick={handlePost}>
          {schedule ? 'Schedule' : 'Post'}
        </PostButton>
      </Footer>
    </Container>
  );
};

const Container = styled.div`
  background: white;
  border-radius: 12px;
  width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ddd;
`;

const Title = styled.h2`
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
`;

const ContentArea = styled.div`
  padding: 20px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  border: none;
  font-size: 16px;
  resize: none;
  &:focus { outline: none; }
`;

const MediaPreview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 15px;
`;

const MediaItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  img, video { width: 100%; height: 100%; object-fit: cover; }
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0,0,0,0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
`;

const PollPreview = styled.div`
  background: #f0f2f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
`;

const PollQuestion = styled.div`
  font-weight: 600;
  margin-bottom: 10px;
`;

const PollOption = styled.div`
  background: white;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
`;

const LocationTag = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e7f3ff;
  padding: 8px 12px;
  border-radius: 20px;
  margin-top: 10px;
  width: fit-content;
  color: #1877f2;
`;

const MusicTag = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff3e0;
  padding: 8px 12px;
  border-radius: 20px;
  margin-top: 10px;
  width: fit-content;
  color: #ff9800;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
`;

const ToolButton = styled.button`
  background: #f0f2f5;
  border: none;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: #e4e6eb; }
`;

const OptionsPanel = styled.div`
  padding: 20px;
  background: #f8f9fa;
  h4 { margin-top: 0; }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 10px;
`;

const AddOptionBtn = styled.button`
  background: none;
  border: none;
  color: #1877f2;
  cursor: pointer;
  font-weight: 600;
`;

const MusicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MusicItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #f0f2f5; }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const FilterBtn = styled.button`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  &:hover { background: #f0f2f5; }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
`;

const VisibilitySelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

const PostButton = styled.button`
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 30px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #166fe5; }
`;

export default AdvancedPostCreator;
