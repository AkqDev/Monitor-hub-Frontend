import React, { useState, useContext } from "react";
import { Input, Button, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function SecretKeyPrompt() {
  const [key, setKey] = useState("");
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const verify = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/verify-admin-key`,
        { key },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        message.success("Access granted");
        navigate("/admin");
      } else {
        message.error("Invalid key");
      }
    } catch {
      message.error("Verification failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-3">Admin Secret Key</h3>
        <Input.Password
          placeholder="Enter secret key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mb-3"
        />
        <Button block type="primary" onClick={verify}>
          Verify & Continue
        </Button>
      </div>
    </div>
  );
}
