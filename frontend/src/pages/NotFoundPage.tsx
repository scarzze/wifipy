import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import styles from './NotFoundPage.module.scss';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.content}>
          <div className={styles.errorCode}>404</div>
          <h1>Page Not Found</h1>
          <p>
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
            >
              <Home size={16} />
              Go Home
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Go Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}