import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Shield, Zap, Clock } from 'lucide-react';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import styles from './HomePage.module.scss';

export default function HomePage() {
  const navigate = useNavigate();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'WiFiPy';
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '+254700000000';

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <Wifi size={48} />
            <h1>{companyName}</h1>
          </div>
          
          <h2 className={styles.title}>
            Welcome to High-Speed Internet
          </h2>
          
          <p className={styles.subtitle}>
            Get instant access to fast, secure internet connection. 
            Pay once and enjoy seamless browsing for the next hour.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <Zap className={styles.featureIcon} />
              <span>High-Speed Connection</span>
            </div>
            <div className={styles.feature}>
              <Shield className={styles.featureIcon} />
              <span>Secure & Private</span>
            </div>
            <div className={styles.feature}>
              <Clock className={styles.featureIcon} />
              <span>Instant Activation</span>
            </div>
          </div>
          
          <div className={styles.pricing}>
            <Card className={styles.pricingCard}>
              <div className={styles.price}>
                <span className={styles.currency}>KES</span>
                <span className={styles.amount}>20</span>
                <span className={styles.period}>/ hour</span>
              </div>
              <p className={styles.pricingDescription}>
                Unlimited browsing, streaming, and downloads
              </p>
              <Button 
                size="large" 
                onClick={() => navigate('/payment')}
                className={styles.getStartedButton}
              >
                Get Internet Access
              </Button>
            </Card>
          </div>
        </div>
      </div>
      
      <div className={styles.howItWorks}>
        <div className={styles.container}>
          <h3>How it works</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h4>Click "Get Internet Access"</h4>
              <p>Start the payment process to get your unique reference number</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h4>Pay via M-Pesa</h4>
              <p>Send payment to our till number using the provided reference</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h4>Get Connected</h4>
              <p>Your internet access will be activated automatically</p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>Need help? Call us at <a href={`tel:${supportPhone}`}>{supportPhone}</a></p>
          <p className={styles.copyright}>
            © 2024 {companyName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}