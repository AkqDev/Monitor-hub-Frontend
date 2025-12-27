import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, message , theme } from 'antd';
import { Video } from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import VideoMeeting from './VideoMeeting';
import { socket } from '../../utils/socket';

export default function MeetingPanel({ userId, userName, token }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

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

    socket.on("meetingStarting", ({ title }) => {
      message.info(`🔔 "${title}" is starting now`);
      fetchMeetings();
    });

    return () => socket.off("meetingStarting");
  }, [fetchMeetings]);

  const canJoinMeeting = (scheduledTime) => moment().isSameOrAfter(moment(scheduledTime));

  const handleJoinMeeting = (meeting) => {
    if (!canJoinMeeting(meeting.scheduledTime)) {
      message.warning('Meeting has not started yet.');
      return;
    }
    setCurrentMeetingId(meeting.meetingId);
  };

  const handleLeaveMeeting = () => {
    setCurrentMeetingId(null);
    fetchMeetings();
  };

  if (currentMeetingId) {
    return (
      <div className='h-[85vh]'>
        <VideoMeeting
          meetingId={currentMeetingId}
          userId={userId}
          userName={userName}
          onLeave={handleLeaveMeeting}
          isAdmin={false}
        />
      </div>
    );
  }

  const columns = [
    { title: 'Title', dataIndex: 'title', render: text => <span className="text-white">{text}</span> },
    { title: 'Description', dataIndex: 'description', render: text => <span className="text-white">{text || '—'}</span> },
    { title: 'Time', dataIndex: 'scheduledTime', render: date => <span className="text-white">{moment(date).format('MMM D, YYYY h:mm A')}</span> },
    { title: 'Host', dataIndex: ['host', 'name'], render: text => <span className="text-white">{text}</span> },
    {
  title: 'Actions',
  render: (_, record) => {
    const canJoin = canJoinMeeting(record.scheduledTime);
    return (
      <Button
        disabled={!canJoin}
        onClick={() => handleJoinMeeting(record)}
        className={`!text-white !bg-green-500 !border-0 ${
          !canJoin ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {canJoin ? 'Join Now' : 'Waiting'}
      </Button>
    );
  }
}
];

  return (
    <Card className="shadow-2xl rounded-2xl border !border-black/25 !bg-black/25 backdrop-blur-3xl"
      title={<div className="flex items-center gap-2 text-green-500 font-bold font-[poppins]"><Video /> Scheduled Meetings</div>}
      extra={<Button className='!bg-green-500 !text-white !outline-0 !border-0 !rounded-full !font-semibold font-[poppins] ' onClick={fetchMeetings}>Refresh</Button>}
    >
<Table
  columns={columns}
  dataSource={meetings.filter(m =>
    moment(m.scheduledTime).isAfter(moment().subtract(2, 'hours'))
  )}
  loading={loading}
  pagination={{ pageSize: 6 }}
  style={{ fontFamily: "Poppins" }}
  rootClassName="dark-table"
/>
    </Card>
  );
}
 