import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const VirtualCurrencyStore = () => {
  const [balance, setBalance] = useState(0);
  const [gifts, setGifts] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [balanceRes, giftsRes, packagesRes] = await Promise.all([
      axios.get('/api/virtual-currency/balance'),
      axios.get('/api/virtual-currency/gifts/catalog'),
      axios.get('/api/virtual-currency/packages')
    ]);
    setBalance(balanceRes.data.balance);
    setGifts(giftsRes.data);
    setPackages(packagesRes.data);
  };

  const purchasePackage = async (pkg) => {
    await axios.post('/api/virtual-currency/purchase', { amount: pkg.coins, paymentMethod: 'card' });
    alert(`Purchased ${pkg.coins} coins!`);
    fetchData();
  };

  const sendGift = async (gift) => {
    const userId = prompt('Enter user ID to send gift');
    if (userId) {
      await axios.post(`/api/virtual-currency/send-gift/${userId}`, { giftType: gift.name, cost: gift.cost });
      alert('Gift sent!');
      fetchData();
    }
  };

  return (
    <Container>
      <Header>
        <h2>Virtual Currency Store</h2>
        <Balance>💰 {balance} Coins</Balance>
      </Header>

      <Section>
        <h3>Buy Coins</h3>
        <PackageGrid>
          {packages.map((pkg, i) => (
            <Package key={i}>
              <Coins>{pkg.coins} Coins</Coins>
              {pkg.bonus > 0 && <Bonus>+{pkg.bonus} Bonus</Bonus>}
              <Price>${pkg.price}</Price>
              <Button onClick={() => purchasePackage(pkg)}>Buy Now</Button>
            </Package>
          ))}
        </PackageGrid>
      </Section>

      <Section>
        <h3>Send Gifts</h3>
        <GiftGrid>
          {gifts.map(gift => (
            <Gift key={gift.id}>
              <Icon>{gift.icon}</Icon>
              <Name>{gift.name}</Name>
              <Cost>{gift.cost} coins</Cost>
              <Button onClick={() => sendGift(gift)}>Send</Button>
            </Gift>
          ))}
        </GiftGrid>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Balance = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #f59e0b;
`;

const Section = styled.div`
  margin-bottom: 40px;
`;

const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const Package = styled.div`
  background: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const Coins = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #1877f2;
`;

const Bonus = styled.div`
  color: #10b981;
  font-size: 14px;
  margin: 5px 0;
`;

const Price = styled.div`
  font-size: 24px;
  margin: 15px 0;
`;

const Button = styled.button`
  padding: 10px 20px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
`;

const GiftGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
`;

const Gift = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 10px;
`;

const Name = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const Cost = styled.div`
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
`;

export default VirtualCurrencyStore;
