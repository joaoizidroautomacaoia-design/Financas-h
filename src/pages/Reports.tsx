import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { isThisMonth, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { parseDateOnly } from '@/lib/date';

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(0, 72%, 51%)', 'hsl(330, 80%, 60%)', 'hsl(200, 70%, 50%)', 'hsl(215, 20%, 55%)'];

const DISTRIBUTION_COLORS = {
  contas: 'hsl(0, 72%, 51%)',
  compras: 'hsl(38, 92%, 50%)',
  investimentos: 'hsl(217, 91%, 60%)',
  sobra: 'hsl(160, 84%, 39%)',
};

export default function ReportsPage() {
  const { bills, deposits, monthlyBudget, investmentBudget } = useFinance();
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalReceived = useMemo(() => {
    const now = new Date();
    const s = startOfMonth(now);
    const e = endOfMonth(now);
    return deposits
      .filter(d => isWithinInterval(parseDateOnly(d.depositDate), { start: s, end: e }))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [deposits]);

  const totalBills = useMemo(() => {
    return bills
      .filter(b => isThisMonth(parseDateOnly(b.dueDate)))
      .reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const distribution = useMemo(() => {
    const sobra = Math.max(0, totalReceived - totalBills - monthlyBudget - investmentBudget);
    return [
      { name: 'Contas', value: totalBills },
      { name: 'Compras do Mês', value: monthlyBudget },
      { name: 'Investimentos', value: investmentBudget },
      { name: 'Sobra', value: sobra },
    ].filter(d => d.value > 0);
  }, [totalReceived, totalBills, monthlyBudget, investmentBudget]);

  const distributionBar = useMemo(() => {
    const sobra = Math.max(0, totalReceived - totalBills - monthlyBudget - investmentBudget);
    return [{
      name: 'Distribuição',
      Contas: totalBills,
      'Compras do Mês': monthlyBudget,
      Investimentos: investmentBudget,
      Sobra: sobra,
    }];
  }, [totalReceived, totalBills, monthlyBudget, investmentBudget]);

  const percentOf = (v: number) => totalReceived > 0 ? ((v / totalReceived) * 100).toFixed(1) + '%' : '0%';

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

  const distColorMap: Record<string, string> = {
    'Contas': DISTRIBUTION_COLORS.contas,
    'Compras do Mês': DISTRIBUTION_COLORS.compras,
    'Investimentos': DISTRIBUTION_COLORS.investimentos,
    'Sobra': DISTRIBUTION_COLORS.sobra,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      {/* Distribution section */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-2">Como Separar Seu Dinheiro</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Baseado nos seus ganhos de {formatCurrency(totalReceived)} este mês
        </p>
        {totalReceived > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {distribution.map((d) => <Cell key={d.name} fill={distColorMap[d.name]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: distColorMap[d.name] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="mono font-medium">{percentOf(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Contas', value: totalBills, color: DISTRIBUTION_COLORS.contas },
                { label: 'Compras do Mês', value: monthlyBudget, color: DISTRIBUTION_COLORS.compras },
                { label: 'Investimentos', value: investmentBudget, color: DISTRIBUTION_COLORS.investimentos },
                { label: 'Sobra', value: Math.max(0, totalReceived - totalBills - monthlyBudget - investmentBudget), color: DISTRIBUTION_COLORS.sobra },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="mono text-sm font-semibold">{formatCurrency(item.value)}</span>
                    <span className="text-xs text-muted-foreground ml-2">{percentOf(item.value)}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 mt-2">
                <span className="text-sm font-semibold">Total Recebido</span>
                <span className="mono text-sm font-bold">{formatCurrency(totalReceived)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Registre depósitos para ver a distribuição sugerida.</p>
        )}
      </div>

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