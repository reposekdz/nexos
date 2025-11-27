import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { Filter, Grid, List, Star } from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: #166fe5;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${props => props.theme.colors.textSecondary};
`;

const FilterSelect = styled.select`
  padding: 10px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  cursor: pointer;
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const ViewButton = styled.button`
  padding: 8px 12px;
  border: none;
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.text};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.hover};
  }
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr'};
  gap: 20px;
`;

const ProductCard = styled(motion.div)`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.small};
  cursor: pointer;
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.medium};
  }
`;

const ProductImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const ProductInfo = styled.div`
  padding: 16px;
`;

const ProductTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.3;
`;

const ProductPrice = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 8px;
`;

const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 12px;
`;

const ProductActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SellerAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const LikeButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${props => props.liked ? props.theme.colors.error + '20' : props.theme.colors.hover};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  svg {
    width: 18px;
    height: 18px;
    color: ${props => props.liked ? props.theme.colors.error : props.theme.colors.textSecondary};
  }
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
`;

const CategoryTab = styled.button`
  padding: 8px 16px;
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.text};
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 14px;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.hover};
  }
`;

const Marketplace = () => {
  const [view, setView] = useState('grid');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [condition, setCondition] = useState('all');

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'books', name: 'Books' },
    { id: 'sports', name: 'Sports' },
    { id: 'automotive', name: 'Automotive' }
  ];

  const [products] = useState([
    {
      id: 1,
      title: 'iPhone 14 Pro Max - Excellent Condition',
      price: 899,
      currency: 'USD',
      image: '/product1.jpg',
      location: 'New York, NY',
      postedTime: '2 hours ago',
      seller: { name: 'John Doe', avatar: '/avatar1.jpg', rating: 4.8 },
      category: 'electronics',
      condition: 'like-new',
      liked: false
    },
    {
      id: 2,
      title: 'Vintage Leather Sofa - Brown',
      price: 450,
      currency: 'USD',
      image: '/product2.jpg',
      location: 'Los Angeles, CA',
      postedTime: '1 day ago',
      seller: { name: 'Jane Smith', avatar: '/avatar2.jpg', rating: 4.9 },
      category: 'furniture',
      condition: 'good',
      liked: true
    },
    {
      id: 3,
      title: 'MacBook Air M2 - 256GB',
      price: 1099,
      currency: 'USD',
      image: '/product3.jpg',
      location: 'Chicago, IL',
      postedTime: '3 days ago',
      seller: { name: 'Mike Johnson', avatar: '/avatar3.jpg', rating: 4.7 },
      category: 'electronics',
      condition: 'new',
      liked: false
    }
  ]);

  const [likedProducts, setLikedProducts] = useState(new Set([2]));

  const toggleLike = (productId) => {
    setLikedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const filteredProducts = products.filter(product => {
    if (activeCategory !== 'all' && product.category !== activeCategory) return false;
    if (searchQuery && !product.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <Container>
      <Header>
        <Title>Marketplace</Title>
        <CreateButton>
          <PlusIcon style={{ width: '20px', height: '20px' }} />
          Sell Something
        </CreateButton>
      </Header>

      <CategoryTabs>
        {categories.map(category => (
          <CategoryTab
            key={category.id}
            active={activeCategory === category.id}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </CategoryTab>
        ))}
      </CategoryTabs>

      <FilterBar>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search marketplace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        <FilterSelect value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
          <option value="all">Any Price</option>
          <option value="0-100">Under $100</option>
          <option value="100-500">$100 - $500</option>
          <option value="500-1000">$500 - $1000</option>
          <option value="1000+">$1000+</option>
        </FilterSelect>

        <FilterSelect value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="all">Any Condition</option>
          <option value="new">New</option>
          <option value="like-new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </FilterSelect>

        <ViewToggle>
          <ViewButton active={view === 'grid'} onClick={() => setView('grid')}>
            <Grid size={16} />
          </ViewButton>
          <ViewButton active={view === 'list'} onClick={() => setView('list')}>
            <List size={16} />
          </ViewButton>
        </ViewToggle>
      </FilterBar>

      <ProductGrid view={view}>
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <ProductImage src={product.image} alt={product.title} />
            <ProductInfo>
              <ProductPrice>${product.price}</ProductPrice>
              <ProductTitle>{product.title}</ProductTitle>
              
              <ProductMeta>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPinIcon style={{ width: '12px', height: '12px' }} />
                  {product.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ClockIcon style={{ width: '12px', height: '12px' }} />
                  {product.postedTime}
                </span>
              </ProductMeta>

              <ProductActions>
                <SellerInfo>
                  <SellerAvatar src={product.seller.avatar} alt={product.seller.name} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>
                      {product.seller.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Star size={10} fill="#ffc107" color="#ffc107" />
                      {product.seller.rating}
                    </div>
                  </div>
                </SellerInfo>

                <LikeButton
                  liked={likedProducts.has(product.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(product.id);
                  }}
                >
                  {likedProducts.has(product.id) ? <HeartSolid /> : <HeartIcon />}
                </LikeButton>
              </ProductActions>
            </ProductInfo>
          </ProductCard>
        ))}
      </ProductGrid>
    </Container>
  );
};

export default Marketplace;