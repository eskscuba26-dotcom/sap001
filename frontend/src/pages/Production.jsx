import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Production({ user }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    planned_date: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/production-orders`);
      setOrders(response.data);
    } catch (error) {
      toast.error('Üretim emirleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/production-orders`, {
        ...formData,
        quantity: parseFloat(formData.quantity),
        planned_date: new Date(formData.planned_date).toISOString()
      });
      toast.success('Üretim emri oluşturuldu');
      setDialogOpen(false);
      setFormData({ product_id: '', quantity: '', planned_date: '' });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await axios.patch(`${API}/production-orders/${orderId}/status?status=${status}`);
      toast.success('Durum güncellendi');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'planned':
        return { label: 'Planlandı', className: 'status-planned', icon: Clock };
      case 'in_progress':
        return { label: 'Devam Ediyor', className: 'status-in_progress', icon: Clock };
      case 'completed':
        return { label: 'Tamamlandı', className: 'status-completed', icon: CheckCircle };
      case 'cancelled':
        return { label: 'İptal Edildi', className: 'status-cancelled', icon: XCircle };
      default:
        return { label: status, className: '', icon: Clock };
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="production-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Üretim Yönetimi</h1>
          <p className="text-gray-600">Üretim emirleri ve süreç takibi</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-production-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Üretim Emri
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-production-dialog">
              <DialogHeader>
                <DialogTitle>Yeni Üretim Emri</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Ürün</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger id="product" data-testid="production-product">
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    data-testid="production-quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned_date">Planlanan Tarih</Label>
                  <Input
                    id="planned_date"
                    data-testid="production-date"
                    type="datetime-local"
                    value={formData.planned_date}
                    onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-production-btn">Oluştur</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const statusInfo = getStatusInfo(order.status);
          const StatusIcon = statusInfo.icon;
          return (
            <Card key={order.id} className="card-hover" data-testid={`production-card-${order.order_number}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.product_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Emir No: {order.order_number}</p>
                  </div>
                  <div className={`status-badge ${statusInfo.className}`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusInfo.label}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Miktar</p>
                    <p className="font-medium text-lg">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Planlanan Tarih</p>
                    <p className="font-medium">{format(new Date(order.planned_date), 'dd MMM yyyy', { locale: tr })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Oluşturan</p>
                    <p className="font-medium">{order.created_by}</p>
                  </div>
                  {order.completed_date && (
                    <div>
                      <p className="text-sm text-gray-600">Tamamlanma</p>
                      <p className="font-medium">{format(new Date(order.completed_date), 'dd MMM yyyy', { locale: tr })}</p>
                    </div>
                  )}
                </div>
                {canEdit && order.status !== 'completed' && order.status !== 'cancelled' && (
                  <div className="flex gap-2">
                    {order.status === 'planned' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(order.id, 'in_progress')}
                        data-testid={`start-production-${order.order_number}`}
                      >
                        Başlat
                      </Button>
                    )}
                    {order.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(order.id, 'completed')}
                        data-testid={`complete-production-${order.order_number}`}
                      >
                        Tamamla
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      data-testid={`cancel-production-${order.order_number}`}
                    >
                      İptal Et
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}