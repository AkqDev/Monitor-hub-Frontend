import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Modal, Form, Input, DatePicker, Popconfirm, message } from 'antd';
import { Video, Plus, Trash } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import { v4 as uuidv4 } from 'uuid';

export default function MeetingManager({ token }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/meetings', authHeader(token));
      setMeetings(res.data.map(m => ({ ...m, key: m._id })));
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleScheduleMeeting = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        scheduledTime: values.scheduledTime.toISOString(),
        meetingId: uuidv4(),
      };

      const res = await api.post('/api/admin/meetings', payload, authHeader(token));
      message.success('Meeting scheduled successfully.');

      const newMeeting = { ...res.data.meeting, key: res.data.meeting._id };
      setMeetings(prev => [newMeeting, ...prev]);
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error(error.response?.data);
      message.error(error.response?.data?.error || 'Failed to schedule meeting.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      await api.delete(`/api/admin/meetings/${meetingId}`, authHeader(token));
      message.success('Meeting deleted successfully.');
      setMeetings(prev => prev.filter(m => m._id !== meetingId));
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete meeting.');
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Meeting ID', dataIndex: 'meetingId', key: 'meetingId' },
    {
      title: 'Scheduled Time',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      render: date => moment(date).format('YYYY-MM-DD HH:mm')
    },
    { title: 'Host', dataIndex: ['host', 'name'], key: 'host' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Delete this meeting?" onConfirm={() => handleDeleteMeeting(record._id)}>
          <Button className='!bg-green-500 !text-white !font-semibold font-[poppins] !border-0 ' icon={<Trash size={16}/>}>Delete</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="p-6 !bg-black/25 rounded-2xl border-0  shadow-2xl">
      <div className="flex justify-between mb-6">
        <h2 className="!text-green-500 text-xl flex items-center gap-2 !font-semibold font-[poppins]">
          <Video /> Meeting Manager
        </h2>
        <Button className='!bg-green-500 !text-white !font-semibold font-[poppins] !outline-0 !border-0' onClick={() => setIsModalVisible(true)} icon={<Plus size={16}/>}>Schedule New Meeting</Button>
      </div>

      <Table
        columns={columns}
        dataSource={meetings}
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 'max-content' }}
        className="dark-table"
      />

      <Modal
        title="Initialize New Session"
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleScheduleMeeting}>
          <Form.Item name="title" label="Meeting Title" rules={[{ required: true }]}>
            <Input placeholder="Enter title..." />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional details..." />
          </Form.Item>
          <Form.Item name="scheduledTime" label="System Timestamp" rules={[{ required: true }]}>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              disabledDate={current => current && current < moment().startOf('day')}
            />
          </Form.Item>
          <Form.Item>
            <Button className='!bg-green-500 !text-white !font-semibold font-[poppins] !outline-0 !border-0' htmlType="submit" loading={loading} block>
              Confirm Schedule
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
