import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Bill, getBillStatus, STATUS_LABELS, TYPE_LABELS, BillType } from '@/types/finance';
import { format } from 'date-fns';
import { Plus, Trash2, Pencil, CheckCircle2, Filter, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { parseDateOnly } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BillFormDialog from '@/components/BillFormDialog';
import { getCategoryIcon } from '@/lib/category-icons';

const statusColor: Record<string, string> = {
  paid: 'status-paid',
  overdue: 'status-overdue',
  'due-soon': 'status-due-soon',
  future: 'status-future',
};

interface BillGroup {
  groupId: string | null;
  name: string;
  bills: Bill[];
  isGroup: boolean;
}

export default function BillsPage() {
  const { bills, deleteBill, deleteBillGroup, markAsPaid, categories } = useFinance();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editMode, setEditMode] = useState<'single' | 'group'>('single');
  const [showForm, setShowForm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = bills.filter(b => {
    const s = getBillStatus(b);
    if (statusFilter !== 'all' && s !== statusFilter) return false;
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => parseDateOnly(a.dueDate).getTime() - parseDateOnly(b.dueDate).getTime());

  const groupedBills = useMemo(() => {
    const groups: BillGroup[] = [];
    const groupMap = new Map<string, Bill[]>();
    const ungrouped: Bill[] = [];

    filtered.forEach(b => {
      if (b.groupId) {
        if (!groupMap.has(b.groupId)) groupMap.set(b.groupId, []);
        groupMap.get(b.groupId)!.push(b);
      } else {
        ungrouped.push(b);
      }
    });

    groupMap.forEach((billList, groupId) => {
      groups.push({
        groupId,
        name: billList[0].name,
        bills: billList.sort((a, b) => parseDateOnly(a.dueDate).getTime() - parseDateOnly(b.dueDate).getTime()),
        isGroup: billList.length > 1,
      });
    });

    ungrouped.forEach(b => {
      groups.push({ groupId: null, name: b.name, bills: [b], isGroup: false });
    });

    groups.sort((a, b) => parseDateOnly(a.bills[0].dueDate).getTime() - parseDateOnly(b.bills[0].dueDate).getTime());
    return groups;
  }, [filtered]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleEditSingle = (b: Bill) => { setEditBill(b); setEditMode('single'); setShowForm(true); };
  const handleEditGroup = (b: Bill) => { setEditBill(b); setEditMode('group'); setShowForm(true); };

  const renderBillRow = (b: Bill, isChild = false) => {
    const status = getBillStatus(b);
    const CatIcon = getCategoryIcon(b.category);
    return (
      <div key={b.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 hover:bg-accent/30 ${isChild ? 'pl-10 border-l-2 border-primary/20 ml-4' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{b.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[status]}`}>{STATUS_LABELS[status]}</span>
            <span className="category-badge bg-accent text-muted-foreground">
              <CatIcon size={12} />
              {b.category}
            </span>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span>Vence: {format(parseDateOnly(b.dueDate), 'dd/MM/yyyy')}</span>
            <span>{TYPE_LABELS[b.type]}</span>
            {b.installment && <span>Parcela {b.currentInstallment}/{b.installmentCount}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold mono text-lg">{formatCurrency(b.amount)}</span>
          <div className="flex gap-1">
            {!b.paid && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-status-paid hover:text-status-paid hover:bg-status-paid/10" onClick={() => markAsPaid(b.id)} title="Marcar como pago">
                <CheckCircle2 size={16} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleEditSingle(b)} title="Editar">
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteBill(b.id)} title="Deletar">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} contas encontradas</p>
        </div>
        <Button onClick={() => { setEditBill(null); setEditMode('single'); setShowForm(true); }} className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity">
          <Plus size={16} /> Nova Conta
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Filter size={14} className="text-muted-foreground" />
        </div>
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
      <div className="space-y-2 stagger-fade">
        {groupedBills.map(group => {
          if (!group.isGroup) {
            const b = group.bills[0];
            const status = getBillStatus(b);
            return (
              <div key={b.id} className={`glass-card-hover border ${statusColor[status]}`}>
                {renderBillRow(b)}
              </div>
            );
          }

          const isExpanded = expandedGroups.has(group.groupId!);
          const paidCount = group.bills.filter(b => b.paid).length;
          const firstBill = group.bills[0];
          const CatIcon = getCategoryIcon(firstBill.category);

          return (
            <div key={group.groupId} className="glass-card-hover border overflow-hidden">
              <div
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-accent/30 transition-all duration-200"
                onClick={() => toggleGroup(group.groupId!)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isExpanded ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                    <Layers size={16} className="text-primary" />
                    <span className="font-semibold">{group.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {group.bills.length} meses
                    </span>
                    <span className="category-badge bg-accent text-muted-foreground">
                      <CatIcon size={12} />
                      {firstBill.category}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground ml-8">
                    <span>{paidCount}/{group.bills.length} pagos</span>
                    <span>{TYPE_LABELS[firstBill.type]}</span>
                    {firstBill.recurring && <span>Recorrente</span>}
                    {firstBill.installment && <span>Parcelado</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <div className="text-right">
                    <span className="font-bold mono text-lg">{formatCurrency(firstBill.amount)}</span>
                    <span className="text-xs text-muted-foreground block">por mês</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleEditGroup(firstBill)} title="Editar todas">
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteBillGroup(group.groupId!)} title="Deletar todas">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t divide-y divide-border/50 animate-fade-in">
                  {group.bills.map(b => renderBillRow(b, true))}
                </div>
              )}
            </div>
          );
        })}
        {groupedBills.length === 0 && (
          <div className="glass-card p-12 text-center text-muted-foreground">
            Nenhuma conta encontrada
          </div>
        )}
      </div>

      <BillFormDialog open={showForm} onOpenChange={setShowForm} bill={editBill} editMode={editMode} />
    </div>
  );
}
