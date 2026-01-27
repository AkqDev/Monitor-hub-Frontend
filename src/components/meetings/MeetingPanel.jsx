import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Button, 
  message, 
  Modal, 
  Input, 
  Form, 
  Tag, 
  Badge,
  Dropdown,
  Space,
  Tooltip,
  Avatar,
  List,
  Tabs,
  notification
} from 'antd';
import { 
  MdVideoCall, 
  MdSchedule, 
  MdPeople, 
  MdSecurity, 
  MdCalendarToday, 
  MdFilterList, 
  MdSearch,
  MdLock,
  MdLockOpen,
  MdMic,
  MdMicOff,
  MdVisibility,
  MdVisibilityOff,
  MdShare,
  MdContentCopy,
  MdNotifications,
  MdStar
} from 'react-icons/md';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import VideoMeeting from './VideoMeeting';
import { socket } from '../../utils/socket';

const { Search: AntSearch } = Input;
const { TabPane } = Tabs;

export default function MeetingPanel({ userId, userName, token, userAvatar }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [meetingDetailsModal, setMeetingDetailsModal] = useState(false);
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const userRole = 'employee'; // Since this is employee component

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/meetings', authHeader(token));
      setMeetings(res.data.map(m => ({ ...m, key: m._id })));
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to fetch meetings.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMeetings();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Listen for meeting notifications
    socket.on("newMeetingScheduled", (data) => {
      showNotification(
        "New Meeting Scheduled",
        data.message,
        "info",
        () => {
          const meeting = meetings.find(m => m.meetingId === data.meeting.meetingId);
          if (meeting) {
            handleJoinMeeting(meeting);
          }
        }
      );
      fetchMeetings();
    });

    socket.on("meetingStartingSoon", (data) => {
      showNotification(
        "Meeting Starting Soon",
        data.message,
        "warning",
        () => {
          const meeting = meetings.find(m => m.meetingId === data.meetingId);
          if (meeting) {
            handleJoinMeeting(meeting);
          }
        }
      );
      
      // Browser notification
      if (Notification.permission === "granted") {
        new Notification("Meeting Starting Soon", {
          body: data.message,
          icon: "/favicon.ico"
        });
      }
    });

    socket.on("meetingCancelled", (data) => {
      showNotification(
        "Meeting Cancelled",
        data.message,
        "error"
      );
      fetchMeetings();
      
      if (currentMeetingId === data.meetingId) {
        setCurrentMeetingId(null);
        message.warning("The meeting you were in has been cancelled");
      }
    });

    socket.on("meetingEnded", (data) => {
      showNotification(
        "Meeting Ended",
        `"${data.title}" has ended. Duration: ${data.duration} minutes`,
        "info"
      );
      
      if (currentMeetingId === data.meetingId) {
        setCurrentMeetingId(null);
        message.info("Meeting has ended");
      }
      fetchMeetings();
    });

    return () => {
      socket.off("newMeetingScheduled");
      socket.off("meetingStartingSoon");
      socket.off("meetingCancelled");
      socket.off("meetingEnded");
    };
  }, [fetchMeetings, currentMeetingId, meetings]);

  const showNotification = (title, description, type, onClick) => {
    notification[type]({
      message: title,
      description: description,
      duration: 5,
      onClick: onClick
    });
  };

  const canJoinMeeting = (scheduledTime) => moment().isSameOrAfter(moment(scheduledTime));

  const handleJoinMeeting = async (meeting) => {
    if (!canJoinMeeting(meeting.scheduledTime)) {
      message.warning('Meeting has not started yet.');
      return;
    }

    setSelectedMeeting(meeting);

    if (meeting.settings.requirePassword) {
      setPasswordModalVisible(true);
      return;
    }

    // Navigate to join page
    navigate(`/${userRole}/meetings/join/${meeting.meetingId}`);
  };

  const proceedToJoinMeeting = async () => {
    if (!selectedMeeting) return;

    if (selectedMeeting.settings.requirePassword) {
      try {
        const res = await api.post(
          `/api/meetings/${selectedMeeting.meetingId}/verify-password`,
          { password },
          authHeader(token)
        );

        if (!res.data.accessGranted) {
          message.error('Incorrect password!');
          setPassword('');
          return;
        }
      } catch (error) {
        message.error('Failed to verify password.');
        return;
      }
    }

    setPasswordModalVisible(false);
    // Navigate to join page
    navigate(`/${userRole}/meetings/join/${selectedMeeting.meetingId}`);
  };

  const handleLeaveMeeting = () => {
    setCurrentMeetingId(null);
    fetchMeetings();
    message.info('Left the meeting');
  };

  const showMeetingDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setMeetingDetailsModal(true);
  };

  const copyMeetingLink = (meetingId) => {
    const meetingLink = `${window.location.origin}/${userRole}/meetings/join/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    message.success('Meeting link copied!');
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesFilter = filter === 'all' || 
      (filter === 'upcoming' && moment(meeting.scheduledTime).isAfter(moment())) ||
      (filter === 'live' && !meeting.isEnded && moment(meeting.scheduledTime).isBefore(moment())) ||
      (filter === 'ended' && meeting.isEnded);
    
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (currentMeetingId) {
    return (
      <div className='h-[85vh]'>
        <VideoMeeting
          meetingId={currentMeetingId}
          userId={userId}
          userName={userName}
          userAvatar={userAvatar}
          onLeave={handleLeaveMeeting}
          isAdmin={selectedMeeting?.host?._id === userId}
          token={token}
        />
      </div>
    );
  }

  const getMeetingStatus = (meeting) => {
    if (meeting.isEnded) return { status: 'ended', color: 'red', text: 'Ended' };
    if (moment(meeting.scheduledTime).isBefore(moment())) {
      return { status: 'live', color: 'green', text: 'Live Now' };
    }
    return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
  };

  const columns = [
    { 
      title: 'Meeting', 
      dataIndex: 'title', 
      render: (text, record) => (
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <Video className="text-white" size={20} />
            </div>
            {record.settings.requirePassword && (
              <Lock className="absolute -top-1 -right-1 text-yellow-400" size={12} />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{text}</span>
              <Tag color={getMeetingStatus(record).color} className="!border-0">
                {getMeetingStatus(record).text}
              </Tag>
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {record.description || 'No description'}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {moment(record.scheduledTime).format('MMM D, h:mm A')}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} /> {record.participants?.length || 0} participants
              </span>
              {record.host?._id === userId && (
                <span className="flex items-center gap-1 text-green-400">
                  <Shield size={12} /> Host
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Host',
      dataIndex: ['host', 'name'],
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <Avatar src={record.host?.avatar} size="small">
            {text?.charAt(0)}
          </Avatar>
          <span className="text-white">{text}</span>
        </div>
      )
    },
    {
      title: 'Actions',
      render: (_, record) => {
        const status = getMeetingStatus(record);
        const canJoin = status.status === 'live';
        const isHost = record.host?._id === userId;
        
        return (
          <Space>
            <Tooltip title="View Details">
              <Button 
                icon={<Eye size={14} />} 
                size="small"
                onClick={() => showMeetingDetails(record)}
                className="!bg-gray-700 !text-white !border-0"
              />
            </Tooltip>
            
            <Tooltip title="Copy Link">
              <Button 
                icon={<Copy size={14} />} 
                size="small"
                onClick={() => copyMeetingLink(record.meetingId)}
                className="!bg-blue-600 !text-white !border-0"
              />
            </Tooltip>
            
            {canJoin ? (
              <Button
                type="primary"
                onClick={() => handleJoinMeeting(record)}
                className={`!bg-green-500 hover:!bg-green-600 !text-white !border-0 ${
                  isHost ? '!bg-purple-600 hover:!bg-purple-700' : ''
                }`}
                size="small"
              >
                {isHost ? 'Start' : 'Join'}
              </Button>
            ) : (
              <Button
                disabled
                className="opacity-60 cursor-not-allowed !border-0"
                size="small"
              >
                Waiting
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card 
      className="shadow-2xl rounded-2xl border !border-black/25 !bg-black/25 backdrop-blur-3xl"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-700">
              <Video className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-green-500 font-bold font-[poppins] text-xl m-0">Scheduled Meetings</h2>
              <p className="text-gray-400 text-sm m-0">Join your upcoming video conferences</p>
            </div>
          </div>
          <Space>
            <AntSearch
              placeholder="Search meetings..."
              onSearch={setSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 200 }}
              size="small"
              prefix={<Search size={14} />}
            />
            <Button 
              icon={<Filter size={14} />} 
              onClick={fetchMeetings}
              className="!bg-gray-700 !text-white !border-0"
            >
              Refresh
            </Button>
          </Space>
        </div>
      }
    >
      <div className="mb-6">
        <Tabs 
          activeKey={filter} 
          onChange={setFilter}
          className="meeting-tabs"
          items={[
            {
              key: 'all',
              label: (
                <span className="flex items-center gap-2">
                  <Calendar size={14} /> All Meetings
                </span>
              )
            },
            {
              key: 'upcoming',
              label: (
                <span className="flex items-center gap-2">
                  <Clock size={14} /> Upcoming
                  <Badge 
                    count={meetings.filter(m => moment(m.scheduledTime).isAfter(moment())).length} 
                    style={{ backgroundColor: '#3b82f6' }} 
                  />
                </span>
              )
            },
            {
              key: 'live',
              label: (
                <span className="flex items-center gap-2">
                  <Video size={14} /> Live Now
                  <Badge 
                    count={meetings.filter(m => 
                      !m.isEnded && moment(m.scheduledTime).isBefore(moment())
                    ).length} 
                    style={{ backgroundColor: '#10b981' }} 
                  />
                </span>
              )
            }
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredMeetings}
        loading={loading}
        pagination={{ pageSize: 6 }}
        style={{ fontFamily: "Poppins" }}
        rowClassName="hover:!bg-gray-800/30"
        className="dark-table"
        locale={{ emptyText: (
          <div className="text-center py-12">
            <Video className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-gray-400">No meetings found</h3>
            <p className="text-gray-500">Check back later for scheduled meetings</p>
          </div>
        )}}
      />

      <Modal
        title={
          <div className="flex items-center gap-2 text-yellow-500">
            <Lock size={20} />
            <span>Enter Meeting Password</span>
          </div>
        }
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={proceedToJoinMeeting}
        okText="Join Meeting"
        okButtonProps={{ className: '!bg-green-500 !border-0' }}
      >
        <div className="py-4">
          <p className="text-gray-300 mb-4">
            This meeting is protected by a password. Please enter the password to join:
          </p>
          <Input.Password
            placeholder="Enter meeting password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={proceedToJoinMeeting}
            size="large"
          />
          <p className="text-gray-500 text-sm mt-2">
            Contact the meeting host if you don't have the password.
          </p>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Video className="text-green-400" size={20} />
            <span className="text-white">{selectedMeeting?.title}</span>
          </div>
        }
        open={meetingDetailsModal}
        onCancel={() => setMeetingDetailsModal(false)}
        footer={null}
        width={600}
      >
        {selectedMeeting && (
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Scheduled Time</div>
                <div className="text-white text-lg">
                  {moment(selectedMeeting.scheduledTime).format('MMMM D, YYYY h:mm A')}
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Duration</div>
                <div className="text-white text-lg">
                  {selectedMeeting.duration ? `${selectedMeeting.duration} mins` : 'Not started'}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-gray-300 mb-2">Description</h4>
              <p className="text-gray-400">
                {selectedMeeting.description || 'No description provided.'}
              </p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-gray-300 mb-2">Meeting Settings</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMeeting.settings.allowScreenShare && (
                  <Tag color="green" icon={<Share2 size={12} />}>Screen Share</Tag>
                )}
                {selectedMeeting.settings.allowChat && (
                  <Tag color="blue" icon={<Mic size={12} />}>Chat Enabled</Tag>
                )}
                {selectedMeeting.settings.muteOnEntry && (
                  <Tag color="orange" icon={<MicOff size={12} />}>Mute on Entry</Tag>
                )}
                {selectedMeeting.settings.requirePassword && (
                  <Tag color="red" icon={<Lock size={12} />}>Password Protected</Tag>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-gray-300 mb-2">Host & Co-hosts</h4>
              <List
                size="small"
                dataSource={[selectedMeeting.host, ...(selectedMeeting.coHosts || [])]}
                renderItem={(host, index) => (
                  <List.Item>
                    <div className="flex items-center gap-3">
                      <Avatar src={host?.avatar} size="small">
                        {host?.name?.charAt(0)}
                      </Avatar>
                      <div>
                        <div className="text-white">{host?.name}</div>
                        <div className="text-gray-500 text-xs">
                          {index === 0 ? 'Host' : 'Co-host'}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-800">
              <Button 
                type="primary" 
                block 
                size="large"
                className="!bg-green-500 hover:!bg-green-600 !border-0"
                onClick={() => {
                  setMeetingDetailsModal(false);
                  handleJoinMeeting(selectedMeeting);
                }}
                disabled={!canJoinMeeting(selectedMeeting.scheduledTime)}
              >
                {canJoinMeeting(selectedMeeting.scheduledTime) ? 'Join Meeting' : 'Meeting Not Started'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}