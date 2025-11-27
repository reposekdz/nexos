import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const UserAvatar = ({ user, size = 40, showName = false, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/profile/${user._id || user.id}`);
    }
  };

  return (
    <Container onClick={handleClick}>
      <Avatar src={user.avatar || '/default-avatar.png'} size={size} />
      {showName && (
        <Info>
          <Name>
            {user.username}
            {user.isVerified && <Verified>✓</Verified>}
          </Name>
          {user.fullName && <FullName>{user.fullName}</FullName>}
        </Info>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  &:hover { opacity: 0.8; }
`;

const Avatar = styled.img`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  object-fit: cover;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
`;

const Name = styled.div`
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Verified = styled.span`
  background: #1877f2;
  color: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
`;

const FullName = styled.div`
  font-size: 12px;
  color: #666;
`;

export default UserAvatar;
