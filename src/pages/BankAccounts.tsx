import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Landmark } from 'lucide-react';

export default function BankAccountsPage() {
  const { bankAccounts, bills, addBankAccount, updateBankAccount, deleteBankAccount } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<typeof bankAccounts[0] | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  // Calculate effective balance: original balance minus paid bills linked to each account
  const effectiveBalances = useMemo(() => {
    const map: Record<string, number> = {};
    bankAccounts.forEach(a => {
      const paidAmount = bills.filter(b => b.paid && b.bankAccountId === a.id).reduce((s, b) => s + b.amount, 0);
      map[a.id] = a.balance - paidAmount;
    });
    return map;
  }, [bankAccounts, bills]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map(a => (
          <div key={a.id} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Landmark size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">Conta corrente</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBankAccount(a.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <p className={`text-3xl font-bold mono mt-4 ${(effectiveBalances[a.id] ?? a.balance) >= 0 ? 'text-status-paid' : 'text-status-overdue'}`}>
              {formatCurrency(effectiveBalances[a.id] ?? a.balance)}
            </p>
            {bills.some(b => b.paid && b.bankAccountId === a.id) && (
              <p className="text-xs text-muted-foreground mt-1">
                Saldo original: {formatCurrency(a.balance)}
              </p>
            )}
          </div>
        ))}
      </div>

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
              <Label>Saldo Atual</Label>
              <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editAccount ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
