import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type ActivityAction = 'create' | 'update' | 'delete' | 'paid';
export type EntityType = 'bill' | 'bank_account' | 'deposit' | 'transaction' | 'category' | 'loan' | 'receive_date';

export interface ActivityEntry {
  id: string;
  user_email: string;
  user_display_name: string;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string | null;
  entity_name: string;
  details: string;
  created_at: string;
}

const ACTION_LABELS: Record<ActivityAction, string> = {
  create: 'criou',
  update: 'editou',
  delete: 'removeu',
  paid: 'marcou como pago',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  bill: 'conta',
  bank_account: 'conta bancária',
  deposit: 'recebimento',
  transaction: 'transação',
  category: 'categoria',
  loan: 'empréstimo',
  receive_date: 'data de recebimento',
};

export function getActionLabel(action: string) {
  return ACTION_LABELS[action as ActivityAction] || action;
}

export function getEntityLabel(type: string) {
  return ENTITY_LABELS[type as EntityType] || type;
}

export function useActivityLog() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const log = useCallback(async (
    action: ActivityAction,
    entityType: EntityType,
    entityName: string,
    entityId?: string | null,
    details?: string,
  ) => {
    if (!user) return;
    const workspaceId = activeWorkspace?.id || user.id;

    // Get display name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    await supabase.from('activity_log' as any).insert({
      user_id: user.id,
      user_email: user.email || '',
      user_display_name: profile?.display_name || user.email || '',
      workspace_id: workspaceId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName,
      details: details || '',
    });
  }, [user, activeWorkspace]);

  return { log };
}
