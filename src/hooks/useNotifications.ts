import { useEffect, useRef } from 'react';
import { Bill, getBillStatus } from '@/types/finance';

export function useNotifications(bills: Bill[]) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (bills.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's date key to only notify once per day per bill
    const todayKey = today.toISOString().split('T')[0];

    bills.forEach(bill => {
      const status = getBillStatus(bill);
      const notifKey = `${bill.id}-${todayKey}`;

      // Skip already notified or paid bills
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
        try {
          const notification = new Notification('FinControl - Alerta de Vencimento', {
            body: message,
            icon: '/pwa-192x192.png',
            tag: notifKey,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch {
          // SW notification fallback
          navigator.serviceWorker?.ready.then(reg => {
            reg.showNotification('FinControl - Alerta de Vencimento', {
              body: message,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: notifKey,
            });
          });
        }
      }
    });
  }, [bills]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
