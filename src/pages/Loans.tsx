import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Loan } from '@/types/finance';
import { format } from 'date-fns';
import { parseDateOnly, todayDateOnly } from '@/lib/date';
import { Plus, Trash2, Pencil, HandCoins, CheckCircle2, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export default function Loans() {
  const { loans, loanPayments, addLoan, updateLoan, deleteLoan, markLoanAsPaid, addLoanPayment, deleteLoanPayment } = useFinance();
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayDateOnly());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [loanDate, setLoanDate] = useState(todayDateOnly());
  const [notes, setNotes] = useState('');

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const paidByLoan = useMemo(() => {
    const map: Record<string, number> = {};
    loanPayments.forEach(p => {
      map[p.loanId] = (map[p.loanId] || 0) + p.amount;
    });
    return map;
  }, [loanPayments]);

  const getRemainingAmount = (loan: Loan) => {
    return Math.max(0, loan.amount - (paidByLoan[loan.id] || 0));
  };

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

  const openPayment = (loanId: string) => {
    setPaymentLoanId(loanId);
    const remaining = getRemainingAmount(loans.find(l => l.id === loanId)!);
    setPaymentAmount(remaining.toString());
    setPaymentDate(todayDateOnly());
    setPaymentNotes('');
    setPaymentOpen(true);
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

  const handlePaymentSubmit = () => {
    if (!paymentLoanId || !paymentAmount || !paymentDate) return;
    const amt = parseFloat(paymentAmount);
    if (amt <= 0) return;
    addLoanPayment({ loanId: paymentLoanId, amount: amt, paymentDate, notes: paymentNotes });

    // Check if fully paid after this payment
    const loan = loans.find(l => l.id === paymentLoanId);
    if (loan) {
      const totalPaid = (paidByLoan[paymentLoanId] || 0) + amt;
      if (totalPaid >= loan.amount) {
        markLoanAsPaid(paymentLoanId);
      }
    }
    setPaymentOpen(false);
  };

  const unpaid = loans.filter(l => !l.paid);
  const paid = loans.filter(l => l.paid);
  const totalRemaining = unpaid.reduce((s, l) => s + getRemainingAmount(l), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Empréstimos</h1>
        <Button size="sm" onClick={openNew} className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity">
          <Plus size={16} /> Novo Empréstimo
        </Button>
      </div>

      {/* New/Edit loan dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Empréstimo' : 'Registrar Empréstimo'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome da pessoa" value={personName} onChange={e => setPersonName(e.target.value)} />
            <Input type="number" placeholder="Valor total" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" />
            <Input type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
            <Input placeholder="Observação (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <Button onClick={handleSubmit} className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento Parcial</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="text-sm text-muted-foreground">
              Restante: <span className="font-bold text-foreground">{formatCurrency(paymentLoanId ? getRemainingAmount(loans.find(l => l.id === paymentLoanId)!) : 0)}</span>
            </div>
            <Input type="number" placeholder="Valor do pagamento" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} step="0.01" />
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            <Input placeholder="Observação (opcional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
            <Button onClick={handlePaymentSubmit} className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              Registrar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="glass-card-hover p-4">
        <div className="flex gap-4 text-sm">
          <div className="flex-1 p-3 rounded-xl bg-accent/50 border border-border/30">
            <p className="text-muted-foreground text-xs">Restante a pagar</p>
            <p className="font-bold mono text-lg text-status-overdue">{formatCurrency(totalRemaining)}</p>
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
          unpaid.map(loan => {
            const totalPaidAmount = paidByLoan[loan.id] || 0;
            const remaining = getRemainingAmount(loan);
            const pct = loan.amount > 0 ? (totalPaidAmount / loan.amount) * 100 : 0;
            const payments = loanPayments.filter(p => p.loanId === loan.id);
            const isExpanded = expandedLoan === loan.id;

            return (
              <div key={loan.id} className="glass-card-hover overflow-hidden group">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-status-overdue/15 text-status-overdue transition-transform duration-200 group-hover:scale-110">
                    <HandCoins size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{loan.personName}</span>
                    <div className="text-xs text-muted-foreground">
                      Peguei em {format(parseDateOnly(loan.loanDate), 'dd/MM/yyyy')}
                      {loan.notes && ` · ${loan.notes}`}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground mono shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Pago: {formatCurrency(totalPaidAmount)} · Resta: <span className="text-status-overdue font-medium">{formatCurrency(remaining)}</span>
                    </div>
                  </div>
                  <span className="font-bold mono shrink-0 text-status-overdue">{formatCurrency(loan.amount)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openPayment(loan.id)} title="Pagamento parcial">
                      <DollarSign size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-status-paid hover:bg-status-paid/10" onClick={() => markLoanAsPaid(loan.id)} title="Quitar tudo">
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

                {/* Payment history toggle */}
                {payments.length > 0 && (
                  <div className="border-t border-border/30">
                    <button
                      className="w-full px-4 py-2 text-xs text-muted-foreground flex items-center gap-1 hover:bg-accent/50 transition-colors"
                      onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {payments.length} pagamento{payments.length > 1 ? 's' : ''} registrado{payments.length > 1 ? 's' : ''}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1.5">
                        {payments.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-accent/30">
                            <div>
                              <span className="text-status-paid font-medium">{formatCurrency(p.amount)}</span>
                              <span className="text-muted-foreground ml-2">{format(parseDateOnly(p.paymentDate), 'dd/MM/yyyy')}</span>
                              {p.notes && <span className="text-muted-foreground ml-1">· {p.notes}</span>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteLoanPayment(p.id)}>
                              <Trash2 size={10} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
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
