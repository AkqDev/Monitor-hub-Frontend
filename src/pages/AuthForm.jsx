import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Button,
  Tabs,
  message,
  Tooltip,
  Checkbox,
} from "antd";
// Import Framer Motion components
import { motion, AnimatePresence } from "framer-motion";
// Import all necessary icons from lucide-react
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Key,
  User,
  UserCircle,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../App";
import axios from "axios";

const { TabPane } = Tabs;

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
  initial: { opacity: 0, y: 50 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15, delay: 0.2 },
  },
  exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

export default function RoleBasedAuth() {
  const [selectedRole, setSelectedRole] = useState(null); // 'admin', 'employee', or null
  const [authStep, setAuthStep] = useState("role"); // 'role' or 'form'
  const [formType, setFormType] = useState("login"); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [adminAuthData, setAdminAuthData] = useState(null);
  const [showSecretKeyForm, setShowSecretKeyForm] = useState(false);
  const [remember, setRemember] = useState(true);
  const navigate = useNavigate();
  const { user: authUser, login, isLoading } = useAuth();

  // Ant Design Form instances for easy data retrieval
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [secretKeyForm] = Form.useForm();

  // Use environment variable for API URL or default to localhost
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Redirect already authenticated users
  useEffect(() => {
    if (!isLoading && authUser && authUser.role) {
      navigate(authUser.role === "admin" ? "/admin" : "/employee", {
        replace: true,
      });
    }
  }, [authUser, isLoading, navigate]);

  // Handle initial role selection
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setAuthStep("form");
    setFormType("login"); // Default to login when selecting a role
    setShowSecretKeyForm(false); // Reset in case we came back from admin login flow
    loginForm.resetFields();
    registerForm.resetFields();
  };

  // Handle back button from form to role selection
  const handleBackToRole = () => {
    setAuthStep("role");
    setSelectedRole(null);
    setShowSecretKeyForm(false);
    setAdminAuthData(null);
  };

  // --- AUTHENTICATION LOGIC ---

  const handleLogin = async (values) => {
    setLoading(true);
    setAdminAuthData(null);
    setShowSecretKeyForm(false);

    try {
      const res = await axios.post(`${apiBaseUrl}/api/auth/signin`, {
        ...values,
        role: selectedRole,
      });

      const { token, role: userRole, user } = res.data;

      if (userRole === "admin") {
        // Admin login: save data and show the secret key form
        setAdminAuthData({ token, user, role: userRole });
        setShowSecretKeyForm(true);
        message.info(
          "Admin login requires a Secret Key for secondary verification."
        );
      } else {
        // Employee login: complete login immediately
        login(token, userRole, user, remember);
        message.success(`Welcome back, ${user.name}!`);
        navigate("/employee");
      }
    } catch (error) {
      message.error(
        error.response?.data?.error || "Login failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminSecretKey = async (values) => {
    if (!adminAuthData?.token) {
      message.error("Authentication session lost. Please sign in again.");
      setShowSecretKeyForm(false);
      setAuthStep("role");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/api/auth/verify-admin-key`,
        { key: values.secretKey },
        { headers: { Authorization: `Bearer ${adminAuthData.token}` } }
      );

      if (res.data.success) {
        login(adminAuthData.token, "admin", adminAuthData.user, remember);
        message.success(
          `Admin access granted, Welcome ${adminAuthData.user.name}!`
        );
        navigate("/admin");
      } else {
        message.error("Invalid Secret Key. Please try again.");
        secretKeyForm.resetFields();
      }
    } catch (error) {
      message.error(
        "Verification failed. Please check your key or try signing in again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const adminSecretKey =
        selectedRole === "admin" ? values.adminSecretKey : null;

      await axios.post(`${apiBaseUrl}/api/auth/signup`, {
        name: values.name,
        email: values.email,
        password: values.password,
        role: selectedRole,
        adminSecretKey: adminSecretKey,
      });

      message.success("Registration successful! Please log in.");
      setFormType("login");
      loginForm.setFieldsValue({ email: values.email });
    } catch (error) {
      message.error(
        error.response?.data?.error || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your registered email:");
    if (!email) return;
    try {
      await axios.post(`${apiBaseUrl}/api/auth/forgot-password`, { email });
      message.success(
        "Password reset email sent successfully! Check your inbox."
      );
    } catch {
      message.error("Failed to send reset email. Email may not be registered.");
    }
  };

  // --- RENDER FUNCTIONS (with Framer Motion) ---

  const renderRoleSelection = () => (
    <motion.div
      key="role-selection"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
    >
      {/* Admin Button */}
      <motion.button
        variants={itemVariants}
        onClick={() => handleRoleSelect("admin")}
        className="group relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:rotate-6 transition-transform">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-white mb-2">Admin Access</h3>
          <p className="text-purple-200 text-sm">
            Full system control & monitoring
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-300 text-sm">
            <Lock className="w-4 h-4" />
            <span>Requires Secret Key</span>
          </div>
        </div>
      </motion.button>
      {/* Employee Button */}
      <motion.button
        variants={itemVariants}
        onClick={() => handleRoleSelect("employee")}
        className="group relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:rotate-6 transition-transform">
            <UserCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-white mb-2">Employee Access</h3>
          <p className="text-purple-200 text-sm">
            Your daily workspace & tasks
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-purple-300 text-sm">
            <User className="w-4 h-4" />
            <span className="text-white">Standard Login</span>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );

  const renderAuthForm = () => (
    <motion.div
      key="auth-form"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-lg mx-auto"
    >
      <Card
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl custom-ant-card"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 ${
              selectedRole === "admin"
                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                : "bg-gradient-to-br from-purple-500 to-pink-600"
            } rounded-2xl flex items-center justify-center mb-4 mx-auto`}
          >
            {selectedRole === "admin" ? (
              <Shield className="w-8 h-8 text-white" />
            ) : (
              <UserCircle className="w-8 h-8 text-white" />
            )}
          </div>
          <h3 className="text-white font-bold text-lg mb-1">
            {selectedRole === "admin" ? "Admin Access" : "Employee Access"}
          </h3>
          <p className="text-white text-sm font-semibold">
            Sign in or register for your portal.
          </p>
        </div>

        {showSecretKeyForm ? (
          <Form
            form={secretKeyForm}
            onFinish={verifyAdminSecretKey}
            layout="vertical"
          >
            <h2 className="text-white text-xl font-semibold mb-6 text-center border-b border-white/10 pb-4">
              🔑 Two-Factor Verification
            </h2>
            <p className="text-sm text-center text-red-300 mb-4">
              Admin key is required to complete sign-in.
            </p>
            <Tooltip title="This key ensures only authorized personnel gain admin access.">
              <Form.Item
                name="secretKey"
                rules={[
                  {
                    required: true,
                    message: "Please input the Admin Secret Key!",
                  },
                ]}
              >
                <Input.Password
                  prefix={<Key className="w-4 h-4 text-gray-400" />}
                  placeholder="Admin Secret Key"
                  size="large"
                  className="!rounded-xl"
                />
              </Form.Item>
            </Tooltip>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="mt-4 bg-black/70 hover:!bg-black/90 border-none !rounded-xl !text-white font-semibold"
              >
                Verify & Continue
              </Button>
            </Form.Item>
            <Button
              type="link"
              onClick={handleBackToRole}
              block
              className="!text-purple-300 flex items-center justify-center gap-1 hover:!text-purple-200"
            >
              <ArrowLeft className="w-4 h-4" /> Change Role
            </Button>
          </Form>
        ) : (
          // --- LOGIN/REGISTER TABS (The main form) ---
          <Tabs
            activeKey={formType}
            onChange={(key) => {
              setFormType(key);
              registerForm.resetFields();
              loginForm.resetFields();
            }}
            className="custom-tabs"
          >
            <TabPane
              tab={
                <span className="flex items-center gap-1 text-white">
                  <LogIn className="w-4 h-4" /> Login
                </span>
              }
              key="login"
            >
              <Form
                form={loginForm}
                layout="vertical"
                onFinish={handleLogin}
                autoComplete="off"
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Please input your Email!" },
                    { type: "email", message: "Invalid email format!" },
                  ]}
                >
                  <Input
                    prefix={<Mail className="w-4 h-4 text-gray-400" />}
                    placeholder="Email"
                    size="large"
                    className="!rounded-xl"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "Please input your Password!" },
                  ]}
                >
                  <Input.Password
                    prefix={<Lock className="w-4 h-4 text-gray-400" />}
                    placeholder="Password"
                    size="large"
                    className="!rounded-xl"
                  />
                </Form.Item>

                <div className="flex justify-between items-center mb-4">
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="ant-checkbox-wrapper-checked .ant-checkbox-inner { background-color: black; border-color: black; }"
                  >
                    <span className="text-white/80">Remember me</span>
                  </Checkbox>
                  <Button
                    type="link"
                    onClick={handleForgotPassword}
                    className="!text-purple-300 hover:!text-purple-200"
                  >
                    Forgot Password?
                  </Button>
                </div>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="bg-black/70 hover:!bg-black/90 border-none !rounded-xl !text-white font-semibold" // Black button
                  >
                    Login
                  </Button>
                </Form.Item>
                <Button
                  type="link"
                  onClick={handleBackToRole}
                  block
                  className="!text-purple-300 flex items-center justify-center gap-1 hover:!text-purple-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Role
                </Button>
              </Form>
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center gap-1 text-white">
                  <UserPlus className="w-4 h-4" /> Register
                </span>
              }
              key="register"
            >
              <Form
                form={registerForm}
                layout="vertical"
                onFinish={handleRegister}
                autoComplete="off"
              >
                <Form.Item
                  name="name"
                  rules={[
                    { required: true, message: "Please input your Name!" },
                  ]}
                >
                  <Input
                    prefix={<User className="w-4 h-4 text-gray-400" />}
                    placeholder="Full Name"
                    size="large"
                    className="!rounded-xl"
                  />
                </Form.Item>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Please input your Email!" },
                    { type: "email", message: "Invalid email format!" },
                  ]}
                >
                  <Input
                    prefix={<Mail className="w-4 h-4 text-gray-400" />}
                    placeholder="Email"
                    size="large"
                    className="!rounded-xl"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "Please input your Password!" },
                  ]}
                >
                  <Input.Password
                    prefix={<Lock className="w-4 h-4 text-gray-400" />}
                    placeholder="Password"
                    size="large"
                    className="!rounded-xl"
                  />
                </Form.Item>
                {selectedRole === "admin" && (
                  <Form.Item
                    name="adminSecretKey"
                    rules={[
                      {
                        required: true,
                        message: "Admin registration requires the Secret Key.",
                      },
                    ]}
                    help={
                      <span className="text-red-300">
                        Enter A Secret Key to Access{" "}
                      </span>
                    }
                  >
                    <Input.Password
                      prefix={<Key className="w-4 h-4 text-gray-400" />}
                      placeholder="Admin Secret Key"
                      size="large"
                      className="!rounded-xl"
                    />
                  </Form.Item>
                )}
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="bg-black/70 hover:!bg-black/90 border-none !rounded-xl !text-white font-semibold" // Black button
                  >
                    Register
                  </Button>
                </Form.Item>
                <Button
                  type="link"
                  onClick={handleBackToRole}
                  block
                  className="!text-purple-300 flex items-center justify-center gap-1 hover:!text-purple-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Role
                </Button>
              </Form>
            </TabPane>
          </Tabs>
        )}
      </Card>
    </motion.div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-500/20 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-2 text-3xl font-bold">
            Workplace Management System
          </h1>
          <p className="text-purple-200 text-lg">
            Secure, Modern & Efficient Access Portal
          </p>
        </div>

        {/* Conditional Rendering with Framer Motion AnimatePresence */}
        <AnimatePresence mode="wait">
          {authStep === "role" && renderRoleSelection()}
          {authStep === "form" && renderAuthForm()}
        </AnimatePresence>
      </div>
    </div>
  );
}
