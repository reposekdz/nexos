import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const BusinessPageManager = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const res = await axios.get('/api/business/pages');
    setPages(res.data);
  };

  const createPage = async () => {
    const data = {
      name: prompt('Business Name'),
      category: prompt('Category'),
      description: prompt('Description')
    };
    await axios.post('/api/business/pages', data);
    fetchPages();
  };

  return (
    <Container>
      <Header>
        <h2>Business Pages</h2>
        <Button onClick={createPage}>Create Page</Button>
      </Header>

      <PageList>
        {pages.map(page => (
          <Page key={page._id} onClick={() => setSelectedPage(page)}>
            <img src={page.logo || '/default-logo.png'} alt={page.name} />
            <h3>{page.name}</h3>
            <p>{page.category}</p>
            <Stats>
              <span>⭐ {page.averageRating?.toFixed(1)}</span>
              <span>👥 {page.followers?.length} followers</span>
            </Stats>
          </Page>
        ))}
      </PageList>

      {selectedPage && (
        <Details>
          <h2>{selectedPage.name}</h2>
          <p>{selectedPage.description}</p>
          <Section>
            <h3>Products ({selectedPage.products?.length})</h3>
            {selectedPage.products?.map(p => (
              <Product key={p._id}>
                <span>{p.name}</span>
                <span>${p.price}</span>
              </Product>
            ))}
          </Section>
          <Section>
            <h3>Reviews ({selectedPage.reviews?.length})</h3>
            {selectedPage.reviews?.slice(0, 5).map(r => (
              <Review key={r._id}>
                <span>⭐ {r.rating}</span>
                <p>{r.comment}</p>
              </Review>
            ))}
          </Section>
        </Details>
      )}
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

const PageList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Page = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  img { width: 60px; height: 60px; border-radius: 50%; }
`;

const Stats = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
`;

const Details = styled.div`
  background: white;
  padding: 30px;
  border-radius: 10px;
`;

const Section = styled.div`
  margin-top: 20px;
`;

const Product = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #eee;
`;

const Review = styled.div`
  padding: 10px;
  border-bottom: 1px solid #eee;
`;

export default BusinessPageManager;
