import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import usePayment from '../features/payments/hooks/usePayment';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import styles from './PaymentPage.module.scss';

export default function PaymentPage() {
  const navigate = useNavigate();
  const payment = usePayment(20);

  useEffect(() => {
    if (payment.status === 'confirmed') {
      navigate('/success');
    }
  }, [payment.status, navigate]);

  const handleCopyReference = async () => {
    if (payment.reference) {
      try {
        await navigator.clipboard.writeText(payment.reference);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy reference:', err);
      }
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDeviceInfo = () => {
    // Try to get MAC address from various sources (limited in browsers)
    const connection = (navigator as any).connection;
    return {
      mac: undefined, // MAC not available in browsers for security
      ip: undefined, // Will be detected server-side
      deviceInfo: {
        userAgent: navigator.userAgent,
        screen: {
          width: screen.width,
          height: screen.height
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        connection: connection ? {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink
        } : undefined
      }
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => navigate('/')}
          className={styles.backButton}
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <h1>Internet Access Payment</h1>
      </div>

      <div className={styles.content}>
        {payment.status === 'idle' && (
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Get Internet Access</h2>
              <p>Pay KES {payment.amount} for 1 hour of high-speed internet</p>
            </div>
            
            <div className={styles.amountSelector}>
              <label>Select amount:</label>
              <div className={styles.amountOptions}>
                {[20, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`${styles.amountOption} ${payment.amount === amount ? styles.selected : ''}`}
                    onClick={() => payment.setAmount(amount)}
                  >
                    KES {amount}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="large"
              onClick={() => payment.startPayment(getDeviceInfo())}
              className={styles.startButton}
            >
              Generate Payment Reference
            </Button>
          </Card>
        )}

        {payment.status === 'initiating' && (
          <Card className={styles.card}>
            <div className={styles.loadingState}>
              <RefreshCw className={styles.spinner} size={32} />
              <h2>Generating payment reference...</h2>
              <p>Please wait while we prepare your payment details</p>
            </div>
          </Card>
        )}

        {payment.status === 'pending' && (
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.statusIcon}>
                <Clock size={24} />
              </div>
              <h2>Payment Pending</h2>
              <p>Complete your payment to get internet access</p>
            </div>

            <div className={styles.paymentDetails}>
              <div className={styles.instruction}>
                <h3>Payment Instructions</h3>
                <p>{payment.instructions}</p>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detail}>
                  <label>Till Number</label>
                  <div className={styles.value}>{payment.till}</div>
                </div>
                
                <div className={styles.detail}>
                  <label>Amount</label>
                  <div className={styles.value}>KES {payment.amount}</div>
                </div>
                
                <div className={styles.detail}>
                  <label>Reference</label>
                  <div className={styles.referenceValue}>
                    <span>{payment.reference}</span>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleCopyReference}
                      className={styles.copyButton}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              </div>

              {payment.timeRemaining && payment.timeRemaining > 0 && (
                <div className={styles.timer}>
                  <Clock size={16} />
                  <span>Expires in {formatTimeRemaining(payment.timeRemaining)}</span>
                </div>
              )}

              <div className={styles.waitingMessage}>
                <div className={styles.pulsingDot} />
                <span>Waiting for payment confirmation...</span>
              </div>
            </div>
          </Card>
        )}

        {payment.status === 'failed' && (
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.statusIcon} ${styles.error}`}>
                <AlertCircle size={24} />
              </div>
              <h2>Payment Failed</h2>
              <p>{payment.error || 'Something went wrong with your payment'}</p>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => payment.resetPayment()}
              >
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Go Back
              </Button>
            </div>
          </Card>
        )}

        {payment.status === 'expired' && (
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.statusIcon} ${styles.warning}`}>
                <Clock size={24} />
              </div>
              <h2>Payment Expired</h2>
              <p>Your payment reference has expired. Please generate a new one.</p>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => payment.resetPayment()}
              >
                Generate New Reference
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Go Back
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className={styles.help}>
        <p>
          Need help? Contact support at{' '}
          <a href={`tel:${import.meta.env.VITE_SUPPORT_PHONE || '+254700000000'}`}>
            {import.meta.env.VITE_SUPPORT_PHONE || '+254700000000'}
          </a>
        </p>
      </div>
    </div>
  );
}