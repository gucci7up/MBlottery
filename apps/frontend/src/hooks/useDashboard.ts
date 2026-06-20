import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardSummary {
  grossSales: string;
  prizesPaid: string;
  netRevenue: string;
  ticketCount: number;
  salesCount: number;
  pendingPrizesAmount: string;
  pendingPrizesCount: number;
  activeCashSessions: number;
  date: string;
}

export interface BranchSales {
  branchId: string;
  branch?: { name: string; code: string };
  totalAmount: string;
  ticketCount: number;
}

export interface TopNumber {
  number: string;
  count: number;
  amount: string;
}

export interface ActivityItem {
  type: 'SALE' | 'PRIZE' | 'RESULT';
  label: string;
  amount: string | null;
  timestamp: string;
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSalesByBranch() {
  return useQuery<BranchSales[]>({
    queryKey: ['dashboard', 'sales-by-branch'],
    queryFn: () => api.get('/dashboard/sales-by-branch').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useTopNumbers() {
  return useQuery<TopNumber[]>({
    queryKey: ['dashboard', 'top-numbers'],
    queryFn: () => api.get('/dashboard/top-numbers').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.get('/dashboard/activity').then((r) => r.data),
    refetchInterval: 15_000,
  });
}
