import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus } from 'lucide-react';
import { usersService, User } from '@/services/usersService';
import { UserCard } from '@/components/users/UserCard';
import { UserCreateSheet } from '@/components/users/UserCreateSheet';
import { UserEditSheet } from '@/components/users/UserEditSheet';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Utilisateurs</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nouvel Utilisateur
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                onClick={() => handleUserClick(user)} 
              />
            ))}
          </div>
        )}
      </div>

      <UserCreateSheet 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onSuccess={loadUsers}
      />

      <UserEditSheet
        user={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadUsers}
      />
    </DashboardLayout>
  );
}
