import React from 'react';
import styled from 'styled-components';
import Sidebar from './Sidebar';
import Header from './Header';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 250px;
  padding-top: 60px;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding-bottom: 60px;
  }
`;

const Layout = ({ children }) => {
  return (
    <LayoutContainer>
      <Header />
      <Sidebar />
      <MainContent>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;