import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(null); // null = loading state

  useEffect(() => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const role =
        localStorage.getItem("role") || sessionStorage.getItem("role");
      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      if (token && role) {
        setAuth({ token, role, user });
      } else {
        setAuth({ token: null, role: null, user: null });
      }
    } catch (err) {
      console.error(err);
      localStorage.clear();
      sessionStorage.clear();
      setAuth({ token: null, role: null, user: null });
    }
  }, []);

  const login = (token, role, user, remember) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("token", token);
    storage.setItem("role", role);
    storage.setItem("user", JSON.stringify(user));
    setAuth({ token, role, user });
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setAuth({ token: null, role: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};