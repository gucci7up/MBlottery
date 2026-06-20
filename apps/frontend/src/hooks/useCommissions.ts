import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export interface CommissionStatement {
  id: string;
  branchId: string;
  branch: { name: string; code: string };
  periodStart: string;
  periodEnd: string;
  grossSales: string;
  cancellations: string;
  prizesPaid: string;
  netRevenue: string;
  commissionRate: string;
  commissionAmount: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  paidAt?: string;
  approvedAt?: string;
}

export function useCommissionStatements() {
  const { user } = useAuthStore();
  return useQuery<CommissionStatement[]>({
    queryKey: ['commissions', 'statements', user?.branchId],
    queryFn: () => api.get('/commissions/statements').then((r) => r.data),
    enabled: !!user,
  });
}
