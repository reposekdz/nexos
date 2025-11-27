import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { CircleIcon } from '@heroicons/react/24/outline';

const Container = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${props => props.theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const Progress = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #1877f2, #42b883);
  border-radius: 4px;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Task = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.completed ? props.theme.colors.success + '10' : props.theme.colors.background};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateX(4px);
  }
`;

const ProfileCompletion = ({ profile }) => {
  const tasks = [
    { id: 'avatar', label: 'Add profile picture', completed: !!profile.avatar },
    { id: 'bio', label: 'Write a bio', completed: !!profile.bio },
    { id: 'work', label: 'Add work experience', completed: profile.work?.length > 0 },
    { id: 'education', label: 'Add education', completed: profile.education?.length > 0 },
    { id: 'location', label: 'Add location', completed: !!profile.location },
    { id: 'interests', label: 'Add interests', completed: profile.interests?.length > 0 }
  ];

  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  return (
    <Container>
      <Header>
        <h3>Complete Your Profile</h3>
        <span style={{ fontWeight: '600', color: '#1877f2' }}>{Math.round(progress)}%</span>
      </Header>
      
      <ProgressBar>
        <Progress
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </ProgressBar>

      <TaskList>
        {tasks.map(task => (
          <Task key={task.id} completed={task.completed}>
            {task.completed ? (
              <CheckCircleIcon style={{ width: '20px', height: '20px', color: '#42b883' }} />
            ) : (
              <CircleIcon style={{ width: '20px', height: '20px', color: '#999' }} />
            )}
            <span style={{ flex: 1 }}>{task.label}</span>
          </Task>
        ))}
      </TaskList>
    </Container>
  );
};

export default ProfileCompletion;