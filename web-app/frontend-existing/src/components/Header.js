import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  VideoCameraIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { logout } from '../store/slices/authSlice';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
`;

const Logo = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 24px;
  font-weight: bold;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  margin: 0 20px;
`;

const SearchBar = styled.input`
  width: 100%;
  padding: 8px 16px 8px 40px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  background: ${props => props.theme.colors.background};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
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

const SearchResults = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows.large};
  max-height: 300px;
  overflow-y: auto;
  z-index: 1001;
`;

const NavIcons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
`;

const IconButton = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.colors.hover};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.border};
    transform: scale(1.05);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.theme.colors.text};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: ${props => props.theme.colors.error};
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
`;

const UserMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows.large};
  min-width: 200px;
  z-index: 1001;
  overflow: hidden;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const Header = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications] = useState(5); // Mock notification count
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.length > 0);
  };

  return (
    <HeaderContainer>
      <Logo onClick={() => navigate('/')}>Nexos</Logo>
      
      <SearchContainer>
        <SearchIcon />
        <SearchBar 
          placeholder="Search people, posts, groups..."
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => searchQuery && setShowSearchResults(true)}
        />
        <AnimatePresence>
          {showSearchResults && (
            <SearchResults
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div style={{ padding: '12px 16px', color: '#666' }}>Search results for "{searchQuery}"</div>
            </SearchResults>
          )}
        </AnimatePresence>
      </SearchContainer>

      <NavIcons>
        <IconButton onClick={() => navigate('/messages')}>
          <ChatBubbleLeftRightIcon />
        </IconButton>
        
        <IconButton onClick={() => navigate('/groups')}>
          <UserGroupIcon />
        </IconButton>
        
        <IconButton onClick={() => navigate('/marketplace')}>
          <ShoppingBagIcon />
        </IconButton>
        
        <IconButton onClick={() => navigate('/live')}>
          <VideoCameraIcon />
        </IconButton>
        
        <IconButton>
          <BellIcon />
          {notifications > 0 && <NotificationBadge>{notifications}</NotificationBadge>}
        </IconButton>
      </NavIcons>

      <UserSection ref={menuRef}>
        <Avatar 
          src={user?.avatar || '/default-avatar.png'} 
          alt={user?.fullName}
          onClick={() => setShowUserMenu(!showUserMenu)}
        />
        
        <AnimatePresence>
          {showUserMenu && (
            <UserMenu
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
            >
              <MenuItem onClick={() => navigate(`/profile/${user?.username}`)}>
                <Avatar src={user?.avatar} style={{ width: '16px', height: '16px' }} />
                View Profile
              </MenuItem>
              <MenuItem onClick={() => navigate('/settings')}>
                <Cog6ToothIcon />
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ArrowRightOnRectangleIcon />
                Logout
              </MenuItem>
            </UserMenu>
          )}
        </AnimatePresence>
      </UserSection>
    </HeaderContainer>
  );
};

export default Header;