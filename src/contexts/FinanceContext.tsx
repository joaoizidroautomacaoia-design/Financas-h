import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bill, BankAccount, Category, BankDeposit } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseDateOnly, toDateOnly, formatDateOnly, todayDateOnly } from '@/lib/date';

interface FinanceContextType {
  bills: Bill[];
  bankAccounts: BankAccount[];
  categories: Category[];
  deposits: BankDeposit[];
  loading: boolean;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (bill: Bill) => void;
  updateBillGroup: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  deleteBillGroup: (groupId: string) => void;
  markAsPaid: (id: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (account: BankAccount) => void;
  deleteBankAccount: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  addDeposit: (deposit: Omit<BankDeposit, 'id'>) => void;
  deleteDeposit: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Moradia', color: 'hsl(217, 91%, 60%)' },
  { name: 'Alimentação', color: 'hsl(38, 92%, 50%)' },
  { name: 'Transporte', color: 'hsl(280, 65%, 60%)' },
  { name: 'Saúde', color: 'hsl(0, 72%, 51%)' },
  { name: 'Educação', color: 'hsl(160, 84%, 39%)' },
  { name: 'Lazer', color: 'hsl(330, 80%, 60%)' },
  { name: 'Serviços', color: 'hsl(200, 70%, 50%)' },
  { name: 'Outros', color: 'hsl(215, 20%, 55%)' },
];

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBills([]);
      setBankAccounts([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [billsRes, accountsRes, categoriesRes, depositsRes] = await Promise.all([
      supabase.from('bills').select('*').order('due_date'),
      supabase.from('bank_accounts').select('*').order('created_at'),
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('bank_deposits').select('*').order('deposit_date'),
    ]);

    if (billsRes.data) setBills(billsRes.data.map(mapBillFromDb));
    if (accountsRes.data) setBankAccounts(accountsRes.data.map(a => ({ id: a.id, name: a.name, balance: Number(a.balance) })));
    if (depositsRes.data) setDeposits(depositsRes.data.map(d => ({ id: d.id, bankAccountId: d.bank_account_id, amount: Number(d.amount), depositDate: d.deposit_date, description: d.description || '' })));
    if (categoriesRes.data) {
      if (categoriesRes.data.length === 0) {
        await seedCategories();
      } else {
        setCategories(categoriesRes.data.map(c => ({ id: c.id, name: c.name, color: c.color })));
      }
    }
    setLoading(false);
  };

  const seedCategories = async () => {
    if (!user) return;
    const rows = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }));
    const { data } = await supabase.from('categories').insert(rows).select();
    if (data) setCategories(data.map(c => ({ id: c.id, name: c.name, color: c.color })));
  };

  function mapBillFromDb(row: any): Bill {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      amount: Number(row.amount),
      dueDate: row.due_date,
      paid: row.paid,
      paidDate: row.paid_date || undefined,
      recurring: row.recurring,
      frequency: row.frequency || undefined,
      installment: row.installment,
      installmentCount: row.installment_count || undefined,
      currentInstallment: row.current_installment || undefined,
      paymentMethod: row.payment_method,
      bankAccountId: row.bank_account_id || undefined,
      type: row.type as Bill['type'],
      notes: row.notes || '',
      groupId: row.group_id || undefined,
    };
  }

  function billToDb(bill: Omit<Bill, 'id'> & { id?: string }) {
    return {
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      due_date: toDateOnly(bill.dueDate),
      paid: bill.paid,
      paid_date: bill.paidDate ? toDateOnly(bill.paidDate) : null,
      recurring: bill.recurring,
      frequency: bill.frequency || null,
      installment: bill.installment,
      installment_count: bill.installmentCount || null,
      current_installment: bill.currentInstallment || null,
      payment_method: bill.paymentMethod,
      bank_account_id: bill.bankAccountId || null,
      type: bill.type,
      notes: bill.notes || '',
      user_id: user!.id,
      group_id: bill.groupId || null,
    };
  }

  const addBill = useCallback(async (bill: Omit<Bill, 'id'>) => {
    if (!user) return;
    
    // Generate a group_id for recurring/installment bills
    const needsGroup = (bill.recurring && bill.frequency) || (bill.installment && bill.installmentCount && bill.installmentCount > 1);
    const groupId = needsGroup ? crypto.randomUUID() : undefined;
    const billWithGroup = { ...bill, groupId };
    
    const rows = [billToDb(billWithGroup)];

    if (bill.recurring && bill.frequency) {
      const base = parseDateOnly(bill.dueDate);
      for (let i = 1; i <= 11; i++) {
        const d = new Date(base);
        if (bill.frequency === 'monthly') d.setMonth(d.getMonth() + i);
        else if (bill.frequency === 'weekly') d.setDate(d.getDate() + 7 * i);
        else d.setFullYear(d.getFullYear() + i);
        rows.push(billToDb({ ...billWithGroup, dueDate: formatDateOnly(d), paid: false }));
      }
    }

    if (bill.installment && bill.installmentCount && bill.installmentCount > 1) {
      const base = parseDateOnly(bill.dueDate);
      for (let i = 1; i < bill.installmentCount; i++) {
        const d = new Date(base);
        d.setMonth(d.getMonth() + i);
        rows.push(billToDb({
          ...billWithGroup,
          dueDate: formatDateOnly(d),
          paid: false,
          currentInstallment: (bill.currentInstallment || 1) + i,
          notes: `Parcela ${(bill.currentInstallment || 1) + i}/${bill.installmentCount}`,
        }));
      }
    }

    const { data, error } = await supabase.from('bills').insert(rows).select();
    if (error) { toast.error('Erro ao adicionar conta'); return; }
    if (data) setBills(prev => [...prev, ...data.map(mapBillFromDb)]);
  }, [user]);

  const updateBill = useCallback(async (bill: Bill) => {
    const { error } = await supabase.from('bills').update(billToDb(bill)).eq('id', bill.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
  }, [user]);

  const updateBillGroup = useCallback(async (bill: Bill) => {
    if (!bill.groupId) {
      // No group, just update single
      return updateBill(bill);
    }
    const updateData = {
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      type: bill.type,
      payment_method: bill.paymentMethod,
      bank_account_id: bill.bankAccountId || null,
      recurring: bill.recurring,
      frequency: bill.frequency || null,
    };
    const { error } = await supabase.from('bills').update(updateData).eq('group_id', bill.groupId);
    if (error) { toast.error('Erro ao atualizar grupo'); return; }
    setBills(prev => prev.map(b => b.groupId === bill.groupId ? { ...b, ...bill, dueDate: b.dueDate, paid: b.paid, paidDate: b.paidDate, currentInstallment: b.currentInstallment, notes: b.notes, id: b.id } : b));
  }, [user]);

  const deleteBill = useCallback(async (id: string) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const deleteBillGroup = useCallback(async (groupId: string) => {
    const { error } = await supabase.from('bills').delete().eq('group_id', groupId);
    if (error) { toast.error('Erro ao deletar grupo'); return; }
    setBills(prev => prev.filter(b => b.groupId !== groupId));
  }, []);

  const markAsPaid = useCallback(async (id: string) => {
    const now = todayDateOnly();
    const { error } = await supabase.from('bills').update({ paid: true, paid_date: now }).eq('id', id);
    if (error) { toast.error('Erro ao marcar como pago'); return; }
    setBills(prev => prev.map(b => b.id === id ? { ...b, paid: true, paidDate: now } : b));
  }, []);

  const addBankAccount = useCallback(async (a: Omit<BankAccount, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('bank_accounts').insert({ name: a.name, balance: a.balance, user_id: user.id }).select().single();
    if (error) { toast.error('Erro ao adicionar conta bancária'); return; }
    if (data) setBankAccounts(prev => [...prev, { id: data.id, name: data.name, balance: Number(data.balance) }]);
  }, [user]);

  const updateBankAccount = useCallback(async (a: BankAccount) => {
    const { error } = await supabase.from('bank_accounts').update({ name: a.name, balance: a.balance }).eq('id', a.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setBankAccounts(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);

  const deleteBankAccount = useCallback(async (id: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setBankAccounts(prev => prev.filter(x => x.id !== id));
  }, []);

  const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories').insert({ name: c.name, color: c.color, user_id: user.id }).select().single();
    if (error) { toast.error('Erro ao adicionar categoria'); return; }
    if (data) setCategories(prev => [...prev, { id: data.id, name: data.name, color: data.color }]);
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setCategories(prev => prev.filter(x => x.id !== id));
  }, []);

  const addDeposit = useCallback(async (d: Omit<BankDeposit, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('bank_deposits').insert({
      bank_account_id: d.bankAccountId,
      amount: d.amount,
      deposit_date: d.depositDate,
      description: d.description,
      user_id: user.id,
    }).select().single();
    if (error) { toast.error('Erro ao registrar recebimento'); return; }
    if (data) setDeposits(prev => [...prev, { id: data.id, bankAccountId: data.bank_account_id, amount: Number(data.amount), depositDate: data.deposit_date, description: data.description || '' }]);
  }, [user]);

  const deleteDeposit = useCallback(async (id: string) => {
    const { error } = await supabase.from('bank_deposits').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar recebimento'); return; }
    setDeposits(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <FinanceContext.Provider value={{ bills, bankAccounts, categories, deposits, loading, addBill, updateBill, updateBillGroup, deleteBill, deleteBillGroup, markAsPaid, addBankAccount, updateBankAccount, deleteBankAccount, addCategory, deleteCategory, addDeposit, deleteDeposit }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider');
  return ctx;
}
