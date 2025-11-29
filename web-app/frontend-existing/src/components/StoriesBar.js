import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { PlusIcon, PlayIcon } from '@heroicons/react/24/outline';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Container = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const StoriesContainer = styled.div`
  position: relative;
  overflow: hidden;
`;

const StoriesScroll = styled(motion.div)`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const StoryItem = styled(motion.div)`
  position: relative;
  min-width: 100px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(45deg, #667eea, #764ba2);
`;

const CreateStory = styled(StoryItem)`
  background: ${props => props.theme.colors.background};
  border: 2px dashed ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.hover};
  }
`;

const StoryImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StoryOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 12px 8px 8px;
  color: white;
`;

const StoryAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid white;
  position: absolute;
  top: 8px;
  left: 8px;
`;

const StoryName = styled.span`
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
`;

const NavButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: ${props => props.theme.shadows.small};
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
  
  &.left {
    left: 8px;
  }
  
  &.right {
    right: 8px;
  }
`;

const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${StoryItem}:hover & {
    opacity: 1;
  }
`;

const StoriesBar = () => {
  const [stories] = useState([
    {
      id: 1,
      user: { name: 'John Doe', avatar: '/avatar1.jpg' },
      image: '/story1.jpg',
      hasVideo: false
    },
    {
      id: 2,
      user: { name: 'Jane Smith', avatar: '/avatar2.jpg' },
      image: '/story2.jpg',
      hasVideo: true
    },
    {
      id: 3,
      user: { name: 'Mike Johnson', avatar: '/avatar3.jpg' },
      image: '/story3.jpg',
      hasVideo: false
    },
    {
      id: 4,
      user: { name: 'Sarah Wilson', avatar: '/avatar4.jpg' },
      image: '/story4.jpg',
      hasVideo: true
    },
    {
      id: 5,
      user: { name: 'Tom Brown', avatar: '/avatar5.jpg' },
      image: '/story5.jpg',
      hasVideo: false
    }
  ]);

  const [scrollX, setScrollX] = useState(0);

  const scroll = (direction) => {
    const container = document.getElementById('stories-scroll');
    const scrollAmount = 200;
    const newScrollX = direction === 'left' 
      ? Math.max(0, scrollX - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollX + scrollAmount);
    
    setScrollX(newScrollX);
    container.scrollTo({ left: newScrollX, behavior: 'smooth' });
  };

  const handleCreateStory = () => {
    // Open story creation modal
    console.log('Create story');
  };

  const handleViewStory = (story) => {
    // Open story viewer
    console.log('View story:', story);
  };

  return (
    <Container>
      <Header>
        <Title>Stories</Title>
      </Header>
      
      <StoriesContainer>
        <StoriesScroll id="stories-scroll">
          <CreateStory
            onClick={handleCreateStory}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PlusIcon style={{ width: '24px', height: '24px', color: '#1877f2' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1877f2' }}>
              Create Story
            </span>
          </CreateStory>

          {stories.map((story) => (
            <StoryItem
              key={story.id}
              onClick={() => handleViewStory(story)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <StoryImage src={story.image} alt={story.user.name} />
              <StoryAvatar src={story.user.avatar} alt={story.user.name} />
              
              {story.hasVideo && (
                <PlayButton>
                  <PlayIcon style={{ width: '20px', height: '20px', color: '#333' }} />
                </PlayButton>
              )}
              
              <StoryOverlay>
                <StoryName>{story.user.name}</StoryName>
              </StoryOverlay>
            </StoryItem>
          ))}
        </StoriesScroll>

        {scrollX > 0 && (
          <NavButton className="left" onClick={() => scroll('left')}>
            <ChevronLeft size={16} />
          </NavButton>
        )}
        
        <NavButton className="right" onClick={() => scroll('right')}>
          <ChevronRight size={16} />
        </NavButton>
      </StoriesContainer>
    </Container>
  );
};

export default StoriesBar;