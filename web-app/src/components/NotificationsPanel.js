import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon,
  UserPlusIcon,
  CakeIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ShoppingBagIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { X, Settings, Filter } from 'lucide-react';

const NotificationsContainer = styled.div`
  width: 360px;
  max-height: 600px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.large};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
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
`;

const FilterTabs = styled.div`
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const FilterTab = styled.button`
  padding: 12px 16px;
  border: none;
  background: none;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  font-weight: ${props => props.active ? '600' : '400'};
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const NotificationsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const NotificationItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  background: ${props => props.unread ? props.theme.colors.primary + '05' : 'transparent'};
  border-left: 3px solid ${props => props.unread ? props.theme.colors.primary : 'transparent'};
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

const NotificationIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => getIconBackground(props.type, props.theme)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 20px;
    height: 20px;
    color: white;
  }
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationText = styled.p`
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.4;
  
  .username {
    font-weight: 600;
    color: ${props => props.theme.colors.text};
  }
  
  .action {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const NotificationTime = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const NotificationMedia = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  margin-left: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.colors.textSecondary};
  
  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
`;

const getIconBackground = (type, theme) => {
  const colors = {
    like: theme.colors.error,
    comment: theme.colors.primary,
    follow: theme.colors.success,
    birthday: '#ff9800',
    job: '#9c27b0',
    event: '#2196f3',
    marketplace: '#4caf50',
    live: '#f44336'
  };
  return colors[type] || theme.colors.textSecondary;
};

const getNotificationIcon = (type) => {
  const icons = {
    like: HeartSolid,
    comment: ChatBubbleLeftIcon,
    follow: UserPlusIcon,
    birthday: CakeIcon,
    job: BriefcaseIcon,
    event: CalendarDaysIcon,
    marketplace: ShoppingBagIcon,
    live: VideoCameraIcon
  };
  return icons[type] || HeartIcon;
};

const NotificationsPanel = ({ onClose }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'like',
      user: { name: 'John Doe', avatar: '/avatar1.jpg' },
      text: 'liked your post',
      time: '2 minutes ago',
      unread: true,
      media: '/post1.jpg'
    },
    {
      id: 2,
      type: 'comment',
      user: { name: 'Jane Smith', avatar: '/avatar2.jpg' },
      text: 'commented on your photo',
      time: '5 minutes ago',
      unread: true,
      media: '/post2.jpg'
    },
    {
      id: 3,
      type: 'follow',
      user: { name: 'Mike Johnson', avatar: '/avatar3.jpg' },
      text: 'started following you',
      time: '1 hour ago',
      unread: false
    },
    {
      id: 4,
      type: 'birthday',
      user: { name: 'Sarah Wilson', avatar: '/avatar4.jpg' },
      text: 'has a birthday today',
      time: '2 hours ago',
      unread: false
    },
    {
      id: 5,
      type: 'event',
      user: { name: 'Tech Meetup', avatar: '/event1.jpg' },
      text: 'event is starting soon',
      time: '3 hours ago',
      unread: false
    }
  ]);

  const filters = [
    { id: 'all', name: 'All' },
    { id: 'unread', name: 'Unread' },
    { id: 'mentions', name: 'Mentions' }
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'unread') return notification.unread;
    if (activeFilter === 'mentions') return notification.type === 'comment';
    return true;
  });

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, unread: false } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, unread: false }))
    );
  };

  return (
    <NotificationsContainer>
      <Header>
        <Title>Notifications</Title>
        <HeaderActions>
          <IconButton onClick={markAllAsRead} title="Mark all as read">
            <Settings size={16} />
          </IconButton>
          <IconButton onClick={onClose}>
            <X size={16} />
          </IconButton>
        </HeaderActions>
      </Header>

      <FilterTabs>
        {filters.map(filter => (
          <FilterTab
            key={filter.id}
            active={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.name}
          </FilterTab>
        ))}
      </FilterTabs>

      <NotificationsList>
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => {
              const IconComponent = getNotificationIcon(notification.type);
              
              return (
                <NotificationItem
                  key={notification.id}
                  unread={notification.unread}
                  onClick={() => markAsRead(notification.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ x: 4 }}
                >
                  <NotificationIcon type={notification.type}>
                    <IconComponent />
                  </NotificationIcon>
                  
                  <NotificationContent>
                    <NotificationText>
                      <span className="username">{notification.user.name}</span>
                      <span className="action"> {notification.text}</span>
                    </NotificationText>
                    <NotificationTime>{notification.time}</NotificationTime>
                  </NotificationContent>
                  
                  {notification.media && (
                    <NotificationMedia src={notification.media} alt="Media" />
                  )}
                </NotificationItem>
              );
            })
          ) : (
            <EmptyState>
              <HeartIcon />
              <h4>No notifications</h4>
              <p>You're all caught up!</p>
            </EmptyState>
          )}
        </AnimatePresence>
      </NotificationsList>
    </NotificationsContainer>
  );
};

export default NotificationsPanel;