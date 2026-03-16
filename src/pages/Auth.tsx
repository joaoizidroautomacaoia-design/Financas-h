import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Digite seu email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message);
      }
    } else {
      if (password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="glass-card p-8 w-full max-w-md space-y-6 relative animate-scale-in">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mx-auto mb-4 glow-primary animate-float">
            <span className="text-primary-foreground font-bold text-2xl">₿</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">FinControl</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Seu nome" className="pl-10" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="pl-10" required minLength={6} />
            </div>
          </div>

          <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" disabled={loading}>
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </form>

        {isLogin && !forgotMode && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Esqueceu a senha?
            </button>
          </div>
        )}

        {forgotMode && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm text-muted-foreground text-center">Digite seu email para receber o link de recuperação</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10" required />
              </div>
              <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? 'Aguarde...' : 'Enviar Link'}
                {!loading && <ArrowRight size={16} />}
              </Button>
            </form>
            <div className="text-center">
              <button type="button" onClick={() => setForgotMode(false)} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                Voltar ao login
              </button>
            </div>
          </div>
        )}

        {!forgotMode && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {isLogin ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
