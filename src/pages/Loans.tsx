import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Loan } from '@/types/finance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly, todayDateOnly } from '@/lib/date';
import { Plus, Trash2, Pencil, HandCoins, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Loans() {
  const { loans, addLoan, updateLoan, deleteLoan, markLoanAsPaid } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [loanDate, setLoanDate] = useState(todayDateOnly());
  const [notes, setNotes] = useState('');

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const resetForm = () => { setPersonName(''); setAmount(''); setLoanDate(todayDateOnly()); setNotes(''); setEditing(null); };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (loan: Loan) => {
    setEditing(loan);
    setPersonName(loan.personName);
    setAmount(loan.amount.toString());
    setLoanDate(loan.loanDate);
    setNotes(loan.notes);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!personName || !amount || !loanDate) return;
    if (editing) {
      updateLoan({ ...editing, personName, amount: parseFloat(amount), loanDate, notes });
    } else {
      addLoan({ personName, amount: parseFloat(amount), loanDate, notes, paid: false });
    }
    resetForm();
    setOpen(false);
  };

  const unpaid = loans.filter(l => !l.paid);
  const paid = loans.filter(l => l.paid);
  const totalUnpaid = unpaid.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Empréstimos</h1>
        <Button size="sm" onClick={openNew} className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity">
          <Plus size={16} /> Novo Empréstimo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Empréstimo' : 'Registrar Empréstimo'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome da pessoa" value={personName} onChange={e => setPersonName(e.target.value)} />
            <Input type="number" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" />
            <Input type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
            <Input placeholder="Observação (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <Button onClick={handleSubmit} className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="glass-card-hover p-4">
        <div className="flex gap-4 text-sm">
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30">
            <p className="text-muted-foreground text-xs">Total devendo</p>
            <p className="font-bold mono text-lg text-status-overdue">{formatCurrency(totalUnpaid)}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30">
            <p className="text-muted-foreground text-xs">Empréstimos ativos</p>
            <p className="font-bold text-lg">{unpaid.length}</p>
          </div>
        </div>
      </div>

      {/* Unpaid loans */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pendentes</h2>
        {unpaid.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <HandCoins size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum empréstimo pendente</p>
          </div>
        ) : (
          unpaid.map(loan => (
            <div key={loan.id} className="glass-card-hover p-4 flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-status-overdue/15 text-status-overdue transition-transform duration-200 group-hover:scale-110">
                <HandCoins size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{loan.personName}</span>
                <div className="text-xs text-muted-foreground">
                  Peguei em {format(parseDateOnly(loan.loanDate), 'dd/MM/yyyy')}
                  {loan.notes && ` · ${loan.notes}`}
                </div>
              </div>
              <span className="font-bold mono shrink-0 text-status-overdue">{formatCurrency(loan.amount)}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-status-paid hover:bg-status-paid/10" onClick={() => markLoanAsPaid(loan.id)} title="Marcar como pago">
                  <CheckCircle2 size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => openEdit(loan)} title="Editar">
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteLoan(loan.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paid loans */}
      {paid.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pagos</h2>
          {paid.map(loan => (
            <div key={loan.id} className="glass-card p-4 flex items-center gap-3 opacity-60">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-status-paid/15 text-status-paid">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block line-through">{loan.personName}</span>
                <div className="text-xs text-muted-foreground">
                  Pago em {loan.paidDate ? format(parseDateOnly(loan.paidDate), 'dd/MM/yyyy') : '—'}
                </div>
              </div>
              <span className="font-bold mono shrink-0">{formatCurrency(loan.amount)}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteLoan(loan.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
