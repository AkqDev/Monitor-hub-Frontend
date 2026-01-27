import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Popconfirm, 
  message, 
  Switch, 
  Tag, 
  Badge,
  Space,
  Tooltip,
  InputNumber,
  Row,
  Col
} from 'antd';
import { 
  MdVideoCall, 
  MdAdd, 
  MdDelete, 
  MdEdit, 
  MdSettings, 
  MdPeople, 
  MdSchedule, 
  MdLock, 
  MdLockOpen,
  MdContentCopy,
  MdShare,
  MdCalendarToday,
  MdVisibility,
  MdLogin
} from 'react-icons/md';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import { v4 as uuidv4 } from 'uuid';

const { TextArea } = Input;

export default function MeetingManager({ token }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const navigate = useNavigate();
  const userRole = 'admin'; // Since this is admin component

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
        meetingId: uuidv4().substring(0, 8),
        settings: {
          allowScreenShare: values.allowScreenShare ?? true,
          allowChat: values.allowChat ?? true,
          allowRaiseHand: values.allowRaiseHand ?? true,
          muteOnEntry: values.muteOnEntry ?? false,
          recordMeeting: values.recordMeeting ?? false,
          requirePassword: values.requirePassword ?? false,
          maxParticipants: values.maxParticipants ?? 100,
          waitingRoom: values.waitingRoom ?? false
        },
        meetingPassword: values.meetingPassword || null
      };

      const res = await api.post('/api/admin/meetings', payload, authHeader(token));
      message.success('Meeting scheduled successfully!');

      const newMeeting = { ...res.data.meeting, key: res.data.meeting._id };
      setMeetings(prev => [newMeeting, ...prev]);
      setIsModalVisible(false);
      form.resetFields();
      
      const meetingLink = `${window.location.origin}/${userRole}/meetings/join/${payload.meetingId}`;
      navigator.clipboard.writeText(meetingLink);
      message.info('Meeting link copied to clipboard!');
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

  const handleUpdateSettings = async (values) => {
    try {
      const res = await api.put(
        `/api/meetings/${selectedMeeting.meetingId}/settings`, 
        { settings: values }, 
        authHeader(token)
      );
      message.success('Meeting settings updated!');
      setIsSettingsModalVisible(false);
      fetchMeetings();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update settings.');
    }
  };

  const copyMeetingLink = (meetingId) => {
    const meetingLink = `${window.location.origin}/${userRole}/meetings/join/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    message.success('Meeting link copied to clipboard!');
  };

  const shareMeeting = (meeting) => {
    if (navigator.share) {
      navigator.share({
        title: meeting.title,
        text: `Join ${meeting.title}`,
        url: `${window.location.origin}/${userRole}/meetings/join/${meeting.meetingId}`,
      });
    } else {
      copyMeetingLink(meeting.meetingId);
    }
  };

  const getMeetingStatus = (meeting) => {
    if (meeting.isEnded) return { status: 'ended', color: 'red', text: 'Ended' };
    if (moment(meeting.scheduledTime).isBefore(moment())) {
      return { status: 'live', color: 'green', text: 'Live' };
    }
    return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
  };

  const columns = [
    { 
      title: 'Title', 
      dataIndex: 'title', 
      key: 'title',
      render: (text, record) => (
        <div>
          <div className="font-semibold text-white">{text}</div>
          <div className="text-gray-400 text-xs">{record.description?.substring(0, 50)}...</div>
        </div>
      )
    },
    { 
      title: 'Meeting ID', 
      dataIndex: 'meetingId', 
      key: 'meetingId',
      render: (text) => <code className="bg-gray-800 px-2 py-1 rounded">{text}</code>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = getMeetingStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    },
    {
      title: 'Scheduled Time',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      render: (date) => (
        <div>
          <div className="text-white">{moment(date).format('MMM D, YYYY')}</div>
          <div className="text-gray-400 text-xs">{moment(date).format('h:mm A')}</div>
        </div>
      )
    },
    { 
      title: 'Host', 
      dataIndex: ['host', 'name'], 
      key: 'host',
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs">
            {text?.charAt(0)}
          </div>
          <span className="text-white">{text}</span>
        </div>
      )
    },
    {
      title: 'Participants',
      key: 'participants',
      render: (_, record) => (
        <Badge 
          count={record.participants?.length || 0} 
          showZero 
          style={{ backgroundColor: '#10b981' }}
        />
      )
    },
    {
      title: 'Join',
      key: 'join',
      render: (_, record) => {
        const canJoin = moment(record.scheduledTime).isSameOrBefore(moment());
        return (
          <Tooltip title={canJoin ? "Join Meeting" : "Meeting not started"}>
            <Button 
              type="primary"
              size="small"
              icon={<LogIn size={14} />}
              onClick={() => {
                navigate(`/${userRole}/meetings/join/${record.meetingId}`);
              }}
              disabled={!canJoin}
              className={`!border-0 ${canJoin ? '!bg-green-600 hover:!bg-green-700' : '!bg-gray-700'}`}
            >
              Join
            </Button>
          </Tooltip>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Copy Meeting Link">
            <Button 
              size="small"
              icon={<Copy size={14} />} 
              onClick={() => copyMeetingLink(record.meetingId)}
              className="!bg-gray-700 !text-white !border-0"
            />
          </Tooltip>
          <Tooltip title="Share Meeting">
            <Button 
              size="small"
              icon={<Share2 size={14} />} 
              onClick={() => shareMeeting(record)}
              className="!bg-blue-600 !text-white !border-0"
            />
          </Tooltip>
          <Tooltip title="Edit Settings">
            <Button 
              size="small"
              icon={<Settings size={14} />} 
              onClick={() => {
                setSelectedMeeting(record);
                setIsSettingsModalVisible(true);
              }}
              className="!bg-yellow-600 !text-white !border-0"
            />
          </Tooltip>
          <Popconfirm 
            title="Delete this meeting?" 
            onConfirm={() => handleDeleteMeeting(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button 
              size="small"
              icon={<Trash size={14} />} 
              danger
              className="!border-0"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 !bg-black/25 rounded-2xl border-0 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="!text-green-500 text-2xl flex items-center gap-3 !font-bold font-[poppins]">
            <Video size={28} /> Meeting Manager
          </h2>
          <p className="text-gray-400 text-sm mt-1">Schedule and manage video meetings</p>
        </div>
        <Button 
          className='!bg-green-500 hover:!bg-green-600 !text-white !font-semibold font-[poppins] !outline-0 !border-0 flex items-center gap-2' 
          onClick={() => setIsModalVisible(true)} 
          icon={<Plus size={18} />}
          size="large"
        >
          Schedule New Meeting
        </Button>
      </div>

      <Card className="!bg-gray-900 !border-gray-800 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-900/30 rounded-lg">
                <Calendar className="text-green-400" size={20} />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Total Meetings</div>
                <div className="text-white text-2xl font-bold">{meetings.length}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-900/30 rounded-lg">
                <Clock className="text-blue-400" size={20} />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Upcoming</div>
                <div className="text-white text-2xl font-bold">
                  {meetings.filter(m => moment(m.scheduledTime).isAfter(moment())).length}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900/30 rounded-lg">
                <Video className="text-red-400" size={20} />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Live Now</div>
                <div className="text-white text-2xl font-bold">
                  {meetings.filter(m => 
                    !m.isEnded && moment(m.scheduledTime).isBefore(moment())
                  ).length}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg">
                <Users className="text-purple-400" size={20} />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Participants</div>
                <div className="text-white text-2xl font-bold">
                  {meetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={meetings}
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 'max-content' }}
        className="dark-table"
        rowClassName="hover:!bg-gray-800/50"
      />

      <Modal
        title={
          <div className="flex items-center gap-2 text-green-500">
            <Video size={20} />
            <span>Schedule New Meeting</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
        width={700}
        className="meeting-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleScheduleMeeting}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="title" 
                label="Meeting Title" 
                rules={[{ required: true, message: 'Please enter meeting title' }]}
              >
                <Input 
                  placeholder="Enter meeting title..." 
                  size="large"
                  prefix={<Video className="text-gray-400" size={16} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduledTime" label="Scheduled Time" rules={[{ required: true }]}>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  disabledDate={current => current && current < moment().startOf('day')}
                  size="large"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="Description">
            <TextArea 
              rows={3} 
              placeholder="Meeting agenda, topics to discuss, etc..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Card title="Meeting Settings" className="!bg-gray-900 !border-gray-800 mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="allowScreenShare" label="Allow Screen Sharing" valuePropName="checked">
                  <Switch defaultChecked />
                </Form.Item>
                <Form.Item name="allowChat" label="Allow Chat" valuePropName="checked">
                  <Switch defaultChecked />
                </Form.Item>
                <Form.Item name="allowRaiseHand" label="Allow Raise Hand" valuePropName="checked">
                  <Switch defaultChecked />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="muteOnEntry" label="Mute on Entry" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="recordMeeting" label="Record Meeting" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="requirePassword" label="Require Password" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item 
              noStyle 
              shouldUpdate={(prev, current) => prev.requirePassword !== current.requirePassword}
            >
              {({ getFieldValue }) =>
                getFieldValue('requirePassword') ? (
                  <Form.Item name="meetingPassword" label="Meeting Password" rules={[{ required: true }]}>
                    <Input.Password placeholder="Enter meeting password" size="large" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            <Form.Item name="maxParticipants" label="Max Participants">
              <InputNumber 
                min={1} 
                max={500} 
                defaultValue={100}
                className="w-full"
              />
            </Form.Item>
          </Card>

          <Form.Item>
            <Button 
              className='!bg-green-500 hover:!bg-green-600 !text-white !font-semibold font-[poppins] !outline-0 !border-0' 
              htmlType="submit" 
              loading={loading} 
              block 
              size="large"
            >
              Schedule Meeting
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2 text-yellow-500">
            <Settings size={20} />
            <span>Meeting Settings</span>
          </div>
        }
        open={isSettingsModalVisible}
        onCancel={() => setIsSettingsModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedMeeting && (
          <Form 
            form={settingsForm} 
            layout="vertical" 
            initialValues={selectedMeeting.settings}
            onFinish={handleUpdateSettings}
          >
            <Form.Item name="allowScreenShare" label="Allow Screen Sharing" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="allowChat" label="Allow Chat" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="allowRaiseHand" label="Allow Raise Hand" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="muteOnEntry" label="Mute Participants on Entry" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="recordMeeting" label="Record Meeting Automatically" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="requirePassword" label="Require Password to Join" valuePropName="checked">
              <Switch />
            </Form.Item>
            
            <Form.Item 
              noStyle 
              shouldUpdate={(prev, current) => prev.requirePassword !== current.requirePassword}
            >
              {({ getFieldValue }) =>
                getFieldValue('requirePassword') ? (
                  <Form.Item name="meetingPassword" label="Meeting Password">
                    <Input.Password placeholder="Enter new password" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block
                className="!bg-yellow-600 hover:!bg-yellow-700 !border-0"
              >
                Update Settings
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}