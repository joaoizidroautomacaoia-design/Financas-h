import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PendingInvitesBanner() {
  const { pendingInvites, acceptInvite, rejectInvite } = useWorkspace();

  if (pendingInvites.length === 0) return null;

  const handleAccept = async (id: string, name: string) => {
    await acceptInvite(id);
    toast.success(`Convite de ${name} aceito! Agora você compartilha os dados financeiros.`);
  };

  const handleReject = async (id: string) => {
    await rejectInvite(id);
    toast.info('Convite recusado.');
  };

  return (
    <div className="space-y-2 mb-4">
      {pendingInvites.map(invite => (
        <div key={invite.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={16} className="text-primary shrink-0" />
            <p className="text-sm truncate">
              <strong>{invite.ownerName}</strong> convidou você para compartilhar finanças
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => handleReject(invite.id)} className="h-7 w-7 p-0">
              <X size={14} />
            </Button>
            <Button size="sm" onClick={() => handleAccept(invite.id, invite.ownerName)} className="h-7 bg-gradient-to-r from-primary to-primary-glow text-xs">
              Aceitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
