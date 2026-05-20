// wallet.ts - Driver Wallet Service

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://soberfolks-backend.onrender.com';

export interface WalletDetails {
  id: number;
  balance: number;
  balancePaise: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  availableBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit' | 'withdrawal_request' | 'withdrawal_processed' | 'withdrawal_rejected';
  amount: number;
  amountPaise: number;
  description: string;
  referenceType: string;
  referenceId: number;
  rideId: number | null;
  balanceBefore: number;
  balanceAfter: number;
  pickup?: string;
  drop?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: number;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  upiId?: string;
  bankAccountNumber?: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WalletSummary {
  balance: number;
  availableBalance: number;
  pendingWithdrawal: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalRides: number;
}

/**
 * Get wallet details
 */
export async function getWallet(): Promise<{
  success: boolean;
  wallet?: WalletDetails;
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/wallet`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get wallet' };
    }

    return data;
  } catch (error: any) {
    console.error('Get wallet error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Get wallet summary with earnings breakdown
 */
export async function getWalletSummary(): Promise<{
  success: boolean;
  summary?: WalletSummary;
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/wallet/summary`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get wallet summary' };
    }

    return data;
  } catch (error: any) {
    console.error('Get wallet summary error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Get transaction history
 */
export async function getTransactions(
  page: number = 1,
  limit: number = 20
): Promise<{
  success: boolean;
  transactions?: WalletTransaction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_BASE_URL}/api/wallet/transactions?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get transactions' };
    }

    return data;
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Create withdrawal request
 */
export async function createWithdrawalRequest(
  amount: number, // in rupees
  paymentDetails: {
    upiId?: string;
    bankAccountHolder?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
  request?: {
    id: number;
    amount: number;
    status: string;
    estimatedProcessingTime: string;
  };
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        ...paymentDetails,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create withdrawal request' };
    }

    return data;
  } catch (error: any) {
    console.error('Create withdrawal error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Get withdrawal history
 */
export async function getWithdrawals(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<{
  success: boolean;
  withdrawals?: WithdrawalRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    let url = `${API_BASE_URL}/api/wallet/withdrawals?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get withdrawals' };
    }

    return data;
  } catch (error: any) {
    console.error('Get withdrawals error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Cancel pending withdrawal request
 */
export async function cancelWithdrawal(withdrawalId: number): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw/${withdrawalId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to cancel withdrawal' };
    }

    return data;
  } catch (error: any) {
    console.error('Cancel withdrawal error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'credit':
      return 'Ride Earnings';
    case 'debit':
      return 'Debit';
    case 'withdrawal_request':
      return 'Withdrawal Requested';
    case 'withdrawal_processed':
      return 'Withdrawal Completed';
    case 'withdrawal_rejected':
      return 'Withdrawal Cancelled';
    default:
      return type;
  }
}

/**
 * Get transaction type color
 */
export function getTransactionTypeColor(type: string): string {
  switch (type) {
    case 'credit':
      return '#4CAF50'; // Green
    case 'debit':
    case 'withdrawal_request':
    case 'withdrawal_processed':
      return '#FF9800'; // Orange
    case 'withdrawal_rejected':
      return '#f44336'; // Red
    default:
      return '#757575'; // Grey
  }
}

/**
 * Get withdrawal status color
 */
export function getWithdrawalStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#FF9800'; // Orange
    case 'processing':
      return '#2196F3'; // Blue
    case 'completed':
      return '#4CAF50'; // Green
    case 'rejected':
      return '#f44336'; // Red
    default:
      return '#757575'; // Grey
  }
}
