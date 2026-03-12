import { useFinance } from '@/contexts/FinanceContext';
import { getBillStatus, STATUS_LABELS } from '@/types/finance';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Wallet, Landmark, Receipt } from 'lucide-react';
import { useMemo } from 'react';
import { format, isThisMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/date';

export default function Dashboard() {
  const { bills, bankAccounts, transactions } = useFinance();

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

    // Transactions this month
    const monthTransactions = transactions.filter(t => isThisMonth(parseDateOnly(t.transactionDate)));
    const totalTransactions = monthTransactions.reduce((s, t) => s + t.amount, 0);

    // Group by category
    const byCategory = monthTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1]);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className={`glass-card p-5 border ${c.colorClass}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider opacity-80">{c.label}</span>
              <c.icon size={18} />
            </div>
            <p className="text-2xl font-bold mono">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Progresso de Pagamentos</span>
          <span className="text-sm font-semibold mono">{stats.pctPaid.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${stats.pctPaid}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {stats.paidThisMonth.length} de {stats.monthBills.length} contas pagas este mês
        </p>
      </div>

      {/* Transactions summary */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-primary" />
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
          <div className="space-y-2">
            {stats.categoryBreakdown.map(([cat, amount]) => {
              const pct = stats.totalTransactions > 0 ? (amount / stats.totalTransactions) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-medium mono">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
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
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-status-overdue" />
            <h2 className="font-semibold">Contas Atrasadas ({stats.overdue.length})</h2>
          </div>
          {stats.overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta atrasada 🎉</p>
          ) : (
            <div className="space-y-2">
              {stats.overdue.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg status-overdue border text-sm">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs opacity-70">Venceu {format(parseDateOnly(b.dueDate), 'dd/MM')} · {Math.abs(differenceInDays(parseDateOnly(b.dueDate), new Date()))} dias atrás</p>
                  </div>
                  <span className="font-semibold mono">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due soon */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-status-due-soon" />
            <h2 className="font-semibold">Vencem em até 3 dias ({stats.dueSoon.length})</h2>
          </div>
          {stats.dueSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta próxima do vencimento</p>
          ) : (
            <div className="space-y-2">
              {stats.dueSoon.map(b => {
                const days = differenceInDays(parseDateOnly(b.dueDate), new Date());
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg status-due-soon border text-sm">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs opacity-70">
                        {days === 0 ? 'Vence hoje' : days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`} · {format(parseDateOnly(b.dueDate), 'dd/MM')}
                      </p>
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
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Contas Bancárias</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bankAccounts.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Landmark size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">{a.name}</span>
              </div>
              <span className={`font-semibold mono text-sm ${a.balance >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>
                {formatCurrency(a.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}