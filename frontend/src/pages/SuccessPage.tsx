import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Wifi, Clock, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import styles from './SuccessPage.module.scss';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour in seconds
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Card className={styles.successCard}>
          <div className={styles.header}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
            <h1>Payment Successful!</h1>
            <p>Your internet access has been activated</p>
          </div>
          
          <div className={styles.connectionStatus}>
            <div className={styles.statusIndicator}>
              <Wifi className={styles.wifiIcon} />
              <span className={styles.statusText}>Connected</span>
            </div>
            
            <div className={styles.timeRemaining}>
              <Clock size={20} />
              <span>Time remaining: {formatTime(timeRemaining)}</span>
            </div>
          </div>
          
          <div className={styles.features}>
            <h3>What you can do now:</h3>
            <ul>
              <li>Browse any website</li>
              <li>Stream videos and music</li>
              <li>Download files</li>
              <li>Video calls and messaging</li>
              <li>Social media access</li>
            </ul>
          </div>
          
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="large"
              onClick={() => window.close()}
              className={styles.closeButton}
            >
              Start Browsing
              <ArrowRight size={16} />
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>
        </Card>
        
        <div className={styles.tips}>
          <Card padding="small">
            <h4>💡 Pro Tips</h4>
            <ul>
              <li>Keep this tab open to monitor your remaining time</li>
              <li>Your session will automatically expire after 1 hour</li>
              <li>You can purchase additional time anytime</li>
            </ul>
          </Card>
        </div>
      </div>
      
      <div className={styles.footer}>
        <p>
          Need to extend your session?{' '}
          <button 
            className={styles.linkButton}
            onClick={() => navigate('/payment')}
          >
            Purchase more time
          </button>
        </p>
      </div>
    </div>
  );
}