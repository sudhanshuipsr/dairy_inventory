import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Common Components
import MainLayout from './components/common/MainLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StockView from './pages/StockView';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Production from './pages/Production';
import ExpiryBatches from './pages/ExpiryBatches';
import ProductManagement from './pages/ProductManagement';
import SupplierManagement from './pages/SupplierManagement';
import Reports from './pages/Reports';
import DataHub from './pages/DataHub';
import UserManagement from './pages/UserManagement';
import AuditLogViewer from './pages/AuditLogViewer';
import CustomerRating from './pages/CustomerRating';
import FeedbackManagement from './pages/FeedbackManagement';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';


function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/rate" element={<CustomerRating />} />
            <Route path="/feedback" element={<CustomerRating />} />

            {/* Protected Workspace Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Accessible by Staff & Admin (Role-guarded internally for actions) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/stock" element={<StockView />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/expiry" element={<ExpiryBatches />} />

              {/* Accessible by Admin Only */}
              <Route
                path="/reports"
                element={
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                }
              />
              <Route
                path="/feedback-admin"
                element={
                  <AdminRoute>
                    <FeedbackManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <AdminRoute>
                    <FeedbackManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="/ratings"
                element={
                  <AdminRoute>
                    <FeedbackManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="/data-hub"
                element={
                  <AdminRoute>
                    <DataHub />
                  </AdminRoute>
                }
              />
              <Route
                path="/hub"
                element={
                  <AdminRoute>
                    <DataHub />
                  </AdminRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/audit-logs"
                element={
                  <AdminRoute>
                    <AuditLogViewer />
                  </AdminRoute>
                }
              />
            </Route>


            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
