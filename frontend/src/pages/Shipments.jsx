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
import { Plus, Truck, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Shipments({ user }) {
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    customer_name: '',
    destination: '',
    shipment_date: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchShipments();
    fetchProducts();
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await axios.get(`${API}/shipments`);
      setShipments(response.data);
    } catch (error) {
      toast.error('Sevkiyatlar yüklenemedi');
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
      await axios.post(`${API}/shipments`, {
        ...formData,
        quantity: parseFloat(formData.quantity),
        shipment_date: new Date(formData.shipment_date).toISOString()
      });
      toast.success('Sevkiyat oluşturuldu');
      setDialogOpen(false);
      setFormData({ product_id: '', quantity: '', customer_name: '', destination: '', shipment_date: '' });
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const updateStatus = async (shipmentId, status) => {
    try {
      await axios.patch(`${API}/shipments/${shipmentId}/status?status=${status}`);
      toast.success('Durum güncellendi');
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Beklemede', className: 'status-pending', icon: Clock };
      case 'in_transit':
        return { label: 'Yolda', className: 'status-in_transit', icon: Truck };
      case 'delivered':
        return { label: 'Teslim Edildi', className: 'status-delivered', icon: CheckCircle };
      default:
        return { label: status, className: '', icon: Clock };
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="shipments-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Sevkiyat Yönetimi</h1>
          <p className="text-gray-600">Ürün sevkiyatları ve teslimat takibi</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-shipment-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Sevkiyat
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-shipment-dialog">
              <DialogHeader>
                <DialogTitle>Yeni Sevkiyat Oluştur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Ürün</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger id="product" data-testid="shipment-product">
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stok: {product.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    data-testid="shipment-quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">Müşteri Adı</Label>
                  <Input
                    id="customer"
                    data-testid="shipment-customer"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Varış Yeri</Label>
                  <Input
                    id="destination"
                    data-testid="shipment-destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipment_date">Sevkiyat Tarihi</Label>
                  <Input
                    id="shipment_date"
                    data-testid="shipment-date"
                    type="datetime-local"
                    value={formData.shipment_date}
                    onChange={(e) => setFormData({ ...formData, shipment_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-shipment-btn">Oluştur</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {shipments.map((shipment) => {
          const statusInfo = getStatusInfo(shipment.status);
          const StatusIcon = statusInfo.icon;
          return (
            <Card key={shipment.id} className="card-hover" data-testid={`shipment-card-${shipment.shipment_number}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{shipment.product_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Sevkiyat No: {shipment.shipment_number}</p>
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
                    <p className="font-medium text-lg">{shipment.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Müşteri</p>
                    <p className="font-medium">{shipment.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Varış</p>
                    <p className="font-medium">{shipment.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sevkiyat Tarihi</p>
                    <p className="font-medium">{format(new Date(shipment.shipment_date), 'dd MMM yyyy', { locale: tr })}</p>
                  </div>
                </div>
                {canEdit && shipment.status !== 'delivered' && (
                  <div className="flex gap-2">
                    {shipment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(shipment.id, 'in_transit')}
                        data-testid={`transit-shipment-${shipment.shipment_number}`}
                      >
                        Yola Çıktı
                      </Button>
                    )}
                    {shipment.status === 'in_transit' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(shipment.id, 'delivered')}
                        data-testid={`deliver-shipment-${shipment.shipment_number}`}
                      >
                        Teslim Edildi
                      </Button>
                    )}
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