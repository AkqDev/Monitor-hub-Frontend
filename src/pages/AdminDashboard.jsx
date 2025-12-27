import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Card, Statistic, Row, Col } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, User, MessageSquare, ListTodo, Video, Monitor, Power,
  CalendarPlus, DollarSign, Megaphone, Activity 
} from 'lucide-react';
import { useAuth } from '../App'; 

// Import Admin Feature Components
import ActiveSessions from '../components/admin/ActiveSessions'; 
import TaskManager from '../components/admin/TaskManager';
import MeetingManager from '../components/meetings/MeetingManager';
import AdminChat from '../components/admin/AdminChat';
import ScreenMonitor from '../components/admin/ScreenMonitor';
import FineManager from '../components/admin/FineManager'; 
import EventManagerPanel from '../components/shared/EventManagerPanel'; 
import AnnouncementManagerPanel from '../components/shared/AnnouncementManagerPanel';
import ActivityLogs from "../components/admin/ActivityLogs.jsx";

const { Header, Content, Sider } = Layout;

// Navigation Items
const menuItems = [
  { key: 'overview', icon: <LayoutDashboard />, label: 'Overview' },
  { key: 'sessions', icon: <User />, label: 'Active Sessions' },
  { key: 'activity', icon: <Activity />, label: 'Activity Logs' },
  { key: 'monitoring', icon: <Monitor />, label: 'Live Monitoring' },
  { key: 'tasks', icon: <ListTodo />, label: 'Task Manager' },
  { key: 'meetings', icon: <Video />, label: 'Meeting Manager' },
  { key: 'events', icon: <CalendarPlus />, label: 'Event Manager' },
  { key: 'fines', icon: <DollarSign />, label: 'Fine Manager' },
  { key: 'announcements', icon: <Megaphone />, label: 'Announcements' },
  { key: 'chat', icon: <MessageSquare />, label: 'Global Chat' },
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

  // ✅ FIXED DROPDOWN (NO overlay)
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
        <div className="p-4 flex justify-center h-[64px]">
          <h1 className="text-white text-xl font-bold">
            {collapsed ? 'MH' : 'MonitorHub Hub'}
          </h1>
        </div>

        <Menu
          theme="dark"
          selectedKeys={[currentKey]}
          mode="inline"
          onClick={handleMenuClick}
          items={menuItems}
          className="!bg-transparent"
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Header className="!bg-gray-800 flex justify-between px-6 border-b border-white/20">
          <h2 className="text-white text-xl font-semibold">
            Admin Dashboard | {menuItems.find(i => i.key === currentKey)?.label || 'Overview'}
          </h2>

          <Dropdown menu={{ items: userDropdownItems }} trigger={['click']}>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar style={{ backgroundColor: '#87d068' }} icon={<User />} />
              <span className="text-white hidden sm:block">{user?.name}</span>
            </div>
          </Dropdown>
        </Header>

        <Content className="p-6 bg-gray-800">
          <Routes>
            <Route path="/" element={<OverviewDashboard user={user} />} />
            <Route path="sessions" element={<ActiveSessions token={token} />} />
            <Route path="activity" element={<ActivityLogs token={token} isAdmin />} />
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

/* ---------- OVERVIEW ---------- */

const adminStats = [
  { title: 'Active Sessions', value: 45, icon: <User />, suffix: '/50' },
  { title: 'Pending Tasks', value: 12, icon: <ListTodo />, suffix: ' urgent' },
  { title: 'Total Fines', value: 18000, icon: <DollarSign />, prefix: 'PKR ' },
  { title: 'Upcoming Meetings', value: 3, icon: <Video />, suffix: ' today' },
  { title: 'New Announcements', value: 5, icon: <Megaphone />, suffix: ' unread' },
];

const OverviewDashboard = ({ user }) => {
  const navigate = useNavigate();

  return (
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
};

const NotFound = () => (
  <div className="text-white p-8">Admin Feature Not Found.</div>
);
