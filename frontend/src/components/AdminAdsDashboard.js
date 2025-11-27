import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const AdminAdsDashboard = () => {
  const [pendingAds, setPendingAds] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [pendingRes, statsRes] = await Promise.all([
      axios.get('/api/admin/ads/pending'),
      axios.get('/api/admin/ads/stats')
    ]);
    setPendingAds(pendingRes.data);
    setStats(statsRes.data);
  };

  const approveAd = async (id) => {
    await axios.post(`/api/admin/ads/${id}/approve`);
    fetchData();
  };

  const rejectAd = async (id) => {
    const reason = prompt('Rejection reason:');
    await axios.post(`/api/admin/ads/${id}/reject`, { reason });
    fetchData();
  };

  return (
    <Container>
      <Header>
        <h2>Admin Ads Dashboard</h2>
      </Header>

      <Stats>
        <Stat>
          <Label>Total Ads</Label>
          <Value>{stats.totalAds}</Value>
        </Stat>
        <Stat>
          <Label>Active</Label>
          <Value>{stats.activeAds}</Value>
        </Stat>
        <Stat>
          <Label>Pending</Label>
          <Value>{stats.pendingAds}</Value>
        </Stat>
        <Stat>
          <Label>Revenue</Label>
          <Value>${stats.totalSpent?.toFixed(2)}</Value>
        </Stat>
      </Stats>

      <Section>
        <h3>Pending Approvals ({pendingAds.length})</h3>
        {pendingAds.map(ad => (
          <AdCard key={ad._id}>
            <AdInfo>
              <h4>{ad.campaignName}</h4>
              <p>Advertiser: {ad.advertiser?.username}</p>
              <p>Format: {ad.format}</p>
              <p>Budget: ${ad.budget.amount}</p>
            </AdInfo>
            <Actions>
              <ApproveBtn onClick={() => approveAd(ad._id)}>Approve</ApproveBtn>
              <RejectBtn onClick={() => rejectAd(ad._id)}>Reject</RejectBtn>
            </Actions>
          </AdCard>
        ))}
      </Section>
    </Container>
  );
};

const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Stat = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Label = styled.div`
  color: #666;
  font-size: 14px;
`;

const Value = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #1877f2;
  margin-top: 10px;
`;

const Section = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
`;

const AdCard = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
`;

const AdInfo = styled.div`
  flex: 1;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ApproveBtn = styled.button`
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

const RejectBtn = styled.button`
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

export default AdminAdsDashboard;
