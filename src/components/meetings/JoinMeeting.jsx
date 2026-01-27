import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Input, 
  message, 
  Spin, 
  Modal, 
  Avatar, 
  Tag,
  Alert,
  Row,
  Col,
  Typography
} from 'antd';
import { 
  MdVideoCall, 
  MdLock, 
  MdPeople, 
  MdCalendarToday, 
  MdSchedule, 
  MdArrowBack,
  MdSecurity,
  MdCheckCircle
} from 'react-icons/md';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import VideoMeeting from './VideoMeeting';
import { socket } from '../../utils/socket';

const { Title, Text, Paragraph } = Typography;
const { Password } = Input;

export default function JoinMeeting() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [error, setError] = useState(null);
  
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const userAvatar = localStorage.getItem('userAvatar');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role'); // 'admin' or 'employee'
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!token || !userId) {
      message.error('Please login first to join the meeting');
      navigate(`/${userRole || 'auth'}`);
      return;
    }

    fetchMeetingDetails();
    
    // Listen for meeting notifications
    socket.on("meetingStartingSoon", handleMeetingNotification);
    socket.on("meetingCancelled", handleMeetingCancelled);
    
    return () => {
      socket.off("meetingStartingSoon", handleMeetingNotification);
      socket.off("meetingCancelled", handleMeetingCancelled);
    };
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/meetings/join/${meetingId}`, authHeader(token));
      setMeeting(res.data);
      setError(null);
      
      if (res.data.settings.requirePassword) {
        setPasswordModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Meeting not found');
      message.error('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingNotification = (data) => {
    if (data.meetingId === meetingId) {
      message.info(data.message);
    }
  };

  const handleMeetingCancelled = (data) => {
    if (data.meetingId === meetingId) {
      message.warning(data.message);
      navigate(`/${userRole}/meetings`);
    }
  };

  const handleJoinMeeting = async () => {
    if (!meeting) return;
    
    if (meeting.settings.requirePassword) {
      try {
        const res = await api.post(
          `/api/meetings/${meetingId}/verify-password`,
          { password },
          authHeader(token)
        );
        
        if (!res.data.accessGranted) {
          message.error('Incorrect password!');
          setPassword('');
          return;
        }
      } catch (err) {
        message.error('Failed to verify password');
        return;
      }
    }
    
    setPasswordModal(false);
    setJoining(true);
  };

  const handleLeaveMeeting = () => {
    setJoining(false);
    navigate(`/${userRole}/meetings`);
  };

  const canJoinMeeting = () => {
    if (!meeting) return false;
    return moment().isSameOrAfter(moment(meeting.scheduledTime));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Spin size="large" tip="Loading meeting details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md !bg-gray-800 !border-gray-700">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <Title level={3} className="!text-white mb-2">Meeting Not Found</Title>
            <Text className="text-gray-400 mb-6">
              {error}
            </Text>
            <div className="space-y-3">
              <Button 
                type="primary" 
                block 
                onClick={() => navigate(`/${userRole}/meetings`)}
                className="!bg-green-600 hover:!bg-green-700 !border-0"
              >
                Back to Meetings
              </Button>
              <Button 
                block 
                onClick={() => navigate(`/${userRole}`)}
                className="!bg-gray-700 hover:!bg-gray-600 !border-0 !text-white"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (joining && meeting) {
    return (
      <div className="h-screen">
        <VideoMeeting
          meetingId={meetingId}
          userId={userId}
          userName={userName}
          userAvatar={userAvatar}
          onLeave={handleLeaveMeeting}
          isAdmin={meeting.host?._id === userId || isAdmin}
          token={token}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button 
            icon={<ArrowLeft size={18} />} 
            onClick={() => navigate(`/${userRole}/meetings`)}
            className="!bg-gray-800 hover:!bg-gray-700 !text-white !border-0 mb-4"
          >
            Back to Meetings
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!text-white mb-2 flex items-center gap-3">
                <Video className="text-green-400" />
                {meeting?.title}
              </Title>
              <Text className="text-gray-400">
                Meeting ID: <code className="bg-gray-800 px-2 py-1 rounded ml-2">{meetingId}</code>
              </Text>
            </div>
            
            {meeting?.host?._id === userId && (
              <Tag icon={<Shield size={12} />} color="green" className="!text-sm !py-1">
                You are the Host
              </Tag>
            )}
          </div>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card className="!bg-gray-800/50 !border-gray-700 backdrop-blur-sm h-full">
              <div className="space-y-6">
                <div>
                  <Title level={4} className="!text-white mb-2">Description</Title>
                  <Paragraph className="text-gray-300 text-lg">
                    {meeting?.description || 'No description provided'}
                  </Paragraph>
                </div>
                
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Card className="!bg-gray-900 !border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-900/30">
                          <Calendar className="text-blue-400" size={20} />
                        </div>
                        <div>
                          <Text className="text-gray-400 text-sm">Date</Text>
                          <div className="text-white">
                            {moment(meeting?.scheduledTime).format('MMMM D, YYYY')}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Card className="!bg-gray-900 !border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-900/30">
                          <Clock className="text-purple-400" size={20} />
                        </div>
                        <div>
                          <Text className="text-gray-400 text-sm">Time</Text>
                          <div className="text-white">
                            {moment(meeting?.scheduledTime).format('h:mm A')}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Card className="!bg-gray-900 !border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-900/30">
                          <Users className="text-green-400" size={20} />
                        </div>
                        <div>
                          <Text className="text-gray-400 text-sm">Host</Text>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar src={meeting?.host?.avatar} size="small">
                              {meeting?.host?.name?.charAt(0)}
                            </Avatar>
                            <Text className="text-white">{meeting?.host?.name}</Text>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Card className="!bg-gray-900 !border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-900/30">
                          {meeting?.settings?.requirePassword ? (
                            <Lock className="text-yellow-400" size={20} />
                          ) : (
                            <CheckCircle className="text-green-400" size={20} />
                          )}
                        </div>
                        <div>
                          <Text className="text-gray-400 text-sm">Access</Text>
                          <div className="text-white">
                            {meeting?.settings?.requirePassword ? 'Password Protected' : 'Open Access'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
                
                <div>
                  <Title level={4} className="!text-white mb-3">Meeting Settings</Title>
                  <div className="flex flex-wrap gap-2">
                    {meeting?.settings?.allowScreenShare && (
                      <Tag color="green">Screen Sharing</Tag>
                    )}
                    {meeting?.settings?.allowChat && (
                      <Tag color="blue">Chat Enabled</Tag>
                    )}
                    {meeting?.settings?.allowRaiseHand && (
                      <Tag color="orange">Raise Hand</Tag>
                    )}
                    {meeting?.settings?.muteOnEntry && (
                      <Tag color="red">Mute on Entry</Tag>
                    )}
                    {meeting?.settings?.recordMeeting && (
                      <Tag color="purple">Recording</Tag>
                    )}
                    {meeting?.settings?.waitingRoom && (
                      <Tag color="cyan">Waiting Room</Tag>
                    )}
                  </div>
                </div>
                
                {!canJoinMeeting() && (
                  <Alert
                    message="Meeting Not Started"
                    description={`This meeting will start on ${moment(meeting?.scheduledTime).format('MMMM D, YYYY [at] h:mm A')}`}
                    type="info"
                    showIcon
                    className="!bg-blue-900/20 !border-blue-800"
                  />
                )}
              </div>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card className="!bg-gray-800/50 !border-gray-700 backdrop-blur-sm h-full">
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mx-auto mb-4">
                    <Video className="text-white" size={32} />
                  </div>
                  <Title level={3} className="!text-white">Ready to Join?</Title>
                  <Text className="text-gray-400">
                    Click the button below to enter the meeting
                  </Text>
                </div>
                
                <div className="space-y-4">
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<Video size={18} />}
                    onClick={() => {
                      if (meeting?.settings?.requirePassword) {
                        setPasswordModal(true);
                      } else {
                        handleJoinMeeting();
                      }
                    }}
                    disabled={!canJoinMeeting()}
                    className={`!h-12 text-lg ${
                      canJoinMeeting() 
                        ? '!bg-green-600 hover:!bg-green-700' 
                        : '!bg-gray-700 cursor-not-allowed'
                    } !border-0`}
                  >
                    {canJoinMeeting() ? 'Join Meeting Now' : 'Meeting Not Started'}
                  </Button>
                  
                  {!canJoinMeeting() && (
                    <Button
                      block
                      size="large"
                      className="!bg-blue-600 hover:!bg-blue-700 !border-0 !text-white"
                      onClick={() => {
                        const calendarEvent = {
                          title: meeting.title,
                          description: meeting.description,
                          start: meeting.scheduledTime,
                          end: new Date(new Date(meeting.scheduledTime).getTime() + 60 * 60 * 1000),
                          location: window.location.href
                        };
                        
                        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&details=${encodeURIComponent(calendarEvent.description)}&dates=${moment(calendarEvent.start).format('YYYYMMDDTHHmmss')}/${moment(calendarEvent.end).format('YYYYMMDDTHHmmss')}&location=${encodeURIComponent(calendarEvent.location)}`;
                        
                        window.open(calendarUrl, '_blank');
                      }}
                    >
                      Add to Calendar
                    </Button>
                  )}
                  
                  <Button
                    block
                    size="large"
                    className="!bg-gray-700 hover:!bg-gray-600 !border-0 !text-white"
                    onClick={() => {
                      const meetingLink = `${window.location.origin}/${userRole}/meetings/join/${meetingId}`;
                      navigator.clipboard.writeText(meetingLink);
                      message.success('Meeting link copied to clipboard!');
                    }}
                  >
                    Copy Meeting Link
                  </Button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <Text className="text-gray-500 text-sm">
                    Need help? Contact the host: {meeting?.host?.name}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Lock className="text-yellow-500" size={20} />
            <span className="text-white">Enter Meeting Password</span>
          </div>
        }
        open={passwordModal}
        onCancel={() => setPasswordModal(false)}
        footer={null}
        className="dark-modal"
      >
        <div className="py-4">
          <Text className="text-gray-300 block mb-4">
            This meeting is protected by a password. Please enter the password provided by the host:
          </Text>
          
          <Password
            placeholder="Enter meeting password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleJoinMeeting}
            size="large"
            className="mb-4"
          />
          
          <div className="flex gap-3">
            <Button
              block
              onClick={() => setPasswordModal(false)}
              className="!bg-gray-700 hover:!bg-gray-600 !border-0 !text-white"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              block
              onClick={handleJoinMeeting}
              className="!bg-green-600 hover:!bg-green-700 !border-0"
              loading={joining}
            >
              Join Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}