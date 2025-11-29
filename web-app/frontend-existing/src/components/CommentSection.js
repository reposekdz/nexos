import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Heart, MessageCircle, Send, MoreVertical, Pin, Edit2, Trash2 } from 'lucide-react';
import UserAvatar from './UserAvatar';

const CommentSection = ({ contentId, contentType = 'posts' }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchComments();
  }, [contentId, sortBy]);

  const fetchComments = async () => {
    const res = await axios.get(`/api/comments-advanced/${contentType}/${contentId}/comments?sort=${sortBy}`);
    setComments(res.data.comments);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    if (replyTo) {
      await axios.post(`/api/comments-advanced/${contentType}/${contentId}/comments/${replyTo}/reply`, { text: newComment });
    } else {
      await axios.post(`/api/comments-advanced/${contentType}/${contentId}/comment`, { text: newComment });
    }
    
    setNewComment('');
    setReplyTo(null);
    fetchComments();
  };

  const handleLike = async (commentId) => {
    await axios.post(`/api/comments-advanced/${contentType}/${contentId}/comments/${commentId}/like`);
    fetchComments();
  };

  const handleDelete = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      await axios.delete(`/api/comments-advanced/${contentType}/${contentId}/comments/${commentId}`);
      fetchComments();
    }
  };

  const handleEdit = async (commentId, newText) => {
    await axios.put(`/api/comments-advanced/${contentType}/${contentId}/comments/${commentId}`, { text: newText });
    setEditingComment(null);
    fetchComments();
  };

  const handlePin = async (commentId) => {
    await axios.post(`/api/comments-advanced/${contentType}/${contentId}/comments/${commentId}/pin`);
    fetchComments();
  };

  return (
    <Container>
      <Header>
        <Title>{comments.length} Comments</Title>
        <SortSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Most Recent</option>
          <option value="top">Top Comments</option>
        </SortSelect>
      </Header>

      <InputContainer>
        <UserAvatar user={{ _id: localStorage.getItem('userId'), avatar: localStorage.getItem('userAvatar') }} size={32} />
        <Input 
          placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <SendButton onClick={handleSubmit}>
          <Send size={20} />
        </SendButton>
      </InputContainer>

      {replyTo && (
        <ReplyingTo>
          Replying to comment
          <CancelReply onClick={() => setReplyTo(null)}>Cancel</CancelReply>
        </ReplyingTo>
      )}

      <CommentsList>
        {comments.map(comment => (
          <CommentItem key={comment._id} isPinned={comment.isPinned}>
            {comment.isPinned && <PinnedBadge><Pin size={12} /> Pinned</PinnedBadge>}
            
            <CommentHeader>
              <UserAvatar user={comment.user} size={36} showName />
              <CommentTime>{new Date(comment.createdAt).toLocaleString()}</CommentTime>
              <MoreButton>
                <MoreVertical size={16} />
                <DropdownMenu>
                  <MenuItem onClick={() => handlePin(comment._id)}>
                    <Pin size={14} /> Pin Comment
                  </MenuItem>
                  <MenuItem onClick={() => setEditingComment(comment._id)}>
                    <Edit2 size={14} /> Edit
                  </MenuItem>
                  <MenuItem onClick={() => handleDelete(comment._id)} danger>
                    <Trash2 size={14} /> Delete
                  </MenuItem>
                </DropdownMenu>
              </MoreButton>
            </CommentHeader>

            {editingComment === comment._id ? (
              <EditContainer>
                <Input 
                  defaultValue={comment.text}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(comment._id, e.target.value);
                    }
                  }}
                />
              </EditContainer>
            ) : (
              <CommentText>{comment.text}</CommentText>
            )}

            <CommentActions>
              <ActionButton onClick={() => handleLike(comment._id)}>
                <Heart size={16} fill={comment.likes?.includes(localStorage.getItem('userId')) ? '#f00' : 'none'} />
                {comment.likes?.length || 0}
              </ActionButton>
              <ActionButton onClick={() => setReplyTo(comment._id)}>
                <MessageCircle size={16} />
                Reply
              </ActionButton>
            </CommentActions>

            {comment.replies?.length > 0 && (
              <RepliesList>
                {comment.replies.map((reply, i) => (
                  <Reply key={i}>
                    <UserAvatar user={reply.user} size={28} showName />
                    <ReplyText>{reply.text}</ReplyText>
                    <ReplyTime>{new Date(reply.createdAt).toLocaleString()}</ReplyTime>
                  </Reply>
                ))}
              </RepliesList>
            )}
          </CommentItem>
        ))}
      </CommentsList>
    </Container>
  );
};

const Container = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  margin: 0;
`;

const SortSelect = styled.select`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  &:focus { outline: none; border-color: #1877f2; }
`;

const SendButton = styled.button`
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const ReplyingTo = styled.div`
  background: #f0f2f5;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
`;

const CancelReply = styled.button`
  background: none;
  border: none;
  color: #1877f2;
  cursor: pointer;
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const CommentItem = styled.div`
  padding: 15px;
  border-radius: 8px;
  background: ${props => props.isPinned ? '#f0f8ff' : '#f8f9fa'};
  border: ${props => props.isPinned ? '2px solid #1877f2' : 'none'};
`;

const PinnedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  color: #1877f2;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  position: relative;
`;

const CommentTime = styled.span`
  font-size: 12px;
  color: #666;
  margin-left: auto;
`;

const MoreButton = styled.div`
  cursor: pointer;
  position: relative;
  &:hover > div { display: block; }
`;

const DropdownMenu = styled.div`
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 10;
  min-width: 150px;
`;

const MenuItem = styled.div`
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: ${props => props.danger ? '#f00' : '#000'};
  &:hover { background: #f0f2f5; }
`;

const CommentText = styled.p`
  margin: 0 0 10px 0;
`;

const EditContainer = styled.div`
  margin: 10px 0;
`;

const CommentActions = styled.div`
  display: flex;
  gap: 15px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  &:hover { color: #1877f2; }
`;

const RepliesList = styled.div`
  margin-top: 15px;
  padding-left: 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Reply = styled.div`
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 10px;
  background: white;
  border-radius: 6px;
`;

const ReplyText = styled.div`
  flex: 1;
  font-size: 14px;
`;

const ReplyTime = styled.span`
  font-size: 11px;
  color: #999;
`;

export default CommentSection;
