import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getActionLabel, getEntityLabel, type ActivityEntry } from '@/hooks/useActivityLog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, User, Receipt, Landmark, ArrowLeftRight, Tag, Banknote, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const entityIcons: Record<string, typeof Receipt> = {
  bill: Receipt,
  bank_account: Landmark,
  deposit: Banknote,
  transaction: ArrowLeftRight,
  category: Tag,
};

export default function ActivityLogPage() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const workspaceId = activeWorkspace?.id || user?.id;

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    supabase
      .from('activity_log' as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setEntries(data as unknown as ActivityEntry[]);
        setLoading(false);
      });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (entityFilter !== 'all' && e.entity_type !== entityFilter) return false;
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      return true;
    });
  }, [entries, entityFilter, actionFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    filtered.forEach(e => {
      const dateKey = format(new Date(e.created_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Atividades</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} atividades registradas</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History size={20} className="text-primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Filter size={14} className="text-muted-foreground" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="bill">Contas</SelectItem>
            <SelectItem value="bank_account">Contas bancárias</SelectItem>
            <SelectItem value="deposit">Recebimentos</SelectItem>
            <SelectItem value="transaction">Transações</SelectItem>
            <SelectItem value="category">Categorias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Edição</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
            <SelectItem value="paid">Pagamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          <p>Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="space-y-6 stagger-fade">
          {grouped.map(([dateKey, dayEntries]) => (
            <div key={dateKey}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {format(new Date(dateKey + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {dayEntries.map(entry => {
                  const Icon = entityIcons[entry.entity_type] || Receipt;
                  const actionColor = entry.action === 'delete' ? 'text-destructive' : entry.action === 'paid' ? 'text-status-paid' : entry.action === 'create' ? 'text-primary' : 'text-muted-foreground';
                  return (
                    <div key={entry.id} className="glass-card-hover p-4 flex items-start gap-3 group">
                      <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                        <Icon size={16} className={actionColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{entry.user_display_name || entry.user_email}</span>
                          {' '}
                          <span className={`${actionColor}`}>{getActionLabel(entry.action)}</span>
                          {' '}
                          {getEntityLabel(entry.entity_type)}
                          {' '}
                          <span className="font-medium">"{entry.entity_name}"</span>
                        </p>
                        {entry.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <User size={10} />
                          <span>{entry.user_email}</span>
                          <span>·</span>
                          <span>{format(new Date(entry.created_at), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
