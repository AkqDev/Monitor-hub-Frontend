// File: MyFinesPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Button, Tag, message, Spin, Popconfirm } from 'antd';
import { DollarSign, CheckCircle } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';

export default function MyFinesPanel({ token }) {
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMyFines = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/fines/my', authHeader(token)); 
            setFines(res.data);
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to fetch your fines.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchMyFines();
    }, [fetchMyFines]);

    const handleMarkAsPaid = async (fineId) => {
        try {
            await api.put(`/api/fines/${fineId}/paid`, {}, authHeader(token));
            message.success('Fine successfully marked as paid!');
            setFines(prev => prev.filter(f => f._id !== fineId)); // remove paid fines
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to update fine status.');
        }
    };

    return (
        <Card
            title={<div className="flex items-center gap-2 text-green-400 font-semibold"><DollarSign className='w-5 h-5 text-green-400' /> My Fines</div>}
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 h-full"
        >
            <Spin spinning={loading}>
                <List
                    itemLayout="horizontal"
                    dataSource={fines}
                    locale={{ emptyText: <span className='text-red-800 font-semibold'>No outstanding fines! Keep up the good work.</span> }}
                    renderItem={fine => (
                        <List.Item
                            actions={[
                                !fine.isPaid ? (
                                    <Popconfirm
                                        title="Confirm payment of this fine?"
                                        onConfirm={() => handleMarkAsPaid(fine._id)}
                                        okText="Yes"
                                        cancelText="No"
                                        key="markPaid"
                                    >
                                        <Button type="primary" size="small" icon={<CheckCircle className='w-4 h-4' />}>
                                            Mark Paid
                                        </Button>
                                    </Popconfirm>
                                ) : (
                                    <Tag color="green" key="paid">Paid</Tag>
                                )
                            ]}
                            className='!border-b !border-white/10 hover:bg-white/5 transition-all p-3 rounded-lg'
                        >
                            <List.Item.Meta
                                title={<span className={`font-medium ${fine.isPaid ? 'text-gray-400' : 'text-yellow-400'}`}>₹{fine.amount} - {fine.reason}</span>}
                                description={
                                    <div className='text-purple-300 text-sm space-y-1'>
                                        <p>Assigned by: {fine.assignedBy.name}</p>
                                        <p className='text-xs text-gray-400'>Date: {moment(fine.createdAt).format('MMM D, YYYY')}</p>
                                        {fine.isPaid && <p className='text-xs text-green-300'>Paid on: {moment(fine.paidDate).format('MMM D, YYYY')}</p>}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Spin>
        </Card>
    );
}
