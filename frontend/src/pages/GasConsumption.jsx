import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function GasConsumption({ user }) {
  const [gasRecords, setGasRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    total_gas_kg: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchGasRecords();
  }, []);

  const fetchGasRecords = async () => {
    try {
      const response = await axios.get(`${API}/gas-consumption`);
      setGasRecords(response.data);
    } catch (error) {
      toast.error('Gaz tüketim kayıtları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: new Date(formData.date).toISOString(),
        total_gas_kg: parseFloat(formData.total_gas_kg)
      };

      if (editingRecord) {
        await axios.put(`${API}/gas-consumption/${editingRecord.id}`, payload);
        toast.success('Gaz tüketimi güncellendi');
      } else {
        await axios.post(`${API}/gas-consumption`, payload);
        toast.success('Gaz tüketimi kaydedildi');
      }
      
      setDialogOpen(false);
      setEditingRecord(null);
      setFormData({ date: '', total_gas_kg: '' });
      fetchGasRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      date: new Date(record.date).toISOString().slice(0, 16),
      total_gas_kg: record.total_gas_kg.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Bu gaz tüketim kaydını silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/gas-consumption/${recordId}`);
      toast.success('Gaz tüketimi silindi');
      fetchGasRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  // Toplam hesaplama
  const calculateTotal = () => {
    return gasRecords.reduce((sum, record) => sum + record.total_gas_kg, 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="gas-consumption-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            <Flame className="inline-block w-10 h-10 mr-3 text-orange-600" />
            Günlük Gaz Tüketimi
          </h1>
          <p className="text-gray-600">Toplam üretim gaz tüketim kayıtları</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingRecord(null);
              setFormData({ date: '', total_gas_kg: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-gas-btn">
                <Plus className="h-4 w-4 mr-2" />
                Gaz Tüketimi Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" data-testid="add-gas-dialog">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Gaz Tüketimi Düzenle' : 'Yeni Gaz Tüketimi'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tarih</Label>
                  <Input
                    id="date"
                    data-testid="gas-date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_gas">Toplam Gaz (kg)</Label>
                  <Input
                    id="total_gas"
                    data-testid="gas-total"
                    type="number"
                    step="0.1"
                    value={formData.total_gas_kg}
                    onChange={(e) => setFormData({ ...formData, total_gas_kg: e.target.value })}
                    required
                    placeholder="Günlük toplam gaz tüketimi"
                  />
                </div>

                <Button type="submit" className="w-full" data-testid="submit-gas-btn">
                  {editingRecord ? 'Güncelle' : 'Kaydet'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Özet Kartı */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Toplam Gaz Tüketimi</p>
              <p className="text-4xl font-bold text-orange-600">{calculateTotal().toFixed(2)} kg</p>
            </div>
            <Flame className="w-16 h-16 text-orange-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gaz Tüketim Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Tarih</th>
                  <th className="text-right p-3 font-medium text-gray-600">Toplam Gaz (kg)</th>
                  {canEdit && <th className="text-center p-3 font-medium text-gray-600">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {gasRecords.map((record, index) => (
                  <tr key={record.id} className="border-b hover:bg-orange-50" data-testid={`gas-row-${index}`}>
                    <td className="p-3">{format(new Date(record.date), 'dd.MM.yyyy', { locale: tr })}</td>
                    <td className="p-3 text-right">
                      <span className="text-lg font-bold text-orange-600">
                        {record.total_gas_kg.toFixed(1)} kg
                      </span>
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(record)}
                            data-testid={`edit-gas-${index}`}
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(record.id)}
                            data-testid={`delete-gas-${index}`}
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
            {gasRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz gaz tüketim kaydı bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
