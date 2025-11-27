import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const NearbyMarketplace = () => {
  const [items, setItems] = useState([]);
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(6);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyItems();
    }
  }, [location, radius, category]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          console.error('Location error:', error);
          setLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  };

  const fetchNearbyItems = async () => {
    setLoading(true);
    try {
      const url = category === 'all' 
        ? `/api/marketplace-location/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius * 1000}`
        : `/api/marketplace-location/nearby/category/${category}?lat=${location.lat}&lng=${location.lng}&radius=${radius * 1000}`;
      
      const res = await axios.get(url);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <Container>
      <Header>
        <h2>Nearby Marketplace</h2>
        <Location>📍 Within {radius}km</Location>
      </Header>

      <Filters>
        <RadiusSlider>
          <label>Radius: {radius}km</label>
          <input 
            type="range" 
            min="1" 
            max="6" 
            value={radius}
            onChange={e => setRadius(e.target.value)}
          />
        </RadiusSlider>

        <CategoryFilter>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="fashion">Fashion</option>
            <option value="home">Home & Garden</option>
            <option value="vehicles">Vehicles</option>
            <option value="sports">Sports</option>
          </select>
        </CategoryFilter>
      </Filters>

      {loading ? (
        <Loading>Finding items near you...</Loading>
      ) : (
        <Grid>
          {items.map(item => (
            <ItemCard key={item._id} onClick={() => navigate(`/marketplace/${item._id}`)}>
              <ItemImage src={item.images?.[0] || '/placeholder.png'} />
              <ItemInfo>
                <ItemTitle>{item.title}</ItemTitle>
                <ItemPrice>${item.price}</ItemPrice>
                <ItemDistance>📍 {item.distance}km away</ItemDistance>
                <Seller>
                  <SellerAvatar src={item.seller?.avatar || '/default-avatar.png'} />
                  <SellerName>{item.seller?.username}</SellerName>
                  {item.seller?.isVerified && <Verified>✓</Verified>}
                </Seller>
              </ItemInfo>
            </ItemCard>
          ))}
        </Grid>
      )}

      {!loading && items.length === 0 && (
        <Empty>
          <p>No items found within {radius}km</p>
          <p>Try increasing the search radius</p>
        </Empty>
      )}
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
  margin-bottom: 20px;
`;

const Location = styled.div`
  color: #1877f2;
  font-weight: 600;
`;

const Filters = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 10px;
`;

const RadiusSlider = styled.div`
  flex: 1;
  label { display: block; margin-bottom: 10px; font-weight: 600; }
  input { width: 100%; }
`;

const CategoryFilter = styled.div`
  flex: 1;
  select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const ItemCard = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  &:hover { transform: translateY(-4px); }
`;

const ItemImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const ItemInfo = styled.div`
  padding: 15px;
`;

const ItemTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 16px;
`;

const ItemPrice = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #1877f2;
  margin-bottom: 8px;
`;

const ItemDistance = styled.div`
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
`;

const Seller = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #eee;
`;

const SellerAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const SellerName = styled.span`
  font-size: 14px;
  font-weight: 600;
`;

const Verified = styled.span`
  background: #1877f2;
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const Empty = styled.div`
  text-align: center;
  padding: 50px;
  color: #666;
  p { margin: 10px 0; }
`;

export default NearbyMarketplace;
