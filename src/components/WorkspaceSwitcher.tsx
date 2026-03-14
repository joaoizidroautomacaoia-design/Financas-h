import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Wallet } from 'lucide-react';

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();

  if (workspaces.length <= 1) return null;

  return (
    <Select value={activeWorkspace?.id || ''} onValueChange={setActiveWorkspaceId}>
      <SelectTrigger className="h-9 text-xs border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          {activeWorkspace?.isOwn ? <Wallet size={14} /> : <Users size={14} />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {workspaces.map(w => (
          <SelectItem key={w.id} value={w.id}>
            <div className="flex items-center gap-2">
              {w.isOwn ? <Wallet size={14} /> : <Users size={14} />}
              {w.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
