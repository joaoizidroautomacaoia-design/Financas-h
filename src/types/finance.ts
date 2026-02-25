import { parseDateOnly } from '@/lib/date';

export type BillStatus = 'paid' | 'pending' | 'overdue' | 'due-soon' | 'future';
export type BillType = 'fixed' | 'variable' | 'card' | 'subscription';
export type Frequency = 'monthly' | 'annual' | 'weekly';

export interface Bill {
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string; // ISO date
  paid: boolean;
  paidDate?: string;
  recurring: boolean;
  frequency?: Frequency;
  installment: boolean;
  installmentCount?: number;
  currentInstallment?: number;
  paymentMethod: string;
  bankAccountId?: string;
  type: BillType;
  notes?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export function getBillStatus(bill: Bill): BillStatus {
  if (bill.paid) return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseDateOnly(bill.dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-soon';
  return 'future';
}

export const STATUS_LABELS: Record<BillStatus, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  overdue: 'Atrasado',
  'due-soon': 'Vence em breve',
  future: 'Futuro',
};

export const TYPE_LABELS: Record<BillType, string> = {
  fixed: 'Fixa',
  variable: 'Variável',
  card: 'Cartão',
  subscription: 'Assinatura',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: 'Mensal',
  annual: 'Anual',
  weekly: 'Semanal',
};
