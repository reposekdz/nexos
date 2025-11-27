import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { CheckCircle, MapPin, Briefcase, GraduationCap, Link as LinkIcon, Settings, Users, TrendingUp, Award, Star, Video, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const EnhancedProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetchProfile();
    fetchInsights();
  }, [userId]);

  const fetchProfile = async () => {
    const res = await axios.get(`/api/users/${userId}`);
    setProfile(res.data);
  };

  const fetchInsights = async () => {
    const res = await axios.get(`/api/profile-complete/insights`);
    setInsights(res.data);
  };

  if (!profile) return <Loading>Loading...</Loading>;

  return (
    <Container>
      <CoverSection coverType={profile.coverType}>
        {profile.coverType === 'video' ? (
          <CoverVideo src={profile.coverPhoto} autoPlay loop muted />
        ) : (
          <CoverImage src={profile.coverPhoto || '/default-cover.jpg'} />
        )}
        <CoverOverlay>
          <ProfileType>{profile.profileType || 'Personal'}</ProfileType>
        </CoverOverlay>
      </CoverSection>

      <ProfileHeader>
        <AvatarSection>
          <Avatar src={profile.avatar || '/default-avatar.png'} />
          {profile.isVerified && (
            <VerifiedBadge>
              <CheckCircle size={24} />
            </VerifiedBadge>
          )}
        </AvatarSection>

        <InfoSection>
          <Name>{profile.fullName}</Name>
          <Username>@{profile.username}</Username>
          
          {profile.bio && (
            <Bio>
              <BioText>{profile.bio.text || profile.bio}</BioText>
              {profile.bio.embeds && (
                <Embeds>
                  {profile.bio.embeds.map((embed, i) => (
                    <Embed key={i} dangerouslySetInnerHTML={{ __html: embed }} />
                  ))}
                </Embeds>
              )}
            </Bio>
          )}

          <MetaInfo>
            {profile.location && (
              <MetaItem>
                <MapPin size={16} />
                {profile.location.city}, {profile.location.country}
              </MetaItem>
            )}
            {profile.work && profile.work[0] && (
              <MetaItem>
                <Briefcase size={16} />
                {profile.work[0].position} at {profile.work[0].company}
              </MetaItem>
            )}
            {profile.education && profile.education[0] && (
              <MetaItem>
                <GraduationCap size={16} />
                {profile.education[0].school}
              </MetaItem>
            )}
          </MetaInfo>

          {profile.socialLinks && (
            <SocialLinks>
              {profile.socialLinks.website && (
                <SocialLink href={profile.socialLinks.website} target="_blank">
                  <LinkIcon size={16} />
                  Website
                </SocialLink>
              )}
              {profile.socialLinks.twitter && (
                <SocialLink href={`https://twitter.com/${profile.socialLinks.twitter}`} target="_blank">
                  Twitter
                </SocialLink>
              )}
              {profile.socialLinks.linkedin && (
                <SocialLink href={profile.socialLinks.linkedin} target="_blank">
                  LinkedIn
                </SocialLink>
              )}
            </SocialLinks>
          )}
        </InfoSection>

        <ActionsSection>
          <ActionButton primary>
            <Users size={18} />
            Follow
          </ActionButton>
          <ActionButton>
            <Settings size={18} />
          </ActionButton>
        </ActionsSection>
      </ProfileHeader>

      <StatsBar>
        <Stat>
          <StatValue>{profile.posts?.length || 0}</StatValue>
          <StatLabel>Posts</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{profile.followers?.length || 0}</StatValue>
          <StatLabel>Followers</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{profile.following?.length || 0}</StatValue>
          <StatLabel>Following</StatLabel>
        </Stat>
        {insights && (
          <>
            <Stat>
              <StatValue>{insights.totalLikes}</StatValue>
              <StatLabel>Likes</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{insights.profileViews}</StatValue>
              <StatLabel>Views</StatLabel>
            </Stat>
          </>
        )}
      </StatsBar>

      {profile.badges && profile.badges.length > 0 && (
        <BadgesSection>
          {profile.badges.map((badge, i) => (
            <Badge key={i}>
              <Award size={16} />
              {badge.type}
            </Badge>
          ))}
        </BadgesSection>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <SkillsSection>
          <SectionTitle>Skills</SectionTitle>
          <SkillsList>
            {profile.skills.map((skill, i) => (
              <Skill key={i}>
                <SkillName>{skill}</SkillName>
                <EndorseButton>
                  <Star size={14} />
                  Endorse
                </EndorseButton>
              </Skill>
            ))}
          </SkillsList>
        </SkillsSection>
      )}

      <TabsSection>
        <Tab active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
          <ImageIcon size={18} />
          Posts
        </Tab>
        <Tab active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>
          <Video size={18} />
          Videos
        </Tab>
        <Tab active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
          About
        </Tab>
      </TabsSection>

      <ContentSection>
        {activeTab === 'posts' && <div>Posts content...</div>}
        {activeTab === 'videos' && <div>Videos content...</div>}
        {activeTab === 'about' && (
          <AboutSection>
            <h3>About</h3>
            <p>{profile.bio?.text || profile.bio}</p>
          </AboutSection>
        )}
      </ContentSection>
    </Container>
  );
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: white;
`;

const CoverSection = styled.div`
  position: relative;
  height: 400px;
  overflow: hidden;
`;

const CoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CoverVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CoverOverlay = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
`;

const ProfileType = styled.div`
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
`;

const ProfileHeader = styled.div`
  display: flex;
  gap: 30px;
  padding: 30px;
  position: relative;
  margin-top: -80px;
`;

const AvatarSection = styled.div`
  position: relative;
`;

const Avatar = styled.img`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 5px solid white;
  object-fit: cover;
`;

const VerifiedBadge = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #1877f2;
  color: white;
  border-radius: 50%;
  padding: 4px;
  border: 3px solid white;
`;

const InfoSection = styled.div`
  flex: 1;
`;

const Name = styled.h1`
  margin: 0 0 5px 0;
  font-size: 32px;
`;

const Username = styled.div`
  color: #666;
  font-size: 18px;
  margin-bottom: 15px;
`;

const Bio = styled.div`
  margin: 15px 0;
`;

const BioText = styled.p`
  margin: 0 0 10px 0;
  line-height: 1.6;
`;

const Embeds = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Embed = styled.div`
  max-width: 300px;
`;

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 15px 0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 15px;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  gap: 5px;
  color: #1877f2;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const ActionsSection = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: ${props => props.primary ? '#1877f2' : 'white'};
  color: ${props => props.primary ? 'white' : 'black'};
  cursor: pointer;
  font-weight: 600;
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 20px;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
`;

const Stat = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: bold;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 14px;
`;

const BadgesSection = styled.div`
  display: flex;
  gap: 10px;
  padding: 20px;
  flex-wrap: wrap;
`;

const Badge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f0f2f5;
  padding: 8px 16px;
  border-radius: 20px;
  color: #1877f2;
  font-weight: 600;
`;

const SkillsSection = styled.div`
  padding: 20px;
  border-top: 1px solid #ddd;
`;

const SectionTitle = styled.h3`
  margin: 0 0 15px 0;
`;

const SkillsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Skill = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const SkillName = styled.div`
  font-weight: 600;
`;

const EndorseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid #1877f2;
  color: #1877f2;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
`;

const TabsSection = styled.div`
  display: flex;
  border-bottom: 1px solid #ddd;
  padding: 0 20px;
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 3px solid ${props => props.active ? '#1877f2' : 'transparent'};
  color: ${props => props.active ? '#1877f2' : '#666'};
  font-weight: ${props => props.active ? '600' : '400'};
`;

const ContentSection = styled.div`
  padding: 20px;
`;

const AboutSection = styled.div`
  h3 { margin-top: 0; }
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
`;

export default EnhancedProfile;
