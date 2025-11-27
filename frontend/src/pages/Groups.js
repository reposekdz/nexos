import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { Users, Crown, Shield, Calendar, MessageCircle, Settings } from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: #166fe5;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button`
  padding: 12px 20px;
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

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
  max-width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.surface};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${props => props.theme.colors.textSecondary};
`;

const GroupsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const GroupCard = styled(motion.div)`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.small};
  cursor: pointer;
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.medium};
  }
`;

const GroupCover = styled.div`
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GroupAvatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  border: 3px solid white;
  box-shadow: ${props => props.theme.shadows.small};
`;

const GroupInfo = styled.div`
  padding: 16px;
`;

const GroupName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.3;
`;

const GroupDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const GroupMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 16px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const GroupActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 8px 16px;
  border: 1px solid ${props => props.primary ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.primary ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.primary ? 'white' : props.theme.colors.text};
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: ${props => props.primary ? '#166fe5' : props.theme.colors.hover};
  }
`;

const PrivacyBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.7);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
`;

const MyGroupCard = styled(GroupCard)`
  border: 2px solid ${props => props.theme.colors.primary}20;
`;

const AdminBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: ${props => props.theme.colors.warning}20;
  color: ${props => props.theme.colors.warning};
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
`;

const Groups = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'discover', name: 'Discover' },
    { id: 'my-groups', name: 'My Groups' },
    { id: 'invitations', name: 'Invitations' }
  ];

  const [discoverGroups] = useState([
    {
      id: 1,
      name: 'React Developers Community',
      description: 'A community for React developers to share knowledge, ask questions, and collaborate on projects.',
      avatar: '/group1.jpg',
      members: 15420,
      posts: 1250,
      isPrivate: false,
      category: 'Technology',
      recentActivity: '2 hours ago'
    },
    {
      id: 2,
      name: 'Photography Enthusiasts',
      description: 'Share your best shots, get feedback, and learn new techniques from fellow photographers.',
      avatar: '/group2.jpg',
      members: 8930,
      posts: 890,
      isPrivate: false,
      category: 'Arts & Creativity',
      recentActivity: '1 hour ago'
    },
    {
      id: 3,
      name: 'Local Food Lovers',
      description: 'Discover the best restaurants, share recipes, and connect with food enthusiasts in your area.',
      avatar: '/group3.jpg',
      members: 3240,
      posts: 456,
      isPrivate: true,
      category: 'Food & Dining',
      recentActivity: '30 minutes ago'
    }
  ]);

  const [myGroups] = useState([
    {
      id: 4,
      name: 'Web Development Bootcamp',
      description: 'Learning web development together through projects and peer support.',
      avatar: '/group4.jpg',
      members: 245,
      posts: 89,
      isPrivate: false,
      category: 'Education',
      recentActivity: '15 minutes ago',
      role: 'admin',
      joined: '2 months ago'
    },
    {
      id: 5,
      name: 'Weekend Hikers',
      description: 'Planning weekend hiking trips and sharing trail experiences.',
      avatar: '/group5.jpg',
      members: 67,
      posts: 34,
      isPrivate: true,
      category: 'Sports & Recreation',
      recentActivity: '1 day ago',
      role: 'member',
      joined: '3 weeks ago'
    }
  ]);

  const handleJoinGroup = (groupId) => {
    console.log('Joining group:', groupId);
  };

  const handleViewGroup = (groupId) => {
    console.log('Viewing group:', groupId);
  };

  const renderGroupCard = (group, isMyGroup = false) => {
    const CardComponent = isMyGroup ? MyGroupCard : GroupCard;
    
    return (
      <CardComponent
        key={group.id}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleViewGroup(group.id)}
      >
        <GroupCover>
          <GroupAvatar src={group.avatar} alt={group.name} />
          <PrivacyBadge>
            {group.isPrivate ? <LockClosedIcon style={{ width: '12px', height: '12px' }} /> : <GlobeAltIcon style={{ width: '12px', height: '12px' }} />}
            {group.isPrivate ? 'Private' : 'Public'}
          </PrivacyBadge>
        </GroupCover>
        
        <GroupInfo>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <GroupName>{group.name}</GroupName>
            {isMyGroup && group.role === 'admin' && (
              <AdminBadge>
                <Crown size={10} />
                Admin
              </AdminBadge>
            )}
          </div>
          
          <GroupDescription>{group.description}</GroupDescription>
          
          <GroupMeta>
            <MetaItem>
              <Users size={12} />
              {group.members.toLocaleString()} members
            </MetaItem>
            <MetaItem>
              <MessageCircle size={12} />
              {group.posts} posts
            </MetaItem>
          </GroupMeta>
          
          <GroupActions>
            {isMyGroup ? (
              <>
                <ActionButton primary>
                  <ChatBubbleLeftRightIcon style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                  View Posts
                </ActionButton>
                {group.role === 'admin' && (
                  <ActionButton>
                    <Settings size={16} />
                  </ActionButton>
                )}
              </>
            ) : (
              <>
                <ActionButton primary onClick={(e) => {
                  e.stopPropagation();
                  handleJoinGroup(group.id);
                }}>
                  <UserGroupIcon style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                  {group.isPrivate ? 'Request to Join' : 'Join Group'}
                </ActionButton>
                <ActionButton>
                  View
                </ActionButton>
              </>
            )}
          </GroupActions>
        </GroupInfo>
      </CardComponent>
    );
  };

  const getGroupsToShow = () => {
    switch (activeTab) {
      case 'my-groups':
        return myGroups;
      case 'invitations':
        return []; // Would show pending invitations
      default:
        return discoverGroups;
    }
  };

  const filteredGroups = getGroupsToShow().filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container>
      <Header>
        <Title>Groups</Title>
        <CreateButton>
          <PlusIcon style={{ width: '20px', height: '20px' }} />
          Create Group
        </CreateButton>
      </Header>

      <TabsContainer>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </Tab>
        ))}
      </TabsContainer>

      <SearchContainer>
        <SearchIcon />
        <SearchInput
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      <GroupsGrid>
        {filteredGroups.map(group => renderGroupCard(group, activeTab === 'my-groups'))}
      </GroupsGrid>

      {filteredGroups.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#666'
        }}>
          <UserGroupIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px' }} />
          <h3>No groups found</h3>
          <p>Try adjusting your search or explore different categories.</p>
        </div>
      )}
    </Container>
  );
};

export default Groups;