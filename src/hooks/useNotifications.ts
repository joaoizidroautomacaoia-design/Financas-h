import { useEffect, useRef } from 'react';
import { Bill, Loan, getBillStatus } from '@/types/finance';

export function useNotifications(bills: Bill[], loans: Loan[] = []) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];

    // Bill notifications
    bills.forEach(bill => {
      const status = getBillStatus(bill);
      const notifKey = `bill-${bill.id}-${todayKey}`;
      if (notifiedRef.current.has(notifKey)) return;
      if (bill.paid) return;

      let message = '';
      if (status === 'overdue') {
        message = `⚠️ "${bill.name}" está atrasada! Valor: R$ ${bill.amount.toFixed(2)}`;
      } else if (status === 'due-soon') {
        message = `⏰ "${bill.name}" vence em breve! Valor: R$ ${bill.amount.toFixed(2)}`;
      }

      if (message) {
        notifiedRef.current.add(notifKey);
        sendNotification('FinControl - Alerta de Vencimento', message, notifKey);
      }
    });

    // Loan notifications - daily reminder for all unpaid loans
    const unpaidLoans = loans.filter(l => !l.paid);
    if (unpaidLoans.length > 0) {
      const loanNotifKey = `loans-daily-${todayKey}`;
      if (!notifiedRef.current.has(loanNotifKey)) {
        notifiedRef.current.add(loanNotifKey);
        const total = unpaidLoans.reduce((s, l) => s + l.amount, 0);
        const names = unpaidLoans.map(l => l.personName).join(', ');
        const message = `💰 Você tem ${unpaidLoans.length} empréstimo(s) pendente(s) totalizando R$ ${total.toFixed(2)}.\nDe: ${names}`;
        sendNotification('FinControl - Empréstimos Pendentes', message, loanNotifKey);
      }
    }
  }, [bills, loans]);
}

function sendNotification(title: string, body: string, tag: string) {
  try {
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
      });
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
