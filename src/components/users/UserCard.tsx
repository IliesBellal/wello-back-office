import { User } from '@/services/usersService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone } from 'lucide-react';

interface UserCardProps {
  user: User;
  onClick: () => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
            style={{ backgroundColor: user.color }}
          >
            {initials}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {user.first_name} {user.last_name}
              </h3>
              {user.permissions.is_admin && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{user.phone}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {user.permissions.enabled ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Actif</Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactif</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
