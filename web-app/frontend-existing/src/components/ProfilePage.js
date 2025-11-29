import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  CameraIcon, 
  UserPlusIcon, 
  ChatBubbleLeftRightIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  VideoCameraIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { MapPin, Briefcase, GraduationCap, Heart, Users, Edit3 } from 'lucide-react';

const ProfileContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
`;

const CoverSection = styled.div`
  position: relative;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const CoverPhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CoverOverlay = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
`;

const EditCoverButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0,0,0,0.7);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover {
    background: rgba(0,0,0,0.8);
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: end;
  gap: 20px;
  margin-top: -80px;
  margin-bottom: 20px;
  position: relative;
  z-index: 10;
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const ProfileAvatar = styled.img`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: ${props => props.theme.shadows.medium};
`;

const AvatarEditButton = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme.colors.surface};
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadows.small};
`;

const ProfileInfo = styled.div`
  flex: 1;
  padding-top: 20px;
`;

const ProfileName = styled.h1`
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const ProfileBio = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 16px 0;
  line-height: 1.4;
`;

const ProfileStats = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
`;

const StatItem = styled.div`
  text-align: center;
  
  .count {
    font-size: 20px;
    font-weight: 700;
    display: block;
  }
  
  .label {
    font-size: 14px;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const ProfileActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${props => props.primary ? props.theme.colors.primary : props.theme.colors.hover};
  color: ${props => props.primary ? 'white' : props.theme.colors.text};
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ContentTabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 16px 24px;
  border: none;
  background: none;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  font-weight: ${props => props.active ? '600' : '400'};
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div``;

const Sidebar = styled.div``;

const AboutCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const AboutItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const FriendsCard = styled(AboutCard)``;

const FriendsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const FriendItem = styled.div`
  text-align: center;
  cursor: pointer;
  
  img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    object-fit: cover;
    margin-bottom: 4px;
  }
  
  .name {
    font-size: 12px;
    font-weight: 600;
  }
`;

const PhotosCard = styled(AboutCard)``;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
`;

const PhotoItem = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
`;

const ProfilePage = ({ username }) => {
  const [activeTab, setActiveTab] = useState('posts');
  const [isOwnProfile] = useState(true); // Mock data

  const profileData = {
    name: 'John Doe',
    bio: 'Software Developer | Tech Enthusiast | Coffee Lover ☕',
    avatar: '/avatar.jpg',
    cover: '/cover.jpg',
    stats: {
      posts: 245,
      friends: 1420,
      followers: 3200
    },
    about: {
      location: 'San Francisco, CA',
      work: 'Software Engineer at Tech Corp',
      education: 'Computer Science, Stanford University',
      relationship: 'Single',
      joined: 'Joined March 2020'
    },
    friends: Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      name: `Friend ${i + 1}`,
      avatar: `/friend${i + 1}.jpg`
    })),
    photos: Array.from({ length: 9 }, (_, i) => `/photo${i + 1}.jpg`)
  };

  const tabs = [
    { id: 'posts', name: 'Posts', icon: null },
    { id: 'about', name: 'About', icon: null },
    { id: 'friends', name: 'Friends', icon: null },
    { id: 'photos', name: 'Photos', icon: PhotoIcon },
    { id: 'videos', name: 'Videos', icon: VideoCameraIcon },
    { id: 'events', name: 'Events', icon: CalendarDaysIcon }
  ];

  return (
    <ProfileContainer>
      <CoverSection>
        <CoverPhoto src={profileData.cover} alt="Cover" />
        {isOwnProfile && (
          <CoverOverlay>
            <EditCoverButton>
              <CameraIcon style={{ width: '16px', height: '16px' }} />
              Edit Cover
            </EditCoverButton>
          </CoverOverlay>
        )}
      </CoverSection>

      <ProfileHeader>
        <AvatarContainer>
          <ProfileAvatar src={profileData.avatar} alt={profileData.name} />
          {isOwnProfile && (
            <AvatarEditButton>
              <CameraIcon style={{ width: '16px', height: '16px' }} />
            </AvatarEditButton>
          )}
        </AvatarContainer>

        <ProfileInfo>
          <ProfileName>{profileData.name}</ProfileName>
          <ProfileBio>{profileData.bio}</ProfileBio>
          
          <ProfileStats>
            <StatItem>
              <span className="count">{profileData.stats.posts}</span>
              <span className="label">Posts</span>
            </StatItem>
            <StatItem>
              <span className="count">{profileData.stats.friends}</span>
              <span className="label">Friends</span>
            </StatItem>
            <StatItem>
              <span className="count">{profileData.stats.followers}</span>
              <span className="label">Followers</span>
            </StatItem>
          </ProfileStats>

          <ProfileActions>
            {isOwnProfile ? (
              <>
                <ActionButton primary>
                  <Edit3 size={16} />
                  Edit Profile
                </ActionButton>
                <ActionButton>
                  <PhotoIcon style={{ width: '16px', height: '16px' }} />
                  Add Story
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton primary>
                  <UserPlusIcon style={{ width: '16px', height: '16px' }} />
                  Add Friend
                </ActionButton>
                <ActionButton>
                  <ChatBubbleLeftRightIcon style={{ width: '16px', height: '16px' }} />
                  Message
                </ActionButton>
                <ActionButton>
                  <EllipsisHorizontalIcon style={{ width: '16px', height: '16px' }} />
                </ActionButton>
              </>
            )}
          </ProfileActions>
        </ProfileInfo>
      </ProfileHeader>

      <ContentTabs>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </Tab>
        ))}
      </ContentTabs>

      <ContentGrid>
        <MainContent>
          {activeTab === 'posts' && <div>Posts content here</div>}
          {activeTab === 'about' && <div>About content here</div>}
          {activeTab === 'friends' && <div>Friends content here</div>}
          {activeTab === 'photos' && <div>Photos content here</div>}
        </MainContent>

        <Sidebar>
          <AboutCard>
            <h3 style={{ marginBottom: '16px' }}>About</h3>
            <AboutItem>
              <Briefcase />
              <span>{profileData.about.work}</span>
            </AboutItem>
            <AboutItem>
              <GraduationCap />
              <span>{profileData.about.education}</span>
            </AboutItem>
            <AboutItem>
              <MapPin />
              <span>{profileData.about.location}</span>
            </AboutItem>
            <AboutItem>
              <Heart />
              <span>{profileData.about.relationship}</span>
            </AboutItem>
          </AboutCard>

          <FriendsCard>
            <h3 style={{ marginBottom: '16px' }}>Friends</h3>
            <FriendsGrid>
              {profileData.friends.map(friend => (
                <FriendItem key={friend.id}>
                  <img src={friend.avatar} alt={friend.name} />
                  <div className="name">{friend.name}</div>
                </FriendItem>
              ))}
            </FriendsGrid>
          </FriendsCard>

          <PhotosCard>
            <h3 style={{ marginBottom: '16px' }}>Photos</h3>
            <PhotosGrid>
              {profileData.photos.map((photo, index) => (
                <PhotoItem key={index} src={photo} alt={`Photo ${index + 1}`} />
              ))}
            </PhotosGrid>
          </PhotosCard>
        </Sidebar>
      </ContentGrid>
    </ProfileContainer>
  );
};

export default ProfilePage;