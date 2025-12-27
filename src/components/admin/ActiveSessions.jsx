import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Tooltip, message } from 'antd'; 
import { User, Clock, Radio, Activity, CheckCircle, XCircle } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import { socket } from '../../utils/socket';

export default function ActiveSessions({ token }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [socketStatus, setSocketStatus] = useState({});

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const usersRes = await api.get('/api/admin/employees', authHeader(token)); 
            const presenceRes = await api.get('/api/presence/all', authHeader(token));

            const presenceMap = new Map(
                (presenceRes.data || []).map(p => [p.userId, p])
            );

            const updatedEmployees = (usersRes.data || []).map(user => {
                const presenceData = presenceMap.get(user._id);
                return {
                    key: user._id,
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: presenceData && presenceData.active ? 'Active' : 'Offline', 
                    checkInTime: presenceData?.startTime ? new Date(presenceData.startTime) : null,
                    lastActivity: presenceData?.lastActivity ? new Date(presenceData.lastActivity) : null,
                };
            });
            setEmployees(updatedEmployees);
        } catch (error) {
            console.error('Error fetching employees or presence:', error);
            message.error('Failed to load employee list.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const updateEmployeeRealtime = useCallback((userId, updates) => {
        setEmployees(prevEmployees =>
            prevEmployees.map(emp =>
                emp.id === userId ? { ...emp, ...updates } : emp
            )
        );
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect(); 
        }

        const handleOnlineUsersList = (onlineUsers) => {
            setSocketStatus(onlineUsers || {});
        };

        const handleCheckIn = ({ userId, startTime }) => {
            updateEmployeeRealtime(userId, { 
                status: 'Active', 
                checkInTime: new Date(startTime),
                lastActivity: new Date(startTime)
            });
        };

        const handleCheckOut = ({ userId }) => {
            updateEmployeeRealtime(userId, { 
                status: 'Offline', 
                checkInTime: null,
                lastActivity: null 
            });
        };

        const handleActivityUpdate = ({ userId, lastActivity }) => {
            updateEmployeeRealtime(userId, { 
                lastActivity: new Date(lastActivity) 
            });
        };
        
        const handleUserConnected = ({ userId }) => {
            setSocketStatus(prev => ({ ...prev, [userId]: true }));
        };

        const handleUserDisconnected = ({ userId }) => {
            setSocketStatus(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
        };
        
        socket.emit('requestOnlineUsers'); 
        
        socket.on('onlineUsersList', handleOnlineUsersList); 
        socket.on('userConnected', handleUserConnected);
        socket.on('userDisconnected', handleUserDisconnected);
        socket.on('checkInEvent', handleCheckIn);
        socket.on('checkOutEvent', handleCheckOut);
        socket.on('activityUpdateEvent', handleActivityUpdate);

        return () => {
            socket.off('onlineUsersList', handleOnlineUsersList);
            socket.off('userConnected', handleUserConnected);
            socket.off('userDisconnected', handleUserDisconnected);
            socket.off('checkInEvent', handleCheckIn);
            socket.off('checkOutEvent', handleCheckOut);
            socket.off('activityUpdateEvent', handleActivityUpdate);
        };
    }, [updateEmployeeRealtime]);

    const renderActivity = (activityTime) => {
        if (!activityTime) {
            return <span className='text-gray-500'>N/A</span>;
        }
        
        const diffInMinutes = moment().diff(moment(activityTime), 'minutes');
        let color, statusText;
        if (diffInMinutes < 5) {
            color = 'green'; statusText = 'Highly Active';
        } else if (diffInMinutes < 15) {
            color = 'yellow'; statusText = 'Moderately Active';
        } else if (diffInMinutes < 30) {
            color = 'orange'; statusText = 'Idle';
        } else {
            color = 'red'; statusText = 'Inactive';
        }

        return (
            <Tooltip title={`Last seen: ${moment(activityTime).format('LT')} (${statusText})`}>
                <Tag color={color} icon={<Activity className='w-4 h-4' />}>
                    {statusText}
                </Tag>
            </Tooltip>
        );
    };

    const columns = [
        {
            title: 'Employee Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'admin' ? 'blue' : 'purple'}>
                    {role.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Online Status',
            key: 'socketStatus',
            render: (_, record) => {
                const isOnline = !!socketStatus[record.id];
                return (
                    <Tag 
                        color={isOnline ? 'green' : 'red'} 
                        icon={<Radio className='w-4 h-4' />}
                    >
                        {isOnline ? 'Online' : 'Offline'}
                    </Tag>
                );
            },
            sorter: (a, b) => (!!socketStatus[b.id] - !!socketStatus[a.id]) 
        },
        {
            title: 'Session Status (Check-In)',
            dataIndex: 'status',
            key: 'sessionStatus',
            render: (status) => (
                <Tag 
                    color={status === 'Active' ? 'blue' : 'gray'} 
                    icon={status === 'Active' ? <CheckCircle className='w-4 h-4' /> : <XCircle className='w-4 h-4' />}
                >
                    {status === 'Active' ? 'Checked In' : 'Not Checked In'}
                </Tag>
            ),
            sorter: (a, b) => a.status.localeCompare(b.status)
        },
        {
            title: 'Check-In Time',
            dataIndex: 'checkInTime',
            key: 'checkInTime',
            render: (time) => time ? (
                <div className="flex items-center gap-1 text-purple-200">
                    <Clock className='w-4 h-4 text-purple-400' />
                    {moment(time).format('h:mm:ss A')} 
                </div>
            ) : <span className='text-gray-500'>N/A</span>,
            sorter: (a, b) => (a.checkInTime ? a.checkInTime.getTime() : 0) - (b.checkInTime ? b.checkInTime.getTime() : 0),
        },
        {
            title: 'Last Activity',
            dataIndex: 'lastActivity',
            key: 'lastActivity',
            render: renderActivity,
            sorter: (a, b) => (a.lastActivity ? a.lastActivity.getTime() : 0) - (b.lastActivity ? b.lastActivity.getTime() : 0),
        },
    ];

        return (
        <Card
            title={
                <div className="flex items-center gap-2 text-green-500 font-[poppins]">
                    <User size={16} />
                    All Employee Status
                </div>
            }
            className="!bg-black/25 backdrop-blur-xl !rounded-2xl !border-0 custom-ant-card"
        >
            <Table
                columns={columns}
                dataSource={employees}
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
                className="dark-table"
                rowKey="id"   // ✅ ensures stable row rendering
            />
        </Card>
    );
}
