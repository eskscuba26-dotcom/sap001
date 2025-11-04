import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function Stock() {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await axios.get(`${API}/stock`);
      // Sort by total quantity descending
      const sorted = response.data.sort((a, b) => b.total_quantity - a.total_quantity);
      setStockItems(sorted);
    } catch (error) {
      toast.error('Stok bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    const totalQuantity = stockItems.reduce((sum, item) => sum + item.total_quantity, 0);
    const totalSquareMeters = stockItems.reduce((sum, item) => sum + item.total_square_meters, 0);
    const totalModels = stockItems.length;
    
    return { totalQuantity, totalSquareMeters, totalModels };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6 fade-in" data-testid="stock-page">
      <div>
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Stok Durumu</h1>
        <p className="text-gray-600">Üretilen mamul stok bilgileri</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam Model Çeşidi</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalModels}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam Adet</CardTitle>
            <Package className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam m²</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalSquareMeters.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stok Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Kalınlık (mm)</th>
                  <th className="text-left p-3 font-medium text-gray-600">En (cm)</th>
                  <th className="text-left p-3 font-medium text-gray-600">Metre</th>
                  <th className="text-left p-3 font-medium text-gray-600">Renk</th>
                  <th className="text-left p-3 font-medium text-gray-600">Toplam Adet</th>
                  <th className="text-left p-3 font-medium text-gray-600">Toplam m²</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50" data-testid={`stock-row-${index}`}>
                    <td className="p-3 font-medium">{item.thickness_mm}</td>
                    <td className="p-3">{item.width_cm}</td>
                    <td className="p-3">{item.length_m}</td>
                    <td className="p-3">
                      {item.color_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {item.color_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-green-600">{item.total_quantity.toLocaleString()}</td>
                    <td className="p-3 font-medium text-indigo-600">{item.total_square_meters.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stockItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz stok kaydı bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
