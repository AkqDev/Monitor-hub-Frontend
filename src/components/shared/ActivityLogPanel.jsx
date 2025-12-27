import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Tag, Spin, Tooltip, message } from 'antd';
import { History, User, Shield, Briefcase } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';

const actionColors = {
    'TASK_CREATED': 'blue',
    'TASK_UPDATED': 'cyan',
    'TASK_STATUS_CHANGE': 'geekblue',
    'MEETING_SCHEDULED': 'volcano',
    'FINE_ASSIGNED': 'red',
    'FINE_PAID': 'green',
    'EVENT_CREATED': 'purple',
    'USER_LOGIN': 'lime',
    'USER_LOGOUT': 'red', // Added logout color
};

export default function ActivityLogPanel({ token, isAdmin = false }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = isAdmin ? '/api/activitylogs' : '/api/activitylogs/my';
            const res = await api.get(endpoint, authHeader(token));
            setLogs(res.data);
        } catch (error) {
            // Check for specific error message or fall back
            message.error(error.response?.data?.error || 'Failed to fetch activity logs.');
        } finally {
            setLoading(false);
        }
    }, [token, isAdmin]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getIconByRole = (role) => {
        if (role === 'admin') return <Shield className='w-4 h-4 text-red-400' />;
        return <Briefcase className='w-4 h-4 text-blue-400' />;
    };

    return (
        <Card
            title={<div className="flex items-center gap-2 text-gray-400 font-semibold"><History className='w-5 h-5 text-gray-400' /> {isAdmin ? 'System Activity Feed' : 'My Recent Activity'}</div>}
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 activity-card"
            // FIX: Added Ant Design specific styles to ensure dark theme compatibility
            headStyle={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
            bodyStyle={{ padding: 0 }}
        >
            <Spin spinning={loading}>
                <List
                    itemLayout="horizontal"
                    dataSource={logs}
                    locale={{ emptyText: <span className='text-red-800 font-semibold'>No activity recorded yet.</span> }}
                    renderItem={log => {
                        // FIX: Ensure log.userId is an object (populated by MongoDB) before accessing properties
                        const userDetails = log.userId && typeof log.userId === 'object' ? log.userId : null;

                        return (
                            <List.Item
                                className='!border-b !border-white/10 p-3 hover:bg-white/5 transition-colors'
                            >
                                <List.Item.Meta
                                    title={
                                        <div className="flex items-center gap-2 text-white">
                                            <Tag color={actionColors[log.action] || 'default'}>{log.action.replace(/_/g, ' ')}</Tag>
                                            <span className="text-sm text-gray-400">{moment(log.createdAt).fromNow()}</span>
                                        </div>
                                    }
                                    description={
                                        <div className='text-sm text-white space-y-1'>
                                            <p className="text-purple-300">{log.description}</p>
                                            {isAdmin && userDetails && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {getIconByRole(userDetails.role)}
                                                    <span>{userDetails.name} ({userDetails.role})</span>
                                                </div>
                                            )}
                                            {!isAdmin && userDetails && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                     <User className='w-3 h-3 text-gray-500' />
                                                    <span>User ID: {log.userId._id || log.userId}</span>
                                                </div>
                                            )}
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Spin>
        </Card>
    );
}
