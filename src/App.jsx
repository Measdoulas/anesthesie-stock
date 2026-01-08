import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import StockEntry from './pages/StockEntry';
import StockExit from './pages/StockExit';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Validation from './pages/Validation';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Chargement...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};



function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="entry" element={<StockEntry />} />
              <Route path="exit" element={<StockExit />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="validation" element={<Validation />} />
            </Route>
          </Routes>
        </HashRouter>
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
