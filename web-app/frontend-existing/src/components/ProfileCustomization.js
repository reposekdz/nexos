import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { PaintBrushIcon, SwatchIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { Palette, Shield, Eye, Users } from 'lucide-react';

const CustomizationPanel = styled(motion.div)`
  position: fixed;
  right: 20px;
  top: 100px;
  width: 300px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.large};
  padding: 20px;
  z-index: 1000;
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const ThemeOption = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  background: ${props => props.color};
`;

const ToggleSwitch = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px;
  background: ${props => props.theme.colors.hover};
  border: none;
  border-radius: 8px;
  cursor: pointer;
`;

const PrivacyOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  
  select {
    padding: 4px 8px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 4px;
    background: ${props => props.theme.colors.surface};
  }
`;

const ProfileCustomization = ({ onClose }) => {
  const [theme, setTheme] = useState('blue');
  const [darkMode, setDarkMode] = useState(false);
  const [privacy, setPrivacy] = useState({
    profile: 'public',
    posts: 'friends',
    friends: 'friends'
  });

  const themes = [
    { name: 'blue', color: '#1877f2' },
    { name: 'green', color: '#42b883' },
    { name: 'purple', color: '#8b5cf6' },
    { name: 'pink', color: '#ec4899' },
    { name: 'orange', color: '#f97316' },
    { name: 'red', color: '#ef4444' },
    { name: 'teal', color: '#14b8a6' },
    { name: 'indigo', color: '#6366f1' }
  ];

  return (
    <CustomizationPanel
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <Section>
        <h4><Palette size={16} />Theme Colors</h4>
        <ThemeGrid>
          {themes.map(t => (
            <ThemeOption
              key={t.name}
              color={t.color}
              active={theme === t.name}
              onClick={() => setTheme(t.name)}
            />
          ))}
        </ThemeGrid>
      </Section>

      <Section>
        <h4><SwatchIcon style={{ width: '16px', height: '16px' }} />Display</h4>
        <ToggleSwitch onClick={() => setDarkMode(!darkMode)}>
          <span>Dark Mode</span>
          {darkMode ? <MoonIcon style={{ width: '20px', height: '20px' }} /> : <SunIcon style={{ width: '20px', height: '20px' }} />}
        </ToggleSwitch>
      </Section>

      <Section>
        <h4><Shield size={16} />Privacy Settings</h4>
        <PrivacyOption>
          <span>Profile Visibility</span>
          <select value={privacy.profile} onChange={(e) => setPrivacy({...privacy, profile: e.target.value})}>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </PrivacyOption>
        <PrivacyOption>
          <span>Posts Visibility</span>
          <select value={privacy.posts} onChange={(e) => setPrivacy({...privacy, posts: e.target.value})}>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </PrivacyOption>
        <PrivacyOption>
          <span>Friends List</span>
          <select value={privacy.friends} onChange={(e) => setPrivacy({...privacy, friends: e.target.value})}>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </PrivacyOption>
      </Section>
    </CustomizationPanel>
  );
};

export default ProfileCustomization;