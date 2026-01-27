import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './pages/AuthForm';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import { api, authHeader } from './utils/api';
// FIX: The socket utility needs both the socket object and the registration utility.
import { socket, registerSocket } from './utils/socket.io'; 

// --- Context Setup ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// --- Auth Provider Component ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Initial token check: look in both storage types for persistence
    const initialToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const [token, setToken] = useState(initialToken);
    const [isLoading, setIsLoading] = useState(true);

    const verifyToken = async (authToken) => {
        if (!authToken) {
            setUser(null);
            setToken(null); 
            setIsLoading(false);
            // Ensure socket is disconnected if there's no token
            if (socket.connected) {
                socket.disconnect();
            }
            return;
        }

        try {
            const res = await api.get('/api/auth/me', authHeader(authToken));
            
            setUser(res.data);
            setToken(authToken);
            
            // --- FIX/IMPROVEMENT: Socket Connection & Authentication ---
            // Register socket with user ID and role (instead of token for auth field)
            const userId = res.data._id || res.data.id;
            const userRole = res.data.role;

            // This assumes socket.io utility has a registerSocket function
            // If the registerSocket function is defined to handle both connect and emit:
            // registerSocket(userId, userRole);
            
            // If we are handling it directly in AuthProvider (which is common):
            socket.auth = { userId, role: userRole, token: authToken }; // Use role for joining rooms
            if (!socket.connected) {
                socket.connect();
            } else {
                 // If already connected, force re-auth in case of token change
                 socket.disconnect().connect();
            }

        } catch (error) {
            console.error("Token verification failed:", error);
            // Clear all storage locations on failure
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            // Also clear user and role data, if stored separately
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            localStorage.removeItem('role');
            sessionStorage.removeItem('role');
            
            setToken(null);
            setUser(null);
            socket.disconnect();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        verifyToken(token);
        
        // Cleanup on unmount
        return () => {
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, []);

    const login = (authToken, role, userData, remember) => {
        const storage = remember ? localStorage : sessionStorage;
        const oppositeStorage = remember ? sessionStorage : localStorage;
        
        // Store the token and user data in the correct storage location
        storage.setItem('token', authToken);
        storage.setItem('user', JSON.stringify(userData));
        storage.setItem('role', role); 
        
        // Clear the token from the opposite storage to prevent conflicts
        oppositeStorage.removeItem('token');
        oppositeStorage.removeItem('user');
        oppositeStorage.removeItem('role');

        // Verify the token, which updates the state and connects the socket
        verifyToken(authToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token'); 
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('role');
        sessionStorage.removeItem('role');

        setToken(null);
        setUser(null);
        socket.disconnect(); 
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Protected Route Component (RBAC) ---
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // Simple loading screen while token is being verified
        return <div className="text-white text-center p-8 bg-gray-900 min-h-screen">Loading application...</div>;
    }

    if (!user) {
        // Redirect unauthenticated user to auth page
        return <Navigate to="/auth" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect user to their appropriate dashboard if role is incorrect
        return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
    }

    return children;
};

// --- Helper Components ---
const HomeRedirect = () => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div className="text-white text-center p-8 bg-gray-900 min-h-screen">Loading...</div>;
    if (user) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
    }
    return <Navigate to="/auth" replace />;
};

const NotFound = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <h1 className="text-6xl font-bold text-red-500">404</h1>
        <p className="text-xl text-white mt-4">Page Not Found</p>
        <Navigate to="/" replace />
    </div>
);


// --- Main App Component ---
export default function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-gray-900 text-white">
                    <Routes>
                        {/* Authentication Form */}
                        <Route path="/auth" element={<AuthForm />} />
                        
                        {/* Admin Dashboard Route */}
                        <Route 
                            path="/admin/*" 
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } 
                        />
                        
                        {/* Employee Dashboard Route */}
                        <Route 
                            path="/employee/*" 
                            element={
                                <ProtectedRoute allowedRoles={['employee']}>
                                    <EmployeeDashboard />
                                </ProtectedRoute>
                            } 
                        />
                        
                        {/* Root Route: Redirects based on auth status */}
                        <Route path="/" element={<HomeRedirect />} />
                        
                        {/* Catch-all route */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    );
}

// Export AuthProvider and useAuth from this file as well if it's the official context file.
export { AuthProvider, useAuth };