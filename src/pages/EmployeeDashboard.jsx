import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Card, Row, Col, message, Tag } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App'; 
import { 
    Home, ListTodo, Video, MessageSquare, Clock, Power, CheckCircle, XCircle, Megaphone, DollarSign, CalendarPlus, User, Activity
} from 'lucide-react';

// Import Employee Feature Components
import TaskList from '../components/employee/TaskList';
import ActivityLogPanel from '../components/shared/ActivityLogPanel';
import MeetingPanel from "../components/meetings/MeetingPanel";
import ChatPanel from "../components/shared/ChatPanel";
import AnnouncementManagerPanel from "../components/shared/AnnouncementManagerPanel";
import EventManagerPanel from "../components/shared/EventManagerPanel";
import MyFinesPanel from "../components/employee/MyFinesPanel";
import { api, authHeader } from '../utils/api';

const { Header, Content, Sider } = Layout;

const menuItems = [
    { key: 'home', icon: <Home className='w-4 h-4' />, label: 'Home', path: '' },
    { key: 'tasks', icon: <ListTodo className='w-4 h-4' />, label: 'My Tasks', path: 'tasks' },
    { key: 'meetings', icon: <Video className='w-4 h-4' />, label: 'Meetings', path: 'meetings' },
    { key: 'chat', icon: <MessageSquare className='w-4 h-4' />, label: 'Global Chat', path: 'chat' },
    { key: 'announcements', icon: <Megaphone className='w-4 h-4' />, label: 'Announcements', path: 'announcements' },
    { key: 'events', icon: <CalendarPlus className='w-4 h-4' />, label: 'Events', path: 'events' },
    { key: 'fines', icon: <DollarSign className='w-4 h-4' />, label: 'My Fines', path: 'fines' },
    { key: 'activity', icon: <Activity className='w-4 h-4' />, label: 'My Activity', path: 'activity' },
];

export default function EmployeeDashboard() {
    const { user, token, logout } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const { token: antdToken } = theme.useToken();

    const pathParts = location.pathname.split('/');
    const currentKey = menuItems.find(item => item.path === pathParts[pathParts.length - 1])?.key || 'home';

    // --- Presence (Check-In) Management ---
    const fetchPresenceStatus = async () => {
        const userId = user?._id; 
        if (!userId || !token) return;

        try {
            const res = await api.get(`/api/presence/status/${userId}`, authHeader(token));
            setIsCheckedIn(res.data.active);
            setCheckInTime(res.data.startTime ? new Date(res.data.startTime) : null);
        } catch (error) {
            console.error("Failed to fetch presence status:", error);
            setIsCheckedIn(false); 
        }
    };
    
    useEffect(() => {
        if (user && token) {
            fetchPresenceStatus();
            
            const activityInterval = setInterval(() => {
                if (isCheckedIn) {
                    api.post('/api/presence/activity', {}, authHeader(token))
                        .catch(err => console.error("Activity ping failed:", err));
                }
            }, 60000); // Every 60 seconds

            return () => clearInterval(activityInterval);
        }
    }, [user, token, isCheckedIn]); 

    const handleCheckIn = async () => {
        try {
            await api.post('/api/presence/checkin', {}, authHeader(token));
            setIsCheckedIn(true);
            setCheckInTime(new Date());
            message.success("You are successfully checked in!");
        } catch (error) {
            message.error(error.response?.data?.error || "Check-in failed.");
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.post('/api/presence/checkout', {}, authHeader(token)); 
            setIsCheckedIn(false);
            setCheckInTime(null);
            message.success("You are successfully checked out.");
        } catch (error) {
            message.error(error.response?.data?.error || "Check-out failed.");
        }
    };

    const handleMenuClick = ({ key }) => {
        const item = menuItems.find(i => i.key === key);
        navigate(`/employee/${item.path}`);
    };
    
    const handleLogout = () => {
        logout();
        navigate('/auth'); 
    };

    const userDropdownMenu = {
        items: [
            { key: 'profile', label: `Logged in as: ${user?.name || 'Employee'}`, disabled: true },
            { type: 'divider' },
            { key: 'logout', label: 'Logout', icon: <Power className='w-4 h-4' />, danger: true, onClick: handleLogout },
        ]
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
        <Sider
    collapsible
    collapsed={collapsed}
    onCollapse={(value) => setCollapsed(value)}
    breakpoint="lg"
    collapsedWidth="80"
    style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#1E293B',
    }}
    className='border-r border-white/20'
>
    <div className="logo p-4 flex items-center justify-center h-[64px]">
        <h1 className="text-white text-2xl font-bold transition-all duration-300 overflow-hidden">
            {collapsed ? 'MH' : 'MonitorHub'}
        </h1>
    </div>

    <Menu
        theme="dark"
        defaultSelectedKeys={['home']}
        selectedKeys={[currentKey]}
        mode="inline"
        onClick={handleMenuClick}
        items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
        }))}
        className='!bg-transparent text-white custom-employee-menu'
        style={{
            backgroundColor: 'transparent',
            color: '#fff',
        }}
    />
    <style jsx="true" global="true">{`
        /* Target the selected item in the dark, inline menu */
        .custom-employee-menu .ant-menu-item-selected {
            background-color: transparent !important;
            border-right: none !important;
            border-bottom: 2px solid #10B981 !important;
            margin-bottom: -2px;
        }
        .custom-employee-menu .ant-menu-item:hover,
        .custom-employee-menu .ant-menu-item-selected:hover,
        .custom-employee-menu .ant-menu-item-active {
            background-color: transparent !important;
            color: #4ade80 !important;
        }
    `}</style>
</Sider>  
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin 0.2s' }}>
                <Header
  style={{ padding: 0, zIndex: 10 }}
  className="w-full bg-gradient-to-r from-gray-900 via-black to-gray-800 
             flex justify-between items-center px-6 border-b border-white/20 shadow-lg"
>
  <h2 className="text-white text-xl sm:text-2xl font-bold tracking-wide ml-10">
    Employee Dashboard | {menuItems.find(i => i.key === currentKey)?.label || 'Home'}
  </h2>

  <div className="flex items-center gap-6">
    <div className="flex items-center gap-3 ">
      {isCheckedIn ? (
        <Button
          onClick={handleCheckOut}
          icon={<XCircle className="w-4 h-4" />}
          className="!bg-red-600 !text-white !rounded-full !px-4 !py-2 !border-0 !font-semibold font-[poppins] !cursor-pointer"
        >
          Check Out
        </Button>
      ) : (
        <Button
          onClick={handleCheckIn}
          icon={<CheckCircle className="w-4 h-4 !font-semibold font-[poppins]" />}
          className="!bg-green-500 !text-white !rounded-full !px-4 !py-2 !border-0 !font-semibold font-[poppins]"
        >
          Check In
        </Button>
      )}
      <Tag
        className={`!rounded-full px-3 py-1 text-sm font-medium${isCheckedIn ? 'bg-green-600' : 'bg-red-600'} text-white`}
      >
        {isCheckedIn ? '✔ Checked In' : '✖ Checked Out'}
      </Tag>
    </div>

    <Dropdown menu={userDropdownMenu} trigger={['click']}>
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all mr-10">
        <Avatar
  className="!bg-green-500 shadow-md"
  icon={<User size={16} />}
/>

        <span className="!text-gray-100 !font-semibold !font-[poppins] hidden sm:block">{user?.name}</span>
      </div>
    </Dropdown>
  </div>
</Header>

                <Content className='p-6' style={{ background: '#1f2937' }}>
                    <Routes>
                        <Route path="/" element={<EmployeeHome 
                            user={user} 
                            token={token}
                            checkInTime={checkInTime} 
                            isCheckedIn={isCheckedIn}
                        />} />
                        <Route path="tasks" element={<TaskList userId={user?._id} token={token} compact={false} />} />
                        <Route path="meetings" element={<MeetingPanel userId={user?._id} userName={user?.name} token={token} />} />
                        <Route path="chat" element={<ChatPanel userId={user?._id} userName={user?.name} token={token} />} />
                        <Route path="announcements" element={<AnnouncementManagerPanel token={token} isAdmin={false} />} />
                        <Route path="events" element={<EventManagerPanel token={token} isAdmin={false} />} />
                        <Route path="fines" element={<MyFinesPanel token={token} />} />
                        <Route path="activity" element={<ActivityLogPanel token={token} isAdmin={false} />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

// --- Employee Home Component ---
const EmployeeHome = ({ user, token, checkInTime, isCheckedIn }) => (
    <Row gutter={[16, 16]}>
        <Col span={24}>
            <div className="p-8 !bg-black/25 backdrop-blur-xl rounded-2xl !border-0">
                <h1 className="text-3xl font-bold text-green-500 mb-4 font-[poppins]">Welcome back, {user?.name}!</h1>
                <p className="text-lg text-gray-200 font-[poppins]">
                    Your portal for tasks, meetings, and real-time collaboration.
                </p>
            </div>
        </Col>
        <Col xs={24} md={8}>
            <Card 
                title={<div className="flex items-center gap-2 text-yellow-400"><Clock className='w-5 h-5 text-yellow-400' /> Session Status</div>}
                className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20"
            >
                <p className="text-lg text-white">Status: **{isCheckedIn ? 'Active' : 'Offline'}**</p>
                {checkInTime && <p className="text-md text-purple-300">Checked In: {checkInTime.toLocaleTimeString()}</p>}
                {!isCheckedIn && <p className="text-md text-red-800 font-semibold">Please check in to start tracking your activity.</p>}
            </Card>
        </Col>
        <Col xs={24} md={16}>
            <TaskList userId={user?._id} token={token} compact={true} />
        </Col>
    </Row>
);

// --- Not Found Page ---
const NotFound = () => (
    <div className="text-white p-8">Employee Feature Not Found.</div>
);