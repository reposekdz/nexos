import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MonetizationDashboard = () => {
  const [earnings, setEarnings] = useState({ total: 0, breakdown: {} });
  const [balance, setBalance] = useState(0);
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [earningsRes, balanceRes, tiersRes] = await Promise.all([
      axios.get('/api/monetization/earnings/breakdown'),
      axios.get('/api/monetization/payout/balance'),
      axios.get('/api/monetization/subscriptions/tiers')
    ]);
    setEarnings(earningsRes.data);
    setBalance(balanceRes.data.balance);
    setTiers(tiersRes.data);
  };

  const requestPayout = async () => {
    await axios.post('/api/monetization/payout/request', { amount: balance, method: 'bank' });
    alert('Payout requested');
    fetchData();
  };

  return (
    <Container>
      <Header>
        <h2>Monetization Dashboard</h2>
      </Header>

      <Stats>
        <Stat>
          <h3>Total Earnings</h3>
          <Value>${earnings.total?.toFixed(2)}</Value>
        </Stat>
        <Stat>
          <h3>Available Balance</h3>
          <Value>${balance?.toFixed(2)}</Value>
          <Button onClick={requestPayout}>Request Payout</Button>
        </Stat>
      </Stats>

      <Section>
        <h3>Earnings Breakdown</h3>
        {Object.entries(earnings).map(([type, amount]) => (
          <Item key={type}>
            <span>{type}</span>
            <span>${amount?.toFixed(2)}</span>
          </Item>
        ))}
      </Section>

      <Section>
        <h3>Subscription Tiers</h3>
        {tiers.map(tier => (
          <Tier key={tier._id}>
            <h4>{tier.name} - ${tier.price}/month</h4>
            <ul>
              {tier.benefits?.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </Tier>
        ))}
      </Section>
    </Container>
  );
};

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Stat = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Value = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #1877f2;
  margin: 10px 0;
`;

const Button = styled.button`
  padding: 10px 20px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
`;

const Section = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const Item = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
`;

const Tier = styled.div`
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
`;

export default MonetizationDashboard;
