import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './pages/AuthForm';
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import { api, authHeader } from './utils/api';
import { socket } from './utils/socket'; 

// --- Context Setup ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// --- Auth Provider Component ---
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const initialToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const [token, setToken] = useState(initialToken);
    const [isLoading, setIsLoading] = useState(true);

    const verifyToken = async (authToken) => {
        if (!authToken) {
            setUser(null);
            setToken(null); 
            setIsLoading(false);
            if (socket.connected) socket.disconnect();
            return;
        }

        try {
            const res = await api.get('/api/auth/me', authHeader(authToken));
            const userData = res.data;
            setUser(userData);
            setToken(authToken);
            
            // --- Socket Connection & Authentication ---
            const userId = userData._id || userData.id;
            socket.auth = { userId, role: userData.role, token: authToken };
            if (!socket.connected) {
                socket.connect();
            } else {
                socket.disconnect().connect();
            }

        } catch (error) {
            console.error("Token verification failed:", error);
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            setUser(null);
            setToken(null);
            if (socket.connected) socket.disconnect();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        verifyToken(token);
    }, []);

    const login = (authToken, role, userData, remember) => {
        const storage = remember ? localStorage : sessionStorage;
        const oppositeStorage = remember ? sessionStorage : localStorage;
        storage.setItem('token', authToken);
        oppositeStorage.removeItem('token');
        verifyToken(authToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token'); 
        setToken(null);
        setUser(null);
        if (socket.connected) socket.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Protected Route Component ---
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="text-white text-center p-8 bg-gray-900 min-h-screen">Loading application...</div>;
    }

    if (!user) return <Navigate to="/auth" replace />;
    if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
    }

    return children;
};

// --- Home Redirect ---
const HomeRedirect = () => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div className="text-white text-center p-8 bg-gray-900 min-h-screen">Loading...</div>;
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
    return <Navigate to="/auth" replace />;
};

// --- Not Found Page ---
const NotFound = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <h1 className="text-6xl font-bold text-red-500">404</h1>
        <p className="text-xl text-white mt-4">Page Not Found</p>
    </div>
);

// --- Main App Component ---
export default function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-gray-900 text-white">
                    <Routes>
                        <Route path="/auth" element={<AuthForm />} />
                        
                        <Route 
                            path="/admin/*" 
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } 
                        />
                        
                        <Route 
                            path="/employee/*" 
                            element={
                                <ProtectedRoute allowedRoles={['employee']}>
                                    <EmployeeDashboard />
                                </ProtectedRoute>
                            } 
                        />
                        
                        <Route path="/" element={<HomeRedirect />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    );
}
