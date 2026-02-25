import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { getBillStatus, STATUS_LABELS, Bill } from '@/types/finance';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { parseDateOnly } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusDotColor: Record<string, string> = {
  paid: 'bg-status-paid',
  overdue: 'bg-status-overdue',
  'due-soon': 'bg-status-due-soon',
  future: 'bg-status-future',
};

const statusTextColor: Record<string, string> = {
  paid: 'status-paid',
  overdue: 'status-overdue',
  'due-soon': 'status-due-soon',
  future: 'status-future',
};

export default function CalendarPage() {
  const { bills, markAsPaid } = useFinance();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startWeekday = getDay(start);

  const billsByDate = useMemo(() => {
    const map: Record<string, Bill[]> = {};
    bills.forEach(b => {
      const key = format(parseDateOnly(b.dueDate), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bills]);

  const selectedBills = selectedDay ? (billsByDate[format(selectedDay, 'yyyy-MM-dd')] || []) : [];

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>

      <div className="glass-card p-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={18} />
          </Button>
          <span className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startWeekday }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayBills = billsByDate[key] || [];
            const isToday = isSameDay(day, new Date());
            const hasOverdue = dayBills.some(b => getBillStatus(b) === 'overdue');
            const hasDueSoon = dayBills.some(b => getBillStatus(b) === 'due-soon');
            const hasPaid = dayBills.some(b => getBillStatus(b) === 'paid');
            const hasFuture = dayBills.some(b => getBillStatus(b) === 'future');

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent ${
                  isToday ? 'ring-1 ring-primary' : ''
                } ${dayBills.length > 0 ? 'cursor-pointer' : ''}`}
              >
                <span className={isToday ? 'font-bold text-primary' : ''}>{format(day, 'd')}</span>
                {dayBills.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasOverdue && <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor.overdue}`} />}
                    {hasDueSoon && <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor['due-soon']}`} />}
                    {hasPaid && <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor.paid}`} />}
                    {hasFuture && <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor.future}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          {[
            { label: 'Pago', color: statusDotColor.paid },
            { label: 'Atrasado', color: statusDotColor.overdue },
            { label: 'Vence em breve', color: statusDotColor['due-soon'] },
            { label: 'Futuro', color: statusDotColor.future },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          {selectedBills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma conta neste dia.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {selectedBills.map(b => {
                const status = getBillStatus(b);
                return (
                  <div key={b.id} className={`p-3 rounded-lg border ${statusTextColor[status]}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{b.name}</span>
                      <span className="font-bold mono">{formatCurrency(b.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">{STATUS_LABELS[status]} · {b.category}</span>
                      {!b.paid && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAsPaid(b.id)}>
                          <CheckCircle2 size={12} /> Marcar pago
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
