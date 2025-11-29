import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import io from 'socket.io-client';
import {
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  LockClosedIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const ModerationConsole = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [moderators, setModerators] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    
    socketRef.current.emit('join-moderation', { moderatorId: currentUserId });
    
    socketRef.current.on('moderator-joined', (data) => {
      setModerators(prev => [...prev.filter(m => m.id !== data.moderator.id), data.moderator]);
    });

    socketRef.current.on('moderator-left', (data) => {
      setModerators(prev => prev.filter(m => m.id !== data.moderatorId));
    });

    socketRef.current.on('case-locked', (data) => {
      if (selectedReport?._id === data.caseId) {
        setActiveCase(data);
      }
    });

    socketRef.current.on('case-unlocked', (data) => {
      if (activeCase?.caseId === data.caseId) {
        setActiveCase(null);
      }
    });

    socketRef.current.on('annotation-added', (data) => {
      if (selectedReport?._id === data.caseId) {
        setAnnotations(prev => [...prev, data.annotation]);
      }
    });

    socketRef.current.on('action-taken', (data) => {
      if (selectedReport?._id === data.caseId) {
        setActions(prev => [...prev, data.action]);
      }
    });

    socketRef.current.on('moderator-cursor', (data) => {
    });

    fetchReports();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-moderation', { moderatorId: currentUserId });
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/moderation/reports?status=${filter}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    setLoading(true);
    
    try {
      const [annotationsRes, actionsRes] = await Promise.all([
        axios.get(`/api/moderation/reports/${report._id}/annotations`),
        axios.get(`/api/moderation/reports/${report._id}/actions`)
      ]);
      
      setAnnotations(annotationsRes.data);
      setActions(actionsRes.data);
      
      socketRef.current.emit('lock-case', {
        caseId: report._id,
        moderatorId: currentUserId
      });
    } catch (error) {
      console.error('Error loading report details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.trim()) return;
    
    try {
      const response = await axios.post(
        `/api/moderation/reports/${selectedReport._id}/annotations`,
        { text: newAnnotation }
      );
      
      socketRef.current.emit('add-annotation', {
        caseId: selectedReport._id,
        annotation: response.data
      });
      
      setNewAnnotation('');
    } catch (error) {
      console.error('Error adding annotation:', error);
    }
  };

  const handleAction = async (actionType, reason) => {
    try {
      const response = await axios.post(
        `/api/moderation/reports/${selectedReport._id}/action`,
        { action: actionType, reason }
      );
      
      socketRef.current.emit('action-taken', {
        caseId: selectedReport._id,
        action: response.data
      });
      
      socketRef.current.emit('unlock-case', {
        caseId: selectedReport._id,
        moderatorId: currentUserId
      });
      
      setSelectedReport(null);
      setActiveCase(null);
      fetchReports();
      
      alert(`Action ${actionType} completed successfully`);
    } catch (error) {
      console.error('Error taking action:', error);
      alert('Failed to complete action');
    }
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'spam':
        return <FlagIcon style={{ width: 20, height: 20 }} />;
      case 'harassment':
        return <UsersIcon style={{ width: 20, height: 20 }} />;
      case 'inappropriate':
        return <EyeIcon style={{ width: 20, height: 20 }} />;
      default:
        return <FlagIcon style={{ width: 20, height: 20 }} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low':
        return '#52c41a';
      case 'medium':
        return '#faad14';
      case 'high':
        return '#ff4d4f';
      case 'critical':
        return '#a8071a';
      default:
        return '#999';
    }
  };

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <h2>Moderation Queue</h2>
          <OnlineModerators>
            <UsersIcon style={{ width: 16, height: 16 }} />
            <span>{moderators.length} online</span>
          </OnlineModerators>
        </SidebarHeader>

        <FilterTabs>
          <FilterTab 
            active={filter === 'pending'} 
            onClick={() => setFilter('pending')}
          >
            Pending ({reports.filter(r => r.status === 'pending').length})
          </FilterTab>
          <FilterTab 
            active={filter === 'in_review'} 
            onClick={() => setFilter('in_review')}
          >
            In Review
          </FilterTab>
          <FilterTab 
            active={filter === 'resolved'} 
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </FilterTab>
        </FilterTabs>

        <ReportsList>
          {loading ? (
            <LoadingState>Loading...</LoadingState>
          ) : reports.length === 0 ? (
            <EmptyState>No reports found</EmptyState>
          ) : (
            reports.map(report => (
              <ReportItem
                key={report._id}
                selected={selectedReport?._id === report._id}
                onClick={() => handleSelectReport(report)}
              >
                <ReportHeader>
                  <ReportType>{getReportTypeIcon(report.type)}</ReportType>
                  <ReportTime>
                    <ClockIcon style={{ width: 14, height: 14 }} />
                    {new Date(report.createdAt).toLocaleString()}
                  </ReportTime>
                </ReportHeader>
                <ReportContent>
                  <ReportTitle>{report.reason}</ReportTitle>
                  <SeverityBadge color={getSeverityColor(report.severity)}>
                    {report.severity}
                  </SeverityBadge>
                </ReportContent>
                <ReportMeta>
                  <span>By: {report.reporter?.username}</span>
                  {report.lockedBy && (
                    <LockedBadge>
                      <LockClosedIcon style={{ width: 12, height: 12 }} />
                      {report.lockedBy.username}
                    </LockedBadge>
                  )}
                </ReportMeta>
              </ReportItem>
            ))
          )}
        </ReportsList>
      </Sidebar>

      <MainContent>
        {!selectedReport ? (
          <EmptySelection>
            <DocumentTextIcon style={{ width: 64, height: 64, color: '#999' }} />
            <p>Select a report to review</p>
          </EmptySelection>
        ) : (
          <ReportDetails>
            <DetailsHeader>
              <div>
                <h2>{selectedReport.reason}</h2>
                <DetailsMeta>
                  Report #{selectedReport._id.substring(0, 8)} • 
                  Reported by {selectedReport.reporter?.username} • 
                  {new Date(selectedReport.createdAt).toLocaleString()}
                </DetailsMeta>
              </div>
              {activeCase?.moderatorId !== currentUserId && activeCase ? (
                <LockedBanner>
                  <LockClosedIcon style={{ width: 20, height: 20 }} />
                  Currently locked by {activeCase.moderatorName}
                </LockedBanner>
              ) : null}
            </DetailsHeader>

            <ContentPreview>
              <SectionTitle>Reported Content</SectionTitle>
              <ContentBox>
                {selectedReport.contentType === 'post' && (
                  <div>
                    <p><strong>Post Content:</strong></p>
                    <p>{selectedReport.content?.text}</p>
                    {selectedReport.content?.media && (
                      <ContentMedia src={selectedReport.content.media} alt="Reported content" />
                    )}
                  </div>
                )}
                {selectedReport.contentType === 'comment' && (
                  <div>
                    <p><strong>Comment:</strong></p>
                    <p>{selectedReport.content?.text}</p>
                  </div>
                )}
                {selectedReport.contentType === 'user' && (
                  <div>
                    <p><strong>Reported User:</strong></p>
                    <UserCard>
                      <img src={selectedReport.content?.avatar} alt="" />
                      <div>
                        <p><strong>{selectedReport.content?.username}</strong></p>
                        <p>{selectedReport.content?.bio}</p>
                      </div>
                    </UserCard>
                  </div>
                )}
              </ContentBox>

              <SectionTitle>Evidence & Context</SectionTitle>
              <ContentBox>
                <p><strong>Reason:</strong> {selectedReport.reason}</p>
                <p><strong>Severity:</strong> <SeverityBadge color={getSeverityColor(selectedReport.severity)}>{selectedReport.severity}</SeverityBadge></p>
                <p><strong>Additional Details:</strong> {selectedReport.details || 'None provided'}</p>
              </ContentBox>
            </ContentPreview>

            <CollaborationSection>
              <SectionTitle>
                Team Collaboration
                <ModeratorsList>
                  {moderators
                    .filter(m => m.activeCase === selectedReport._id)
                    .map(mod => (
                      <ModeratorBadge key={mod.id} color={mod.color}>
                        {mod.username}
                      </ModeratorBadge>
                    ))}
                </ModeratorsList>
              </SectionTitle>

              <AnnotationsList>
                <AnimatePresence>
                  {annotations.map((annotation, index) => (
                    <AnnotationItem
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AnnotationHeader>
                        <strong>{annotation.moderator?.username}</strong>
                        <span>{new Date(annotation.timestamp).toLocaleTimeString()}</span>
                      </AnnotationHeader>
                      <AnnotationText>{annotation.text}</AnnotationText>
                    </AnnotationItem>
                  ))}
                </AnimatePresence>
              </AnnotationsList>

              <AnnotationInput>
                <input
                  type="text"
                  placeholder="Add annotation or note..."
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAnnotation()}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                />
                <button 
                  onClick={handleAddAnnotation}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                >
                  Add
                </button>
              </AnnotationInput>
            </CollaborationSection>

            <ActionsSection>
              <SectionTitle>Actions</SectionTitle>
              
              {actions.length > 0 && (
                <ActionHistory>
                  {actions.map((action, index) => (
                    <ActionItem key={index}>
                      <ActionIcon action={action.type}>
                        {action.type === 'approve' ? 
                          <CheckCircleIcon style={{ width: 20, height: 20 }} /> :
                          <XCircleIcon style={{ width: 20, height: 20 }} />
                        }
                      </ActionIcon>
                      <div>
                        <p><strong>{action.moderator?.username}</strong> - {action.type}</p>
                        <p>{action.reason}</p>
                        <p><small>{new Date(action.timestamp).toLocaleString()}</small></p>
                      </div>
                    </ActionItem>
                  ))}
                </ActionHistory>
              )}

              <ActionButtons>
                <ActionButton
                  type="approve"
                  onClick={() => handleAction('approve', 'Content does not violate guidelines')}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                >
                  <CheckCircleIcon style={{ width: 20, height: 20 }} />
                  Approve
                </ActionButton>
                <ActionButton
                  type="warn"
                  onClick={() => handleAction('warn', prompt('Warning reason:'))}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                >
                  <FlagIcon style={{ width: 20, height: 20 }} />
                  Warn User
                </ActionButton>
                <ActionButton
                  type="remove"
                  onClick={() => handleAction('remove', prompt('Removal reason:'))}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                >
                  <XCircleIcon style={{ width: 20, height: 20 }} />
                  Remove Content
                </ActionButton>
                <ActionButton
                  type="ban"
                  onClick={() => handleAction('ban', prompt('Ban reason:'))}
                  disabled={activeCase?.moderatorId !== currentUserId && activeCase}
                >
                  <LockClosedIcon style={{ width: 20, height: 20 }} />
                  Ban User
                </ActionButton>
              </ActionButtons>
            </ActionsSection>
          </ReportDetails>
        )}
      </MainContent>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  background: #f5f5f5;
`;

const Sidebar = styled.div`
  width: 350px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h2 {
    margin: 0 0 10px 0;
    font-size: 20px;
  }
`;

const OnlineModerators = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #52c41a;
  font-size: 14px;
`;

const FilterTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e0e0e0;
`;

const FilterTab = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${props => props.active ? '#1877f2' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? '#1877f2' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#1877f2' : '#f5f5f5'};
  }
`;

const ReportsList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
  color: #999;
`;

const EmptyState = styled.div`
  padding: 40px;
  text-align: center;
  color: #999;
`;

const ReportItem = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  background: ${props => props.selected ? '#e7f3ff' : 'white'};
  transition: background 0.2s;

  &:hover {
    background: ${props => props.selected ? '#e7f3ff' : '#f9f9f9'};
  }
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ReportType = styled.div`
  color: #666;
`;

const ReportTime = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
`;

const ReportContent = styled.div`
  margin-bottom: 8px;
`;

const ReportTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const SeverityBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.color}15;
  color: ${props => props.color};
`;

const ReportMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
`;

const LockedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #faad14;
  font-weight: 500;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const EmptySelection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;

  p {
    margin-top: 16px;
    font-size: 16px;
  }
`;

const ReportDetails = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
`;

const DetailsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;

  h2 {
    margin: 0 0 8px 0;
  }
`;

const DetailsMeta = styled.div`
  color: #666;
  font-size: 14px;
`;

const LockedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  color: #d48806;
  font-weight: 500;
`;

const ContentPreview = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ContentBox = styled.div`
  background: #f9f9f9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;

  p {
    margin: 8px 0;
  }
`;

const ContentMedia = styled.img`
  max-width: 100%;
  margin-top: 12px;
  border-radius: 6px;
`;

const UserCard = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;

  img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
`;

const CollaborationSection = styled.div`
  margin-bottom: 24px;
`;

const ModeratorsList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ModeratorBadge = styled.span`
  padding: 4px 12px;
  border-radius: 12px;
  background: ${props => props.color || '#1877f2'}20;
  color: ${props => props.color || '#1877f2'};
  font-size: 12px;
  font-weight: 500;
`;

const AnnotationsList = styled.div`
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
`;

const AnnotationItem = styled(motion.div)`
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 8px;
`;

const AnnotationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 14px;

  span {
    color: #999;
    font-size: 12px;
  }
`;

const AnnotationText = styled.div`
  font-size: 14px;
  color: #333;
`;

const AnnotationInput = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;

    &:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: #1877f2;
    color: white;
    font-weight: 600;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #166fe5;
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
`;

const ActionsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
`;

const ActionHistory = styled.div`
  margin-bottom: 16px;
`;

const ActionItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 8px;

  p {
    margin: 4px 0;
  }

  small {
    color: #999;
  }
`;

const ActionIcon = styled.div`
  color: ${props => props.action === 'approve' ? '#52c41a' : '#ff4d4f'};
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid ${props => 
    props.type === 'approve' ? '#52c41a' :
    props.type === 'warn' ? '#faad14' :
    props.type === 'remove' ? '#ff4d4f' :
    '#a8071a'
  };
  border-radius: 8px;
  background: white;
  color: ${props => 
    props.type === 'approve' ? '#52c41a' :
    props.type === 'warn' ? '#faad14' :
    props.type === 'remove' ? '#ff4d4f' :
    '#a8071a'
  };
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => 
      props.type === 'approve' ? '#52c41a' :
      props.type === 'warn' ? '#faad14' :
      props.type === 'remove' ? '#ff4d4f' :
      '#a8071a'
    };
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default ModerationConsole;
