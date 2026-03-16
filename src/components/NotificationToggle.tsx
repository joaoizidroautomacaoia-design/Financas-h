import { useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/hooks/useNotifications';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      toast.success('Notificações ativadas! Você será avisado sobre contas próximas do vencimento.');
    } else {
      toast.error('Permissão de notificação negada. Habilite nas configurações do navegador.');
    }
  };

  if (!('Notification' in window)) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        <BellOff size={16} />
        Notificações não suportadas neste navegador
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
        <BellRing size={16} className="text-emerald-500" />
        <div>
          <p className="font-medium text-foreground">Notificações ativas</p>
          <p className="text-xs text-muted-foreground">Você será notificado quando contas estiverem próximas do vencimento ou atrasadas.</p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
        <BellOff size={16} className="text-destructive" />
        <div>
          <p className="font-medium text-foreground">Notificações bloqueadas</p>
          <p className="text-xs text-muted-foreground">Habilite nas configurações do seu navegador para receber alertas.</p>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={handleEnable} variant="outline" className="gap-2">
      <Bell size={16} />
      Ativar Notificações
    </Button>
  );
}
