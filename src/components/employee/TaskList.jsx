import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, List, Select, message, Spin } from 'antd';
import { ListTodo } from 'lucide-react';
import {
    ProjectOutlined,
    ClockCircleOutlined,
    UserOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { HiOutlineViewGrid } from 'react-icons/hi';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';

const { Option } = Select;

export default function TaskList({ token, compact = false }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    /* ================= FETCH TASKS ================= */
    const fetchTasks = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            // ✅ Correct endpoint for employee tasks
            const res = await api.get('/api/tasks/my', authHeader(token));
            setTasks(res.data || []);
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    /* ================= STATUS UPDATE ================= */
    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await api.put(
                `/api/tasks/status/${taskId}`,
                { status: newStatus },
                authHeader(token)
            );

            setTasks(prev =>
                prev.map(task =>
                    task._id === taskId ? { ...task, status: newStatus } : task
                )
            );

            message.success(`Progress updated to ${newStatus.toUpperCase()}`);
        } catch {
            message.error('Status update failed');
        }
    };

    const displayTasks = compact
        ? tasks.filter(t => t.status !== 'completed').slice(0, 5)
        : tasks;

    return (
        <Card
            title={
                <div className="flex items-center gap-2 text-green-500 font-bold tracking-tight font-[Poppins]">
                    <HiOutlineViewGrid className="w-5 h-5" />
                    {compact ? 'Focus Queue' : 'Tasks'}
                </div>
            }
            className="!bg-black/40 backdrop-blur-xl rounded-3xl !border-white/10 shadow-2xl overflow-hidden font-[Poppins]"
            bodyStyle={{ padding: '24px' }}
            extra={
                <Button
                    onClick={fetchTasks}
                    loading={loading}
                    icon={<ReloadOutlined />}
                    className="!bg-green-500 !text-white !border-none rounded-full !font-bold"
                >
                    Refresh
                </Button>
            }
        >
            <Spin spinning={loading}>
                <List
                    dataSource={displayTasks}
                    locale={{ emptyText: 'No tasks available' }}
                    renderItem={task => (
                        <div className="w-full mb-6 last:mb-0">

                            {/* ================= HEADER LABELS ================= */}
                            <div className="flex w-full items-center justify-between px-10 py-2 bg-white/5 rounded-t-2xl border-x border-t border-white/10">

                                <div className="flex-2">
                                    <span className="text-green-500 flex items-center gap-2 font-[Poppins] font-semibold">
                                        <ProjectOutlined />
                                        Task Overview
                                    </span>
                                </div>

                                <div className="flex items-center gap-12 text-center">

                                    <span className="w-50 font-[Poppins] font-semibold text-gray-100 flex items-center justify-center gap-2">
                                        <ProjectOutlined />
                                        Progress Stage
                                    </span>

                                    <span className="w-40 font-[Poppins] font-semibold text-gray-100 flex items-center justify-center gap-2">
                                        <ClockCircleOutlined className='w-4'/>
                                        Deadline
                                    </span>

                                    <span className="w-40 font-[Poppins] font-semibold text-gray-100 flex items-center justify-center gap-2">
                                        <UserOutlined className='w-4'/>
                                        Assigned By
                                    </span>
                                </div>
                            </div>

                            {/* ================= DATA ROW ================= */}
                            <div className="flex w-full items-center justify-between gap-8 bg-black/60 backdrop-blur-3xl px-10 py-5 rounded-b-2xl border border-white/10">

                                {/* TITLE */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="!text-white !font-bold font-[poppins] inline-block mr-3 text-lg ">
                                        {task.title}
                                    </h4>
                                    <span className="!text-gray-200 font-[poppins]">
                                        — {task.description || 'Active MonitorHub task'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-12 whitespace-nowrap">

                                    {/* PROGRESS STAGE */}
                                    <div className="w-40 flex justify-center !text-white">
                                        <Select
                                            value={task.status}
                                            bordered={false}
                                            className="w-full rounded !font-semibold text-sm border border-white/10 !bg-black !text-gray-200"
                                            dropdownClassName="!bg-black !border !border-white/10 shadow-2xl !text-white"
                                            onChange={(val) => handleStatusChange(task._id, val)}
                                        >
                                            <Option value="in-progress">
                                                <span className="!text-gray-200 text-sm !font-semibold font-[poppins]">In Progress</span>
                                            </Option>
                                            <Option value="completed">
                                                <span className="!text-gray-200 text-sm !font-semibold font-[poppins]">Completed</span>
                                            </Option>
                                        </Select>
                                    </div>

                                    {/* DELIVERY WINDOW */}
                                    <div className="w-40 text-center">
                                        <span className="text-sm !font-semibold !text-white font-[poppins]">
                                            {task.dueDate ? moment(task.dueDate).format('MMM D') : '—'}
                                        </span>
                                    </div>

                                    {/* TASK OWNER */}
                                    <div className="w-48 text-center">
                                        <span className="text-sm !font-semibold !text-white font-[poppins]">
                                            {task.assignedBy?.name?.split(' ')[0] || 'Admin'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                />
            </Spin>
        </Card>
    );
}
