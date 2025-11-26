import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./pages/AuthForm";
import SecretKeyPrompt from "./pages/SecretKeyPrompt";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { AuthContext } from "./context/AuthContext";
import HeaderBar from "./components/HeaderBar";   // 👈 import your header

export default function App() {
  const { auth } = useContext(AuthContext);

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (auth === null) return null;
    if (!auth?.token) return <Navigate to="/" replace />;
    if (!allowedRoles.includes(auth.role)) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth / Login */}
        <Route path="/" element={<AuthForm />} />

        {/* Secret key prompt (admins only) */}
        <Route
          path="/secret"
          element={
            auth?.role === "admin" ? (
              <SecretKeyPrompt />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Employee Dashboard */}
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute allowedRoles={["employee", "admin"]}>
              <div className="min-h-screen bg-gray-50">
                <HeaderBar />               {/* 👈 add header here */}
                <EmployeeDashboard />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <div className="min-h-screen bg-gray-50">
                <HeaderBar />           
                <AdminDashboard />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}