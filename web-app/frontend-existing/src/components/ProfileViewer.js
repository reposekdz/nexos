import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const ProfileViewer = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const [profileRes, postsRes] = await Promise.all([
      axios.get(`/api/users/${userId}`),
      axios.get(`/api/posts/user/${userId}`)
    ]);
    setProfile(profileRes.data);
    setPosts(postsRes.data);
    setIsFollowing(profileRes.data.followers?.includes(localStorage.getItem('userId')));
  };

  const handleFollow = async () => {
    if (isFollowing) {
      await axios.post(`/api/follow/${userId}/unfollow`);
    } else {
      await axios.post(`/api/follow/${userId}/follow`);
    }
    setIsFollowing(!isFollowing);
    fetchProfile();
  };

  const handleMessage = () => {
    navigate(`/messages/${userId}`);
  };

  if (!profile) return <Loading>Loading...</Loading>;

  return (
    <Container>
      <Header>
        <Avatar src={profile.avatar || '/default-avatar.png'} onClick={() => setShowFollowers(true)} />
        <Info>
          <Username>
            {profile.username}
            {profile.isVerified && <Verified>✓</Verified>}
          </Username>
          <Stats>
            <Stat onClick={() => setActiveTab('posts')}>
              <Count>{posts.length}</Count>
              <Label>Posts</Label>
            </Stat>
            <Stat onClick={() => setShowFollowers(true)}>
              <Count>{profile.followers?.length || 0}</Count>
              <Label>Followers</Label>
            </Stat>
            <Stat onClick={() => setShowFollowing(true)}>
              <Count>{profile.following?.length || 0}</Count>
              <Label>Following</Label>
            </Stat>
          </Stats>
          <Actions>
            <Button primary onClick={handleFollow}>{isFollowing ? 'Unfollow' : 'Follow'}</Button>
            <Button onClick={handleMessage}>Message</Button>
          </Actions>
        </Info>
      </Header>

      <Bio>
        <FullName>{profile.fullName}</FullName>
        <BioText>{profile.bio}</BioText>
        {profile.website && <Website href={profile.website} target="_blank">{profile.website}</Website>}
      </Bio>

      <Tabs>
        <Tab active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>Posts</Tab>
        <Tab active={activeTab === 'reels'} onClick={() => setActiveTab('reels')}>Reels</Tab>
        <Tab active={activeTab === 'tagged'} onClick={() => setActiveTab('tagged')}>Tagged</Tab>
      </Tabs>

      <Content>
        {activeTab === 'posts' && (
          <Grid>
            {posts.map(post => (
              <PostCard key={post._id} onClick={() => navigate(`/post/${post._id}`)}>
                {post.media?.[0] && <img src={post.media[0].url} alt="" />}
                <Overlay>
                  <span>❤️ {post.likes?.length}</span>
                  <span>💬 {post.comments?.length}</span>
                </Overlay>
              </PostCard>
            ))}
          </Grid>
        )}
      </Content>

      {showFollowers && (
        <Modal onClick={() => setShowFollowers(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>Followers</h3>
              <Close onClick={() => setShowFollowers(false)}>×</Close>
            </ModalHeader>
            <UserList userId={userId} type="followers" />
          </ModalContent>
        </Modal>
      )}

      {showFollowing && (
        <Modal onClick={() => setShowFollowing(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>Following</h3>
              <Close onClick={() => setShowFollowing(false)}>×</Close>
            </ModalHeader>
            <UserList userId={userId} type="following" />
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

const UserList = ({ userId, type }) => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await axios.get(`/api/follow/${userId}/${type}`);
    setUsers(res.data[type]);
  };

  const handleFollow = async (targetId, isFollowing) => {
    if (isFollowing) {
      await axios.post(`/api/follow/${targetId}/unfollow`);
    } else {
      await axios.post(`/api/follow/${targetId}/follow`);
    }
    fetchUsers();
  };

  return (
    <List>
      {users.map(user => (
        <UserItem key={user._id}>
          <UserAvatar src={user.avatar || '/default-avatar.png'} onClick={() => navigate(`/profile/${user._id}`)} />
          <UserInfo onClick={() => navigate(`/profile/${user._id}`)}>
            <UserName>{user.username}</UserName>
            <UserBio>{user.bio}</UserBio>
          </UserInfo>
          <FollowBtn onClick={() => handleFollow(user._id, user.isFollowedByYou)}>
            {user.isFollowedByYou ? 'Unfollow' : 'Follow'}
          </FollowBtn>
        </UserItem>
      ))}
    </List>
  );
};

const Container = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const Header = styled.div`
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
`;

const Avatar = styled.img`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  cursor: pointer;
  object-fit: cover;
`;

const Info = styled.div`
  flex: 1;
`;

const Username = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
`;

const Verified = styled.span`
  background: #1877f2;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const Stats = styled.div`
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
`;

const Stat = styled.div`
  cursor: pointer;
  text-align: center;
`;

const Count = styled.div`
  font-weight: bold;
  font-size: 18px;
`;

const Label = styled.div`
  color: #666;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  padding: 8px 24px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: ${props => props.primary ? '#1877f2' : 'white'};
  color: ${props => props.primary ? 'white' : 'black'};
  cursor: pointer;
  font-weight: 600;
`;

const Bio = styled.div`
  margin-bottom: 30px;
`;

const FullName = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const BioText = styled.div`
  margin-bottom: 5px;
`;

const Website = styled.a`
  color: #1877f2;
  text-decoration: none;
`;

const Tabs = styled.div`
  display: flex;
  border-top: 1px solid #ddd;
  justify-content: center;
  gap: 60px;
`;

const Tab = styled.div`
  padding: 15px 0;
  cursor: pointer;
  border-top: 2px solid ${props => props.active ? '#000' : 'transparent'};
  font-weight: ${props => props.active ? '600' : '400'};
  margin-top: -1px;
`;

const Content = styled.div`
  margin-top: 30px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
`;

const PostCard = styled.div`
  aspect-ratio: 1;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
  &:hover > div { opacity: 1; }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: white;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.2s;
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 400px;
  max-height: 500px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
`;

const Close = styled.button`
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
`;

const List = styled.div`
  overflow-y: auto;
  max-height: 400px;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 12px;
  &:hover { background: #f5f5f5; }
`;

const UserAvatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
`;

const UserInfo = styled.div`
  flex: 1;
  cursor: pointer;
`;

const UserName = styled.div`
  font-weight: 600;
`;

const UserBio = styled.div`
  font-size: 14px;
  color: #666;
`;

const FollowBtn = styled.button`
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-weight: 600;
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
`;

export default ProfileViewer;
