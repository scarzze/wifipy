import API from '../../../services/apiClient';

export interface PaymentInitiationRequest {
  mac?: string;
  ip?: string;
  amount?: number;
  deviceInfo?: {
    userAgent: string;
    screen: { width: number; height: number };
    timezone: string;
    language: string;
  };
}

export interface PaymentInitiationResponse {
  reference: string;
  amount: number;
  till: string;
  instructions: string;
  expiresIn: number;
}

export interface PaymentStatusResponse {
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  amount: number;
  createdAt: number;
  confirmedAt?: number;
  expiresAt: number;
}

export async function initiatePayment(payload: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
  const response = await API.post('/payments/initiate', {
    ...payload,
    deviceInfo: {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      ...payload.deviceInfo
    }
  });
  return response.data;
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
  const response = await API.get(`/payments/${reference}/status`);
  return response.data;
}

export async function reconcilePayment(reference: string, providerTxnId: string): Promise<void> {
  await API.post(`/payments/${reference}/reconcile`, { providerTxnId });
}