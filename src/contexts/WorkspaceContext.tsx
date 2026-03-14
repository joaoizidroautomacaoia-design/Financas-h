import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Workspace {
  id: string; // owner user_id
  label: string; // display name or email
  isOwn: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string) => void;
  pendingInvites: PendingInvite[];
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  refreshInvites: () => void;
}

export interface PendingInvite {
  id: string;
  owner_id: string;
  ownerName: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;

    // Own workspace
    const own: Workspace = { id: user.id, label: 'Minhas Finanças', isOwn: true };

    // Accepted shared workspaces (I'm a dependent of someone)
    const { data: asDependent } = await supabase
      .from('dependents')
      .select('owner_id')
      .eq('dependent_user_id', user.id)
      .eq('status', 'accepted');

    const sharedWorkspaces: Workspace[] = [];
    if (asDependent && asDependent.length > 0) {
      const ownerIds = asDependent.map(d => d.owner_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);

      for (const dep of asDependent) {
        const profile = profiles?.find(p => p.user_id === dep.owner_id);
        sharedWorkspaces.push({
          id: dep.owner_id,
          label: profile?.display_name || 'Conta compartilhada',
          isOwn: false,
        });
      }
    }

    const all = [own, ...sharedWorkspaces];
    setWorkspaces(all);

    // Keep active or default to own
    if (!activeWorkspaceId || !all.find(w => w.id === activeWorkspaceId)) {
      setActiveWorkspaceId(user.id);
    }
  }, [user, activeWorkspaceId]);

  const fetchPendingInvites = useCallback(async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from('dependents')
      .select('id, owner_id')
      .eq('dependent_email', user.email)
      .eq('status', 'pending');

    if (!data || data.length === 0) {
      setPendingInvites([]);
      return;
    }

    const ownerIds = data.map(d => d.owner_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', ownerIds);

    setPendingInvites(data.map(d => ({
      id: d.id,
      owner_id: d.owner_id,
      ownerName: profiles?.find(p => p.user_id === d.owner_id)?.display_name || 'Alguém',
    })));
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
      fetchPendingInvites();
    } else {
      setWorkspaces([]);
      setPendingInvites([]);
      setActiveWorkspaceId(null);
    }
  }, [user]);

  const acceptInvite = async (inviteId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('dependents')
      .update({ dependent_user_id: user.id, status: 'accepted' })
      .eq('id', inviteId);
    if (!error) {
      await fetchPendingInvites();
      await fetchWorkspaces();
    }
  };

  const rejectInvite = async (inviteId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('dependents')
      .delete()
      .eq('id', inviteId);
    if (!error) {
      await fetchPendingInvites();
    }
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      pendingInvites,
      acceptInvite,
      rejectInvite,
      refreshInvites: fetchPendingInvites,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
}
