// payment.ts - Payment Service for Razorpay Integration

import RazorpayCheckout from 'react-native-razorpay';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://soberfolks-backend.onrender.com';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface RideDetails {
  fare: number;
  distance: string;
  pickup: string;
  drop: string;
  driverName: string;
}

export interface FareBreakdown {
  total: number;
  platformFee: number;
  driverAmount: number;
}

export interface CreateOrderResponse {
  success: boolean;
  order?: PaymentOrder;
  key?: string;
  rideDetails?: RideDetails;
  fareBreakdown?: FareBreakdown;
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  payment?: {
    id: number;
    amount: number;
    driverAmount: number;
    platformFee: number;
    method: string;
  };
  error?: string;
  retryAllowed?: boolean;
}

/**
 * Create Razorpay order for a ride payment
 */
export async function createPaymentOrder(rideId: number): Promise<CreateOrderResponse> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rideId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create payment order' };
    }

    return data;
  } catch (error: any) {
    console.error('Create payment order error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Open Razorpay checkout
 */
export async function openRazorpayCheckout(
  order: PaymentOrder,
  key: string,
  consumer: { name: string; email?: string; phone: string },
  rideDetails?: RideDetails
): Promise<{
  success: boolean;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  error?: { code: number; description: string };
}> {
  const options = {
    description: `SoberFolk Ride - ${rideDetails?.distance || 'Ride Payment'}`,
    image: 'https://i.ibb.co/placeholder/soberfolk-logo.png', // Replace with actual logo
    currency: order.currency,
    key: key,
    amount: order.amount,
    name: 'SoberFolk',
    order_id: order.id,
    prefill: {
      email: consumer.email || '',
      contact: consumer.phone,
      name: consumer.name,
    },
    theme: { color: '#667eea' },
    retry: {
      enabled: true,
      max_count: 3,
    },
    send_sms_hash: true,
    remember_customer: true,
  };

  try {
    const result = await RazorpayCheckout.open(options);
    return {
      success: true,
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_order_id: result.razorpay_order_id,
      razorpay_signature: result.razorpay_signature,
    };
  } catch (error: any) {
    console.error('Razorpay checkout error:', error);
    return {
      success: false,
      error: {
        code: error.code || 0,
        description: error.description || 'Payment cancelled or failed',
      },
    };
  }
}

/**
 * Verify payment with backend
 */
export async function verifyPayment(
  rideId: number,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): Promise<VerifyPaymentResponse> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rideId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || 'Payment verification failed',
        retryAllowed: data.retryAllowed 
      };
    }

    return data;
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Report payment failure to backend
 */
export async function reportPaymentFailure(
  razorpay_order_id: string,
  error_code: number,
  error_description: string
): Promise<void> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    await fetch(`${API_BASE_URL}/api/payments/failed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        razorpay_order_id,
        error_code,
        error_description,
      }),
    });
  } catch (error) {
    console.error('Report payment failure error:', error);
  }
}

/**
 * Retry payment for a ride
 */
export async function retryPayment(rideId: number): Promise<CreateOrderResponse> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/payments/retry/${rideId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to retry payment' };
    }

    return data;
  } catch (error: any) {
    console.error('Retry payment error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Get payment details for a ride
 */
export async function getPaymentDetails(rideId: number): Promise<{
  success: boolean;
  payment?: any;
  ride?: any;
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/payments/ride/${rideId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get payment details' };
    }

    return data;
  } catch (error: any) {
    console.error('Get payment details error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Complete payment flow
 * Handles: create order → open checkout → verify payment
 */
export async function processPayment(
  rideId: number,
  consumer: { name: string; email?: string; phone: string }
): Promise<{
  success: boolean;
  payment?: any;
  error?: string;
  cancelled?: boolean;
}> {
  // Step 1: Create order
  const orderResult = await createPaymentOrder(rideId);
  
  if (!orderResult.success || !orderResult.order || !orderResult.key) {
    return { success: false, error: orderResult.error || 'Failed to create order' };
  }

  // Step 2: Open Razorpay checkout
  const checkoutResult = await openRazorpayCheckout(
    orderResult.order,
    orderResult.key,
    consumer,
    orderResult.rideDetails
  );

  if (!checkoutResult.success) {
    // User cancelled or payment failed
    if (checkoutResult.error) {
      await reportPaymentFailure(
        orderResult.order.id,
        checkoutResult.error.code,
        checkoutResult.error.description
      );
    }
    
    return { 
      success: false, 
      error: checkoutResult.error?.description || 'Payment failed',
      cancelled: checkoutResult.error?.code === 0 // User cancelled
    };
  }

  // Step 3: Verify payment
  const verifyResult = await verifyPayment(
    rideId,
    checkoutResult.razorpay_order_id!,
    checkoutResult.razorpay_payment_id!,
    checkoutResult.razorpay_signature!
  );

  if (!verifyResult.success) {
    return { success: false, error: verifyResult.error || 'Payment verification failed' };
  }

  return { success: true, payment: verifyResult.payment };
}
