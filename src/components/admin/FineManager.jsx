import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Tag,
  Popconfirm,
  message
} from 'antd';
import { DollarSign, Plus, CheckCircle, Trash2, Edit2 } from 'lucide-react';
import { api, authHeader } from '../../utils/api';

const { Option } = Select;
const { TextArea } = Input;

export default function FineManager({ token }) {
  const [fines, setFines] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editFine, setEditFine] = useState(null);
  const [form] = Form.useForm();

  // Load users and fines
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const usersRes = await api.get('/api/admin/employees', authHeader(token));
      const finesRes = await api.get('/api/fines', authHeader(token));

      setUsers(usersRes.data);
      setFines(finesRes.data.map(f => ({ ...f, key: f._id })));
    } catch (err) {
      console.error(err);
      message.error('Failed to load fines');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Assign or edit fine
  const assignFine = async (values) => {
    try {
      let res;
      if (editFine) {
        res = await api.put(`/api/fines/${editFine._id}`, values, authHeader(token));
        setFines(prev => prev.map(f =>
          f._id === editFine._id
            ? { ...f, ...res.data.fine, key: res.data.fine._id }
            : f
        ));
        message.success('Fine updated successfully');
      } else {
        res = await api.post('/api/fines', values, authHeader(token));
        setFines(prev => [{ ...res.data.fine, key: res.data.fine._id }, ...prev]);
        message.success('Fine assigned successfully');
      }
      setOpen(false);
      setEditFine(null);
      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error('Failed to assign/update fine');
    }
  };

  // Mark fine as paid
  const markPaid = async (id) => {
    try {
      await api.put(`/api/fines/${id}/paid`, {}, authHeader(token));
      setFines(prev => prev.filter(f => f._id !== id)); // Remove paid fines
      message.success('Fine marked as paid');
    } catch (err) {
      console.error(err);
      message.error('Failed to mark fine as paid');
    }
  };

  // Delete fine
  const deleteFine = async (id) => {
    try {
      await api.delete(`/api/fines/${id}`, authHeader(token));
      setFines(prev => prev.filter(f => f._id !== id));
      message.success('Fine deleted successfully');
    } catch (err) {
      console.error(err);
      message.error('Failed to delete fine');
    }
  };

  // Open edit modal
  const openEditModal = (fine) => {
    setEditFine(fine);
    const userId = fine.userId?._id ? fine.userId._id : fine.userId;
    form.setFieldsValue({
      userId,
      reason: fine.reason,
      amount: fine.amount,
    });
    setOpen(true);
  };

  const columns = [
    { title: 'Employee', dataIndex: ['userId', 'name'], className: 'font-poppins' },
    { title: 'Reason', dataIndex: 'reason', className: 'font-poppins' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      className: 'font-poppins',
      render: amt => <span className="text-green-500 font-semibold font-[poppins]">Pkr{amt}</span>
    },
    {
      title: 'Status',
      dataIndex: 'isPaid',
      render: paid => paid ? <Tag className="!bg-gray-300 !text-green-800 !font-semibold font-[poppins]!text-lg">Paid</Tag> : <Tag className='!bg-gray-300 !text-green-800 !font-semibold font-[poppins]!text-lg'>Unpaid</Tag>
    },
    {
      title: 'Action',
      render: (_, record) => (
        <div className="flex gap-2">
          {!record.isPaid && (
            <Popconfirm title="Mark this fine as paid?" onConfirm={() => markPaid(record._id)}>
              <Button size="small" type="primary" className="rounded-full font-poppins" icon={<CheckCircle className="w-4 h-4" />}>
                Mark Paid
              </Button>
            </Popconfirm>
          )}
          <Button
            size="small"
            type="default"
            className="rounded-full font-poppins"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm title="Are you sure you want to delete this fine?" onConfirm={() => deleteFine(record._id)}>
            <Button size="small" type="default" danger className="rounded-full font-poppins" icon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <>
      <Card
        className="!bg-black/25 !border-0 font-poppins"
        title={
          <div className="flex items-center gap-2 text-green-400 font-bold text-lg">
            <DollarSign size={18} />
            Fine Manager
          </div>
        }
        extra={
          <Button
            icon={<Plus size={16} />}
            onClick={() => { setOpen(true); setEditFine(null); form.resetFields(); }}
            className="rounded-full font-poppins"
          >
            Assign Fine
          </Button>
        }
      >
        <Table columns={columns} dataSource={fines} loading={loading} className="dark-table" />
      </Card>

      <Modal
        open={open}
        footer={null}
        onCancel={() => setOpen(false)}
        title={editFine ? "Edit Fine" : "Assign Fine"}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={assignFine}>
          <Form.Item name="userId" label="Employee" rules={[{ required: true, message: 'Select an employee' }]}>
            <Select placeholder="Select employee">
              {users.map(u => (
                <Option key={u._id} value={u._id}>{u.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Enter fine amount' }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Enter reason for fine' }]}>
            <TextArea rows={3} placeholder="Reason for fine" />
          </Form.Item>

          <Button htmlType="submit" type="primary" block className="rounded-full font-poppins">
            {editFine ? "Update Fine" : "Assign Fine"}
          </Button>
        </Form>
      </Modal>
    </>
  );
}
