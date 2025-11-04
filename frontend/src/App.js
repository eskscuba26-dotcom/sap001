import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import RawMaterials from "@/pages/RawMaterials";
import Products from "@/pages/Products";
import Production from "@/pages/Production";
import Manufacturing from "@/pages/Manufacturing";
import Shipments from "@/pages/Shipments";
import Consumption from "@/pages/Consumption";
import CostAnalysis from "@/pages/CostAnalysis";
import Users from "@/pages/Users";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { API };

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout user={user}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/raw-materials" element={<RawMaterials user={user} />} />
                    <Route path="/products" element={<Products user={user} />} />
                    <Route path="/production" element={<Production user={user} />} />
                    <Route path="/shipments" element={<Shipments user={user} />} />
                    <Route path="/consumption" element={<Consumption user={user} />} />
                    <Route path="/cost-analysis" element={<CostAnalysis />} />
                    <Route path="/users" element={<Users user={user} />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;