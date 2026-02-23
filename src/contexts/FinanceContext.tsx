import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bill, BankAccount, Category } from '@/types/finance';

interface FinanceContextType {
  bills: Bill[];
  bankAccounts: BankAccount[];
  categories: Category[];
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  markAsPaid: (id: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (account: BankAccount) => void;
  deleteBankAccount: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Moradia', color: 'hsl(217, 91%, 60%)' },
  { id: '2', name: 'Alimentação', color: 'hsl(38, 92%, 50%)' },
  { id: '3', name: 'Transporte', color: 'hsl(280, 65%, 60%)' },
  { id: '4', name: 'Saúde', color: 'hsl(0, 72%, 51%)' },
  { id: '5', name: 'Educação', color: 'hsl(160, 84%, 39%)' },
  { id: '6', name: 'Lazer', color: 'hsl(330, 80%, 60%)' },
  { id: '7', name: 'Serviços', color: 'hsl(200, 70%, 50%)' },
  { id: '8', name: 'Outros', color: 'hsl(215, 20%, 55%)' },
];

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: '1', name: 'Nubank', balance: 5200 },
  { id: '2', name: 'Itaú', balance: 3800 },
];

function generateSampleBills(): Bill[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  return [
    { id: '1', name: 'Aluguel', category: 'Moradia', amount: 1800, dueDate: new Date(y, m, 5).toISOString(), paid: new Date(y, m, 5) < today, paidDate: new Date(y, m, 5) < today ? new Date(y, m, 4).toISOString() : undefined, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Débito', bankAccountId: '2', type: 'fixed', notes: '' },
    { id: '2', name: 'Internet', category: 'Serviços', amount: 119.90, dueDate: new Date(y, m, 10).toISOString(), paid: new Date(y, m, 10) < today, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Débito', bankAccountId: '1', type: 'fixed', notes: '' },
    { id: '3', name: 'Energia Elétrica', category: 'Moradia', amount: 245, dueDate: new Date(y, m, 15).toISOString(), paid: false, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Boleto', bankAccountId: '1', type: 'variable', notes: '' },
    { id: '4', name: 'Netflix', category: 'Lazer', amount: 55.90, dueDate: new Date(y, m, 8).toISOString(), paid: new Date(y, m, 8) < today, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Cartão', bankAccountId: '1', type: 'subscription', notes: '' },
    { id: '5', name: 'Supermercado', category: 'Alimentação', amount: 650, dueDate: new Date(y, m, 20).toISOString(), paid: false, recurring: false, installment: false, paymentMethod: 'Cartão', bankAccountId: '1', type: 'variable', notes: '' },
    { id: '6', name: 'Plano de Saúde', category: 'Saúde', amount: 489, dueDate: new Date(y, m, 12).toISOString(), paid: new Date(y, m, 12) < today, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Débito', bankAccountId: '2', type: 'fixed', notes: '' },
    { id: '7', name: 'Curso Online', category: 'Educação', amount: 197, dueDate: new Date(y, m, 25).toISOString(), paid: false, recurring: false, installment: true, installmentCount: 6, currentInstallment: 3, paymentMethod: 'Cartão', bankAccountId: '1', type: 'card', notes: 'Parcela 3/6' },
    { id: '8', name: 'Água', category: 'Moradia', amount: 85, dueDate: new Date(y, m, 18).toISOString(), paid: false, recurring: true, frequency: 'monthly', installment: false, paymentMethod: 'Boleto', bankAccountId: '2', type: 'variable', notes: '' },
  ];
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function load<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<Bill[]>(() => load('fin_bills', generateSampleBills()));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => load('fin_accounts', DEFAULT_BANK_ACCOUNTS));
  const [categories, setCategories] = useState<Category[]>(() => load('fin_categories', DEFAULT_CATEGORIES));

  useEffect(() => { localStorage.setItem('fin_bills', JSON.stringify(bills)); }, [bills]);
  useEffect(() => { localStorage.setItem('fin_accounts', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem('fin_categories', JSON.stringify(categories)); }, [categories]);

  const addBill = useCallback((bill: Omit<Bill, 'id'>) => {
    const newBill = { ...bill, id: uid() };
    setBills(prev => [...prev, newBill]);

    // Generate recurring/installment copies
    if (bill.recurring && bill.frequency) {
      const copies: Bill[] = [];
      const base = new Date(bill.dueDate);
      for (let i = 1; i <= 11; i++) {
        const d = new Date(base);
        if (bill.frequency === 'monthly') d.setMonth(d.getMonth() + i);
        else if (bill.frequency === 'weekly') d.setDate(d.getDate() + 7 * i);
        else d.setFullYear(d.getFullYear() + i);
        copies.push({ ...bill, id: uid(), dueDate: d.toISOString(), paid: false });
      }
      setBills(prev => [...prev, ...copies]);
    }
    if (bill.installment && bill.installmentCount && bill.installmentCount > 1) {
      const copies: Bill[] = [];
      const base = new Date(bill.dueDate);
      for (let i = 1; i < bill.installmentCount; i++) {
        const d = new Date(base);
        d.setMonth(d.getMonth() + i);
        copies.push({ ...bill, id: uid(), dueDate: d.toISOString(), paid: false, currentInstallment: (bill.currentInstallment || 1) + i, notes: `Parcela ${(bill.currentInstallment || 1) + i}/${bill.installmentCount}` });
      }
      setBills(prev => [...prev, ...copies]);
    }
  }, []);

  const updateBill = useCallback((bill: Bill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const markAsPaid = useCallback((id: string) => {
    setBills(prev => prev.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b, paid: true, paidDate: new Date().toISOString() };
      // Subtract from bank account
      if (b.bankAccountId) {
        setBankAccounts(accs => accs.map(a =>
          a.id === b.bankAccountId ? { ...a, balance: a.balance - b.amount } : a
        ));
      }
      return updated;
    }));
  }, []);

  const addBankAccount = useCallback((a: Omit<BankAccount, 'id'>) => {
    setBankAccounts(prev => [...prev, { ...a, id: uid() }]);
  }, []);
  const updateBankAccount = useCallback((a: BankAccount) => {
    setBankAccounts(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);
  const deleteBankAccount = useCallback((id: string) => {
    setBankAccounts(prev => prev.filter(x => x.id !== id));
  }, []);
  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    setCategories(prev => [...prev, { ...c, id: uid() }]);
  }, []);
  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <FinanceContext.Provider value={{ bills, bankAccounts, categories, addBill, updateBill, deleteBill, markAsPaid, addBankAccount, updateBankAccount, deleteBankAccount, addCategory, deleteCategory }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider');
  return ctx;
}
