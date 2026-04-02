import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bill, BankAccount, Category, BankDeposit, Transaction, Loan, LoanPayment } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { parseDateOnly, toDateOnly, formatDateOnly, todayDateOnly } from '@/lib/date';

interface FinanceContextType {
  bills: Bill[];
  bankAccounts: BankAccount[];
  categories: Category[];
  deposits: BankDeposit[];
  transactions: Transaction[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  monthlyBudget: number;
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
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addLoan: (l: Omit<Loan, 'id'>) => void;
  updateLoan: (l: Loan) => void;
  deleteLoan: (id: string) => void;
  markLoanAsPaid: (id: string) => void;
  addLoanPayment: (p: Omit<LoanPayment, 'id'>) => void;
  deleteLoanPayment: (id: string) => void;
  setMonthlyBudget: (amount: number) => void;
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
  const { activeWorkspace } = useWorkspace();
  const { log } = useActivityLog();
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveUserId = activeWorkspace?.id || user?.id;

  useEffect(() => {
    if (!user || !effectiveUserId) {
      setBills([]);
      setBankAccounts([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    fetchAll();
  }, [user, effectiveUserId]);

  const fetchAll = async () => {
    setLoading(true);
    const uid = effectiveUserId!;
    const [billsRes, accountsRes, categoriesRes, depositsRes, transactionsRes, loansRes, loanPaymentsRes] = await Promise.all([
      supabase.from('bills').select('*').eq('user_id', uid).order('due_date'),
      supabase.from('bank_accounts').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('categories').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('bank_deposits').select('*').eq('user_id', uid).order('deposit_date'),
      supabase.from('transactions').select('*').eq('user_id', uid).order('transaction_date', { ascending: false }),
      supabase.from('loans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('loan_payments').select('*').eq('user_id', uid).order('payment_date', { ascending: false }),
    ]);

    if (billsRes.data) setBills(billsRes.data.map(mapBillFromDb));
    if (accountsRes.data) setBankAccounts(accountsRes.data.map(a => ({ id: a.id, name: a.name, balance: Number(a.balance) })));
    if (depositsRes.data) setDeposits(depositsRes.data.map(d => ({ id: d.id, bankAccountId: d.bank_account_id, amount: Number(d.amount), depositDate: d.deposit_date, description: d.description || '' })));
    if (transactionsRes.data) setTransactions(transactionsRes.data.map(t => ({ id: t.id, description: t.description, amount: Number(t.amount), category: t.category, transactionDate: t.transaction_date, notes: t.notes || '' })));
    if (loansRes.data) setLoans(loansRes.data.map((l: any) => ({ id: l.id, personName: l.person_name, amount: Number(l.amount), loanDate: l.loan_date, notes: l.notes || '', paid: l.paid, paidDate: l.paid_date || undefined })));
    if (loanPaymentsRes.data) setLoanPayments(loanPaymentsRes.data.map((p: any) => ({ id: p.id, loanId: p.loan_id, amount: Number(p.amount), paymentDate: p.payment_date, notes: p.notes || '' })));
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
    if (!user || !effectiveUserId) return;
    if (effectiveUserId !== user.id) return;
    const { data: existing } = await supabase.from('categories').select('id, name, color').eq('user_id', effectiveUserId);
    if (existing && existing.length > 0) {
      setCategories(existing.map(c => ({ id: c.id, name: c.name, color: c.color })));
      return;
    }
    const rows = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: effectiveUserId }));
    const { data } = await supabase.from('categories').insert(rows).select();
    if (data) setCategories(data.map(c => ({ id: c.id, name: c.name, color: c.color })));
  };

  function mapBillFromDb(row: any): Bill {
    return {
      id: row.id, name: row.name, category: row.category, amount: Number(row.amount),
      dueDate: row.due_date, paid: row.paid, paidDate: row.paid_date || undefined,
      recurring: row.recurring, frequency: row.frequency || undefined,
      installment: row.installment, installmentCount: row.installment_count || undefined,
      currentInstallment: row.current_installment || undefined,
      paymentMethod: row.payment_method, bankAccountId: row.bank_account_id || undefined,
      type: row.type as Bill['type'], notes: row.notes || '', groupId: row.group_id || undefined,
    };
  }

  function billToDb(bill: Omit<Bill, 'id'> & { id?: string }) {
    return {
      name: bill.name, category: bill.category, amount: bill.amount,
      due_date: toDateOnly(bill.dueDate), paid: bill.paid,
      paid_date: bill.paidDate ? toDateOnly(bill.paidDate) : null,
      recurring: bill.recurring, frequency: bill.frequency || null,
      installment: bill.installment, installment_count: bill.installmentCount || null,
      current_installment: bill.currentInstallment || null,
      payment_method: bill.paymentMethod, bank_account_id: bill.bankAccountId || null,
      type: bill.type, notes: bill.notes || '', user_id: effectiveUserId!,
      group_id: bill.groupId || null,
    };
  }

  const addBill = useCallback(async (bill: Omit<Bill, 'id'>) => {
    if (!user) return;
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
          ...billWithGroup, dueDate: formatDateOnly(d), paid: false,
          currentInstallment: (bill.currentInstallment || 1) + i,
          notes: `Parcela ${(bill.currentInstallment || 1) + i}/${bill.installmentCount}`,
        }));
      }
    }

    const { data, error } = await supabase.from('bills').insert(rows).select();
    if (error) { toast.error('Erro ao adicionar conta'); return; }
    if (data) {
      setBills(prev => [...prev, ...data.map(mapBillFromDb)]);
      log('create', 'bill', bill.name, data[0]?.id);
    }
  }, [user, log]);

  const updateBill = useCallback(async (bill: Bill) => {
    const { error } = await supabase.from('bills').update(billToDb(bill)).eq('id', bill.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
    log('update', 'bill', bill.name, bill.id);
  }, [user, log]);

  const updateBillGroup = useCallback(async (bill: Bill) => {
    if (!bill.groupId) return updateBill(bill);
    const updateData = {
      name: bill.name, category: bill.category, amount: bill.amount, type: bill.type,
      payment_method: bill.paymentMethod, bank_account_id: bill.bankAccountId || null,
      recurring: bill.recurring, frequency: bill.frequency || null,
    };
    const { error } = await supabase.from('bills').update(updateData).eq('group_id', bill.groupId);
    if (error) { toast.error('Erro ao atualizar grupo'); return; }
    setBills(prev => prev.map(b => b.groupId === bill.groupId ? { ...b, ...bill, dueDate: b.dueDate, paid: b.paid, paidDate: b.paidDate, currentInstallment: b.currentInstallment, notes: b.notes, id: b.id } : b));
    log('update', 'bill', bill.name, bill.id, 'Grupo inteiro atualizado');
  }, [user, log]);

  const deleteBill = useCallback(async (id: string) => {
    const bill = bills.find(b => b.id === id);
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setBills(prev => prev.filter(b => b.id !== id));
    log('delete', 'bill', bill?.name || '', id);
  }, [bills, log]);

  const deleteBillGroup = useCallback(async (groupId: string) => {
    const bill = bills.find(b => b.groupId === groupId);
    const { error } = await supabase.from('bills').delete().eq('group_id', groupId);
    if (error) { toast.error('Erro ao deletar grupo'); return; }
    setBills(prev => prev.filter(b => b.groupId !== groupId));
    log('delete', 'bill', bill?.name || '', undefined, 'Grupo inteiro removido');
  }, [bills, log]);

  const markAsPaid = useCallback(async (id: string) => {
    const now = todayDateOnly();
    const bill = bills.find(b => b.id === id);
    const { error } = await supabase.from('bills').update({ paid: true, paid_date: now }).eq('id', id);
    if (error) { toast.error('Erro ao marcar como pago'); return; }
    setBills(prev => prev.map(b => b.id === id ? { ...b, paid: true, paidDate: now } : b));
    log('paid', 'bill', bill?.name || '', id);
  }, [bills, log]);

  const addBankAccount = useCallback(async (a: Omit<BankAccount, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('bank_accounts').insert({ name: a.name, balance: a.balance, user_id: effectiveUserId! }).select().single();
    if (error) { toast.error('Erro ao adicionar conta bancária'); return; }
    if (data) {
      setBankAccounts(prev => [...prev, { id: data.id, name: data.name, balance: Number(data.balance) }]);
      log('create', 'bank_account', a.name, data.id);
    }
  }, [user, log]);

  const updateBankAccount = useCallback(async (a: BankAccount) => {
    const { error } = await supabase.from('bank_accounts').update({ name: a.name, balance: a.balance }).eq('id', a.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setBankAccounts(prev => prev.map(x => x.id === a.id ? a : x));
    log('update', 'bank_account', a.name, a.id);
  }, [log]);

  const deleteBankAccount = useCallback(async (id: string) => {
    const acc = bankAccounts.find(a => a.id === id);
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setBankAccounts(prev => prev.filter(x => x.id !== id));
    log('delete', 'bank_account', acc?.name || '', id);
  }, [bankAccounts, log]);

  const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories').insert({ name: c.name, color: c.color, user_id: effectiveUserId! }).select().single();
    if (error) { toast.error('Erro ao adicionar categoria'); return; }
    if (data) {
      setCategories(prev => [...prev, { id: data.id, name: data.name, color: data.color }]);
      log('create', 'category', c.name, data.id);
    }
  }, [user, log]);

  const deleteCategory = useCallback(async (id: string) => {
    const cat = categories.find(c => c.id === id);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar'); return; }
    setCategories(prev => prev.filter(x => x.id !== id));
    log('delete', 'category', cat?.name || '', id);
  }, [categories, log]);

  const addDeposit = useCallback(async (d: Omit<BankDeposit, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('bank_deposits').insert({
      bank_account_id: d.bankAccountId, amount: d.amount, deposit_date: d.depositDate,
      description: d.description, user_id: effectiveUserId!,
    }).select().single();
    if (error) { toast.error('Erro ao registrar recebimento'); return; }
    if (data) {
      setDeposits(prev => [...prev, { id: data.id, bankAccountId: data.bank_account_id, amount: Number(data.amount), depositDate: data.deposit_date, description: data.description || '' }]);
      log('create', 'deposit', d.description || 'Recebimento', data.id);
    }
  }, [user, log]);

  const deleteDeposit = useCallback(async (id: string) => {
    const dep = deposits.find(d => d.id === id);
    const { error } = await supabase.from('bank_deposits').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar recebimento'); return; }
    setDeposits(prev => prev.filter(x => x.id !== id));
    log('delete', 'deposit', dep?.description || 'Recebimento', id);
  }, [deposits, log]);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('transactions').insert({
      description: t.description, amount: t.amount, category: t.category,
      transaction_date: t.transactionDate, notes: t.notes, user_id: effectiveUserId!,
    }).select().single();
    if (error) { toast.error('Erro ao adicionar transação'); return; }
    if (data) {
      setTransactions(prev => [{ id: data.id, description: data.description, amount: Number(data.amount), category: data.category, transactionDate: data.transaction_date, notes: data.notes || '' }, ...prev]);
      log('create', 'transaction', t.description, data.id);
    }
  }, [user, log]);

  const updateTransaction = useCallback(async (t: Transaction) => {
    const { error } = await supabase.from('transactions').update({
      description: t.description, amount: t.amount, category: t.category,
      transaction_date: t.transactionDate, notes: t.notes,
    }).eq('id', t.id);
    if (error) { toast.error('Erro ao atualizar transação'); return; }
    setTransactions(prev => prev.map(x => x.id === t.id ? t : x));
    log('update', 'transaction', t.description, t.id);
  }, [log]);

  const deleteTransaction = useCallback(async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar transação'); return; }
    setTransactions(prev => prev.filter(x => x.id !== id));
    log('delete', 'transaction', tx?.description || '', id);
  }, [transactions, log]);

  const addLoan = useCallback(async (l: Omit<Loan, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('loans').insert({
      person_name: l.personName, amount: l.amount, loan_date: l.loanDate,
      notes: l.notes, paid: l.paid, user_id: effectiveUserId!,
    }).select().single();
    if (error) { toast.error('Erro ao adicionar empréstimo'); return; }
    if (data) {
      setLoans(prev => [{ id: data.id, personName: (data as any).person_name, amount: Number(data.amount), loanDate: (data as any).loan_date, notes: data.notes || '', paid: data.paid, paidDate: (data as any).paid_date || undefined }, ...prev]);
      log('create', 'loan', l.personName, data.id);
    }
  }, [user, log]);

  const updateLoan = useCallback(async (l: Loan) => {
    const { error } = await supabase.from('loans').update({
      person_name: l.personName, amount: l.amount, loan_date: l.loanDate, notes: l.notes,
    }).eq('id', l.id);
    if (error) { toast.error('Erro ao atualizar empréstimo'); return; }
    setLoans(prev => prev.map(x => x.id === l.id ? l : x));
    log('update', 'loan', l.personName, l.id);
  }, [log]);

  const deleteLoan = useCallback(async (id: string) => {
    const loan = loans.find(l => l.id === id);
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar empréstimo'); return; }
    setLoans(prev => prev.filter(x => x.id !== id));
    log('delete', 'loan', loan?.personName || '', id);
  }, [loans, log]);

  const markLoanAsPaid = useCallback(async (id: string) => {
    const now = todayDateOnly();
    const loan = loans.find(l => l.id === id);
    const { error } = await supabase.from('loans').update({ paid: true, paid_date: now }).eq('id', id);
    if (error) { toast.error('Erro ao marcar como pago'); return; }
    setLoans(prev => prev.map(l => l.id === id ? { ...l, paid: true, paidDate: now } : l));
    log('paid', 'loan', loan?.personName || '', id);
  }, [loans, log]);

  const addLoanPayment = useCallback(async (p: Omit<LoanPayment, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('loan_payments').insert({
      loan_id: p.loanId, amount: p.amount, payment_date: p.paymentDate,
      notes: p.notes, user_id: effectiveUserId!,
    }).select().single();
    if (error) { toast.error('Erro ao registrar pagamento'); return; }
    if (data) {
      setLoanPayments(prev => [{ id: data.id, loanId: (data as any).loan_id, amount: Number(data.amount), paymentDate: (data as any).payment_date, notes: data.notes || '' }, ...prev]);
      const loan = loans.find(l => l.id === p.loanId);
      log('create', 'loan', `Pagamento parcial - ${loan?.personName || ''}`, data.id);
      toast.success('Pagamento registrado!');
    }
  }, [user, loans, log]);

  const deleteLoanPayment = useCallback(async (id: string) => {
    const { error } = await supabase.from('loan_payments').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar pagamento'); return; }
    setLoanPayments(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <FinanceContext.Provider value={{ bills, bankAccounts, categories, deposits, transactions, loans, loanPayments, loading, addBill, updateBill, updateBillGroup, deleteBill, deleteBillGroup, markAsPaid, addBankAccount, updateBankAccount, deleteBankAccount, addCategory, deleteCategory, addDeposit, deleteDeposit, addTransaction, updateTransaction, deleteTransaction, addLoan, updateLoan, deleteLoan, markLoanAsPaid, addLoanPayment, deleteLoanPayment }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider');
  return ctx;
}
