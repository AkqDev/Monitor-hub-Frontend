import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Table, Modal, Form, Input, Popconfirm, Tag, message } from 'antd';
import { Megaphone, Plus, Edit, Trash } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';

const { TextArea } = Input;

const typeColor = (type = 'general') => {
  switch (type.toLowerCase()) {
    case 'urgent':
      return 'green';
    case 'event':
      return 'green';
    default:
      return 'green';
  }
};

export default function AnnouncementManagerPanel({ token, isAdmin }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/announcements', authHeader(token));
      setData(res.data);
    } catch {
      message.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submit = async (values) => {
    try {
      setLoading(true);
      if (editing) {
        const res = await api.put(`/api/announcements/${editing._id}`, values, authHeader(token));
        setData(prev => prev.map(i => (i._id === editing._id ? res.data : i)));
        message.success('Announcement updated');
      } else {
        const res = await api.post('/api/announcements', values, authHeader(token));
        setData(prev => [res.data, ...prev]);
        message.success('Announcement created');
      }
      setOpen(false);
      setEditing(null);
      form.resetFields();
    } catch {
      message.error('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/api/announcements/${id}`, authHeader(token));
      setData(prev => prev.filter(i => i._id !== id));
      message.success('Deleted');
    } catch {
      message.error('Delete failed');
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: text => <span className="text-white font-medium font-[poppins]">{text}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: t => <Tag className="!font-[poppins] !font-semibold" color={typeColor(t)}>{t?.toUpperCase()}</Tag>,
    },
    {
      title: 'Content',
      dataIndex: 'content',
      ellipsis: true,
      render: t => <span className="!font-[poppins] !font-semibold">{t}</span>,
    },
    {
      title: 'Posted By',
      render: (_, r) => <span className="!font-[poppins] !font-semibold">{r.postedBy?.name || 'Admin'}</span>,
    },
    {
      title: 'Date',
      render: (_, r) => (
        <span className="!font-[poppins] !font-semibold">{moment(r.createdAt).format('YYYY-MM-DD HH:mm')}</span>
      ),
    },
    isAdmin && {
      title: 'Actions',
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }} className='!bg-white !focus-0 !border-0 !text-green-500 !font-[poppins] !font-semibold' icon={<Edit size={14} />} />
          <Popconfirm title="Delete announcement?" onConfirm={() => remove(r._id)}>
            <Button size="small" className='!bg-green-500 !focus-0 !border-0 !text-white !font-[poppins] !font-semibold' icon={<Trash size={14} />} />
          </Popconfirm>
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <Card
      className="!bg-black/25 !border-0 rounded-2xl"
      title={
        <div className="flex items-center gap-2 !text-green-500 !font-bold !font-[poppins]">
          <Megaphone size={18} /> Announcement Manager
        </div>
      }
      extra={
        isAdmin && (
          <Button
            className="!bg-green-500 !text-white !font-semibold !focus-0 !border-0"
            icon={<Plus size={16} />}
            onClick={() => setOpen(true)}
          >
            New Announcement
          </Button>
        )
      }
    >
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 6 }}
        className="dark-table"
      />

      <Modal
        open={open}
        footer={null}
        onCancel={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          requiredMark={false}   // removes * signs
        >
          <Form.Item
            name="title"
            label={<span className="font-semibold text-black">Title</span>}
            rules={[{ required: true }]}
          >
            <Input className="text-black font-semibold" />
          </Form.Item>

          <Form.Item
            name="type"
            label={<span className="font-semibold text-black">Type</span>}
            initialValue="general"
          >
            <Input
              placeholder="general / urgent / event"
              className="text-black font-semibold"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label={<span className="font-semibold text-black">Content</span>}
            rules={[{ required: true }]}
          >
            <TextArea rows={2} className="text-black font-semibold" />
          </Form.Item>

          <Button
            htmlType="submit"
            block
            loading={loading}
            className="!bg-green-500 hover:bg-green-600 !text-white font-semibold border-none outline-focus-0"
          >
            {editing ? 'Update' : 'Create'}
          </Button>
        </Form>
      </Modal>
    </Card>
  );
}
