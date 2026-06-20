import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useDashboardSummary = () =>
  useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => api.get('/dashboard/summary').then(r => r.data), refetchInterval: 30_000 });

export const useSalesByBranch = () =>
  useQuery({ queryKey: ['dashboard', 'sales-by-branch'], queryFn: () => api.get('/dashboard/sales-by-branch').then(r => r.data), refetchInterval: 60_000 });

export const useTopNumbers = (limit = 10) =>
  useQuery({ queryKey: ['dashboard', 'top-numbers'], queryFn: () => api.get(`/dashboard/top-numbers?limit=${limit}`).then(r => r.data), refetchInterval: 60_000 });

export const usePendingPrizes = () =>
  useQuery({ queryKey: ['dashboard', 'pending-prizes'], queryFn: () => api.get('/dashboard/pending-prizes').then(r => r.data), refetchInterval: 30_000 });

export const useRecentActivity = () =>
  useQuery({ queryKey: ['dashboard', 'activity'], queryFn: () => api.get('/dashboard/activity').then(r => r.data), refetchInterval: 15_000 });

// ─── Branches ─────────────────────────────────────────────────────────────────
export const useBranches = () =>
  useQuery({ queryKey: ['branches'], queryFn: () => api.get('/branches').then(r => r.data) });

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: unknown) => api.post('/branches', data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }) });
};

export const useUpdateBranchStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/branches/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: unknown) => api.post('/users', data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
};

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/deactivate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUnlockUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/unlock`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

// ─── Draws ────────────────────────────────────────────────────────────────────
export const useDraws = (status?: string) =>
  useQuery({ queryKey: ['draws', status], queryFn: () => api.get('/draws', { params: { status } }).then(r => r.data) });

export const useOpenDraws = () =>
  useQuery({ queryKey: ['draws', 'open'], queryFn: () => api.get('/draws/open').then(r => r.data), refetchInterval: 30_000 });

export const useCloseDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/draws/${id}/close`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['draws'] }),
  });
};

export const useOpenDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/draws/${id}/open`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['draws'] }),
  });
};

// ─── Results ──────────────────────────────────────────────────────────────────
export const useResults = () =>
  useQuery({ queryKey: ['results'], queryFn: () => api.get('/results').then(r => r.data) });

export const usePublishResult = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post('/results', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
};

export const useConfirmResult = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (drawId: string) => api.post(`/results/${drawId}/confirm`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
};

// ─── Limits ───────────────────────────────────────────────────────────────────
export const useLimits = () =>
  useQuery({ queryKey: ['limits'], queryFn: () => api.get('/limits').then(r => r.data) });

// ─── Lottery Providers ────────────────────────────────────────────────────────
export const useLotteryProviders = () =>
  useQuery({ queryKey: ['lottery-providers'], queryFn: () => api.get('/lottery-providers').then(r => r.data) });

// ─── Cash Sessions ────────────────────────────────────────────────────────────
export const useCashSessions = (branchId?: string) =>
  useQuery({
    queryKey: ['cash-sessions', branchId],
    queryFn: () => api.get(branchId ? `/cash-sessions/branch/${branchId}` : '/cash-sessions').then(r => r.data),
  });

// ─── Reports ──────────────────────────────────────────────────────────────────
export const useSalesReport = (from: string, to: string) =>
  useQuery({ queryKey: ['reports', 'sales', from, to], queryFn: () => api.get('/reports/sales', { params: { from, to } }).then(r => r.data), enabled: !!from && !!to });

// ─── Audit ────────────────────────────────────────────────────────────────────
export const useAuditLogs = (filters?: Record<string, string>) =>
  useQuery({ queryKey: ['audit', filters], queryFn: () => api.get('/audit', { params: filters }).then(r => r.data) });

// ─── Commissions ──────────────────────────────────────────────────────────────
export const useCommissionStatements = () =>
  useQuery({ queryKey: ['commissions', 'statements'], queryFn: () => api.get('/commissions/statements').then(r => r.data) });

// ─── Payout Tables ────────────────────────────────────────────────────────────
export const usePayoutTables = () =>
  useQuery({ queryKey: ['payout-tables'], queryFn: () => api.get('/payout-tables').then(r => r.data) });
