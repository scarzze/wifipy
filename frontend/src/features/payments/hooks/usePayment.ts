import { useEffect, useState, useRef, useCallback } from 'react';
import { initiatePayment, getPaymentStatus, PaymentInitiationRequest } from '../services/paymentService';

type PaymentStatus = 'idle' | 'initiating' | 'pending' | 'confirmed' | 'failed' | 'expired';

export interface PaymentState {
  status: PaymentStatus;
  reference: string | null;
  amount: number;
  till: string | null;
  instructions: string | null;
  error: string | null;
  expiresAt: number | null;
  timeRemaining: number | null;
}

export default function usePayment(initialAmount = 20) {
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    reference: null,
    amount: initialAmount,
    till: null,
    instructions: null,
    error: null,
    expiresAt: null,
    timeRemaining: null
  });

  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const startPayment = useCallback(async (request: PaymentInitiationRequest = {}) => {
    setState(prev => ({ ...prev, status: 'initiating', error: null }));
    
    try {
      const response = await initiatePayment({
        amount: state.amount,
        ...request
      });
      
      const expiresAt = Date.now() + (response.expiresIn * 1000);
      
      setState(prev => ({
        ...prev,
        status: 'pending',
        reference: response.reference,
        till: response.till,
        instructions: response.instructions,
        expiresAt
      }));
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: error.response?.data?.message || 'Failed to initiate payment'
      }));
    }
  }, [state.amount]);

  const resetPayment = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState({
      status: 'idle',
      reference: null,
      amount: initialAmount,
      till: null,
      instructions: null,
      error: null,
      expiresAt: null,
      timeRemaining: null
    });
  }, [initialAmount]);

  // Polling effect
  useEffect(() => {
    if (state.status !== 'pending' || !state.reference) return;

    const poll = async () => {
      try {
        const response = await getPaymentStatus(state.reference!);
        
        if (response.status === 'confirmed') {
          setState(prev => ({ ...prev, status: 'confirmed' }));
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (response.status === 'failed') {
          setState(prev => ({ ...prev, status: 'failed', error: 'Payment failed' }));
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (response.status === 'expired') {
          setState(prev => ({ ...prev, status: 'expired' }));
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (error) {
        console.error('Payment status polling error:', error);
      }
    };

    // Start polling immediately, then every 3 seconds
    poll();
    pollRef.current = window.setInterval(poll, 3000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.status, state.reference]);

  // Timer effect for countdown
  useEffect(() => {
    if (!state.expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, state.expiresAt! - now);
      
      setState(prev => ({ ...prev, timeRemaining: remaining }));
      
      if (remaining === 0 && state.status === 'pending') {
        setState(prev => ({ ...prev, status: 'expired' }));
      }
    };

    updateTimer();
    timerRef.current = window.setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.expiresAt, state.status]);

  const setAmount = useCallback((amount: number) => {
    setState(prev => ({ ...prev, amount }));
  }, []);

  return {
    ...state,
    startPayment,
    resetPayment,
    setAmount
  };
}