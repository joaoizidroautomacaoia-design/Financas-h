import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { getBillStatus } from '@/types/finance';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly, todayDateOnly } from '@/lib/date';
import { Plus, Trash2, ShoppingBag, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getCategoryIcon } from '@/lib/category-icons';
import LastModifiedBadge from '@/components/LastModifiedBadge';

export default function Transactions() {
  const { transactions, bills, categories, addTransaction, deleteTransaction } = useFinance();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayDateOnly());
  const [notes, setNotes] = useState('');

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const paidBillsThisMonth = useMemo(() => {
    return bills
      .filter(b => {
        if (!b.paid || !b.paidDate) return false;
        const d = parseDateOnly(b.paidDate);
        return d >= monthStart && d <= monthEnd;
      })
      .map(b => ({
        id: b.id, type: 'bill' as const, description: b.name, amount: b.amount,
        category: b.category, date: b.paidDate!, notes: b.notes || '',
      }));
  }, [bills, monthStart, monthEnd]);

  const transactionsThisMonth = useMemo(() => {
    return transactions
      .filter(t => {
        const d = parseDateOnly(t.transactionDate);
        return d >= monthStart && d <= monthEnd;
      })
      .map(t => ({
        id: t.id, type: 'transaction' as const, description: t.description, amount: t.amount,
        category: t.category, date: t.transactionDate, notes: t.notes,
      }));
  }, [transactions, monthStart, monthEnd]);

  const allEntries = useMemo(() => {
    return [...paidBillsThisMonth, ...transactionsThisMonth].sort((a, b) =>
      parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime()
    );
  }, [paidBillsThisMonth, transactionsThisMonth]);

  const totalMonth = useMemo(() => allEntries.reduce((s, e) => s + e.amount, 0), [allEntries]);

  const handleAdd = () => {
    if (!desc || !amount || !category || !date) return;
    addTransaction({ description: desc, amount: parseFloat(amount), category, transactionDate: date, notes });
    setDesc(''); setAmount(''); setCategory(''); setDate(todayDateOnly()); setNotes('');
    setOpen(false);
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"><Plus size={16} /> Nova Transação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Transação</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Descrição (ex: Padaria)" value={desc} onChange={e => setDesc(e.target.value)} />
              <Input type="number" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => {
                    const CatIcon = getCategoryIcon(c.name);
                    return (
                      <SelectItem key={c.id} value={c.name}>
                        <div className="flex items-center gap-2">
                          <CatIcon size={14} style={{ color: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Input placeholder="Observação (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
              <Button onClick={handleAdd} className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month navigation */}
      <div className="glass-card-hover p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-accent"><ChevronLeft size={18} /></Button>
          <span className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-accent"><ChevronRight size={18} /></Button>
        </div>
        <div className="flex gap-4 text-sm stagger-fade">
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30 transition-all duration-200 hover:bg-accent">
            <p className="text-muted-foreground text-xs">Total do mês</p>
            <p className="font-bold mono text-lg">{formatCurrency(totalMonth)}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30 transition-all duration-200 hover:bg-accent">
            <p className="text-muted-foreground text-xs">Transações</p>
            <p className="font-bold text-lg">{transactionsThisMonth.length}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30 transition-all duration-200 hover:bg-accent">
            <p className="text-muted-foreground text-xs">Contas pagas</p>
            <p className="font-bold text-lg">{paidBillsThisMonth.length}</p>
          </div>
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-2 stagger-fade">
        {allEntries.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma transação neste mês</p>
          </div>
        ) : (
          allEntries.map(entry => {
            const CatIcon = getCategoryIcon(entry.category);
            return (
              <div key={`${entry.type}-${entry.id}`} className="glass-card-hover p-4 flex items-center gap-3 group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${entry.type === 'bill' ? 'bg-primary/15 text-primary' : 'bg-accent'}`}>
                  {entry.type === 'bill' ? <Receipt size={16} /> : <CatIcon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{entry.description}</span>
                    {entry.type === 'bill' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0 font-medium">Conta</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CatIcon size={10} />
                    {entry.category} · {format(parseDateOnly(entry.date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <span className="font-bold mono shrink-0">{formatCurrency(entry.amount)}</span>
                {entry.type === 'transaction' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTransaction(entry.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
