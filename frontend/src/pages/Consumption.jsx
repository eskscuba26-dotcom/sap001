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
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Consumption({ user }) {
  const [consumptions, setConsumptions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    production_order_id: '',
    material_id: '',
    quantity: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchConsumptions();
    fetchMaterials();
    fetchProductionOrders();
  }, []);

  const fetchConsumptions = async () => {
    try {
      const response = await axios.get(`${API}/consumptions`);
      setConsumptions(response.data);
    } catch (error) {
      toast.error('Tüketimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/raw-materials`);
      setMaterials(response.data);
    } catch (error) {
      toast.error('Hammaddeler yüklenemedi');
    }
  };

  const fetchProductionOrders = async () => {
    try {
      const response = await axios.get(`${API}/production-orders`);
      const activeOrders = response.data.filter(
        (order) => order.status === 'planned' || order.status === 'in_progress'
      );
      setProductionOrders(activeOrders);
    } catch (error) {
      toast.error('Üretim emirleri yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/consumptions`, {
        ...formData,
        quantity: parseFloat(formData.quantity)
      });
      toast.success('Tüketim kaydedildi');
      setDialogOpen(false);
      setFormData({ production_order_id: '', material_id: '', quantity: '' });
      fetchConsumptions();
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="consumption-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Tüketim Takibi</h1>
          <p className="text-gray-600">Hammadde tüketim kayıtları</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-consumption-btn">
                <Plus className="h-4 w-4 mr-2" />
                Tüketim Kaydı
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-consumption-dialog" aria-describedby="consumption-dialog-description">
              <DialogHeader>
                <DialogTitle>Yeni Tüketim Kaydı</DialogTitle>
                <p id="consumption-dialog-description" className="sr-only">Hammadde tüketimi kaydetmek için formu doldurun</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="production_order">Üretim Emri</Label>
                  <Select value={formData.production_order_id} onValueChange={(value) => setFormData({ ...formData, production_order_id: value })}>
                    <SelectTrigger id="production_order" data-testid="consumption-order">
                      <SelectValue placeholder="Üretim emri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - {order.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Hammadde</Label>
                  <Select value={formData.material_id} onValueChange={(value) => setFormData({ ...formData, material_id: value })}>
                    <SelectTrigger id="material" data-testid="consumption-material">
                      <SelectValue placeholder="Hammadde seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} (Stok: {material.current_stock} {material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Tüketilen Miktar</Label>
                  <Input
                    id="quantity"
                    data-testid="consumption-quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-consumption-btn">Kaydet</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="overflow-x-auto">
        <Card>
          <CardHeader>
            <CardTitle>Tüketim Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Tarih</th>
                  <th className="text-left p-3 font-medium text-gray-600">Üretim Emri</th>
                  <th className="text-left p-3 font-medium text-gray-600">Hammadde</th>
                  <th className="text-left p-3 font-medium text-gray-600">Miktar</th>
                  <th className="text-left p-3 font-medium text-gray-600">Kaydeden</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.map((consumption, index) => (
                  <tr key={consumption.id} className="border-b hover:bg-gray-50" data-testid={`consumption-row-${index}`}>
                    <td className="p-3">{format(new Date(consumption.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</td>
                    <td className="p-3 font-medium">{consumption.production_order_id}</td>
                    <td className="p-3">{consumption.material_name}</td>
                    <td className="p-3 font-medium">{consumption.quantity}</td>
                    <td className="p-3">{consumption.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {consumptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz tüketim kaydı bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}