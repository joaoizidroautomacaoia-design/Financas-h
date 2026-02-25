import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Bill, getBillStatus } from '@/types/finance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { TYPE_LABELS, FREQUENCY_LABELS, BillType, Frequency } from '@/types/finance';
import { toDateOnly } from '@/lib/date';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: Bill | null;
}

export default function BillFormDialog({ open, onOpenChange, bill }: Props) {
  const { addBill, updateBill, categories, bankAccounts } = useFinance();
  const isEdit = !!bill;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<BillType>('variable');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [installment, setInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setCategory(bill.category);
      setAmount(bill.amount.toString());
      setDueDate(toDateOnly(bill.dueDate));
      setType(bill.type);
      setRecurring(bill.recurring);
      setFrequency(bill.frequency || 'monthly');
      setInstallment(bill.installment);
      setInstallmentCount(bill.installmentCount?.toString() || '');
      setCurrentInstallment(bill.currentInstallment?.toString() || '1');
      setPaymentMethod(bill.paymentMethod);
      setBankAccountId(bill.bankAccountId || '');
      setNotes(bill.notes || '');
    } else {
      setName(''); setCategory(''); setAmount(''); setDueDate(''); setType('variable');
      setRecurring(false); setFrequency('monthly'); setInstallment(false);
      setInstallmentCount(''); setCurrentInstallment('1'); setPaymentMethod(''); setBankAccountId(''); setNotes('');
    }
  }, [bill, open]);

  const handleSubmit = () => {
    if (!name || !amount || !dueDate) return;
    const data = {
      name, category, amount: parseFloat(amount), dueDate: toDateOnly(dueDate),
      paid: bill?.paid || false, paidDate: bill?.paidDate,
      type, recurring, frequency: recurring ? frequency : undefined,
      installment, installmentCount: installment ? parseInt(installmentCount) : undefined,
      currentInstallment: installment ? parseInt(currentInstallment) : undefined,
      paymentMethod, bankAccountId: bankAccountId || undefined, notes,
    };
    if (isEdit) {
      updateBill({ ...data, id: bill.id });
    } else {
      addBill(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome da conta *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as BillType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as BillType[]).map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <div>
              <Label>Data de Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="recurring" checked={recurring} onCheckedChange={v => setRecurring(!!v)} />
              <Label htmlFor="recurring" className="text-sm">Recorrente</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="installment" checked={installment} onCheckedChange={v => setInstallment(!!v)} />
              <Label htmlFor="installment" className="text-sm">Parcelado</Label>
            </div>
          </div>

          {recurring && (
            <div>
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map(f => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {installment && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nº de parcelas</Label>
                <Input type="number" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} />
              </div>
              <div>
                <Label>Parcela atual</Label>
                <Input type="number" value={currentInstallment} onChange={e => setCurrentInstallment(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Forma de Pagamento</Label>
              <Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="Cartão, Boleto..." />
            </div>
            <div>
              <Label>Conta Bancária</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{isEdit ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
