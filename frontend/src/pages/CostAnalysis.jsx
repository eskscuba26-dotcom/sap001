import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function CostAnalysis() {
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostAnalysis();
  }, []);

  const fetchCostAnalysis = async () => {
    try {
      const response = await axios.get(`${API}/costs/analysis`);
      setCostData(response.data);
    } catch (error) {
      toast.error('Maliyet verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = costData.reduce((sum, item) => sum + item.total_cost, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in" data-testid="cost-analysis-page">
      <div>
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Maliyet Analizi</h1>
        <p className="text-gray-600">Hammadde tüketim maliyetleri</p>
      </div>

      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-white">Toplam Maliyet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-lg">
              <DollarSign className="h-8 w-8" />
            </div>
            <div>
              <p className="text-4xl font-bold">{totalCost.toFixed(2)} TL</p>
              <p className="text-indigo-100 mt-1">Tüm hammadde tüketim maliyeti</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Card>
          <CardHeader>
            <CardTitle>Hammadde Bazında Maliyet</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Hammadde</th>
                  <th className="text-left p-3 font-medium text-gray-600">Toplam Tüketim</th>
                  <th className="text-left p-3 font-medium text-gray-600">Toplam Maliyet</th>
                  <th className="text-left p-3 font-medium text-gray-600">Oran</th>
                </tr>
              </thead>
              <tbody>
                {costData.map((item, index) => {
                  const percentage = totalCost > 0 ? (item.total_cost / totalCost * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.material_id} className="border-b hover:bg-gray-50" data-testid={`cost-row-${index}`}>
                      <td className="p-3 font-medium">{item.material_name}</td>
                      <td className="p-3">{item.total_quantity.toFixed(2)}</td>
                      <td className="p-3 font-medium text-indigo-600">{item.total_cost.toFixed(2)} TL</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {costData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz maliyet verisi bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}