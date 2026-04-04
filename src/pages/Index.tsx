import { useFinance } from '@/contexts/FinanceContext';
import { getBillStatus, STATUS_LABELS } from '@/types/finance';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Wallet, Landmark, Receipt, Sparkles, HandCoins, ShoppingCart, Pencil, PiggyBank } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isThisMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/date';
import { getCategoryIcon, getCategoryColor } from '@/lib/category-icons';

export default function Dashboard() {
  const { bills, bankAccounts, transactions, categories, loans, loanPayments, deposits, monthlyBudget, setMonthlyBudget, investmentBudget, setInvestmentBudget } = useFinance();
  useNotifications(bills, loans, loanPayments);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [investmentInput, setInvestmentInput] = useState('');

  const stats = useMemo(() => {
    const today = new Date();
    const monthBills = bills.filter(b => isThisMonth(parseDateOnly(b.dueDate)));
    const paidThisMonth = monthBills.filter(b => b.paid);
    const pendingThisMonth = monthBills.filter(b => !b.paid);
    const totalMonth = monthBills.reduce((s, b) => s + b.amount, 0);
    const totalPaid = paidThisMonth.reduce((s, b) => s + b.amount, 0);
    const totalPending = pendingThisMonth.reduce((s, b) => s + b.amount, 0);
    const pctPaid = totalMonth > 0 ? (totalPaid / totalMonth) * 100 : 0;
    const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
    const totalPaidByBank = bills.filter(b => b.paid && b.bankAccountId).reduce((s, b) => s + b.amount, 0);
    const projected = totalBalance - totalPaidByBank - totalPending;

    const overdue = bills.filter(b => getBillStatus(b) === 'overdue');
    const dueSoon = bills.filter(b => getBillStatus(b) === 'due-soon');

    const monthTransactions = transactions.filter(t => isThisMonth(parseDateOnly(t.transactionDate)));
    const totalTransactions = monthTransactions.reduce((s, t) => s + t.amount, 0);

    const byCategory = monthTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return { totalMonth, totalPaid, totalPending, pctPaid, projected, totalBalance, overdue, dueSoon, paidThisMonth, monthBills, monthTransactions, totalTransactions, categoryBreakdown };
  }, [bills, bankAccounts, transactions]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const cards = [
    { label: 'Total do Mês', value: formatCurrency(stats.totalMonth), icon: Wallet, colorClass: 'status-future' },
    { label: 'Total Pago', value: formatCurrency(stats.totalPaid), icon: CheckCircle2, colorClass: 'status-paid' },
    { label: 'Total Pendente', value: formatCurrency(stats.totalPending), icon: Clock, colorClass: 'status-due-soon' },
    { label: 'Saldo Projetado', value: formatCurrency(stats.projected), icon: TrendingUp, colorClass: stats.projected >= 0 ? 'status-paid' : 'status-overdue' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-full">
          <Sparkles size={12} className="text-primary" />
          <span>{stats.monthBills.length} contas este mês</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade">
        {cards.map((c, i) => (
          <div key={i} className={`glass-card-hover p-5 border ${c.colorClass} group`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider opacity-80">{c.label}</span>
              <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <c.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold mono">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass-card-hover p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Progresso de Pagamentos</span>
          <span className="text-sm font-semibold mono text-primary">{stats.pctPaid.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${stats.pctPaid}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {stats.paidThisMonth.length} de {stats.monthBills.length} contas pagas este mês
        </p>
      </div>

      {/* Monthly reserves */}
      {(() => {
        const totalReceived = deposits.filter(d => {
          const date = parseDateOnly(d.depositDate);
          return date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
        }).reduce((s, d) => s + d.amount, 0);
        const totalPaid = bills.filter(b => b.paid).reduce((s, b) => s + b.amount, 0);
        const totalPending = bills.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0);
        const afterBills = totalReceived - totalPaid - totalPending;
        const afterAll = afterBills - monthlyBudget - investmentBudget;
        return (
          <div className="glass-card-hover p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
              <h2 className="font-semibold">Planejamento do Mês</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shopping reserve */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-primary" />
                  <span className="text-sm font-medium">Compras do Mês</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold mono">{formatCurrency(monthlyBudget)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBudgetInput(monthlyBudget > 0 ? monthlyBudget.toString() : ''); setShowBudgetDialog(true); }}>
                    <Pencil size={12} />
                  </Button>
                </div>
              </div>
              {/* Investment reserve */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <PiggyBank size={16} className="text-primary" />
                  <span className="text-sm font-medium">Investimentos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold mono">{formatCurrency(investmentBudget)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setInvestmentInput(investmentBudget > 0 ? investmentBudget.toString() : ''); setShowInvestmentDialog(true); }}>
                    <Pencil size={12} />
                  </Button>
                </div>
              </div>
            </div>

            {(monthlyBudget > 0 || investmentBudget > 0) && (
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground">Sobra após contas + reservas</span>
                <span className={`text-lg font-bold mono ${afterAll >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>
                  {formatCurrency(afterAll)}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Budget dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reserva para Compras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="Ex: 500" step="0.01" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>Cancelar</Button>
              <Button onClick={() => { setMonthlyBudget(parseFloat(budgetInput) || 0); setShowBudgetDialog(false); }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investment dialog */}
      <Dialog open={showInvestmentDialog} onOpenChange={setShowInvestmentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reserva para Investimentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input type="number" value={investmentInput} onChange={e => setInvestmentInput(e.target.value)} placeholder="Ex: 300" step="0.01" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvestmentDialog(false)}>Cancelar</Button>
              <Button onClick={() => { setInvestmentBudget(parseFloat(investmentInput) || 0); setShowInvestmentDialog(false); }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions summary with category icons */}
      <div className="glass-card-hover p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt size={16} className="text-primary" />
            </div>
            <h2 className="font-semibold">Transações do Mês</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold mono">{formatCurrency(stats.totalTransactions)}</p>
            <p className="text-xs text-muted-foreground">{stats.monthTransactions.length} transações</p>
          </div>
        </div>
        {stats.categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação registrada este mês</p>
        ) : (
          <div className="space-y-3">
            {stats.categoryBreakdown.map(([cat, amount]) => {
              const pct = stats.totalTransactions > 0 ? (amount / stats.totalTransactions) * 100 : 0;
              const CatIcon = getCategoryIcon(cat);
              const catColor = getCategoryColor(cat);
              const matchedCat = categories.find(c => c.name === cat);
              const color = matchedCat?.color || catColor;
              return (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <CatIcon size={14} style={{ color }} />
                      </div>
                      <span className="text-muted-foreground">{cat}</span>
                    </div>
                    <span className="font-medium mono">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue */}
        <div className="glass-card-hover p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-status-overdue/15 flex items-center justify-center">
              <AlertTriangle size={16} className="text-status-overdue" />
            </div>
            <h2 className="font-semibold">Contas Atrasadas ({stats.overdue.length})</h2>
          </div>
          {stats.overdue.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhuma conta atrasada 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 stagger-fade">
              {stats.overdue.map(b => {
                const CatIcon = getCategoryIcon(b.category);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg status-overdue border text-sm transition-all duration-200 hover:scale-[1.01]">
                    <div className="flex items-center gap-2.5">
                      <CatIcon size={14} />
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs opacity-70">Venceu {format(parseDateOnly(b.dueDate), 'dd/MM')} · {Math.abs(differenceInDays(parseDateOnly(b.dueDate), new Date()))} dias atrás</p>
                      </div>
                    </div>
                    <span className="font-semibold mono">{formatCurrency(b.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Due soon */}
        <div className="glass-card-hover p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-status-due-soon/15 flex items-center justify-center">
              <Clock size={16} className="text-status-due-soon" />
            </div>
            <h2 className="font-semibold">Vencem em até 3 dias ({stats.dueSoon.length})</h2>
          </div>
          {stats.dueSoon.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhuma conta próxima do vencimento</p>
            </div>
          ) : (
            <div className="space-y-2 stagger-fade">
              {stats.dueSoon.map(b => {
                const days = differenceInDays(parseDateOnly(b.dueDate), new Date());
                const CatIcon = getCategoryIcon(b.category);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg status-due-soon border text-sm transition-all duration-200 hover:scale-[1.01]">
                    <div className="flex items-center gap-2.5">
                      <CatIcon size={14} />
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs opacity-70">
                          {days === 0 ? 'Vence hoje' : days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`} · {format(parseDateOnly(b.dueDate), 'dd/MM')}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold mono">{formatCurrency(b.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bank accounts summary */}
      <div className="glass-card-hover p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Landmark size={16} className="text-primary" />
          </div>
          <h2 className="font-semibold">Contas Bancárias</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-fade">
          {bankAccounts.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl bg-accent/50 border border-border/30 transition-all duration-200 hover:bg-accent hover:border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Landmark size={14} className="text-primary" />
                </div>
                <span className="text-sm font-medium">{a.name}</span>
              </div>
              <span className={`font-semibold mono text-sm ${a.balance >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>
                {formatCurrency(a.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Loans summary */}
      {loans.filter(l => !l.paid).length > 0 && (
        <div className="glass-card-hover p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-status-overdue/15 flex items-center justify-center">
              <HandCoins size={16} className="text-status-overdue" />
            </div>
            <h2 className="font-semibold">Empréstimos Pendentes</h2>
            <span className="ml-auto text-lg font-bold mono text-status-overdue">
              {formatCurrency(loans.filter(l => !l.paid).reduce((s, l) => {
                const paid = loanPayments.filter(p => p.loanId === l.id).reduce((a, p) => a + p.amount, 0);
                return s + Math.max(0, l.amount - paid);
              }, 0))}
            </span>
          </div>
          <div className="space-y-2 stagger-fade">
            {loans.filter(l => !l.paid).map(loan => {
              const totalPaid = loanPayments.filter(p => p.loanId === loan.id).reduce((a, p) => a + p.amount, 0);
              const remaining = Math.max(0, loan.amount - totalPaid);
              const pct = loan.amount > 0 ? (totalPaid / loan.amount) * 100 : 0;
              return (
                <div key={loan.id} className="py-2.5 px-3 rounded-lg status-overdue border text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <HandCoins size={14} />
                      <div>
                        <p className="font-medium">{loan.personName}</p>
                        <p className="text-xs opacity-70">Desde {format(parseDateOnly(loan.loanDate), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold mono">{formatCurrency(remaining)}</span>
                      {totalPaid > 0 && <p className="text-xs opacity-70">de {formatCurrency(loan.amount)}</p>}
                    </div>
                  </div>
                  {totalPaid > 0 && (
                    <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full bg-status-paid rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
