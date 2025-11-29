import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReelsViewer = () => {
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const videoRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (video) {
        if (i === currentIndex) {
          video.play();
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex]);

  const fetchReels = async () => {
    const res = await axios.get('/api/reels');
    setReels(res.data);
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / window.innerHeight);
    setCurrentIndex(index);
  };

  const handleLike = async (reelId) => {
    await axios.post(`/api/interactions/reels/${reelId}/like`);
    fetchReels();
  };

  const handleComment = async (reelId) => {
    await axios.post(`/api/interactions/reels/${reelId}/comment`, { text: comment });
    setComment('');
    fetchReels();
  };

  const handleShare = async (reelId) => {
    await axios.post(`/api/interactions/reels/${reelId}/share`);
    alert('Reel shared!');
  };

  return (
    <Container onScroll={handleScroll}>
      {reels.map((reel, index) => (
        <ReelCard key={reel._id}>
          <Video 
            ref={el => videoRefs.current[index] = el}
            src={reel.video?.url}
            loop
            playsInline
          />

          <Overlay>
            <Header onClick={() => navigate(`/profile/${reel.author._id}`)}>
              <Avatar src={reel.author.avatar || '/default-avatar.png'} />
              <Username>{reel.author.username}</Username>
              {reel.author.isVerified && <Verified>✓</Verified>}
            </Header>

            <Caption>{reel.caption}</Caption>

            <Actions>
              <Action onClick={() => handleLike(reel._id)}>
                <Icon liked={reel.likes?.includes(localStorage.getItem('userId'))}>❤️</Icon>
                <Count>{reel.likes?.length || 0}</Count>
              </Action>

              <Action onClick={() => setShowComments(!showComments)}>
                <Icon>💬</Icon>
                <Count>{reel.comments?.length || 0}</Count>
              </Action>

              <Action onClick={() => handleShare(reel._id)}>
                <Icon>📤</Icon>
              </Action>

              <Action>
                <Icon>🎵</Icon>
              </Action>
            </Actions>
          </Overlay>

          {showComments && (
            <CommentsPanel>
              <CommentsHeader>
                <h3>Comments</h3>
                <CloseBtn onClick={() => setShowComments(false)}>×</CloseBtn>
              </CommentsHeader>
              <CommentsList>
                {reel.comments?.map((c, i) => (
                  <CommentItem key={i}>
                    <CommentAvatar src={c.user?.avatar || '/default-avatar.png'} />
                    <CommentContent>
                      <CommentUser>{c.user?.username}</CommentUser>
                      <CommentText>{c.text}</CommentText>
                    </CommentContent>
                  </CommentItem>
                ))}
              </CommentsList>
              <CommentInput>
                <Input 
                  placeholder="Add a comment..." 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <PostBtn onClick={() => handleComment(reel._id)}>Post</PostBtn>
              </CommentInput>
            </CommentsPanel>
          )}
        </ReelCard>
      ))}
    </Container>
  );
};

const Container = styled.div`
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  &::-webkit-scrollbar { display: none; }
`;

const ReelCard = styled.div`
  height: 100vh;
  position: relative;
  scroll-snap-align: start;
  background: #000;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(transparent 50%, rgba(0,0,0,0.7));
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid white;
`;

const Username = styled.span`
  color: white;
  font-weight: 600;
`;

const Verified = styled.span`
  background: #1877f2;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const Caption = styled.div`
  color: white;
  margin-bottom: 20px;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: absolute;
  right: 20px;
  bottom: 100px;
`;

const Action = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`;

const Icon = styled.div`
  font-size: 32px;
  filter: ${props => props.liked ? 'none' : 'grayscale(1)'};
`;

const Count = styled.div`
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const CommentsPanel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: white;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
`;

const CommentsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
`;

const CommentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 15px 20px;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const CommentAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentUser = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const CommentText = styled.div`
  color: #333;
`;

const CommentInput = styled.div`
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #ddd;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 20px;
`;

const PostBtn = styled.button`
  padding: 10px 20px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
`;

export default ReelsViewer;
