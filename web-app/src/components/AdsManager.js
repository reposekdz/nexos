import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const AdsManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    campaignName: '',
    format: 'image',
    budget: { type: 'daily', amount: 10 },
    bidding: { strategy: 'cpc', bidAmount: 0.5 }
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const res = await axios.get('/api/ads/campaigns');
    setCampaigns(res.data);
  };

  const createCampaign = async () => {
    await axios.post('/api/ads/campaigns', formData);
    fetchCampaigns();
    setShowCreate(false);
  };

  return (
    <Container>
      <Header>
        <h2>Ads Manager</h2>
        <Button onClick={() => setShowCreate(true)}>Create Campaign</Button>
      </Header>
      
      {showCreate && (
        <CreateForm>
          <input placeholder="Campaign Name" onChange={(e) => setFormData({...formData, campaignName: e.target.value})} />
          <select onChange={(e) => setFormData({...formData, format: e.target.value})}>
            <option value="image">Image Ad</option>
            <option value="video">Video Ad</option>
            <option value="carousel">Carousel</option>
            <option value="stories">Stories</option>
          </select>
          <input type="number" placeholder="Budget" onChange={(e) => setFormData({...formData, budget: {...formData.budget, amount: e.target.value}})} />
          <Button onClick={createCampaign}>Create</Button>
        </CreateForm>
      )}

      <CampaignList>
        {campaigns.map(c => (
          <Campaign key={c._id}>
            <h3>{c.campaignName}</h3>
            <p>Status: {c.status}</p>
            <p>Impressions: {c.metrics.impressions}</p>
            <p>Clicks: {c.metrics.clicks}</p>
            <p>Spent: ${c.budget.spent}</p>
          </Campaign>
        ))}
      </CampaignList>
    </Container>
  );
};

const Container = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

const CreateForm = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-direction: column;
`;

const CampaignList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const Campaign = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export default AdsManager;
