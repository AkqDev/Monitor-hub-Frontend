import React from "react";
import ChatPanel from "../shared/ChatPanel";

export default function AdminChat({ userId, userName, token }) {
  return (
    <ChatPanel
      userId={userId}
      userName={userName}
      token={token}
    />
  );
}
