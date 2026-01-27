import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  MdVideoCall, 
  MdMic, 
  MdMicOff, 
  MdVideocamOff, 
  MdCallEnd, 
  MdPerson, 
  MdMonitor, 
  MdChat, 
  MdSettings, 
  MdPanTool, 
  MdPeople,
  MdShare,
  MdContentCopy,
  MdMoreVert,
  MdFullscreen,
  MdFullscreenExit,
  MdSecurity,
  MdVolumeUp
} from 'react-icons/md';
import { 
  Button, 
  Tooltip, 
  message, 
  Badge, 
  Dropdown, 
  Modal, 
  Input, 
  List, 
  Avatar, 
  Popconfirm,
  Tabs,
  Slider,
  Space,
  Card,
  Switch
} from 'antd';
import { socket } from '../../utils/socket';
import '../styles/VideoMeeting.css';
import moment from 'moment';

const { TabPane } = Tabs;
const { TextArea } = Input;

export default function VideoMeeting({ 
  meetingId, 
  userId, 
  userName, 
  userAvatar, 
  onLeave, 
  isAdmin = false
}) {
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  const streamRef = useRef(null);
  const screenRef = useRef(null);
  const peerConnections = useRef({});

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState('participants');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [waitingRoomUsers, setWaitingRoomUsers] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const startMedia = useCallback(async () => {
    try {
      const constraints = {
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Apply initial mute state based on meeting settings
      if (meetingInfo?.settings?.muteOnEntry) {
        stream.getAudioTracks().forEach(track => track.enabled = false);
        setIsMuted(true);
      }
    } catch (err) {
      console.error("Media access error:", err);
      message.error("Could not access camera/microphone. Please check permissions.");
    }
  }, [meetingInfo]);

  const cleanupMeeting = useCallback(() => {
    socket.emit("leaveMeeting", { meetingId, userId });
    
    socket.off("meetingInfo");
    socket.off("meetingUserJoined");
    socket.off("meetingUserLeft");
    socket.off("forceLeave");
    socket.off("forceMute");
    socket.off("forceStopVideo");
    socket.off("meetingChatMessage");
    socket.off("participantUpdated");
    socket.off("handRaised");
    socket.off("handLowered");
    socket.off("waitingRoomUpdate");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");

    // Stop all media tracks
    streamRef.current?.getTracks().forEach(track => track.stop());
    screenRef.current?.getTracks().forEach(track => track.stop());

    // Close peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
  }, [meetingId, userId]);

  useEffect(() => {
    if (!meetingId) return;

    startMedia();

    // Join meeting
    socket.emit("joinMeeting", { 
      meetingId, 
      userId, 
      name: userName,
      avatar: userAvatar 
    });

    // Setup meeting event listeners
    socket.on("meetingInfo", (data) => {
      setMeetingInfo(data.meeting);
      setParticipants(data.participants);
    });

    socket.on("meetingUserJoined", (data) => {
      setParticipants(prev => ({
        ...prev,
        [data.userId]: { 
          ...data, 
          isMuted: data.isMuted,
          hasVideo: data.hasVideo 
        }
      }));
      
      // Add join message to chat
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${data.name} joined the meeting`,
        timestamp: new Date()
      }]);
    });

    socket.on("meetingUserLeft", (data) => {
      setParticipants(prev => {
        const copy = { ...prev };
        delete copy[data.userId];
        return copy;
      });
      
      // Add leave message to chat
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${data.name} left the meeting`,
        timestamp: new Date()
      }]);
    });

    socket.on("forceLeave", () => {
      message.warning("Meeting ended by host");
      handleLeaveMeeting();
    });

    socket.on("forceMute", (data) => {
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !data.muted;
        });
        setIsMuted(data.muted);
        message.info(`You were ${data.muted ? 'muted' : 'unmuted'} by host`);
      }
    });

    socket.on("forceStopVideo", () => {
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
        setIsVideoOff(true);
        message.info("Your video was stopped by host");
      }
    });

    socket.on("meetingChatMessage", (messageData) => {
      setChatMessages(prev => [...prev, messageData]);
      if (activeTab !== 'chat') {
        setUnreadMessages(prev => prev + 1);
      }
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    socket.on("participantUpdated", (data) => {
      setParticipants(prev => ({
        ...prev,
        [data.userId]: { ...prev[data.userId], ...data.updates }
      }));
    });

    socket.on("handRaised", (data) => {
      setParticipants(prev => ({
        ...prev,
        [data.userId]: { ...prev[data.userId], handRaised: true }
      }));
      message.info(`${data.name} raised their hand`);
    });

    socket.on("handLowered", (data) => {
      setParticipants(prev => ({
        ...prev,
        [data.userId]: { ...prev[data.userId], handRaised: false }
      }));
    });

    socket.on("waitingRoomUpdate", (users) => {
      setWaitingRoomUsers(users);
    });

    // WebRTC signaling handlers
    const handleOffer = async (data) => {
      const { from, offer } = data;
      const pc = new RTCPeerConnection();
      peerConnections.current[from] = pc;

      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            to: from,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        to: from,
        answer: answer
      });
    };

    const handleAnswer = async (data) => {
      const { from, answer } = data;
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async (data) => {
      const { from, candidate } = data;
      const pc = peerConnections.current[from];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      cleanupMeeting();
    };
  }, [meetingId, userId, userName, userAvatar, meetingInfo, startMedia, activeTab, cleanupMeeting]);

  const toggleScreenShare = async () => {
    try {
      if (!screenStream) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30, width: 1920, height: 1080 },
          audio: true
        });
        
        screenRef.current = stream;
        setScreenStream(stream);
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        // Notify others
        socket.emit("screenShareStarted", { meetingId });
        
        stream.getVideoTracks()[0].onended = () => {
          socket.emit("screenShareStopped", { meetingId });
          screenRef.current = null;
          setScreenStream(null);
        };
      } else {
        screenStream.getTracks().forEach(t => t.stop());
        screenRef.current = null;
        setScreenStream(null);
        socket.emit("screenShareStopped", { meetingId });
      }
    } catch (err) {
      console.error("Screen share error:", err);
      message.error("Screen sharing cancelled or failed");
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      
      // Notify others
      socket.emit("participantUpdate", {
        meetingId,
        updates: { isMuted: !isMuted }
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
      
      // Notify others
      socket.emit("participantUpdate", {
        meetingId,
        updates: { hasVideo: !isVideoOff }
      });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const messageData = {
        meetingId,
        senderId: userId,
        senderName: userName,
        message: newMessage,
        timestamp: new Date(),
        type: 'text'
      };
      
      socket.emit("sendMeetingMessage", messageData);
      setNewMessage('');
    }
  };

  const toggleHandRaise = () => {
    const raised = !isHandRaised;
    setIsHandRaised(raised);
    
    if (raised) {
      socket.emit("raiseHand", { meetingId });
      message.info("You raised your hand");
    } else {
      socket.emit("lowerHand", { meetingId });
    }
  };

  const handleLeaveMeeting = () => {
    cleanupMeeting();
    onLeave();
  };

  const endMeetingForAll = () => {
    Modal.confirm({
      title: 'End Meeting for All?',
      content: 'This will end the meeting for all participants.',
      okText: 'End Meeting',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        socket.emit("endMeetingForAll", { meetingId });
        handleLeaveMeeting();
      }
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard.writeText(link);
    message.success('Meeting link copied!');
  };

  const handleFullscreen = () => {
    const elem = document.querySelector('.video-meeting-container');
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const admitUser = (targetUserId) => {
    socket.emit("admitUser", { meetingId, targetUserId });
    setWaitingRoomUsers(prev => prev.filter(u => u.userId !== targetUserId));
  };

  const rejectUser = (targetUserId) => {
    socket.emit("rejectUser", { meetingId, targetUserId });
    setWaitingRoomUsers(prev => prev.filter(u => u.userId !== targetUserId));
  };

  const participantItems = [
    {
      key: 'mute',
      label: 'Mute',
      onClick: () => socket.emit("toggleParticipantMute", { 
        meetingId, 
        targetUserId: selectedParticipant, 
        mute: true 
      })
    },
    {
      key: 'stop_video',
      label: 'Stop Video',
      onClick: () => socket.emit("stopParticipantVideo", { 
        meetingId, 
        targetUserId: selectedParticipant 
      })
    },
    {
      key: 'make_cohost',
      label: 'Make Co-host',
      onClick: () => socket.emit("makeCoHost", { 
        meetingId, 
        targetUserId: selectedParticipant 
      })
    },
    {
      key: 'remove',
      label: 'Remove',
      danger: true,
      onClick: () => socket.emit("removeParticipant", { 
        meetingId, 
        targetUserId: selectedParticipant 
      })
    }
  ];

  return (
    <div className={`video-meeting-container flex flex-col h-full bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden border border-gray-800 ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-700">
              <Video className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold m-0">{meetingInfo?.title || 'Meeting'}</h3>
              <p className="text-gray-400 text-sm m-0">
                Meeting ID: <code className="bg-gray-800 px-2 py-1 rounded">{meetingId}</code>
                {isAdmin && <span className="ml-2 text-green-400 flex items-center gap-1"><Shield size={12} /> Host</span>}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge count={Object.keys(participants).length} showZero>
            <Button 
              icon={<UsersIcon size={18} />} 
              type="text"
              className="text-white hover:!bg-gray-800"
            >
              Participants
            </Button>
          </Badge>
          
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <Button 
              icon={isFullscreen ? <Maximize2 size={18} /> : <Maximize2 size={18} />} 
              onClick={handleFullscreen}
              type="text"
              className="text-white hover:!bg-gray-800"
            />
          </Tooltip>
          
          <Tooltip title="Copy Meeting Link">
            <Button 
              icon={<Copy size={18} />} 
              onClick={handleCopyLink}
              type="text"
              className="text-white hover:!bg-gray-800"
            />
          </Tooltip>
          
          <Tooltip title="Settings">
            <Button 
              icon={<Settings size={18} />} 
              onClick={() => setShowSettings(!showSettings)}
              type="text"
              className="text-white hover:!bg-gray-800"
            />
          </Tooltip>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
          {/* Local Video */}
          <div className="relative rounded-xl overflow-hidden border-2 border-green-500 group">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover bg-black"
            />
            <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}></div>
              {userName} (You)
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                shape="circle" 
                size="small"
                icon={isMuted ? <MicOff size={14} /> : <Mic size={14} />} 
                danger={isMuted}
                onClick={toggleMute}
              />
              <Button 
                shape="circle" 
                size="small"
                icon={isVideoOff ? <VideoOff size={14} /> : <Video size={14} />} 
                danger={isVideoOff}
                onClick={toggleVideo}
              />
            </div>
          </div>

          {/* Screen Share */}
          {screenStream && (
            <div className="relative rounded-xl overflow-hidden border-2 border-yellow-500 col-span-2">
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
                <Monitor className="inline mr-2" size={14} />
                {userName}'s Screen
              </div>
            </div>
          )}

          {/* Participants */}
          {Object.entries(participants).map(([id, participant]) => (
            <div 
              key={id} 
              className="relative rounded-xl overflow-hidden border border-gray-700 group bg-gray-900 flex items-center justify-center"
              onContextMenu={(e) => {
                e.preventDefault();
                if (isAdmin && id !== userId) {
                  setSelectedParticipant(id);
                }
              }}
            >
              {participant.hasVideo ? (
                <video 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <Avatar 
                    src={participant.avatar} 
                    size={64}
                    className="mb-2"
                  >
                    {participant.name?.charAt(0)}
                  </Avatar>
                  <div className="text-white text-center">
                    {participant.name}
                  </div>
                </div>
              )}
              
              <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
                {participant.isMuted ? (
                  <MicOff className="text-red-400" size={12} />
                ) : (
                  <Mic className="text-green-400" size={12} />
                )}
                {participant.name}
                {participant.handRaised && (
                  <Hand className="text-yellow-400 animate-pulse" size={12} />
                )}
              </div>
              
              {isAdmin && id !== userId && (
                <Dropdown 
                  menu={{ 
                    items: participantItems,
                    onClick: ({ key }) => {
                      const item = participantItems.find(i => i.key === key);
                      if (item?.onClick) item.onClick();
                    }
                  }} 
                  trigger={['contextMenu']}
                  open={selectedParticipant === id}
                  onOpenChange={(open) => !open && setSelectedParticipant(null)}
                >
                  <div className="absolute inset-0"></div>
                </Dropdown>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-800 flex flex-col">
          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => {
              setActiveTab(key);
              if (key === 'chat') setUnreadMessages(0);
            }}
            className="flex-1"
            tabBarStyle={{ padding: '0 16px', margin: 0 }}
          >
            <TabPane 
              tab={
                <span className="flex items-center gap-2">
                  <UsersIcon size={14} />
                  Participants
                  <Badge 
                    count={Object.keys(participants).length} 
                    size="small" 
                    style={{ backgroundColor: '#10b981' }}
                  />
                </span>
              } 
              key="participants"
            >
              <div className="p-4 overflow-y-auto flex-1">
                <List
                  dataSource={Object.entries(participants)}
                  renderItem={([id, participant]) => (
                    <List.Item className="!px-0">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Avatar src={participant.avatar} size="small">
                            {participant.name?.charAt(0)}
                          </Avatar>
                          <div>
                            <div className="text-white text-sm">
                              {participant.name}
                              {id === userId && ' (You)'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {participant.isMuted ? 'Muted' : 'Speaking'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.handRaised && (
                            <Hand className="text-yellow-400 animate-pulse" size={14} />
                          )}
                          {participant.isScreenSharing && (
                            <Monitor className="text-yellow-400" size={14} />
                          )}
                          {isAdmin && id !== userId && (
                            <Button 
                              size="small" 
                              type="text"
                              icon={<MoreVertical size={12} />}
                              onClick={() => setSelectedParticipant(id)}
                            />
                          )}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                
                {isAdmin && waitingRoomUsers.length > 0 && (
                  <Card 
                    title="Waiting Room" 
                    size="small"
                    className="!bg-gray-800 !border-gray-700 mt-4"
                  >
                    <List
                      dataSource={waitingRoomUsers}
                      renderItem={(user) => (
                        <List.Item className="!px-0">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Avatar size="small">{user.name?.charAt(0)}</Avatar>
                              <span className="text-white text-sm">{user.name}</span>
                            </div>
                            <Space>
                              <Button 
                                size="small"
                                type="primary"
                                onClick={() => admitUser(user.userId)}
                              >
                                Admit
                              </Button>
                              <Button 
                                size="small"
                                danger
                                onClick={() => rejectUser(user.userId)}
                              >
                                Reject
                              </Button>
                            </Space>
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </div>
            </TabPane>
            
            <TabPane 
              tab={
                <span className="flex items-center gap-2">
                  <MessageSquare size={14} />
                  Chat
                  {unreadMessages > 0 && (
                    <Badge 
                      count={unreadMessages} 
                      size="small" 
                      style={{ backgroundColor: '#3b82f6' }}
                    />
                  )}
                </span>
              } 
              key="chat"
            >
              <div className="flex flex-col h-full">
                <div 
                  ref={chatContainerRef}
                  className="flex-1 p-4 overflow-y-auto"
                  onMouseEnter={() => setUnreadMessages(0)}
                >
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`mb-3 ${msg.type === 'system' ? 'text-center' : ''}`}
                    >
                      {msg.type === 'system' ? (
                        <div className="text-gray-500 text-sm bg-gray-800/50 px-3 py-1 rounded-full inline-block">
                          {msg.message}
                        </div>
                      ) : (
                        <div className={`flex ${msg.senderId === userId ? 'justify-end' : ''}`}>
                          <div className={`max-w-xs rounded-lg px-3 py-2 ${msg.senderId === userId ? 'bg-green-900/30' : 'bg-gray-800'}`}>
                            <div className="text-xs text-gray-400 mb-1">
                              {msg.senderName}
                            </div>
                            <div className="text-white">
                              {msg.message}
                            </div>
                            <div className="text-xs text-gray-500 text-right mt-1">
                              {moment(msg.timestamp).format('h:mm A')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-gray-800">
                  <TextArea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="!bg-gray-800 !border-gray-700 !text-white"
                  />
                  <Button 
                    type="primary" 
                    block 
                    onClick={handleSendMessage}
                    className="mt-2 !bg-green-600 hover:!bg-green-700 !border-0"
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-gray-950/90 flex justify-center items-center gap-4 border-t border-gray-800">
        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
          <Button 
            shape="circle" 
            size="large" 
            icon={isMuted ? <MicOff /> : <Mic />} 
            danger={isMuted}
            onClick={toggleMute}
            className={isMuted ? '!bg-red-600 hover:!bg-red-700' : 'hover:!bg-gray-800'}
          />
        </Tooltip>

        <Tooltip title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}>
          <Button 
            shape="circle" 
            size="large" 
            icon={isVideoOff ? <VideoOff /> : <Video />} 
            danger={isVideoOff}
            onClick={toggleVideo}
            className={isVideoOff ? '!bg-red-600 hover:!bg-red-700' : 'hover:!bg-gray-800'}
          />
        </Tooltip>

        <Tooltip title="Share Screen">
          <Button 
            shape="circle" 
            size="large" 
            icon={<Monitor />} 
            type={screenStream ? "primary" : "default"}
            onClick={toggleScreenShare}
            className={screenStream ? '!bg-yellow-600 hover:!bg-yellow-700' : 'hover:!bg-gray-800'}
          />
        </Tooltip>

        <Tooltip title="Raise Hand">
          <Button 
            shape="circle" 
            size="large" 
            icon={<Hand />} 
            type={isHandRaised ? "primary" : "default"}
            onClick={toggleHandRaise}
            className={isHandRaised ? '!bg-purple-600 hover:!bg-purple-700 animate-pulse' : 'hover:!bg-gray-800'}
          />
        </Tooltip>

        <div className="w-32">
          <Slider
            min={0}
            max={100}
            value={volume}
            onChange={setVolume}
            tooltip={{ formatter: (value) => `${value}%` }}
            trackStyle={{ backgroundColor: '#10b981' }}
            handleStyle={{ borderColor: '#10b981' }}
          />
        </div>

        <div className="h-8 w-px bg-gray-700"></div>

        {isAdmin ? (
          <Popconfirm
            title="End meeting for all participants?"
            onConfirm={endMeetingForAll}
            okText="End"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="primary" 
              danger 
              shape="round" 
              icon={<PhoneOff />} 
              size="large"
              className="!bg-red-600 hover:!bg-red-700"
            >
              End Meeting
            </Button>
          </Popconfirm>
        ) : (
          <Button 
            type="primary" 
            danger 
            shape="round" 
            icon={<PhoneOff />} 
            size="large"
            onClick={handleLeaveMeeting}
            className="!bg-red-600 hover:!bg-red-700"
          >
            Leave
          </Button>
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        title="Meeting Settings"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={500}
        className="dark-modal"
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-white mb-4">Audio Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm block mb-2">Microphone</label>
                <Button block className="!bg-gray-800 !border-gray-700 !text-white">
                  Select Microphone
                </Button>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Volume</label>
                <div className="flex items-center gap-3">
                  <Volume2 className="text-gray-400" size={16} />
                  <Slider
                    value={volume}
                    onChange={setVolume}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white mb-4">Video Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm block mb-2">Camera</label>
                <Button block className="!bg-gray-800 !border-gray-700 !text-white">
                  Select Camera
                </Button>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Video Quality</label>
                <Button block className="!bg-gray-800 !border-gray-700 !text-white">
                  HD (720p)
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white mb-4">Meeting Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Always mute on entry</span>
                <Switch defaultChecked={meetingInfo?.settings?.muteOnEntry} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Show video preview</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Enable noise cancellation</span>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}