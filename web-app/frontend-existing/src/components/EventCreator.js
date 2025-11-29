import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  PhotoIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { Clock, Users, Send } from 'lucide-react';

const Container = styled(motion.div)`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 16px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const DateTimeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LocationInput = styled.div`
  position: relative;
  
  input {
    padding-left: 40px;
  }
  
  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const PrivacySelector = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const PrivacyOption = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary + '20' : 'transparent'};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ImageUpload = styled.div`
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
  
  input {
    display: none;
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 12px;
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 12px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    background: #166fe5;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EventCreator = ({ onEventCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    category: '',
    isPrivate: false
  });
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData = new FormData();
      Object.keys(formData).forEach(key => {
        eventData.append(key, formData[key]);
      });
      
      if (coverImage) {
        eventData.append('coverImage', coverImage.file);
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: eventData
      });

      if (response.ok) {
        const event = await response.json();
        onEventCreated?.(event);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          location: '',
          category: '',
          isPrivate: false
        });
        setCoverImage(null);
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CalendarDaysIcon style={{ width: '24px', height: '24px' }} />
        Create Event
      </h2>

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <label>Event Title</label>
          <Input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="What's the name of your event?"
            required
          />
        </FormGroup>

        <FormGroup>
          <label>Description</label>
          <TextArea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Tell people more about your event..."
          />
        </FormGroup>

        <FormGroup>
          <label>When</label>
          <DateTimeRow>
            <div>
              <Input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
              />
              <Input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                style={{ marginTop: '8px' }}
                required
              />
            </div>
            <div>
              <Input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
              />
              <Input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                style={{ marginTop: '8px' }}
              />
            </div>
          </DateTimeRow>
        </FormGroup>

        <FormGroup>
          <label>Location</label>
          <LocationInput>
            <MapPinIcon />
            <Input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Where is your event?"
            />
          </LocationInput>
        </FormGroup>

        <FormGroup>
          <label>Category</label>
          <Input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            placeholder="e.g., Music, Sports, Business, Social"
          />
        </FormGroup>

        <FormGroup>
          <label>Privacy</label>
          <PrivacySelector>
            <PrivacyOption
              type="button"
              active={!formData.isPrivate}
              onClick={() => setFormData(prev => ({ ...prev, isPrivate: false }))}
            >
              <GlobeAltIcon style={{ width: '16px', height: '16px' }} />
              Public
            </PrivacyOption>
            <PrivacyOption
              type="button"
              active={formData.isPrivate}
              onClick={() => setFormData(prev => ({ ...prev, isPrivate: true }))}
            >
              <LockClosedIcon style={{ width: '16px', height: '16px' }} />
              Private
            </PrivacyOption>
          </PrivacySelector>
        </FormGroup>

        <FormGroup>
          <label>Cover Photo</label>
          <ImageUpload onClick={() => document.getElementById('cover-upload').click()}>
            <PhotoIcon style={{ width: '32px', height: '32px', margin: '0 auto 8px' }} />
            <p>Click to upload a cover photo</p>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </ImageUpload>
          {coverImage && <PreviewImage src={coverImage.preview} alt="Cover preview" />}
        </FormGroup>

        <CreateButton type="submit" disabled={loading}>
          <Send size={16} />
          {loading ? 'Creating Event...' : 'Create Event'}
        </CreateButton>
      </form>
    </Container>
  );
};

export default EventCreator;