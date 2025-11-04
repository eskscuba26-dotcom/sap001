import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Shield, User as UserIcon, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('Kullanıcı silindi');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'user':
        return { label: 'Kullanıcı', icon: UserIcon, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'viewer':
        return { label: 'İzleyici', icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100' };
      default:
        return { label: role, icon: UserIcon, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Yetki Gerekli</h2>
            <p className="text-gray-600">Bu sayfaya sadece adminler erişebilir.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="users-page">
      <div>
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Kullanıcı Yönetimi</h1>
        <p className="text-gray-600">Sistem kullanıcıları ve yetkileri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => {
          const roleInfo = getRoleInfo(u.role);
          const RoleIcon = roleInfo.icon;
          return (
            <Card key={u.id} className="card-hover" data-testid={`user-card-${u.username}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${roleInfo.bgColor} p-3 rounded-lg`}>
                      <RoleIcon className={`h-6 w-6 ${roleInfo.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{u.username}</CardTitle>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Rol</span>
                  <span className={`text-sm font-medium capitalize ${roleInfo.color}`}>{roleInfo.label}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Kayıt: {format(new Date(u.created_at), 'dd MMM yyyy', { locale: tr })}
                </div>
                {u.id !== user.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDelete(u.id)}
                    data-testid={`delete-user-${u.username}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}