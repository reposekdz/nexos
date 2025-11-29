import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, QrCodeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { Shield, Smartphone, Copy } from 'lucide-react';

const Container = styled(motion.div)`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 24px;
  
  h2 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 0 0 8px 0;
  }
`;

const Step = styled.div`
  margin-bottom: 24px;
  
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px 0;
    font-size: 16px;
  }
`;

const QRContainer = styled.div`
  text-align: center;
  padding: 20px;
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  margin: 16px 0;
`;

const QRImage = styled.img`
  max-width: 200px;
  height: auto;
`;

const SecretKey = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  margin: 8px 0;
`;

const CopyButton = styled.button`
  padding: 4px 8px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
`;

const TokenInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 16px;
  text-align: center;
  letter-spacing: 2px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 12px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  
  &:hover {
    background: #166fe5;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 12px;
  border-radius: 6px;
  margin: 16px 0;
  text-align: center;
  
  &.success {
    background: ${props => props.theme.colors.success}20;
    color: ${props => props.theme.colors.success};
  }
  
  &.error {
    background: ${props => props.theme.colors.error}20;
    color: ${props => props.theme.colors.error};
  }
`;

const TwoFactorAuth = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const enable2FA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      setQrCode(data.qrCode);
      setSecretKey(data.secret);
      setStep(2);
    } catch (error) {
      setMessage('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token })
      });
      
      if (response.ok) {
        setMessage('2FA enabled successfully!');
        setTimeout(() => onComplete?.(), 2000);
      } else {
        setMessage('Invalid token. Please try again.');
      }
    } catch (error) {
      setMessage('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setMessage('Secret key copied to clipboard');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Header>
        <h2>
          <ShieldCheckIcon style={{ width: '24px', height: '24px' }} />
          Two-Factor Authentication
        </h2>
        <p>Add an extra layer of security to your account</p>
      </Header>

      {step === 1 && (
        <Step>
          <h3>
            <Shield size={20} />
            Step 1: Enable 2FA
          </h3>
          <p>Click the button below to generate your 2FA setup code.</p>
          <ActionButton onClick={enable2FA} disabled={loading}>
            {loading ? 'Generating...' : 'Enable Two-Factor Authentication'}
          </ActionButton>
        </Step>
      )}

      {step === 2 && (
        <>
          <Step>
            <h3>
              <Smartphone size={20} />
              Step 2: Scan QR Code
            </h3>
            <p>Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:</p>
            
            <QRContainer>
              <QRImage src={qrCode} alt="2FA QR Code" />
            </QRContainer>
            
            <p>Or manually enter this secret key:</p>
            <SecretKey>
              <KeyIcon style={{ width: '16px', height: '16px' }} />
              <span>{secretKey}</span>
              <CopyButton onClick={copySecret}>
                <Copy size={12} />
              </CopyButton>
            </SecretKey>
          </Step>

          <Step>
            <h3>
              <QrCodeIcon style={{ width: '20px', height: '20px' }} />
              Step 3: Verify Setup
            </h3>
            <p>Enter the 6-digit code from your authenticator app:</p>
            
            <TokenInput
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            
            <ActionButton 
              onClick={verify2FA} 
              disabled={loading || token.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify and Enable 2FA'}
            </ActionButton>
          </Step>
        </>
      )}

      {message && (
        <StatusMessage className={message.includes('success') ? 'success' : 'error'}>
          {message}
        </StatusMessage>
      )}
    </Container>
  );
};

export default TwoFactorAuth;