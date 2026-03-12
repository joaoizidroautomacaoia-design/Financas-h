import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { BankDeposit } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Landmark, CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { toDateOnly, todayDateOnly, parseDateOnly } from '@/lib/date';

export default function BankAccountsPage() {
  const { bankAccounts, bills, deposits, addBankAccount, updateBankAccount, deleteBankAccount, addDeposit, deleteDeposit } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<typeof bankAccounts[0] | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  // Deposit form
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(todayDateOnly());
  const [depositDesc, setDepositDesc] = useState('');

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => {
    const date = parseDateOnly(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const openEdit = (a: typeof bankAccounts[0]) => {
    setEditAccount(a);
    setName(a.name);
    setBalance(a.balance.toString());
    setShowForm(true);
  };

  const openNew = () => {
    setEditAccount(null);
    setName('');
    setBalance('');
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name) return;
    if (editAccount) {
      updateBankAccount({ id: editAccount.id, name, balance: parseFloat(balance) || 0 });
    } else {
      addBankAccount({ name, balance: parseFloat(balance) || 0 });
    }
    setShowForm(false);
  };

  const openDepositForm = (accountId: string) => {
    setDepositAccountId(accountId);
    setDepositAmount('');
    setDepositDate(todayDateOnly());
    setDepositDesc('');
    setShowDepositForm(true);
  };

  const handleDeposit = () => {
    if (!depositAmount || !depositDate) return;
    addDeposit({
      bankAccountId: depositAccountId,
      amount: parseFloat(depositAmount),
      depositDate: toDateOnly(depositDate),
      description: depositDesc,
    });
    setShowDepositForm(false);
  };

  // Deposits grouped by account
  const depositsByAccount = useMemo(() => {
    const map: Record<string, BankDeposit[]> = {};
    deposits.forEach(d => {
      if (!map[d.bankAccountId]) map[d.bankAccountId] = [];
      map[d.bankAccountId].push(d);
    });
    return map;
  }, [deposits]);

  // Calculate effective balance: original balance minus paid bills
  const effectiveBalances = useMemo(() => {
    const map: Record<string, number> = {};
    bankAccounts.forEach(a => {
      const paidAmount = bills.filter(b => b.paid && b.bankAccountId === a.id).reduce((s, b) => s + b.amount, 0);
      map[a.id] = a.balance - paidAmount;
    });
    return map;
  }, [bankAccounts, bills]);

  // Total received per account in current month
  const receivedByAccount = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const map: Record<string, number> = {};
    deposits.forEach(d => {
      const date = parseDateOnly(d.depositDate);
      if (date.getMonth() === month && date.getFullYear() === year) {
        map[d.bankAccountId] = (map[d.bankAccountId] || 0) + d.amount;
      }
    });
    return map;
  }, [deposits]);

  const totalBalance = bankAccounts.reduce((s, a) => s + (effectiveBalances[a.id] ?? a.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground text-sm">Saldo total: <span className={`mono font-semibold ${totalBalance >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>{formatCurrency(totalBalance)}</span></p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-fade">
        {bankAccounts.map(a => {
          const acDeposits = depositsByAccount[a.id] || [];
          const received = receivedByAccount[a.id] || 0;
          const diff = received - a.balance;
          const isExpanded = expandedId === a.id;

          return (
            <div key={a.id} className="glass-card-hover p-6 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <Landmark size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">Esperado: {formatCurrency(a.balance)}/mês</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDepositForm(a.id)} title="Registrar recebimento">
                    <CalendarPlus size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBankAccount(a.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Balances summary */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Recebido este mês</span>
                  <span className="text-lg font-bold mono text-status-paid">{formatCurrency(received)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Saldo efetivo</span>
                  <span className={`text-lg font-bold mono ${(effectiveBalances[a.id] ?? 0) >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>
                    {formatCurrency(effectiveBalances[a.id] ?? a.balance)}
                  </span>
                </div>
                {received > 0 && diff !== 0 && (
                  <p className={`text-xs font-medium ${diff < 0 ? 'text-status-overdue' : 'text-status-paid'}`}>
                    {diff < 0 ? `Faltam ${formatCurrency(Math.abs(diff))} para completar` : `${formatCurrency(diff)} a mais que o esperado`}
                  </p>
                )}
              </div>

              {/* Toggle deposits */}
              {acDeposits.length > 0 && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {acDeposits.length} recebimento(s)
                </button>
              )}

              {isExpanded && acDeposits.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  {acDeposits.sort((a, b) => b.depositDate.localeCompare(a.depositDate)).map(d => (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{formatDate(d.depositDate)}</span>
                        <span>{d.description || 'Recebimento'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono font-medium text-status-paid">{formatCurrency(d.amount)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDeposit(d.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Account form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" />
            </div>
            <div>
              <Label>Valor esperado por mês</Label>
              <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editAccount ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit form */}
      <Dialog open={showDepositForm} onOpenChange={setShowDepositForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Valor recebido *</Label>
              <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={depositDesc} onChange={e => setDepositDesc(e.target.value)} placeholder="Ex: Salário quinzena" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDepositForm(false)}>Cancelar</Button>
              <Button onClick={handleDeposit}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
