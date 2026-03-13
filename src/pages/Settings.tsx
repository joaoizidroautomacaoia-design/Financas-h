import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogOut, Lock, UserPlus, Trash2, Mail, Clock, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';

interface Dependent {
  id: string;
  dependent_email: string;
  dependent_user_id: string | null;
  status: string;
  created_at: string;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [dependentEmail, setDependentEmail] = useState('');
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [addingDependent, setAddingDependent] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Dependent[]>([]);

  useEffect(() => {
    if (user) {
      fetchDependents();
      fetchPendingInvites();
    }
  }, [user]);

  const fetchDependents = async () => {
    const { data } = await supabase
      .from('dependents')
      .select('*')
      .eq('owner_id', user!.id)
      .order('created_at');
    if (data) setDependents(data);
  };

  const fetchPendingInvites = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from('dependents')
      .select('*')
      .eq('dependent_email', user.email)
      .eq('status', 'pending');
    if (data) setPendingInvites(data);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dependentEmail.trim()) return;
    if (dependentEmail === user?.email) {
      toast.error('Você não pode adicionar a si mesmo');
      return;
    }
    setAddingDependent(true);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('display_name', dependentEmail);

    // Try to find user by checking auth - we'll just insert and let them accept
    const { error } = await supabase.from('dependents').insert({
      owner_id: user!.id,
      dependent_email: dependentEmail.trim().toLowerCase(),
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Este email já foi convidado');
      } else {
        toast.error('Erro ao convidar dependente');
      }
    } else {
      toast.success(`Convite enviado para ${dependentEmail}`);
      setDependentEmail('');
      fetchDependents();
    }
    setAddingDependent(false);
  };

  const handleRemoveDependent = async (id: string) => {
    const { error } = await supabase.from('dependents').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover dependente');
    } else {
      toast.success('Dependente removido');
      fetchDependents();
    }
  };

  const handleAcceptInvite = async (invite: Dependent) => {
    const { error } = await supabase
      .from('dependents')
      .update({ dependent_user_id: user!.id, status: 'accepted' })
      .eq('id', invite.id);
    if (error) {
      toast.error('Erro ao aceitar convite');
    } else {
      toast.success('Convite aceito! Agora você compartilha os dados financeiros.');
      fetchPendingInvites();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
          <SettingsIcon size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Configurações</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="glass-card p-6 space-y-4 border-primary/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail size={20} className="text-primary" />
            Convites Pendentes
          </h2>
          <div className="space-y-3">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm">Você foi convidado para compartilhar dados financeiros</p>
                <Button size="sm" onClick={() => handleAcceptInvite(invite)} className="bg-gradient-to-r from-primary to-primary-glow">
                  Aceitar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lock size={20} className="text-primary" />
          Alterar Senha
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={changingPassword} className="bg-gradient-to-r from-primary to-primary-glow">
            {changingPassword ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </div>

      {/* Dependents */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus size={20} className="text-primary" />
          Dependentes
        </h2>
        <p className="text-sm text-muted-foreground">
          Adicione dependentes por email. Eles poderão ver e editar todos os seus dados financeiros.
        </p>

        <form onSubmit={handleAddDependent} className="flex gap-2 max-w-md">
          <Input
            type="email"
            value={dependentEmail}
            onChange={e => setDependentEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
          <Button type="submit" disabled={addingDependent} className="bg-gradient-to-r from-primary to-primary-glow shrink-0">
            {addingDependent ? '...' : 'Convidar'}
          </Button>
        </form>

        {dependents.length > 0 && (
          <div className="space-y-2 mt-4">
            {dependents.map(dep => (
              <div key={dep.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{dep.dependent_email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {dep.status === 'accepted' ? (
                        <><CheckCircle2 size={12} className="text-emerald-500" /> Aceito</>
                      ) : (
                        <><Clock size={12} className="text-amber-500" /> Pendente — o dependente precisa criar conta e aceitar</>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDependent(dep.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="glass-card p-6">
        <Button
          variant="destructive"
          onClick={signOut}
          className="gap-2"
        >
          <LogOut size={18} />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
