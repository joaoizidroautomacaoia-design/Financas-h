import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { isThisMonth, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { parseDateOnly } from '@/lib/date';

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(0, 72%, 51%)', 'hsl(330, 80%, 60%)', 'hsl(200, 70%, 50%)', 'hsl(215, 20%, 55%)'];

export default function ReportsPage() {
  const { bills } = useFinance();
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const byCategory = useMemo(() => {
    const thisMonth = bills.filter(b => isThisMonth(parseDateOnly(b.dueDate)));
    const map: Record<string, number> = {};
    thisMonth.forEach(b => { map[b.category] = (map[b.category] || 0) + b.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [bills]);

  const paidVsPending = useMemo(() => {
    const thisMonth = bills.filter(b => isThisMonth(parseDateOnly(b.dueDate)));
    const paid = thisMonth.filter(b => b.paid).reduce((s, b) => s + b.amount, 0);
    const pending = thisMonth.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0);
    return [
      { name: 'Pago', value: paid },
      { name: 'Pendente', value: pending },
    ];
  }, [bills]);

  const comparison = useMemo(() => {
    const now = new Date();
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const thisMonthBills = bills.filter(b => isThisMonth(parseDateOnly(b.dueDate)));
    const lastMonthBills = bills.filter(b => isWithinInterval(parseDateOnly(b.dueDate), { start: lastMonthStart, end: lastMonthEnd }));

    const catSet = new Set([...thisMonthBills.map(b => b.category), ...lastMonthBills.map(b => b.category)]);
    return Array.from(catSet).map(cat => ({
      name: cat,
      'Mês Atual': thisMonthBills.filter(b => b.category === cat).reduce((s, b) => s + b.amount, 0),
      'Mês Anterior': lastMonthBills.filter(b => b.category === cat).reduce((s, b) => s + b.amount, 0),
    }));
  }, [bills]);

  const evolution = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(now, 5 - i);
      const s = startOfMonth(m);
      const e = endOfMonth(m);
      const monthBills = bills.filter(b => isWithinInterval(parseDateOnly(b.dueDate), { start: s, end: e }));
      return {
        name: format(m, 'MMM', { locale: ptBR }),
        total: monthBills.reduce((sum, b) => sum + b.amount, 0),
      };
    });
  }, [bills]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 text-sm shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Gastos por Categoria</h3>
          {byCategory.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {byCategory.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="mono font-medium">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Pago vs Pendente</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={paidVsPending} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                <Cell fill="hsl(160, 84%, 39%)" />
                <Cell fill="hsl(38, 92%, 50%)" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {paidVsPending.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: i === 0 ? 'hsl(160, 84%, 39%)' : 'hsl(38, 92%, 50%)' }} />
                <span>{d.name}: <span className="mono font-medium">{formatCurrency(d.value)}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Mês Atual vs Anterior</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Mês Atual" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mês Anterior" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ fill: 'hsl(160, 84%, 39%)', r: 4 }} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
