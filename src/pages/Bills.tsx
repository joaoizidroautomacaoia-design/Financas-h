import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Bill, getBillStatus, STATUS_LABELS, TYPE_LABELS, BillStatus, BillType } from '@/types/finance';
import { format } from 'date-fns';
import { Plus, Trash2, Pencil, CheckCircle2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BillFormDialog from '@/components/BillFormDialog';

const statusColor: Record<string, string> = {
  paid: 'status-paid',
  overdue: 'status-overdue',
  'due-soon': 'status-due-soon',
  future: 'status-future',
};

export default function BillsPage() {
  const { bills, deleteBill, markAsPaid, categories } = useFinance();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [showForm, setShowForm] = useState(false);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = bills.filter(b => {
    const s = getBillStatus(b);
    if (statusFilter !== 'all' && s !== statusFilter) return false;
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} contas encontradas</p>
        </div>
        <Button onClick={() => { setEditBill(null); setShowForm(true); }} className="gap-2">
          <Plus size={16} /> Nova Conta
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="due-soon">Vence em breve</SelectItem>
            <SelectItem value="future">Futuro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            {(Object.keys(TYPE_LABELS) as BillType[]).map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bills list */}
      <div className="space-y-2">
        {filtered.map(b => {
          const status = getBillStatus(b);
          return (
            <div key={b.id} className={`glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${statusColor[status] || ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{b.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[status]}`}>{STATUS_LABELS[status]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{b.category}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Vence: {format(new Date(b.dueDate), 'dd/MM/yyyy')}</span>
                  <span>{TYPE_LABELS[b.type]}</span>
                  {b.installment && <span>Parcela {b.currentInstallment}/{b.installmentCount}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold mono text-lg">{formatCurrency(b.amount)}</span>
                <div className="flex gap-1">
                  {!b.paid && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-status-paid hover:text-status-paid" onClick={() => markAsPaid(b.id)} title="Marcar como pago">
                      <CheckCircle2 size={16} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditBill(b); setShowForm(true); }}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteBill(b.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="glass-card p-12 text-center text-muted-foreground">
            Nenhuma conta encontrada
          </div>
        )}
      </div>

      <BillFormDialog open={showForm} onOpenChange={setShowForm} bill={editBill} />
    </div>
  );
}
