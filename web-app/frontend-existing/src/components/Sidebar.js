import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

const SidebarContainer = styled.nav`
  position: fixed;
  left: 0;
  top: 60px;
  width: 250px;
  height: calc(100vh - 60px);
  background: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  padding: 20px 0;
  z-index: 100;
  
  @media (max-width: 768px) {
    bottom: 0;
    top: auto;
    width: 100%;
    height: 60px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${props => props.theme.colors.text};
  text-decoration: none;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
  
  &.active {
    background: ${props => props.theme.colors.primary}20;
    color: ${props => props.theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 8px;
    font-size: 12px;
  }
`;

const Icon = styled.span`
  margin-right: 12px;
  font-size: 20px;
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 4px;
  }
`;

const Sidebar = () => {
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/explore', icon: '🔍', label: 'Explore' },
    { path: '/reels', icon: '🎬', label: 'Reels' },
    { path: '/messages', icon: '💬', label: 'Messages' },
    { path: '/stories', icon: '📖', label: 'Stories' },
    { path: '/groups', icon: '👥', label: 'Groups' },
    { path: '/marketplace', icon: '🛒', label: 'Marketplace' }
  ];

  return (
    <SidebarContainer>
      {navItems.map(item => (
        <NavItem key={item.path} to={item.path}>
          <Icon>{item.icon}</Icon>
          {item.label}
        </NavItem>
      ))}
    </SidebarContainer>
  );
};

export default Sidebar;