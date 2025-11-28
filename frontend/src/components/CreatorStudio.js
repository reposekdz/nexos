import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  BoltIcon,
  GiftIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const CreatorStudio = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [tiers, setTiers] = useState([]);
  const [unlockables, setUnlockables] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, tiersRes, unlockablesRes, earningsRes, subsRes] = await Promise.all([
        axios.get('/api/creator/stats'),
        axios.get('/api/creator/tiers'),
        axios.get('/api/creator/unlockables'),
        axios.get('/api/creator/earnings'),
        axios.get('/api/creator/subscribers')
      ]);

      setStats(statsRes.data);
      setTiers(tiersRes.data);
      setUnlockables(unlockablesRes.data);
      setEarnings(earningsRes.data);
      setSubscribers(subsRes.data);
    } catch (error) {
      console.error('Error fetching creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <OverviewGrid>
      <StatCard>
        <StatIcon>
          <UserGroupIcon style={{ width: 32, height: 32, color: '#1877f2' }} />
        </StatIcon>
        <StatValue>{stats.totalSubscribers || 0}</StatValue>
        <StatLabel>Total Subscribers</StatLabel>
        <StatChange positive={stats.subscriberChange >= 0}>
          {stats.subscriberChange >= 0 ? '+' : ''}{stats.subscriberChange || 0} this month
        </StatChange>
      </StatCard>

      <StatCard>
        <StatIcon>
          <CurrencyDollarIcon style={{ width: 32, height: 32, color: '#52c41a' }} />
        </StatIcon>
        <StatValue>${(stats.monthlyRevenue || 0).toLocaleString()}</StatValue>
        <StatLabel>Monthly Revenue</StatLabel>
        <StatChange positive={stats.revenueChange >= 0}>
          {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange || 0}% vs last month
        </StatChange>
      </StatCard>

      <StatCard>
        <StatIcon>
          <GiftIcon style={{ width: 32, height: 32, color: '#ff4d4f' }} />
        </StatIcon>
        <StatValue>${(stats.tipsRevenue || 0).toLocaleString()}</StatValue>
        <StatLabel>Tips Received</StatLabel>
        <StatChange positive>
          {stats.tipsCount || 0} tips this month
        </StatChange>
      </StatCard>

      <StatCard>
        <StatIcon>
          <LockClosedIcon style={{ width: 32, height: 32, color: '#faad14' }} />
        </StatIcon>
        <StatValue>{stats.contentSales || 0}</StatValue>
        <StatLabel>Content Sales</StatLabel>
        <StatChange positive={stats.salesChange >= 0}>
          ${(stats.contentRevenue || 0).toLocaleString()} earned
        </StatChange>
      </StatCard>

      <ChartCard>
        <ChartTitle>
          Revenue Overview
          <ChartPeriod>Last 6 months</ChartPeriod>
        </ChartTitle>
        <RevenueChart>
          {stats.revenueHistory?.map((month, index) => (
            <ChartBar key={index}>
              <BarFill height={(month.amount / (stats.maxRevenue || 1)) * 100}>
                <BarTooltip>{month.label}: ${month.amount.toLocaleString()}</BarTooltip>
              </BarFill>
              <BarLabel>{month.label}</BarLabel>
            </ChartBar>
          ))}
        </RevenueChart>
      </ChartCard>

      <EngagementCard>
        <ChartTitle>Engagement Metrics</ChartTitle>
        <MetricsList>
          <MetricItem>
            <MetricLabel>Content Views</MetricLabel>
            <MetricValue>{(stats.contentViews || 0).toLocaleString()}</MetricValue>
            <MetricBar percentage={(stats.contentViews / (stats.maxViews || 1)) * 100} color="#1877f2" />
          </MetricItem>
          <MetricItem>
            <MetricLabel>Engagement Rate</MetricLabel>
            <MetricValue>{stats.engagementRate || 0}%</MetricValue>
            <MetricBar percentage={stats.engagementRate || 0} color="#52c41a" />
          </MetricItem>
          <MetricItem>
            <MetricLabel>Conversion Rate</MetricLabel>
            <MetricValue>{stats.conversionRate || 0}%</MetricValue>
            <MetricBar percentage={stats.conversionRate || 0} color="#faad14" />
          </MetricItem>
        </MetricsList>
      </EngagementCard>
    </OverviewGrid>
  );

  const renderSubscriptions = () => (
    <Section>
      <SectionHeader>
        <h2>Subscription Tiers</h2>
        <AddButton>
          <PlusIcon style={{ width: 20, height: 20 }} />
          Create Tier
        </AddButton>
      </SectionHeader>

      <TiersGrid>
        {tiers.map(tier => (
          <TierCard key={tier._id}>
            <TierHeader>
              <TierName>{tier.name}</TierName>
              <TierPrice>${tier.price}/{tier.interval}</TierPrice>
            </TierHeader>
            <TierDescription>{tier.description}</TierDescription>
            <TierBenefits>
              {tier.benefits?.map((benefit, index) => (
                <Benefit key={index}>
                  <CheckIcon>✓</CheckIcon>
                  {benefit}
                </Benefit>
              ))}
            </TierBenefits>
            <TierStats>
              <TierStat>
                <UserGroupIcon style={{ width: 16, height: 16 }} />
                {tier.subscriberCount || 0} subscribers
              </TierStat>
              <TierStat>
                <CurrencyDollarIcon style={{ width: 16, height: 16 }} />
                ${((tier.subscriberCount || 0) * tier.price).toLocaleString()}/mo
              </TierStat>
            </TierStats>
            <TierActions>
              <ActionButton primary>Edit</ActionButton>
              <ActionButton>View Subscribers</ActionButton>
            </TierActions>
          </TierCard>
        ))}

        <CreateTierCard>
          <PlusIcon style={{ width: 48, height: 48, color: '#1877f2' }} />
          <p>Create New Tier</p>
        </CreateTierCard>
      </TiersGrid>
    </Section>
  );

  const renderUnlockables = () => (
    <Section>
      <SectionHeader>
        <h2>Unlockable Content</h2>
        <AddButton>
          <PlusIcon style={{ width: 20, height: 20 }} />
          Add Content
        </AddButton>
      </SectionHeader>

      <ContentGrid>
        {unlockables.map(content => (
          <ContentCard key={content._id}>
            <ContentThumbnail src={content.thumbnail || '/placeholder.jpg'} alt={content.title} />
            <ContentInfo>
              <ContentType>{content.type}</ContentType>
              <ContentTitle>{content.title}</ContentTitle>
              <ContentPrice>${content.price}</ContentPrice>
              <ContentStats>
                <ContentStat>
                  <StarIcon style={{ width: 14, height: 14 }} />
                  {content.rating || 0} ({content.reviews?.length || 0})
                </ContentStat>
                <ContentStat>
                  <BoltIcon style={{ width: 14, height: 14 }} />
                  {content.purchaseCount || 0} sales
                </ContentStat>
              </ContentStats>
              <ContentActions>
                <ActionButton small primary>Edit</ActionButton>
                <ActionButton small>Analytics</ActionButton>
              </ContentActions>
            </ContentInfo>
          </ContentCard>
        ))}

        <CreateContentCard>
          <PlusIcon style={{ width: 48, height: 48, color: '#1877f2' }} />
          <p>Add Unlockable Content</p>
        </CreateContentCard>
      </ContentGrid>
    </Section>
  );

  const renderEarnings = () => (
    <Section>
      <SectionHeader>
        <h2>Earnings & Payouts</h2>
        <AddButton>
          <CreditCardIcon style={{ width: 20, height: 20 }} />
          Request Payout
        </AddButton>
      </SectionHeader>

      <EarningsOverview>
        <EarningsCard>
          <h3>Available Balance</h3>
          <Balance>${(stats.availableBalance || 0).toLocaleString()}</Balance>
          <BalanceNote>Ready to withdraw</BalanceNote>
        </EarningsCard>

        <EarningsCard>
          <h3>Pending Earnings</h3>
          <Balance secondary>${(stats.pendingEarnings || 0).toLocaleString()}</Balance>
          <BalanceNote>Processing (7-14 days)</BalanceNote>
        </EarningsCard>

        <EarningsCard>
          <h3>Total Lifetime Earnings</h3>
          <Balance>${(stats.lifetimeEarnings || 0).toLocaleString()}</Balance>
          <BalanceNote>All-time revenue</BalanceNote>
        </EarningsCard>
      </EarningsOverview>

      <EarningsTable>
        <TableHeader>
          <th>Period</th>
          <th>Subscriptions</th>
          <th>Content Sales</th>
          <th>Tips</th>
          <th>Total</th>
          <th>Status</th>
        </TableHeader>
        <tbody>
          {earnings.map((earning, index) => (
            <TableRow key={index}>
              <td>{new Date(earning.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
              <td>${earning.subscriptionRevenue.toLocaleString()}</td>
              <td>${earning.contentSalesRevenue.toLocaleString()}</td>
              <td>${earning.tipsRevenue.toLocaleString()}</td>
              <td><strong>${earning.totalRevenue.toLocaleString()}</strong></td>
              <td>
                <StatusBadge status={earning.status}>
                  {earning.status}
                </StatusBadge>
              </td>
            </TableRow>
          ))}
        </tbody>
      </EarningsTable>
    </Section>
  );

  const renderSubscribers = () => (
    <Section>
      <SectionHeader>
        <h2>Subscribers ({subscribers.length})</h2>
        <SearchBar placeholder="Search subscribers..." />
      </SectionHeader>

      <SubscribersList>
        {subscribers.map(sub => (
          <SubscriberItem key={sub._id}>
            <SubscriberAvatar src={sub.subscriber?.avatar || '/default-avatar.png'} />
            <SubscriberInfo>
              <SubscriberName>{sub.subscriber?.username}</SubscriberName>
              <SubscriberTier>{sub.tier?.name} - ${sub.tier?.price}/mo</SubscriberTier>
              <SubscriberDate>
                Since {new Date(sub.startDate).toLocaleDateString()}
              </SubscriberDate>
            </SubscriberInfo>
            <SubscriberActions>
              <StatusBadge status={sub.status}>{sub.status}</StatusBadge>
              <ActionButton small>Message</ActionButton>
            </SubscriberActions>
          </SubscriberItem>
        ))}
      </SubscribersList>
    </Section>
  );

  return (
    <Container>
      <Header>
        <Title>
          <StarIcon style={{ width: 32, height: 32, color: '#faad14' }} />
          Creator Studio
        </Title>
      </Header>

      <Tabs>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          <ChartBarIcon style={{ width: 20, height: 20 }} />
          Overview
        </Tab>
        <Tab active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
          <UserGroupIcon style={{ width: 20, height: 20 }} />
          Subscriptions
        </Tab>
        <Tab active={activeTab === 'unlockables'} onClick={() => setActiveTab('unlockables')}>
          <LockClosedIcon style={{ width: 20, height: 20 }} />
          Unlockables
        </Tab>
        <Tab active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')}>
          <CurrencyDollarIcon style={{ width: 20, height: 20 }} />
          Earnings
        </Tab>
        <Tab active={activeTab === 'subscribers'} onClick={() => setActiveTab('subscribers')}>
          <UsersIcon style={{ width: 20, height: 20 }} />
          Subscribers
        </Tab>
      </Tabs>

      <Content>
        {loading ? (
          <LoadingState>Loading...</LoadingState>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'subscriptions' && renderSubscriptions()}
            {activeTab === 'unlockables' && renderUnlockables()}
            {activeTab === 'earnings' && renderEarnings()}
            {activeTab === 'subscribers' && renderSubscribers()}
          </>
        )}
      </Content>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
`;

const Header = styled.div`
  background: white;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
`;

const Tabs = styled.div`
  background: white;
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border: none;
  background: ${props => props.active ? 'transparent' : 'white'};
  color: ${props => props.active ? '#1877f2' : '#666'};
  font-weight: ${props => props.active ? '600' : '400'};
  border-bottom: 2px solid ${props => props.active ? '#1877f2' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: #1877f2;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 18px;
`;

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const StatIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #f0f7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
`;

const StatChange = styled.div`
  color: ${props => props.positive ? '#52c41a' : '#ff4d4f'};
  font-size: 14px;
  font-weight: 500;
`;

const ChartCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  grid-column: span 2;

  @media (max-width: 1400px) {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const ChartTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChartPeriod = styled.span`
  font-size: 14px;
  color: #666;
  font-weight: 400;
`;

const RevenueChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
`;

const ChartBar = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
  justify-content: flex-end;
`;

const BarFill = styled.div`
  width: 100%;
  height: ${props => props.height}%;
  background: linear-gradient(180deg, #1877f2 0%, #3b5998 100%);
  border-radius: 6px 6px 0 0;
  position: relative;
  transition: height 0.3s ease;
  cursor: pointer;

  &:hover div {
    opacity: 1;
  }
`;

const BarTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  margin-bottom: 8px;
`;

const BarLabel = styled.div`
  font-size: 12px;
  color: #666;
`;

const EngagementCard = styled(ChartCard)`
  grid-column: span 2;
`;

const MetricsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const MetricItem = styled.div``;

const MetricLabel = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
`;

const MetricValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const MetricBar = styled.div`
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.percentage}%;
    background: ${props => props.color};
    transition: width 0.3s ease;
  }
`;

const Section = styled.div``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #1877f2;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #166fe5;
  }
`;

const TiersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
`;

const TierCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const TierHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const TierName = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
`;

const TierPrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1877f2;
`;

const TierDescription = styled.p`
  color: #666;
  margin-bottom: 16px;
`;

const TierBenefits = styled.div`
  margin-bottom: 16px;
`;

const Benefit = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #333;
`;

const CheckIcon = styled.span`
  color: #52c41a;
  font-weight: 700;
`;

const TierStats = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
`;

const TierStat = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
`;

const TierActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: ${props => props.small ? '6px 12px' : '10px 16px'};
  border: 1px solid ${props => props.primary ? '#1877f2' : '#e0e0e0'};
  border-radius: 6px;
  background: ${props => props.primary ? '#1877f2' : 'white'};
  color: ${props => props.primary ? 'white' : '#333'};
  font-weight: 500;
  font-size: ${props => props.small ? '12px' : '14px'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.primary ? '#166fe5' : '#f5f5f5'};
  }
`;

const CreateTierCard = styled.div`
  background: white;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1877f2;
    background: #f0f7ff;
  }

  p {
    margin-top: 12px;
    color: #666;
    font-weight: 500;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const ContentThumbnail = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const ContentInfo = styled.div`
  padding: 16px;
`;

const ContentType = styled.div`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f0f7ff;
  color: #1877f2;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const ContentTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
`;

const ContentPrice = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #52c41a;
  margin-bottom: 12px;
`;

const ContentStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
`;

const ContentStat = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
`;

const ContentActions = styled.div`
  display: flex;
  gap: 8px;
`;

const CreateContentCard = styled(CreateTierCard)`
  padding: 60px 24px;
`;

const EarningsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const EarningsCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);

  h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }
`;

const Balance = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${props => props.secondary ? '#666' : '#52c41a'};
  margin-bottom: 8px;
`;

const BalanceNote = styled.div`
  font-size: 14px;
  color: #999;
`;

const EarningsTable = styled.table`
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const TableHeader = styled.thead`
  background: #f5f5f5;
  
  th {
    padding: 16px;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
    color: #666;
  }
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #f0f0f0;

  td {
    padding: 16px;
    font-size: 14px;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${props => {
    switch (props.status) {
      case 'paid':
      case 'completed':
      case 'active':
        return '#52c41a15';
      case 'pending':
      case 'processing':
        return '#faad1415';
      case 'failed':
      case 'cancelled':
      case 'expired':
        return '#ff4d4f15';
      default:
        return '#e0e0e0';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'paid':
      case 'completed':
      case 'active':
        return '#52c41a';
      case 'pending':
      case 'processing':
        return '#faad14';
      case 'failed':
      case 'cancelled':
      case 'expired':
        return '#ff4d4f';
      default:
        return '#666';
    }
  }};
`;

const SubscribersList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const SubscriberItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const SubscriberAvatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
`;

const SubscriberInfo = styled.div`
  flex: 1;
`;

const SubscriberName = styled.div`
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
`;

const SubscriberTier = styled.div`
  color: #1877f2;
  font-size: 14px;
  margin-bottom: 2px;
`;

const SubscriberDate = styled.div`
  color: #999;
  font-size: 12px;
`;

const SubscriberActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SearchBar = styled.input`
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  width: 300px;

  &:focus {
    outline: none;
    border-color: #1877f2;
  }
`;

export default CreatorStudio;
