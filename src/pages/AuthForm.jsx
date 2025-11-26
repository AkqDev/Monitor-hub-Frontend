import React, { useState, useContext } from "react";
import { Input, Button, Checkbox, message, Tooltip } from "antd";
import { motion } from "framer-motion";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserShield,
  FaUserAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function AuthForm() {
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("employee");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const api = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const submit = async () => {
    if (!form.email || !form.password || (isSignup && !form.name)) {
      return message.warning("Please fill in all required fields");
    }

    try {
      const url = `${api}/api/auth/${isSignup ? "signup" : "signin"}`;
      const res = await axios.post(url, { ...form, role });

      message.success(res.data.message || "Success");

      if (!isSignup) {
        const { token, role: userRole, user } = res.data;
        login(token, userRole, user, remember);

        // ✅ Manager dashboard removed
        if (userRole === "admin") navigate("/admin");
        else navigate("/employee");
      } else {
        setIsSignup(false);
        setForm({ name: "", email: "", password: "" });
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.error || "Something went wrong");
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your registered email:");
    if (!email) return;

    try {
      await axios.post(`${api}/api/auth/forgot-password`, { email });
      message.success("Password reset email sent successfully!");
    } catch {
      message.error("Failed to send reset email");
    }
  };

  const roleButtons = [
    { value: "admin", label: "Admin", icon: <FaUserShield />, color: "bg-blue-600" },
    { value: "employee", label: "Employee", icon: <FaUserAlt />, color: "bg-gray-600" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-black to-gray-900">
      <motion.div
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-semibold mb-3 text-center text-gray-800">
          {isSignup ? "Create an Account" : "Welcome Back"}
        </h2>
        <p className="text-center text-gray-500 mb-6">
          {isSignup ? "Sign up to get started" : "Sign in to access your dashboard"}
        </p>

        {isSignup && (
          <Input
            id="name"
            autoComplete="name"
            prefix={<FaUser className="text-gray-500" />}
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="mb-3"
          />
        )}

        <Input
          id="email"
          autoComplete="email"
          prefix={<FaEnvelope className="text-gray-500" />}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="mb-3"
        />

        <Input
          id="password"
          autoComplete="current-password"
          prefix={<FaLock className="text-gray-500" />}
          placeholder="Password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          suffix={
            <Tooltip title={showPassword ? "Hide Password" : "Show Password"}>
              <Button
                type="text"
                icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                onClick={() => setShowPassword(!showPassword)}
              />
            </Tooltip>
          }
          className="mb-3"
        />

        {/* Role Selection */}
        <div className="text-center mb-4">
          <p className="text-gray-600 mb-2 font-medium">Select Role:</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {roleButtons.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  role === r.value
                    ? `${r.color} text-white shadow-lg scale-105`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {r.icon}
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
            Remember me
          </Checkbox>

          {!isSignup && (
            <a
              onClick={handleForgotPassword}
              className="text-blue-600 hover:underline cursor-pointer text-sm"
            >
              Forgot Password?
            </a>
          )}
        </div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button block type="primary" size="large" onClick={submit} className="rounded-md">
            {isSignup ? "Sign Up" : "Sign In"}
          </Button>
        </motion.div>

        <div className="text-center mt-4 text-gray-600 text-sm">
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <a
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-600 hover:underline cursor-pointer font-medium"
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </a>
        </div>
      </motion.div>
    </div>
  );
}