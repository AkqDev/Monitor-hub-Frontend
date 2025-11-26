import React, { useContext } from "react";
import { Layout, Dropdown, Avatar } from "antd";
import { AuthContext } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import logo from "../logo.png"; // adjust path if needed

const { Header } = Layout;

export default function HeaderBar() {
  const { auth, logout } = useContext(AuthContext);

  const userMenu = {
    items: [
      {
        key: "logout",
        label: <span onClick={logout}>Logout</span>,
      },
    ],
  };

  return (
    <Header
      style={{
        padding: "0 24px",
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Left Side: Logo */}
      <div className="flex items-center">
        <img src={logo} alt="App Logo" className="h-40 w-auto" />
      </div>

      {/* Right Side: Notifications + User Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <NotificationBell />
        <Dropdown menu={userMenu} placement="bottomRight">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 px-3 py-1 rounded transition-all"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Avatar>{auth.user?.name?.[0] || "U"}</Avatar>
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-medium">{auth.user?.name || "User"}</span>
              <span className="text-gray-500">
                {auth.user?.email || "user@example.com"}
              </span>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}