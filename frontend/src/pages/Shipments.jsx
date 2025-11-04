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
import { Plus, Trash2, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Shipments({ user }) {
  const [shipments, setShipments] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    shipment_date: '',
    customer_company: '',
    thickness_mm: '',
    width_cm: '',
    length_m: '',
    color_material_id: '',
    quantity: '',
    invoice_number: '',
    vehicle_plate: '',
    driver_name: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchShipments();
    fetchColors();
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

  const fetchColors = async () => {
    try {
      const response = await axios.get(`${API}/raw-materials`);
      const colorMaterials = response.data.filter(m => m.name.toLowerCase().includes('renk'));
      setColors(colorMaterials);
    } catch (error) {
      console.error('Renkler yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/shipments`, {
        ...formData,
        shipment_date: new Date(formData.shipment_date).toISOString(),
        thickness_mm: parseFloat(formData.thickness_mm),
        width_cm: parseFloat(formData.width_cm),
        length_m: parseFloat(formData.length_m),
        quantity: parseInt(formData.quantity),
        color_material_id: formData.color_material_id || null
      });
      toast.success('Sevkiyat kaydı oluşturuldu');
      setDialogOpen(false);
      setFormData({
        shipment_date: '',
        customer_company: '',
        thickness_mm: '',
        width_cm: '',
        length_m: '',
        color_material_id: '',
        quantity: '',
        invoice_number: '',
        vehicle_plate: '',
        driver_name: ''
      });
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (shipmentId) => {
    if (!window.confirm('Bu sevkiyat kaydını silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/shipments/${shipmentId}`);
      toast.success('Sevkiyat kaydı silindi');
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const calculateSquareMeters = () => {
    const width = parseFloat(formData.width_cm);
    const length = parseFloat(formData.length_m);
    const quantity = parseInt(formData.quantity);
    if (width && length && quantity) {
      return ((width / 100) * length * quantity).toFixed(2);
    }
    return '0';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="shipments-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Sevkiyat Yönetimi</h1>
          <p className="text-gray-600">Ürün sevkiyatları ve teslimat kayıtları</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-shipment-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Sevkiyat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-shipment-dialog" aria-describedby="shipment-dialog-description">
              <DialogHeader>
                <DialogTitle>Yeni Sevkiyat Kaydı</DialogTitle>
                <p id="shipment-dialog-description" className="sr-only">Sevkiyat bilgilerini girin</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="customer_company">Alıcı Firma</Label>
                    <Input
                      id="customer_company"
                      data-testid="shipment-customer"
                      value={formData.customer_company}
                      onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="thickness">Kalınlık (mm)</Label>
                    <Input
                      id="thickness"
                      data-testid="shipment-thickness"
                      type="number"
                      step="0.1"
                      value={formData.thickness_mm}
                      onChange={(e) => setFormData({ ...formData, thickness_mm: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width">En (cm)</Label>
                    <Input
                      id="width"
                      data-testid="shipment-width"
                      type="number"
                      value={formData.width_cm}
                      onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="length">Metre</Label>
                    <Input
                      id="length"
                      data-testid="shipment-length"
                      type="number"
                      value={formData.length_m}
                      onChange={(e) => setFormData({ ...formData, length_m: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Renk (Opsiyonel)</Label>
                  <Select value={formData.color_material_id || "none"} onValueChange={(value) => setFormData({ ...formData, color_material_id: value === "none" ? "" : value })}>
                    <SelectTrigger id="color" data-testid="shipment-color">
                      <SelectValue placeholder="Renk seçin (opsiyonel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Renk Yok</SelectItem>
                      {colors.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          {color.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Adet</Label>
                    <Input
                      id="quantity"
                      data-testid="shipment-quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="square_meters">Metrekare (Otomatik)</Label>
                    <Input
                      id="square_meters"
                      type="text"
                      value={calculateSquareMeters()}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">İrsaliye Numarası</Label>
                    <Input
                      id="invoice_number"
                      data-testid="shipment-invoice"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_plate">Araç Plakası</Label>
                    <Input
                      id="vehicle_plate"
                      data-testid="shipment-plate"
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver_name">Şoför Bilgisi</Label>
                    <Input
                      id="driver_name"
                      data-testid="shipment-driver"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" data-testid="submit-shipment-btn">Kaydet</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sevkiyat Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-gray-600">Tarih</th>
                  <th className="text-left p-2 font-medium text-gray-600">Alıcı Firma</th>
                  <th className="text-left p-2 font-medium text-gray-600">Kalınlık (mm)</th>
                  <th className="text-left p-2 font-medium text-gray-600">En (cm)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Metre</th>
                  <th className="text-left p-2 font-medium text-gray-600">Renk</th>
                  <th className="text-left p-2 font-medium text-gray-600">Adet</th>
                  <th className="text-left p-2 font-medium text-gray-600">m²</th>
                  <th className="text-left p-2 font-medium text-gray-600">İrsaliye</th>
                  <th className="text-left p-2 font-medium text-gray-600">Plaka</th>
                  <th className="text-left p-2 font-medium text-gray-600">Şoför</th>
                  {canEdit && <th className="text-left p-2 font-medium text-gray-600">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment, index) => (
                  <tr key={shipment.id} className="border-b hover:bg-gray-50" data-testid={`shipment-row-${index}`}>
                    <td className="p-2">{format(new Date(shipment.shipment_date), 'dd.MM.yyyy', { locale: tr })}</td>
                    <td className="p-2 font-medium">{shipment.customer_company}</td>
                    <td className="p-2">{shipment.thickness_mm}</td>
                    <td className="p-2">{shipment.width_cm}</td>
                    <td className="p-2">{shipment.length_m}</td>
                    <td className="p-2">
                      {shipment.color_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {shipment.color_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-2 font-bold text-red-600">{shipment.quantity}</td>
                    <td className="p-2 font-medium text-indigo-600">{shipment.square_meters.toFixed(2)}</td>
                    <td className="p-2 text-xs">{shipment.invoice_number}</td>
                    <td className="p-2 text-xs">{shipment.vehicle_plate}</td>
                    <td className="p-2 text-xs">{shipment.driver_name}</td>
                    {canEdit && (
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(shipment.id)}
                          data-testid={`delete-shipment-${index}`}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {shipments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz sevkiyat kaydı bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
