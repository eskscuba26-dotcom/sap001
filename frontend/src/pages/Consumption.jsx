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
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Consumption({ user }) {
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsumption, setEditingConsumption] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    machine: 'Makine 1',
    petkim_quantity: '',
    fire_quantity: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchConsumptions();
  }, []);

  const fetchConsumptions = async () => {
    try {
      const response = await axios.get(`${API}/daily-consumptions`);
      setConsumptions(response.data);
    } catch (error) {
      toast.error('Tüketimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Otomatik hesaplamalar
  const calculateEstol = () => {
    const petkim = parseFloat(formData.petkim_quantity) || 0;
    const fire = parseFloat(formData.fire_quantity) || 0;
    // Petkim + Fire'dan toplam Estol (%3)
    return ((petkim + fire) * 0.03).toFixed(2);
  };

  const calculateTalk = () => {
    const petkim = parseFloat(formData.petkim_quantity) || 0;
    const fire = parseFloat(formData.fire_quantity) || 0;
    // Petkim + Fire'dan toplam Talk (%1.5)
    return ((petkim + fire) * 0.015).toFixed(2);
  };

  const calculateTotalPetkim = () => {
    const petkim = parseFloat(formData.petkim_quantity) || 0;
    const fire = parseFloat(formData.fire_quantity) || 0;
    // Toplam Petkim = Petkim + Fire
    return (petkim + fire).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: new Date(formData.date).toISOString(),
        machine: formData.machine,
        petkim_quantity: parseFloat(formData.petkim_quantity),
        estol_quantity: parseFloat(calculateEstol()),
        talk_quantity: parseFloat(calculateTalk()),
        fire_quantity: parseFloat(formData.fire_quantity),
        total_petkim: parseFloat(calculateTotalPetkim())
      };

      if (editingConsumption) {
        await axios.put(`${API}/daily-consumptions/${editingConsumption.id}`, payload);
        toast.success('Tüketim kaydı güncellendi');
      } else {
        await axios.post(`${API}/daily-consumptions`, payload);
        toast.success('Tüketim kaydı oluşturuldu');
      }
      
      setDialogOpen(false);
      setEditingConsumption(null);
      setFormData({
        date: '',
        machine: 'Makine 1',
        petkim_quantity: '',
        fire_quantity: ''
      });
      fetchConsumptions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleEdit = (consumption) => {
    setEditingConsumption(consumption);
    setFormData({
      date: new Date(consumption.date).toISOString().slice(0, 16),
      machine: consumption.machine,
      petkim_quantity: consumption.petkim_quantity.toString(),
      fire_quantity: consumption.fire_quantity.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (consumptionId) => {
    if (!window.confirm('Bu tüketim kaydını silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/daily-consumptions/${consumptionId}`);
      toast.success('Tüketim kaydı silindi');
      fetchConsumptions();
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
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Günlük Tüketim Takibi</h1>
          <p className="text-gray-600">Makine bazlı hammadde tüketim kayıtları</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingConsumption(null);
              setFormData({
                date: '',
                machine: 'Makine 1',
                petkim_quantity: '',
                fire_quantity: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-consumption-btn">
                <Plus className="h-4 w-4 mr-2" />
                Tüketim Kaydı Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="add-consumption-dialog">
              <DialogHeader>
                <DialogTitle>{editingConsumption ? 'Tüketim Kaydı Düzenle' : 'Yeni Tüketim Kaydı'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Tarih</Label>
                    <Input
                      id="date"
                      data-testid="consumption-date"
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machine">Makine</Label>
                    <Select value={formData.machine} onValueChange={(value) => setFormData({ ...formData, machine: value })}>
                      <SelectTrigger id="machine" data-testid="consumption-machine">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Makine 1">Makine 1</SelectItem>
                        <SelectItem value="Makine 2">Makine 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petkim">Petkim Miktarı (kg)</Label>
                  <Input
                    id="petkim"
                    data-testid="consumption-petkim"
                    type="number"
                    step="0.01"
                    value={formData.petkim_quantity}
                    onChange={(e) => setFormData({ ...formData, petkim_quantity: e.target.value })}
                    required
                    placeholder="Petkim miktarını girin"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estol">Estol (kg) - Otomatik (%3)</Label>
                    <Input
                      id="estol"
                      type="text"
                      value={calculateEstol()}
                      readOnly
                      className="bg-gray-50 font-semibold text-indigo-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="talk">Talk (kg) - Otomatik (%1.5)</Label>
                    <Input
                      id="talk"
                      type="text"
                      value={calculateTalk()}
                      readOnly
                      className="bg-gray-50 font-semibold text-indigo-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fire">Fire / Sıcak Malzeme (kg)</Label>
                  <Input
                    id="fire"
                    data-testid="consumption-fire"
                    type="number"
                    step="0.01"
                    value={formData.fire_quantity}
                    onChange={(e) => setFormData({ ...formData, fire_quantity: e.target.value })}
                    required
                    placeholder="Fire miktarını girin"
                  />
                </div>

                <div className="space-y-2 bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <Label htmlFor="total_petkim" className="text-lg font-bold">Toplam Petkim (kg)</Label>
                  <Input
                    id="total_petkim"
                    type="text"
                    value={calculateTotalPetkim()}
                    readOnly
                    className="bg-white font-bold text-xl text-indigo-700"
                  />
                  <p className="text-sm text-gray-600">Petkim + Fire</p>
                </div>

                <Button type="submit" className="w-full" data-testid="submit-consumption-btn">
                  {editingConsumption ? 'Güncelle' : 'Kaydet'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüketim Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-gray-600">Tarih</th>
                  <th className="text-left p-2 font-medium text-gray-600">Makine</th>
                  <th className="text-left p-2 font-medium text-gray-600">Petkim (kg)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Estol (kg)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Talk (kg)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Fire (kg)</th>
                  <th className="text-left p-2 font-medium text-gray-600">Toplam Petkim</th>
                  {canEdit && <th className="text-left p-2 font-medium text-gray-600">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {consumptions.map((consumption, index) => (
                  <tr key={consumption.id} className="border-b hover:bg-gray-50" data-testid={`consumption-row-${index}`}>
                    <td className="p-2">{format(new Date(consumption.date), 'dd.MM.yyyy HH:mm', { locale: tr })}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        consumption.machine === 'Makine 1' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {consumption.machine}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-blue-600">{consumption.petkim_quantity.toFixed(2)}</td>
                    <td className="p-2">{consumption.estol_quantity.toFixed(2)}</td>
                    <td className="p-2">{consumption.talk_quantity.toFixed(2)}</td>
                    <td className="p-2 text-red-600 font-semibold">{consumption.fire_quantity.toFixed(2)}</td>
                    <td className="p-2 font-bold text-indigo-600">{consumption.total_petkim.toFixed(2)}</td>
                    {canEdit && (
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(consumption)}
                            data-testid={`edit-consumption-${index}`}
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(consumption.id)}
                            data-testid={`delete-consumption-${index}`}
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {consumptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz tüketim kaydı bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
