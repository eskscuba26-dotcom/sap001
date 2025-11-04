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
import { Plus, Package } from 'lucide-react';

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    unit: 'adet'
  });

  const canEdit = user?.role !== 'viewer';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/products`, formData);
      toast.success('Ürün eklendi');
      setDialogOpen(false);
      setFormData({ name: '', code: '', unit: 'adet' });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="products-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Ürünler</h1>
          <p className="text-gray-600">Mamul ürün tanımları ve stok durumu</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-product-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ürün
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-product-dialog" aria-describedby="product-dialog-description">
              <DialogHeader>
                <DialogTitle>Yeni Ürün Ekle</DialogTitle>
                <p id="product-dialog-description" className="sr-only">Yeni ürün tanımlamak için formu doldurun</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ürün Adı</Label>
                  <Input
                    id="name"
                    data-testid="product-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Ürün Kodu</Label>
                  <Input
                    id="code"
                    data-testid="product-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Birim</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger id="unit" data-testid="product-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adet">adet</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lt">lt</SelectItem>
                      <SelectItem value="mt">mt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-product-btn">Ekle</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="card-hover" data-testid={`product-card-${product.code}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Kod: {product.code}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Mevcut Stok</p>
                  <p className="text-2xl font-bold text-green-600">
                    {product.current_stock} {product.unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}