import React, { useContext } from "react";
import { Layout, Menu, Dropdown, Avatar, Spin } from "antd";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const { Header, Content } = Layout;

export default function LayoutShell({ children }) {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (auth === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" tip="Loading user..." fullscreen />
      </div>
    );
  }

  const role = auth?.role || "employee";

  // ONLY ADMIN OR EMPLOYEE DASHBOARD
  const menuItems = [
    role === "admin"
      ? { key: "/admin", label: "Admin Dashboard" }
      : { key: "/employee", label: "Employee Dashboard" },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="logout" onClick={() => { logout(); navigate("/"); }}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <Menu
          mode="horizontal"
          selectedKeys={[`/${location.pathname.split("/")[1]}`]}
          items={menuItems}
          onClick={(e) => navigate(e.key)}
          style={{ flex: 1 }}
        />

        <Dropdown overlay={userMenu} placement="bottomRight">
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
      </Header>

      <Content style={{ margin: "16px" }}>{children}</Content>
    </Layout>
  );
}
