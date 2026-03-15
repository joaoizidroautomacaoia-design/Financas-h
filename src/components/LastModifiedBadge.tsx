import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { getActionLabel } from '@/hooks/useActivityLog';
import { User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  entityType: string;
  entityId: string;
}

interface LastActivity {
  user_display_name: string;
  user_email: string;
  action: string;
  created_at: string;
}

export default function LastModifiedBadge({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [activity, setActivity] = useState<LastActivity | null>(null);

  const workspaceId = activeWorkspace?.id || user?.id;

  useEffect(() => {
    if (!workspaceId || !entityId) return;
    supabase
      .from('activity_log' as any)
      .select('user_display_name, user_email, action, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setActivity(data[0] as unknown as LastActivity);
      });
  }, [entityId, entityType, workspaceId]);

  if (!activity) return null;

  const name = activity.user_display_name || activity.user_email;
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
      <User size={9} />
      <span>{getActionLabel(activity.action)} por {name} · {timeAgo}</span>
    </div>
  );
}
