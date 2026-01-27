import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Card, Statistic, Row, Col, Spin } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  MdDashboard, MdPerson, MdChat, MdTask, MdVideoCall, MdMonitor, MdPowerSettingsNew,
  MdEvent, MdAttachMoney, MdCampaign, MdSchedule, MdTrendingUp, MdCheckCircle, MdGroup,
  MdRefresh
} from 'react-icons/md';
import { 
  FaUsers, FaTasks, FaMoneyBillWave, FaCalendarAlt, FaVideo, FaClock,
  FaChartLine, FaUserCheck, FaBell, FaEye
} from 'react-icons/fa';
import { 
  IoStatsChart, IoTime, IoCheckmarkCircle, IoAlert, IoRefresh
} from 'react-icons/io5';
import { useAuth } from '../App'; 
import { api, authHeader } from '../utils/api';

// Admin Feature Components
import ActiveSessions from '../components/admin/ActiveSessions'; 
import TaskManager from '../components/admin/TaskManager';
import MeetingManager from '../components/meetings/MeetingManager';
import AdminChat from '../components/admin/AdminChat';
import ScreenMonitor from '../components/admin/ScreenMonitor';
import FineManager from '../components/admin/FineManager'; 
import EventManagerPanel from '../components/shared/EventManagerPanel'; 
import AnnouncementManagerPanel from '../components/shared/AnnouncementManagerPanel';
import JoinMeeting from '../components/meetings/JoinMeeting'

const { Header, Content, Sider } = Layout;

// Sidebar Navigation
const menuItems = [
  { key: 'overview', icon: <MdDashboard className="w-4 h-4 text-blue-400" />, label: 'Overview' },
  { key: 'sessions', icon: <FaUserCheck className="w-4 h-4 text-green-400" />, label: 'Active Sessions' },
  { key: 'monitoring', icon: <MdMonitor className="w-4 h-4 text-purple-400" />, label: 'Live Monitoring' },
  { key: 'tasks', icon: <FaTasks className="w-4 h-4 text-orange-400" />, label: 'Task Manager' },
  { key: 'meetings', icon: <MdVideoCall className="w-4 h-4 text-pink-400" />, label: 'Meeting Manager' },
  { key: 'events', icon: <FaCalendarAlt className="w-4 h-4 text-cyan-400" />, label: 'Event Manager' },
  { key: 'fines', icon: <FaMoneyBillWave className="w-4 h-4 text-red-400" />, label: 'Fine Manager' },
  { key: 'announcements', icon: <MdCampaign className="w-4 h-4 text-yellow-400" />, label: 'Announcements' },
  { key: 'chat', icon: <MdChat className="w-4 h-4 text-indigo-400" />, label: 'Global Chat' },
];

export default function AdminDashboard() {
  const authContext = useAuth();
  
  // Add null check for auth context
  if (!authContext) {
    return <div className="text-white text-center p-8 bg-gray-900 min-h-screen">Loading...</div>;
  }
  
  const { user, token, logout } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  const { token: antdToken } = theme.useToken();

  const pathParts = location.pathname.split('/');
  const currentKey = pathParts[pathParts.length - 1] || 'overview';

  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalEmployees: 0,
    pendingTasks: 0,
    totalFines: 0,
    unpaidFines: 0,
    upcomingMeetings: 0,
    todayEvents: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple statistics in parallel
      const [
        presenceRes,
        employeesRes,
        tasksRes,
        finesRes,
        meetingsRes,
        eventsRes
      ] = await Promise.all([
        api.get('/api/presence/all', authHeader(token)),
        api.get('/api/admin/employees', authHeader(token)),
        api.get('/api/tasks', authHeader(token)),
        api.get('/api/fines', authHeader(token)),
        api.get('/api/admin/meetings', authHeader(token)),
        api.get('/api/events', authHeader(token))
      ]);

      // Calculate active sessions (checked-in employees)
      const activeSessions = (presenceRes.data || []).filter(p => p.active).length;
      
      // Calculate pending tasks
      const pendingTasks = (tasksRes.data || []).filter(task => 
        task.status !== 'completed'
      ).length;

      // Calculate fines totals
      const totalFines = (finesRes.data || []).reduce((sum, fine) => sum + fine.amount, 0);
      const unpaidFines = (finesRes.data || []).filter(fine => !fine.isPaid).length;

      // Calculate upcoming meetings (today)
      const today = new Date().toISOString().split('T')[0];
      const upcomingMeetings = (meetingsRes.data || []).filter(meeting => {
        const meetingDate = new Date(meeting.scheduledTime).toISOString().split('T')[0];
        return meetingDate === today;
      }).length;

      // Calculate today's events
      const todayEvents = (eventsRes.data || []).filter(event => {
        const eventDate = new Date(event.date).toISOString().split('T')[0];
        return eventDate === today;
      }).length;

      setStats({
        activeSessions,
        totalEmployees: employeesRes.data?.length || 0,
        pendingTasks,
        totalFines,
        unpaidFines,
        upcomingMeetings,
        todayEvents
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardStats();
      
      // Refresh stats every 30 seconds for real-time updates
      const interval = setInterval(fetchDashboardStats, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

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
      className: '!text-green-500 !font-semibold !font-[poppins] ',
      label: `Admin: ${user?.name || 'User'}`,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      className: '!text-green-500 !font-semibold !font-[poppins] !hover:bg-transparent',
      icon: <MdPowerSettingsNew className="w-4 h-4 text-red-400" />,
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
          <h1 className="text-green-500 text-2xl font-bold transition-all duration-300 overflow-hidden
          font-[poppins]">
            {collapsed ? 'MH' : 'MonitorHub'}
          </h1>
        </div>

        <Menu
          theme="dark"
          selectedKeys={[currentKey]}
          mode="inline"
          onClick={handleMenuClick}
          items={menuItems}
          className="!bg-transparent custom-admin-menu !font-[poppins] !font-semibold"
          style={{
            backgroundColor: 'transparent',
            color: '#fff',
          }}
        />

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
        <Header className="w-full bg-gradient-to-r from-gray-900 via-black to-gray-800 flex justify-between items-center px-6 border-b border-white/20 shadow-lg">
          <h2 className="text-white text-xl sm:text-2xl font-bold tracking-wide font-[poppins]">
            Admin Dashboard | {menuItems.find(i => i.key === currentKey)?.label || 'Overview'}
          </h2>

          <Dropdown menu={{ items: userDropdownItems }} trigger={['click']} >
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <Avatar className="!bg-green-500 shadow-md" icon={<MdPerson size={16} className="text-white" />} />
              <span className="text-gray-100 font-semibold hidden sm:block font-[poppins] uppercase">{user?.name}</span>
            </div>
          </Dropdown>
        </Header>

        {/* CONTENT */}
        <Content className="p-6" style={{ background: '#1f2937' }}>
          <Routes>
            <Route path="/" element={
              <OverviewDashboard 
                user={user} 
                stats={stats} 
                loading={loading}
                token={token}
                onRefresh={fetchDashboardStats}
              />} 
            />
            <Route path="sessions" element={<ActiveSessions token={token} />} />
            <Route path="monitoring" element={<ScreenMonitor adminUser={user} token={token} />} />
            <Route path="tasks" element={<TaskManager token={token} />} />
            <Route path="meetings" element={<MeetingManager token={token} />} />
            <Route path="events" element={<EventManagerPanel token={token} isAdmin />} />
            <Route path="fines" element={<FineManager token={token} />} />
            <Route path="announcements" element={<AnnouncementManagerPanel token={token} isAdmin />} />
            <Route path="chat" element={<AdminChat userId={user?._id} userName={user?.name} token={token} />} />

            {/* ADD THESE MEETING JOIN ROUTES */}
  <Route path="meetings/join/:meetingId" element={<JoinMeeting />} />
  <Route path="meeting/:meetingId" element={<JoinMeeting />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

/* -------- OVERVIEW -------- */

const OverviewDashboard = ({ user, stats, loading, token, onRefresh }) => {
  const adminStats = [
    { 
      title: 'Active Sessions', 
      value: stats.activeSessions, 
      suffix: `/${stats.totalEmployees}`,
      icon: <MdTrendingUp className="w-5 h-5" />,
      color: '#10B981'
    },
    { 
      title: 'Total Employees', 
      value: stats.totalEmployees, 
      suffix: '',
      icon: <FaUsers className="w-5 h-5" />,
      color: '#3B82F6'
    },
    { 
      title: 'Pending Tasks', 
      value: stats.pendingTasks, 
      suffix: ' pending',
      icon: <FaTasks className="w-5 h-5" />,
      color: '#F59E0B'
    },
    { 
      title: 'Unpaid Fines', 
      value: stats.unpaidFines, 
      suffix: ' fines',
      icon: <MdAttachMoney className="w-5 h-5" />,
      color: '#EF4444'
    },
    { 
      title: 'Total Fines', 
      value: `PKR ${stats.totalFines.toLocaleString()}`, 
      suffix: '',
      icon: <FaMoneyBillWave className="w-5 h-5" />,
      color: '#8B5CF6'
    },
    { 
      title: 'Upcoming Meetings', 
      value: stats.upcomingMeetings, 
      suffix: ' today',
      icon: <FaVideo className="w-5 h-5" />,
      color: '#EC4899'
    },
    { 
      title: "Today's Events", 
      value: stats.todayEvents, 
      suffix: ' events',
      icon: <FaCalendarAlt className="w-5 h-5" />,
      color: '#06B6D4'
    },
    { 
      title: 'Last Updated', 
      value: 'Just now', 
      suffix: '',
      icon: <IoTime className="w-5 h-5" />,
      color: '#6B7280'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="p-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">MonitorHub Admin Dashboard</h1>
            <p className="text-blue-300 text-lg">Welcome back, <span className="font-semibold">{user?.name}</span></p>
            <p className="text-gray-400 mt-2">Real-time monitoring and management system</p>
          </div>
          <Button 
            type="primary" 
            onClick={onRefresh}
            loading={loading}
            icon={<IoRefresh className="w-4 h-4" />}
            className="!bg-green-600 !border-0 !font-semibold"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" tip="Loading dashboard statistics..." />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {adminStats.map((stat, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Card 
                  className="!bg-gray-800 border-gray-700 hover:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                  styles={{ body: { padding: '20px' } }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                      <div style={{ color: stat.color }}>
                        {stat.icon}
                      </div>
                    </div>
                    <Statistic 
                      title={
                        <span className="text-gray-300 font-medium text-sm uppercase tracking-wide">
                          {stat.title}
                        </span>
                      } 
                      value={stat.value}
                      suffix={
                        <span className="text-gray-400 text-sm">
                          {stat.suffix}
                        </span>
                      }
                      className="text-right"
                      valueStyle={{ 
                        color: '#fff', 
                        fontSize: '28px', 
                        fontWeight: 'bold',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    />
                  </div>
                  <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((index + 1) * 12, 100)}%`,
                        backgroundColor: stat.color
                      }}
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
            <Row gutter={[16, 16]}>
              <Col span={24} md={8}>
                <Card 
                  className="!bg-gradient-to-r from-blue-900/50 to-blue-800/30 !border-blue-700 cursor-pointer hover:border-blue-500 transition-all"
                  onClick={() => window.location.href = '/admin/tasks'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-lg">Assign New Task</h3>
                      <p className="text-blue-200">Create and assign tasks to employees</p>
                    </div>
                    <FaTasks className="w-8 h-8 text-blue-400" />
                  </div>
                </Card>
              </Col>
              <Col span={24} md={8}>
                <Card 
                  className="!bg-gradient-to-r from-green-900/50 to-green-800/30 !border-green-700 cursor-pointer hover:border-green-500 transition-all"
                  onClick={() => window.location.href = '/admin/meetings'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-lg">Schedule Meeting</h3>
                      <p className="text-green-200">Set up new team meetings</p>
                    </div>
                    <FaVideo className="w-8 h-8 text-green-400" />
                  </div>
                </Card>
              </Col>
              <Col span={24} md={8}>
                <Card 
                  className="!bg-gradient-to-r from-purple-900/50 to-purple-800/30 !border-purple-700 cursor-pointer hover:border-purple-500 transition-all"
                  onClick={() => window.location.href = '/admin/fines'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-lg">Assign Fine</h3>
                      <p className="text-purple-200">Manage employee fines</p>
                    </div>
                    <FaMoneyBillWave className="w-8 h-8 text-purple-400" />
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </>
      )}
    </div>
  );
};

const NotFound = () => (
  <div className="text-white p-8">Admin Feature Not Found.</div>
);