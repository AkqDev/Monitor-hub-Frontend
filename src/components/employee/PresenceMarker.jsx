import React, { useState } from "react";
import { Clock, CheckCircle } from "lucide-react";
import { Button, message } from "antd";
import { api, authHeader } from "../../utils/api";

export default function PresenceMarker({ userId, token, onPresenceMarked }) {
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    if (!userId || !token) {
      return message.error("User not authenticated.");
    }

    setLoading(true);
    try {
      const res = await api.post(
        '/api/presence/checkin',
        { userId },
        authHeader(token)
      );
      
      message.success("Presence marked! Monitoring has started.");
      onPresenceMarked(res.data.startTime); // Notify parent component
    } catch (error) {
      console.error("Check-in failed:", error);
      message.error(error.response?.data?.error || "Failed to mark presence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      onClick={handleCheckIn}
      loading={loading}
      disabled={loading}
      icon={<CheckCircle className="w-4 h-4" />}
      className="!bg-green-500/30 !text-green-300 !border-green-500/50 hover:!bg-green-500/40 transition-all"
    >
      Check In
    </Button>
  );
}