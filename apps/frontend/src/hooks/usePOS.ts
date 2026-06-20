import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Draw, Ticket } from '../types/lottery';
import { usePOSStore, BetSlipItem } from '../stores/posStore';
import { v4 as uuidv4 } from 'uuid';

export function useOpenDraws() {
  return useQuery<Draw[]>({
    queryKey: ['draws', 'open'],
    queryFn: () => api.get('/draws/open').then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSellTicket() {
  const { selectedDrawId, clearSlip } = usePOSStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (items: BetSlipItem[]) => {
      const idempotencyKey = uuidv4();
      const res = await api.post<Ticket>(
        '/tickets',
        {
          drawId: selectedDrawId,
          bets: items.map((b) => ({
            modality: b.modality,
            numbers: b.numbers,
            amount: b.amount,
          })),
        },
        { headers: { 'idempotency-key': idempotencyKey } },
      );
      return res.data;
    },
    onSuccess: () => {
      clearSlip();
      qc.invalidateQueries({ queryKey: ['draws', 'open'] });
    },
  });
}

export function useVerifyTicket() {
  return useMutation({
    mutationFn: (serial: string) =>
      api.get<Ticket & { integrityValid: boolean }>(`/tickets/serial/${serial}`).then((r) => r.data),
  });
}

export interface PaymentResult {
  payment: { id: string; amount: string };
  prizeAmount: string;
  ticketNumber: string;
}

export interface PaymentError {
  requiresAuth?: boolean;
  message: string;
}

export function usePayPrize() {
  return useMutation({
    mutationFn: (params: { ticketId: string; authorizerId?: string; notes?: string }) =>
      api.post<PaymentResult>('/payments', params).then((r) => r.data),
  });
}
