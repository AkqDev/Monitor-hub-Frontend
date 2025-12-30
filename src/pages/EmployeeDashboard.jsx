import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Card, Row, Col, message, Tag } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App'; 
import { 
    Home, ListTodo, Video, MessageSquare, Clock, Power, CheckCircle, XCircle, Megaphone, DollarSign, CalendarPlus, User, Monitor
} from 'lucide-react';

import TaskList from '../components/employee/TaskList';
import MeetingPanel from "../components/meetings/MeetingPanel";
import ChatPanel from "../components/shared/ChatPanel";
import AnnouncementManagerPanel from "../components/shared/AnnouncementManagerPanel";
import EventManagerPanel from "../components/shared/EventManagerPanel";
import MyFinesPanel from '../components/employee/MyFinesPanel';
import ScreenMonitoring from '../components/employee/ScreenMonitoring';
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
    { key: 'screen-monitoring', icon: <Monitor className='w-4 h-4' />, label: 'Screen Monitoring', path: 'screen-monitoring' },
];

export default function EmployeeDashboard() {
    const { user, token, logout } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [checkOutLoading, setCheckOutLoading] = useState(false);
    theme.useToken();

    const pathParts = location.pathname.split('/');
    const currentKey = menuItems.find(item => item.path === pathParts[pathParts.length - 1])?.key || 'home';

    // Get user ID - standardized approach
    const getUserId = () => {
        console.log('User object:', user);
        
        // Try different possible ID fields
        const userId = user?.id || user?._id || user?.userId;
        console.log('Extracted userId:', userId);
        
        return userId;
    };

    // --- Presence (Check-In) Management ---
    const fetchPresenceStatus = async () => {
        const userId = getUserId();
        if (!userId || !token) {
            console.log('Cannot fetch: userId =', userId, 'token =', !!token);
            return;
        }

        try {
            console.log('Fetching presence status for userId:', userId);
            const res = await api.get(`/api/presence/status/${userId}`, authHeader(token));
            console.log('Full API Response:', res.data);
            
            // Check if we have history with active presence
            const activePresence = res.data?.history?.find(p => p.active === true);
            const isActive = res.data?.active || activePresence?.active || false;
            const startTime = res.data?.startTime || activePresence?.startTime;
            
            console.log('Setting isCheckedIn to:', isActive);
            console.log('Setting checkInTime to:', startTime);
            
            setIsCheckedIn(isActive);
            setCheckInTime(startTime ? new Date(startTime) : null);
        } catch (error) {
            console.error("Failed to fetch presence status:", error);
            setIsCheckedIn(false); 
            setCheckInTime(null);
        }
    };
    
    useEffect(() => {
        console.log('Auth hook values:', { user, token: !!token, userId: getUserId() });
        if (user && token) {
            fetchPresenceStatus();
        }
    }, [user, token]);

    const handleCheckIn = async () => {
        console.log('Check In button clicked, current isCheckedIn:', isCheckedIn);
        try {
            setCheckInLoading(true);
            const response = await api.post('/api/presence/checkin', {}, authHeader(token));
            console.log('Check-in successful:', response.data);
            
            // Update state immediately
            setIsCheckedIn(true);
            setCheckInTime(new Date());
            
            // Also refetch to ensure consistency
            await fetchPresenceStatus();
            
            message.success("You are successfully checked in!");
        } catch (error) {
            console.error("Check-in error:", error);
            console.error("Error response:", error.response?.data);
            
            // If "already checked in", update frontend state
            if (error.response?.data?.message === "User already checked in.") {
                console.log('User is already checked in, updating frontend state');
                setIsCheckedIn(true);
                // Try to fetch current check-in time
                await fetchPresenceStatus();
                message.info("You are already checked in.");
            } else {
                message.error(error.response?.data?.message || error.response?.data?.error || "Check-in failed.");
            }
        } finally {
            setCheckInLoading(false);
        }
    };

    const handleCheckOut = async () => {
        console.log('Check Out button clicked, current isCheckedIn:', isCheckedIn);
        try {
            setCheckOutLoading(true);
            const response = await api.post('/api/presence/checkout', {}, authHeader(token)); 
            console.log('Check-out successful:', response.data);
            
            // Update state immediately
            setIsCheckedIn(false);
            setCheckInTime(null);
            
            // Also refetch to ensure consistency
            await fetchPresenceStatus();
            
            message.success("You are successfully checked out.");
        } catch (error) {
            console.error("Check-out error:", error);
            console.error("Error response:", error.response?.data);
            
            // If "not checked in", update frontend state
            if (error.response?.data?.message === "User is not checked in.") {
                console.log('User is not checked in, updating frontend state');
                setIsCheckedIn(false);
                setCheckInTime(null);
                message.info("You are not checked in.");
            } else {
                message.error(error.response?.data?.message || error.response?.data?.error || "Check-out failed.");
            }
        } finally {
            setCheckOutLoading(false);
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
            { key: 'profile', label: `Logged in as: ${user?.name || 'Employee'}`, className:"!text-black !font-semibold !font-[poppins]", disabled: true },
            { type: 'divider' },
            { key: 'logout', label: 'Logout', icon: <Power className='w-4 h-4' />, className:"!text-white !bg-green-500 !font-semibold !font-[poppins]", onClick: handleLogout },
        ]
    };

    // Get userId for passing to components
    const userId = getUserId();

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

                <style>{`
                    .custom-employee-menu .ant-menu-item-selected {
                        background-color: transparent !important;
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
                        <div className="flex items-center gap-3">
                            {/* Debug button - remove after testing */}
                            <Button
                                onClick={fetchPresenceStatus}
                                className="!bg-gray-700 !text-white !rounded-full !px-4 !py-2 !border-0 !font-semibold hover:!bg-gray-600 active:!bg-gray-700"
                            >
                                Refresh Status
                            </Button>
                            
                            {isCheckedIn ? (
                                <Button
                                    onClick={handleCheckOut}
                                    icon={<XCircle className="w-4 h-4" />}
                                    className="!bg-green-500 !text-white !rounded-full !px-4 !py-2 !border-0 !font-semibold hover:!bg-green-600 active:!bg-green-700"
                                    loading={checkOutLoading}
                                    disabled={checkOutLoading}
                                >
                                    Check Out
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCheckIn}
                                    icon={<CheckCircle className="w-4 h-4" />}
                                    className="!bg-green-500 !text-white !rounded-full !px-4 !py-2 !border-0 !font-semibold hover:!bg-green-600 active:!bg-green-700"
                                    loading={checkInLoading}
                                    disabled={checkInLoading}
                                >
                                    Check In
                                </Button>
                            )}

                        </div>

                        <Dropdown menu={userDropdownMenu} trigger={['click']}>
                            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all mr-10">
                                <Avatar className="!bg-green-500 shadow-md" icon={<User size={16} />} />
                                <span className="!text-gray-100 !font-semibold hidden sm:block">{user?.name}</span>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className='p-6' style={{ background: '#1f2937' }}>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <EmployeeHome
                                    user={user}
                                    checkInTime={checkInTime}
                                    isCheckedIn={isCheckedIn}
                                />
                            }
                        />
                        <Route path="tasks" element={<TaskList userId={userId} token={token} compact={false} />} />
                        <Route path="meetings" element={<MeetingPanel userId={userId} userName={user?.name} token={token} />} />
                        <Route path="chat" element={<ChatPanel userId={userId} userName={user?.name} token={token} />} />
                        <Route path="announcements" element={<AnnouncementManagerPanel token={token} isAdmin={false} />} />
                        <Route path="events" element={<EventManagerPanel token={token} isAdmin={false} />} />
                        <Route path="fines" element={<MyFinesPanel token={token} />} />
                        <Route path="screen-monitoring" element={<ScreenMonitoring socketToken={token} user={user} />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

// --- Employee Home Component ---
const EmployeeHome = ({ user, checkInTime, isCheckedIn }) => {
    console.log('EmployeeHome render - User:', user?.name, 'isCheckedIn:', isCheckedIn, 'checkInTime:', checkInTime);
    
    return (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <div className="p-8 !bg-black/25 backdrop-blur-xl rounded-2xl !border-0">
                    <h1 className="text-3xl font-bold text-green-500 mb-4">Welcome back, {user?.name}!</h1>
                    <p className="text-lg text-gray-200">
                        Your portal for tasks, meetings, and real-time collaboration.
                    </p>
                </div>
            </Col>

            <Col span={24}>
                <Card 
                    title={<div className="flex items-center gap-2 text-green-500 font-[poppins] !font-bold"><Clock className='w-5 h-5' /> Session Status</div>}
                    className="!bg-black/25 backdrop-blur-xl rounded-2xl !border-0"
                >
                    <p className="text-lg font-[poppins] !text-green-500">
                        Status: <strong className="!text-gray-200">{isCheckedIn ? 'Active' : 'Offline'}</strong>
                    </p>
                    <p className="text-sm text-gray-400">
                        User ID: {user?.id || user?._id || 'Not available'}
                    </p>

                    {checkInTime && (
                        <p className="text-md !text-green-500">
                            Checked In: {checkInTime.toLocaleTimeString()} ({checkInTime.toLocaleDateString()})
                        </p>
                    )}

                    {!isCheckedIn && (
                        <p className="text-md !text-green-500 !font-semibold font-[poppins] mt-3">
                            Please check in to start your session.
                        </p>
                    )}
                </Card>
            </Col>
        </Row>
    );
};

// --- Not Found Page ---
const NotFound = () => (
    <div className="text-white p-8">Employee Feature Not Found.</div>
);