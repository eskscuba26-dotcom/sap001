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
import { Plus, Trash2, Factory } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Manufacturing({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    production_date: '',
    machine: 'Makine 1',
    thickness_mm: '',
    width_cm: '',
    length_m: '',
    quantity: '',
    masura_type: 'Masura 100',
    masura_quantity: '',
    gas_consumption_kg: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API}/manufacturing`);
      setRecords(response.data);
    } catch (error) {
      toast.error('Üretim kayıtları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    // Format date for datetime-local input
    const date = new Date(record.production_date);
    const formattedDate = date.toISOString().slice(0, 16);
    
    setEditingRecord(record);
    setFormData({
      production_date: formattedDate,
      machine: record.machine,
      thickness_mm: record.thickness_mm.toString(),
      width_cm: record.width_cm.toString(),
      length_m: record.length_m.toString(),
      quantity: record.quantity.toString(),
      masura_type: record.masura_type,
      masura_quantity: record.masura_quantity.toString(),
      gas_consumption_kg: record.gas_consumption_kg.toString()
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        production_date: new Date(formData.production_date).toISOString(),
        thickness_mm: parseFloat(formData.thickness_mm),
        width_cm: parseFloat(formData.width_cm),
        length_m: parseFloat(formData.length_m),
        quantity: parseInt(formData.quantity),
        masura_quantity: parseInt(formData.masura_quantity),
        gas_consumption_kg: parseFloat(formData.gas_consumption_kg),
        machine: formData.machine,
        masura_type: formData.masura_type
      };

      if (editingRecord) {
        // Update existing record
        await axios.delete(`${API}/manufacturing/${editingRecord.id}`);
        await axios.post(`${API}/manufacturing`, payload);
        toast.success('Üretim kaydı güncellendi');
      } else {
        // Create new record
        await axios.post(`${API}/manufacturing`, payload);
        toast.success('Üretim kaydı eklendi');
      }
      
      setDialogOpen(false);
      setEditingRecord(null);
      setFormData({
        production_date: '',
        machine: 'Makine 1',
        thickness_mm: '',
        width_cm: '',
        length_m: '',
        quantity: '',
        masura_type: 'Masura 100',
        masura_quantity: '',
        gas_consumption_kg: ''
      });
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Bu üretim kaydını silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/manufacturing/${recordId}`);
      toast.success('Kayıt silindi');
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  // Calculate metrekare
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
    <div className="space-y-6 fade-in" data-testid="manufacturing-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Üretim Kayıtları</h1>
          <p className="text-gray-600">Detaylı üretim takibi ve raporlama</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingRecord(null);
              setFormData({
                production_date: '',
                machine: 'Makine 1',
                thickness_mm: '',
                width_cm: '',
                length_m: '',
                quantity: '',
                masura_type: 'Masura 100',
                masura_quantity: '',
                gas_consumption_kg: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-manufacturing-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Üretim Kaydı
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-manufacturing-dialog" aria-describedby="manufacturing-dialog-description">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Üretim Kaydını Düzenle' : 'Yeni Üretim Kaydı'}</DialogTitle>
                <p id="manufacturing-dialog-description" className="sr-only">Üretim bilgilerini girerek yeni kayıt oluşturun veya mevcut kaydı düzenleyin</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="production_date">Üretim Tarihi</Label>
                    <Input
                      id="production_date"
                      data-testid="manufacturing-date"
                      type="datetime-local"
                      value={formData.production_date}
                      onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machine">Makine</Label>
                    <Select value={formData.machine} onValueChange={(value) => setFormData({ ...formData, machine: value })}>
                      <SelectTrigger id="machine" data-testid="manufacturing-machine">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Makine 1">Makine 1</SelectItem>
                        <SelectItem value="Makine 2">Makine 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="thickness">Kalınlık (mm)</Label>
                    <Input
                      id="thickness"
                      data-testid="manufacturing-thickness"
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
                      data-testid="manufacturing-width"
                      type="number"
                      step="1"
                      value={formData.width_cm}
                      onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="length">Metre</Label>
                    <Input
                      id="length"
                      data-testid="manufacturing-length"
                      type="number"
                      step="1"
                      value={formData.length_m}
                      onChange={(e) => setFormData({ ...formData, length_m: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Adet</Label>
                    <Input
                      id="quantity"
                      data-testid="manufacturing-quantity"
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
                      data-testid="manufacturing-sqm"
                      type="text"
                      value={calculateSquareMeters()}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="masura_type">Masura Tipi</Label>
                    <Select value={formData.masura_type} onValueChange={(value) => setFormData({ ...formData, masura_type: value })}>
                      <SelectTrigger id="masura_type" data-testid="manufacturing-masura-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masura 100">Masura 100</SelectItem>
                        <SelectItem value="Masura 120">Masura 120</SelectItem>
                        <SelectItem value="Masura 150">Masura 150</SelectItem>
                        <SelectItem value="Masura 200">Masura 200</SelectItem>
                        <SelectItem value="Masura Yok">Masura Yok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="masura_quantity">Masura Adedi</Label>
                    <Input
                      id="masura_quantity"
                      data-testid="manufacturing-masura-quantity"
                      type="number"
                      value={formData.masura_quantity}
                      onChange={(e) => setFormData({ ...formData, masura_quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gas_consumption">Gaz Payı (kg)</Label>
                  <Input
                    id="gas_consumption"
                    data-testid="manufacturing-gas"
                    type="number"
                    step="0.01"
                    value={formData.gas_consumption_kg}
                    onChange={(e) => setFormData({ ...formData, gas_consumption_kg: e.target.value })}
                    required
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Model: {formData.thickness_mm && formData.width_cm && formData.length_m ? `${formData.thickness_mm} mm x ${formData.width_cm} cm x ${formData.length_m} m` : 'Değerler girilince otomatik oluşacak'}</p>
                </div>

                <Button type="submit" className="w-full" data-testid="submit-manufacturing-btn">Kaydet</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="overflow-x-auto">
        <Card>
          <CardHeader>
            <CardTitle>Üretim Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-gray-600">Tarih</th>
                  <th className="text-left p-2 font-medium text-gray-600">Makine</th>
                  <th className="text-left p-2 font-medium text-gray-600">Kalınlık (mm)</th>
                  <th className="text-left p-2 font-medium text-gray-600">En (cm)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Metre</th>
                  <th className="text-left p-2 font-medium text-gray-600">Adet</th>
                  <th className="text-left p-2 font-medium text-gray-600">m²</th>
                  <th className="text-left p-2 font-medium text-gray-600">Masura</th>
                  <th className="text-left p-2 font-medium text-gray-600">Gaz (kg)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Kaydeden</th>
                  {canEdit && <th className="text-left p-2 font-medium text-gray-600">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50" data-testid={`manufacturing-row-${index}`}>
                    <td className="p-2">{format(new Date(record.production_date), 'dd.MM.yyyy', { locale: tr })}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${record.machine === 'Makine 1' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        <Factory className="h-3 w-3 mr-1" />
                        {record.machine}
                      </span>
                    </td>
                    <td className="p-2 font-medium">{record.thickness_mm}</td>
                    <td className="p-2">{record.width_cm}</td>
                    <td className="p-2">{record.length_m}</td>
                    <td className="p-2 font-medium">{record.quantity}</td>
                    <td className="p-2 font-medium text-indigo-600">{record.square_meters.toFixed(2)}</td>
                    <td className="p-2 text-xs">{record.masura_type} ({record.masura_quantity})</td>
                    <td className="p-2">{record.gas_consumption_kg.toFixed(2)}</td>
                    <td className="p-2 text-xs">{record.created_by}</td>
                    {canEdit && (
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(record.id)}
                          data-testid={`delete-manufacturing-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz üretim kaydı bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
