import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check hash for type=recovery
    if (window.location.hash.includes('type=recovery')) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="glass-card p-8 w-full max-w-md space-y-6 relative animate-scale-in">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mx-auto mb-4 glow-primary">
            <span className="text-primary-foreground font-bold text-2xl">₿</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Redefinir Senha</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {ready ? 'Digite sua nova senha' : 'Verificando link de recuperação...'}
          </p>
        </div>

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="pl-10" required minLength={6} />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" disabled={loading}>
              {loading ? 'Aguarde...' : 'Atualizar Senha'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        )}
      </div>
    </div>
  );
}
