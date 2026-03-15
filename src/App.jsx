import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Auth from './pages/Auth';

import Dashboard from './components/Dashboard';
import HabitTracker from './pages/HabitTracker';
import FinancialTracker from './pages/FinancialTracker';
import TodoTracker from './pages/TodoTracker';
import MedicalTracker from './pages/MedicalTracker';
import AdminPanel from './pages/AdminPanel';
import DocumentVault from './pages/DocumentVault';
import TripTracker from './pages/TripTracker';
import TripDetails from './pages/TripDetails';
import SharedGallery from './pages/SharedGallery';

// Protected route component that checks permissions
const ProtectedRoute = ({ children, requiredPermission = null, requireAdmin = false }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/" />;
  }

  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-indigo-500">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
      <Route path="/shared/:token" element={<SharedGallery />} />

      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/habits"
          element={
            <ProtectedRoute requiredPermission="habits">
              <HabitTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute requiredPermission="finance">
              <FinancialTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/todos"
          element={
            <ProtectedRoute requiredPermission="todos">
              <TodoTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical"
          element={
            <ProtectedRoute requiredPermission="medical">
              <MedicalTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentVault />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips"
          element={
            <ProtectedRoute requiredPermission="trips">
              <TripTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute requiredPermission="trips">
              <TripDetails />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
