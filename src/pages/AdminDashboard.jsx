import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Card, Statistic, Row, Col } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, User, MessageSquare, ListTodo, Video, Monitor, Power,
  CalendarPlus, DollarSign, Megaphone
} from 'lucide-react';
import { useAuth } from '../App'; 

// Admin Feature Components
import ActiveSessions from '../components/admin/ActiveSessions'; 
import TaskManager from '../components/admin/TaskManager';
import MeetingManager from '../components/meetings/MeetingManager';
import AdminChat from '../components/admin/AdminChat';
import ScreenMonitor from '../components/admin/ScreenMonitor';
import FineManager from '../components/admin/FineManager'; 
import EventManagerPanel from '../components/shared/EventManagerPanel'; 
import AnnouncementManagerPanel from '../components/shared/AnnouncementManagerPanel';

const { Header, Content, Sider } = Layout;

// Sidebar Navigation
const menuItems = [
  { key: 'overview', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview' },
  { key: 'sessions', icon: <User className="w-4 h-4" />, label: 'Active Sessions' },
  { key: 'monitoring', icon: <Monitor className="w-4 h-4" />, label: 'Live Monitoring' },
  { key: 'tasks', icon: <ListTodo className="w-4 h-4" />, label: 'Task Manager' },
  { key: 'meetings', icon: <Video className="w-4 h-4" />, label: 'Meeting Manager' },
  { key: 'events', icon: <CalendarPlus className="w-4 h-4" />, label: 'Event Manager' },
  { key: 'fines', icon: <DollarSign className="w-4 h-4" />, label: 'Fine Manager' },
  { key: 'announcements', icon: <Megaphone className="w-4 h-4" />, label: 'Announcements' },
  { key: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Global Chat' },
];

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: antdToken } = theme.useToken();

  const pathParts = location.pathname.split('/');
  const currentKey = pathParts[pathParts.length - 1] || 'overview';

  const [collapsed, setCollapsed] = useState(false);

  const handleMenuClick = ({ key }) => {
    key === 'overview' ? navigate('/admin') : navigate(`/admin/${key}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const userDropdownItems = [
    {
      key: 'profile',
      label: `Admin: ${user?.name || 'User'}`,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <Power className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth="80"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          backgroundColor: '#1E293B',
        }}
        className="border-r border-white/20"
      >
        <div className="logo p-4 flex items-center justify-center h-[64px]">
          <h1 className="text-white text-2xl font-bold transition-all duration-300 overflow-hidden">
            {collapsed ? 'MH' : 'MonitorHub'}
          </h1>
        </div>

        <Menu
          theme="dark"
          selectedKeys={[currentKey]}
          mode="inline"
          onClick={handleMenuClick}
          items={menuItems}
          className="!bg-transparent custom-admin-menu"
          style={{
            backgroundColor: 'transparent',
            color: '#fff',
          }}
        />

        {/* Sidebar active + hover style same as Employee */}
        <style jsx="true" global="true">{`
          .custom-admin-menu .ant-menu-item-selected {
            background-color: transparent !important;
            border-right: none !important;
            border-bottom: 2px solid #10B981 !important;
            margin-bottom: -2px;
          }
          .custom-admin-menu .ant-menu-item,
          .custom-admin-menu .ant-menu-submenu-title {
            color: #fff !important;
          }
          .custom-admin-menu .ant-menu-item:hover,
          .custom-admin-menu .ant-menu-item-active {
            background-color: transparent !important;
            color: #4ade80 !important;
          }
        `}</style>
      </Sider>

      {/* MAIN PANEL */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin 0.2s' }}>
        {/* HEADER */}
        <Header className="w-full bg-gradient-to-r from-gray-900 via-black to-gray-800 flex justify-between px-6 border-b border-white/20 shadow-lg">
          <h2 className="text-white text-xl sm:text-2xl font-bold tracking-wide">
            Admin Dashboard | {menuItems.find(i => i.key === currentKey)?.label || 'Overview'}
          </h2>

          <Dropdown menu={{ items: userDropdownItems }} trigger={['click']}>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <Avatar className="!bg-green-500 shadow-md" icon={<User size={16} />} />
              <span className="text-gray-100 font-semibold hidden sm:block">{user?.name}</span>
            </div>
          </Dropdown>
        </Header>

        {/* CONTENT */}
        <Content className="p-6" style={{ background: '#1f2937' }}>
          <Routes>
            <Route path="/" element={<OverviewDashboard user={user} />} />
            <Route path="sessions" element={<ActiveSessions token={token} />} />
            <Route path="monitoring" element={<ScreenMonitor token={token} />} />
            <Route path="tasks" element={<TaskManager token={token} />} />
            <Route path="meetings" element={<MeetingManager token={token} />} />
            <Route path="events" element={<EventManagerPanel token={token} isAdmin />} />
            <Route path="fines" element={<FineManager token={token} />} />
            <Route path="announcements" element={<AnnouncementManagerPanel token={token} isAdmin />} />
            <Route path="chat" element={<AdminChat userId={user?._id} userName={user?.name} token={token} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

/* -------- OVERVIEW -------- */

const adminStats = [
  { title: 'Active Sessions', value: 45, prefix: '', suffix: '/50' },
  { title: 'Pending Tasks', value: 12, prefix: '', suffix: ' urgent' },
  { title: 'Total Fines', value: 18000, prefix: 'PKR ', suffix: '' },
  { title: 'Upcoming Meetings', value: 3, prefix: '', suffix: ' today' },
  { title: 'New Announcements', value: 5, prefix: '', suffix: ' unread' },
];

const OverviewDashboard = ({ user }) => (
  <div className="space-y-8">
    <div className="p-8 bg-gray-700 rounded-xl">
      <h1 className="text-4xl font-bold text-white">MonitorHub Admin Dashboard</h1>
      <p className="text-blue-300">Welcome back, {user?.name}</p>
    </div>

    <Row gutter={[24, 24]}>
      {adminStats.map((s, i) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={i}>
          <Card className="!bg-gray-800 border-gray-700">
            <Statistic title={s.title} value={s.value} prefix={s.prefix} suffix={s.suffix} />
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);

const NotFound = () => (
  <div className="text-white p-8">Admin Feature Not Found.</div>
);
