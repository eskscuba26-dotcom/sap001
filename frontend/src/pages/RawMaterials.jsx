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
import { Plus, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';

export default function RawMaterials({ user }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    unit: 'kg',
    unit_price: '',
    min_stock_level: ''
  });
  const [stockData, setStockData] = useState({
    transaction_type: 'in',
    quantity: '',
    reference: '',
    notes: ''
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/raw-materials`);
      setMaterials(response.data);
    } catch (error) {
      toast.error('Hammaddeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/raw-materials`, {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
        min_stock_level: parseFloat(formData.min_stock_level)
      });
      toast.success('Hammadde eklendi');
      setDialogOpen(false);
      setFormData({ name: '', code: '', unit: 'kg', unit_price: '', min_stock_level: '' });
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleStockTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/stock-transactions`, {
        material_id: selectedMaterial.id,
        ...stockData,
        quantity: parseFloat(stockData.quantity)
      });
      toast.success('Stok hareketi kaydedildi');
      setStockDialogOpen(false);
      setStockData({ transaction_type: 'in', quantity: '', reference: '', notes: '' });
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="raw-materials-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Hammaddeler</h1>
          <p className="text-gray-600">Hammadde tanımları ve stok yönetimi</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-material-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hammadde
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-material-dialog" aria-describedby="material-dialog-description">
              <DialogHeader>
                <DialogTitle>Yeni Hammadde Ekle</DialogTitle>
                <p id="material-dialog-description" className="sr-only">Yeni hammadde tanımlamak için formu doldurun</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hammadde Adı</Label>
                  <Input
                    id="name"
                    data-testid="material-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Hammadde Kodu</Label>
                  <Input
                    id="code"
                    data-testid="material-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Birim</Label>
                    <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                      <SelectTrigger id="unit" data-testid="material-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lt">lt</SelectItem>
                        <SelectItem value="mt">mt</SelectItem>
                        <SelectItem value="adet">adet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Birim Fiyat</Label>
                    <Input
                      id="unit_price"
                      data-testid="material-price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Minimum Stok Seviyesi</Label>
                  <Input
                    id="min_stock"
                    data-testid="material-min-stock"
                    type="number"
                    step="0.01"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-material-btn">Ekle</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material) => {
          const isLowStock = material.current_stock <= material.min_stock_level;
          return (
            <Card key={material.id} className="card-hover" data-testid={`material-card-${material.code}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{material.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Kod: {material.code}</p>
                  </div>
                  {isLowStock && (
                    <div className="bg-red-100 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Mevcut Stok</p>
                    <p className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                      {material.current_stock} {material.unit}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Birim Fiyat</p>
                    <p className="font-medium">{material.unit_price} TL</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Min. Stok</p>
                    <p className="font-medium">{material.min_stock_level} {material.unit}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setStockData({ ...stockData, transaction_type: 'in' });
                        setStockDialogOpen(true);
                      }}
                      data-testid={`stock-in-btn-${material.code}`}
                    >
                      <ArrowDown className="h-4 w-4 mr-1 text-green-600" />
                      Giriş
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setStockData({ ...stockData, transaction_type: 'out' });
                        setStockDialogOpen(true);
                      }}
                      data-testid={`stock-out-btn-${material.code}`}
                    >
                      <ArrowUp className="h-4 w-4 mr-1 text-red-600" />
                      Çıkış
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Transaction Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent data-testid="stock-transaction-dialog" aria-describedby="stock-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {selectedMaterial?.name} - Stok {stockData.transaction_type === 'in' ? 'Girişi' : 'Çıkışı'}
            </DialogTitle>
            <p id="stock-dialog-description" className="sr-only">Stok hareketi kaydetmek için bilgileri girin</p>
          </DialogHeader>
          <form onSubmit={handleStockTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                data-testid="stock-quantity"
                type="number"
                step="0.01"
                value={stockData.quantity}
                onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Referans (Opsiyonel)</Label>
              <Input
                id="reference"
                data-testid="stock-reference"
                value={stockData.reference}
                onChange={(e) => setStockData({ ...stockData, reference: e.target.value })}
                placeholder="Örn: Fatura No, Sipariş No"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
              <Input
                id="notes"
                data-testid="stock-notes"
                value={stockData.notes}
                onChange={(e) => setStockData({ ...stockData, notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" data-testid="submit-stock-btn">Kaydet</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}