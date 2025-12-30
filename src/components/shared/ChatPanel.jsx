import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Layout, Card, Input, Button, List, Spin, message, 
  Dropdown, Avatar, Tooltip, Typography, Popover, 
  Upload, Modal, Form, Badge, Tag, Segmented
} from "antd";
import { 
  Send, PhoneCall, Video, Smile, Paperclip, 
  Image, File, Mic, MoreVertical, Edit2, 
  Pin, Trash2, Search, Eye, EyeOff, 
  Download, Copy, Flag, Star, Clock,
  Users, Volume2, VolumeX, Bell, BellOff,
  Hash, AtSign, Menu, X, Maximize2,
  MessageSquare, Check, CheckCheck, Plus
} from "lucide-react";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import moment from "moment";
import ChatSidebar from "./ChatSidebar";
import { socket, connectSocket } from "../../utils/socket"; // Import connectSocket
import { api, authHeader } from "../../utils/api";
import "../styles/ChatPanel.css";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

const getPrivateRoomId = (a, b) => [a, b].sort().join("_");

export default function ChatPanel({ userId, userName, userAvatar, token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("chat");
  const [callStatus, setCallStatus] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);

  const roomId = selectedRoom?.isDM
    ? getPrivateRoomId(userId, selectedRoom._id)
    : selectedRoom?.isGroup ? selectedRoom._id : "global";

  // Debug: Check token
  useEffect(() => {
    console.log("🔍 Token check in ChatPanel:", {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
    });
  }, [token]);

  // Socket Connection
  useEffect(() => {
    if (!token) {
      console.error("❌ No token available for socket connection");
      message.error("Authentication token missing");
      return;
    }

    console.log("🔗 Setting up socket connection...");

    // Connect socket with token
    const connected = connectSocket(token);
    if (!connected) return;

    // ================= SOCKET EVENT LISTENERS =================
    
    // Connection established
    socket.on("connect", () => {
      console.log("✅ Socket connected, ID:", socket.id);
      setIsSocketConnected(true);
      message.success("Connected to chat");
      
      // Join current room if selected
      if (roomId && selectedRoom) {
        console.log(`Joining room: ${roomId}`);
        socket.emit("joinRoom", roomId, (response) => {
          if (response?.success) {
            console.log(`✅ Joined room: ${roomId}`);
          }
        });
      }
    });

    // Server acknowledged connection
    socket.on("connected", (data) => {
      console.log("✅ Server acknowledged connection:", data);
    });

    // Room joined successfully
    socket.on("roomJoined", (data) => {
      console.log("✅ Joined room:", data.roomId);
    });

    // Room left successfully
    socket.on("roomLeft", (data) => {
      console.log("❌ Left room:", data.roomId);
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setIsSocketConnected(false);
      
      if (error.message.includes("Authentication")) {
        message.error("Authentication failed. Please login again.");
      } else if (error.message.includes("timeout")) {
        message.error("Connection timeout. Check your internet.");
      } else {
        message.error("Failed to connect to chat");
      }
    });

    // Disconnected
    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected, reason:", reason);
      setIsSocketConnected(false);
      if (reason === "io server disconnect") {
        message.warning("Disconnected by server");
      } else if (reason === "io client disconnect") {
        console.log("Disconnected by client");
      } else {
        message.warning("Disconnected from chat");
      }
    });

    // User online
    socket.on("userOnline", (userData) => {
      console.log("👤 User online:", userData.userId);
      setOnlineUsers(prev => [...new Set([...prev, userData.userId])]);
    });

    // User offline
    socket.on("userOffline", ({ userId: offlineUserId }) => {
      console.log("👤 User offline:", offlineUserId);
      setOnlineUsers(prev => prev.filter(id => id !== offlineUserId));
    });

    // Online users list
    socket.on("onlineUsers", (users) => {
      console.log("📊 Online users:", users.length);
      setOnlineUsers(users);
    });

    // Typing indicator
    socket.on("userTyping", ({ userId: typingUserId, roomId: typingRoomId, name }) => {
      if (typingRoomId === roomId) {
        console.log(`⌨️ ${name} is typing...`);
        setTypingUsers(prev => ({ ...prev, [typingUserId]: true }));
        setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [typingUserId]: false }));
        }, 3000);
      }
    });

    // User stopped typing
    socket.on("userStoppedTyping", ({ userId: typingUserId, roomId: typingRoomId }) => {
      if (typingRoomId === roomId) {
        setTypingUsers(prev => ({ ...prev, [typingUserId]: false }));
      }
    });

    // Incoming call
    socket.on("incomingCall", ({ from, signal, type }) => {
      console.log("📞 Incoming call from:", from);
      setCallStatus({ from, signal, type: 'incoming', callType: type });
    });

    // Call accepted
    socket.on("callAccepted", ({ signal }) => {
      console.log("✅ Call accepted");
      setCallStatus(prev => ({ ...prev, connected: true }));
    });

    // New chat message
    socket.on("receiveChatMessage", (msg) => {
      console.log("📨 New message in room:", msg.room, "from:", msg.senderName);
      
      if (msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
        scrollBottom();
      } else {
        // Increment unread count for other rooms
        const msgRoom = msg.senderId === userId ? msg.room : msg.senderId;
        setUnreadCounts(prev => ({
          ...prev,
          [msgRoom]: (prev[msgRoom] || 0) + 1
        }));
        console.log("🔔 Unread message in other room:", msgRoom);
      }
    });

    // Message edited
    socket.on("messageEdited", ({ messageId, newContent }) => {
      console.log("✏️ Message edited:", messageId);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, message: newContent, edited: true }
          : msg
      ));
    });

    // Message deleted
    socket.on("messageDeleted", ({ messageId, forEveryone }) => {
      console.log("🗑️ Message deleted:", messageId, "forEveryone:", forEveryone);
      if (forEveryone) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });

    // Message reaction
    socket.on("messageReaction", ({ messageId, emoji, userId: reactorId, reactions }) => {
      console.log("😄 Reaction on message:", messageId, "emoji:", emoji);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, reactions }
          : msg
      ));
    });

    // User status updated
    socket.on("userStatusUpdated", ({ userId: statusUserId, status }) => {
      console.log("🔄 Status updated for user:", statusUserId, "status:", status);
    });

    // Message read receipt
    socket.on("messageRead", ({ messageId, userId: readerId }) => {
      console.log("👁️ Message read:", messageId, "by:", readerId);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId && !msg.readBy.includes(readerId)
          ? { ...msg, readBy: [...msg.readBy, readerId] }
          : msg
      ));
    });

    // Generic error
    socket.on("error", (err) => {
      console.error("❌ Socket error:", err);
      if (err.message) {
        message.error(`Socket error: ${err.message}`);
      }
    });

    // ================= CLEANUP =================
    return () => {
      console.log("🧹 Cleaning up socket listeners");
      
      // Remove all listeners
      socket.off("connect");
      socket.off("connected");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("onlineUsers");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("receiveChatMessage");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("messageReaction");
      socket.off("userStatusUpdated");
      socket.off("messageRead");
      socket.off("error");
      socket.off("roomJoined");
      socket.off("roomLeft");
      
      // Disconnect if still connected
      if (socket.connected) {
        console.log("🔌 Disconnecting socket on cleanup");
        socket.disconnect();
      }
      
      setIsSocketConnected(false);
    };
  }, [token]); // Only depend on token

  // Join room when roomId changes
  useEffect(() => {
    if (isSocketConnected && roomId && selectedRoom) {
      console.log(`🔄 Joining room ${roomId} for ${selectedRoom.name}`);
      socket.emit("joinRoom", roomId, (response) => {
        if (response?.success) {
          console.log(`✅ Successfully joined room: ${roomId}`);
        } else if (response?.error) {
          console.error(`❌ Failed to join room: ${response.error}`);
        }
      });
      
      // Clear unread count for this room
      if (unreadCounts[selectedRoom._id]) {
        setUnreadCounts(prev => ({ ...prev, [selectedRoom._id]: 0 }));
      }
    }
  }, [roomId, selectedRoom, isSocketConnected]);

  // Load Chat History
  const loadHistory = useCallback(async () => {
    if (!selectedRoom) return;

    setLoading(true);
    try {
      // Get correct room ID for API call
      const roomIdToFetch = selectedRoom._id === "global" || 
                           selectedRoom.isGroup ? 
                           selectedRoom._id : 
                           getPrivateRoomId(userId, selectedRoom._id);

      console.log(`📚 Loading history for room: ${roomIdToFetch}`);

      const res = await api.get(
        `/api/chat/history/${roomIdToFetch}`,
        authHeader(token)
      );

      console.log(`📜 Loaded ${res.data.length} messages`);

      setMessages(
        res.data.map((m) => ({
          _id: m._id,
          senderId: m.sender?._id,
          senderName: m.sender?.name || "Unknown",
          senderAvatar: m.sender?.avatar,
          message: m.message,
          timestamp: m.createdAt,
          room: m.room,
          readBy: m.readBy || [],
          reactions: m.reactions || {},
          attachments: m.attachments || [],
          edited: m.edited,
          pinned: m.pinned,
          replyTo: m.replyTo
        }))
      );
    } catch (error) {
      console.error("Failed to load messages:", error);
      message.error("Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
      setTimeout(scrollBottom, 100);
    }
  }, [selectedRoom, token, userId]);

  useEffect(() => {
    if (selectedRoom) {
      loadHistory();
    }
  }, [selectedRoom, loadHistory]);

  // Typing Indicator
  const handleTyping = () => {
    if (!selectedRoom || !isSocketConnected) return;
    
    setIsTyping(true);
    socket.emit("typing", {
      roomId,
      userId
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stopTyping", { roomId });
    }, 3000);
  };

  // Send Message
  const sendMessage = async () => {
    if (!input.trim() || !selectedRoom || !isSocketConnected) {
      if (!isSocketConnected) {
        message.error("Not connected to chat");
      }
      return;
    }

    const messageData = {
      recipientId: selectedRoom._id,
      message: input,
      replyTo: replyingTo?._id,
      attachments: []
    };

    if (editingMessage) {
      // Edit existing message via API
      try {
        await api.put(
          `/api/chat/messages/${editingMessage._id}`,
          { message: input },
          authHeader(token)
        );
        setEditingMessage(null);
        // Reload messages to show edited version
        loadHistory();
      } catch (error) {
        console.error("Edit message error:", error);
        message.error("Failed to edit message");
      }
    } else {
      // Send new message via socket with callback
      socket.emit("sendChatMessage", messageData, (response) => {
        if (response?.success) {
          console.log("✅ Message sent successfully, ID:", response.messageId);
          
          // Add message to local state immediately for instant feedback
          const tempMessage = {
            _id: response.messageId || `temp-${Date.now()}`,
            senderId: userId,
            senderName: userName,
            senderAvatar: userAvatar,
            message: input,
            timestamp: new Date(),
            room: roomId,
            readBy: [],
            reactions: {},
            attachments: [],
            edited: false,
            pinned: false,
            isPending: !response.messageId // Mark as pending if no ID yet
          };
          
          setMessages(prev => [...prev, tempMessage]);
          scrollBottom();
        } else if (response?.error) {
          console.error("❌ Message send failed:", response.error);
          message.error(`Failed to send message: ${response.error}`);
        }
      });
    }

    setInput("");
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  // File Upload
  const handleFileUpload = async (file) => {
    if (!isSocketConnected) {
      message.error("Not connected to chat");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(
        "/api/chat/upload",
        formData,
        {
          ...authHeader(token),
          "Content-Type": "multipart/form-data"
        }
      );

      const messageData = {
        recipientId: selectedRoom._id,
        message: `Sent a file: ${res.data.name}`,
        attachments: [res.data]
      };

      // Send via socket
      socket.emit("sendChatMessage", messageData, (response) => {
        if (response?.success) {
          message.success("File uploaded successfully");
        } else {
          message.error("Failed to send file");
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      message.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Message Actions
  const handleMessageAction = (action, msg) => {
    if (!isSocketConnected) {
      message.error("Not connected to chat");
      return;
    }

    switch (action) {
      case 'reply':
        setReplyingTo(msg);
        break;
      case 'edit':
        setEditingMessage(msg);
        setInput(msg.message);
        break;
      case 'delete':
        Modal.confirm({
          title: 'Delete Message',
          content: 'Are you sure you want to delete this message?',
          onOk: () => {
            socket.emit("deleteMessage", {
              messageId: msg._id,
              roomId,
              forEveryone: true
            }, (response) => {
              if (response?.success) {
                message.success("Message deleted");
              } else if (response?.error) {
                message.error(`Failed to delete: ${response.error}`);
              }
            });
          }
        });
        break;
      case 'pin':
        socket.emit("pinMessage", {
          messageId: msg._id,
          roomId
        }, (response) => {
          if (response?.success) {
            message.success(msg.pinned ? "Message unpinned" : "Message pinned");
          }
        });
        break;
      case 'copy':
        navigator.clipboard.writeText(msg.message);
        message.success("Copied to clipboard");
        break;
    }
  };

  // Start Call
  const startCall = (type = 'audio') => {
    if (!selectedRoom || !isSocketConnected) {
      message.error("Not connected to chat");
      return;
    }

    socket.emit("callUser", {
      to: selectedRoom._id,
      type,
      signal: "start"
    });

    setCallStatus({
      type: 'outgoing',
      to: selectedRoom._id,
      callType: type
    });
  };

  // Scroll to bottom
  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get typing text
  const getTypingText = () => {
    const typingUserIds = Object.keys(typingUsers).filter(id => typingUsers[id]);
    if (typingUserIds.length === 0) return null;
    
    if (typingUserIds.length === 1) {
      const user = messages.find(m => m.senderId === typingUserIds[0]);
      return `${user?.senderName || 'Someone'} is typing...`;
    }
    
    return `${typingUserIds.length} people are typing...`;
  };

  // Filter messages by view mode
  const filteredMessages = messages.filter(msg => {
    if (viewMode === 'media') {
      return msg.attachments?.some(a => a.type?.startsWith('image/'));
    }
    if (viewMode === 'files') {
      return msg.attachments?.some(a => !a.type?.startsWith('image/'));
    }
    return true;
  });

  // Handle key press for sending message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout className="chat-container">
      {/* Connection Status Indicator */}
      {!isSocketConnected && (
        <div className="connection-status">
          <Badge status="error" text="Disconnected" />
          <Button 
            type="link" 
            size="small" 
            onClick={() => connectSocket(token)}
            style={{ marginLeft: 10 }}
          >
            Reconnect
          </Button>
        </div>
      )}

      {/* Call Modal */}
      {callStatus && (
        <Modal
          title={callStatus.type === 'incoming' ? 'Incoming Call' : 'Calling...'}
          open={true}
          onCancel={() => setCallStatus(null)}
          footer={[
            callStatus.type === 'incoming' && (
              <>
                <Button key="reject" danger onClick={() => {
                  socket.emit("rejectCall", { to: callStatus.from, reason: "Rejected" });
                  setCallStatus(null);
                }}>
                  Reject
                </Button>
                <Button key="accept" type="primary" onClick={() => {
                  socket.emit("answerCall", { 
                    to: callStatus.from,
                    signal: "accept"
                  });
                }}>
                  Accept
                </Button>
              </>
            ),
            callStatus.type === 'outgoing' && (
              <Button key="cancel" danger onClick={() => {
                socket.emit("endCall", { to: callStatus.to });
                setCallStatus(null);
              }}>
                Cancel Call
              </Button>
            )
          ]}
        >
          <div className="call-modal">
            <Avatar size={80} src={selectedRoom?.avatar || userAvatar} />
            <Title level={4} className="mt-4">
              {callStatus.type === 'incoming' 
                ? `Call from ${callStatus.from}`
                : `Calling ${selectedRoom?.name}...`
              }
            </Title>
            <p className="text-gray-500">
              {callStatus.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
          </div>
        </Modal>
      )}

      <Sider 
        width={320} 
        collapsed={sidebarCollapsed}
        collapsedWidth={0}
        className="chat-sidebar"
      >
        <ChatSidebar
          userId={userId}
          token={token}
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
          onClearUnread={(roomId) => {
            setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
          }}
          onStartCall={(userId) => startCall('audio')}
          onStartVideo={(userId) => startCall('video')}
        />
      </Sider>

      <Content className="chat-content">
        <Card
          className="chat-card"
          title={
            <div className="chat-header">
              <Button
                type="text"
                icon={sidebarCollapsed ? <Menu /> : <X />}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="sidebar-toggle"
              />
              
              <div className="room-info">
                <Avatar 
                  size={40} 
                  src={selectedRoom?.avatar}
                  className="mr-3"
                />
                <div>
                  <div className="room-name">
                    <Title level={5} className="mb-0">
                      {selectedRoom?.name || "Select a chat"}
                      {!isSocketConnected && (
                        <Badge 
                          status="error" 
                          text="Offline" 
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Title>
                    {selectedRoom?.isGroup && (
                      <Tag color="blue" className="ml-2">
                        <Users size={12} /> Group
                      </Tag>
                    )}
                  </div>
                  <div className="room-status">
                    {selectedRoom && (
                      <>
                        {selectedRoom._id !== "global" && selectedRoom._id !== userId && (
                          <Badge 
                            status={selectedRoom.online ? "success" : "default"} 
                            text={
                              selectedRoom.online 
                                ? "Online" 
                                : `Last seen ${moment(selectedRoom.lastSeen).fromNow()}`
                            } 
                          />
                        )}
                        {getTypingText() && (
                          <span className="typing-indicator">
                            {getTypingText()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          }
          extra={
            selectedRoom && (
              <div className="chat-actions">
                <Tooltip title="Search">
                  <Button type="text" icon={<Search />} />
                </Tooltip>
                
                <Tooltip title="Voice Call">
                  <Button 
                    type="text" 
                    icon={<PhoneCall />}
                    onClick={() => startCall('audio')}
                    disabled={!isSocketConnected}
                  />
                </Tooltip>
                
                <Tooltip title="Video Call">
                  <Button 
                    type="text" 
                    icon={<Video />}
                    onClick={() => startCall('video')}
                    disabled={!isSocketConnected}
                  />
                </Tooltip>
                
                <Tooltip title="More Options">
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'view',
                          label: 'View Mode',
                          children: [
                            {
                              key: 'chat',
                              label: 'Chat',
                              icon: <MessageSquare size={14} />
                            },
                            {
                              key: 'media',
                              label: 'Media',
                              icon: <Image size={14} />
                            },
                            {
                              key: 'files',
                              label: 'Files',
                              icon: <File size={14} />
                            }
                          ]
                        },
                        {
                          key: 'notifications',
                          label: 'Notifications',
                          icon: <Bell size={14} />
                        },
                        {
                          key: 'mute',
                          label: 'Mute Chat',
                          icon: <VolumeX size={14} />
                        },
                        {
                          key: 'clear',
                          label: 'Clear Chat',
                          icon: <Trash2 size={14} />,
                          danger: true
                        }
                      ]
                    }}
                  >
                    <Button type="text" icon={<MoreVertical />} />
                  </Dropdown>
                </Tooltip>
              </div>
            )
          }
        >
          {/* View Mode Tabs */}
          {selectedRoom && (
            <Segmented
              options={[
                { label: 'Chat', value: 'chat', icon: <MessageSquare size={14} /> },
                { label: 'Media', value: 'media', icon: <Image size={14} /> },
                { label: 'Files', value: 'files', icon: <File size={14} /> }
              ]}
              value={viewMode}
              onChange={setViewMode}
              className="view-mode-tabs"
            />
          )}

          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
            <div className="pinned-messages">
              <Pin size={14} />
              <span>Pinned Messages</span>
              <List
                dataSource={pinnedMessages.slice(0, 2)}
                renderItem={msg => (
                  <div className="pinned-message">
                    <strong>{msg.senderName}: </strong>
                    {msg.message.substring(0, 50)}...
                  </div>
                )}
              />
            </div>
          )}

          {/* Reply Preview */}
          {replyingTo && (
            <div className="reply-preview">
              <div className="reply-info">
                <strong>Replying to {replyingTo.senderName}</strong>
                <p>{replyingTo.message.substring(0, 100)}{replyingTo.message.length > 100 ? '...' : ''}</p>
              </div>
              <Button 
                type="text" 
                icon={<X />} 
                size="small"
                onClick={() => setReplyingTo(null)}
              />
            </div>
          )}

          {/* Messages Area */}
          <Spin spinning={loading}>
            <div className="messages-container" ref={chatContainerRef}>
              {filteredMessages.length === 0 ? (
                <div className="empty-chat">
                  <MessageSquare size={64} />
                  <Title level={4}>
                    {isSocketConnected ? "No messages yet" : "Not connected"}
                  </Title>
                  <p>
                    {isSocketConnected 
                      ? "Start a conversation by sending a message!" 
                      : "Please reconnect to load messages"}
                  </p>
                  {!isSocketConnected && (
                    <Button 
                      type="primary" 
                      onClick={() => connectSocket(token)}
                      className="mt-4"
                    >
                      Reconnect
                    </Button>
                  )}
                </div>
              ) : (
                <List
                  dataSource={filteredMessages}
                  renderItem={(msg) => (
                    <div
                      className={`message-item ${
                        msg.senderId === userId ? 'sent' : 'received'
                      } ${msg.pinned ? 'pinned' : ''} ${msg.isPending ? 'pending' : ''}`}
                      id={`msg-${msg._id}`}
                    >
                      {viewMode === 'chat' && (
                        <>
                          <Avatar 
                            size={32} 
                            src={msg.senderAvatar}
                            className="message-avatar"
                          />
                          
                          <div className="message-content">
                            <div className="message-header">
                              <strong className="message-sender">
                                {msg.senderId === userId ? 'You' : msg.senderName}
                                {msg.isPending && (
                                  <Spin size="small" style={{ marginLeft: 8 }} />
                                )}
                              </strong>
                              <span className="message-time">
                                {moment(msg.timestamp).format('HH:mm')}
                                {msg.edited && <span className="edited"> (edited)</span>}
                              </span>
                            </div>

                            {/* Reply Reference */}
                            {msg.replyTo && (
                              <div className="message-reply">
                                <strong>
                                  {msg.replyTo.senderId === userId ? 'You' : msg.replyTo.senderName}
                                </strong>
                                <p>{msg.replyTo.message?.substring(0, 50)}...</p>
                              </div>
                            )}

                            {/* Message Text */}
                            <div className="message-text">
                              {msg.message}
                              
                              {/* Attachments */}
                              {msg.attachments?.map((att, idx) => (
                                <div key={idx} className="message-attachment">
                                  {att.type?.startsWith('image/') ? (
                                    <img 
                                      src={att.url} 
                                      alt="Attachment" 
                                      className="attachment-image"
                                    />
                                  ) : (
                                    <div className="attachment-file">
                                      <File size={16} />
                                      <a href={att.url} download target="_blank" rel="noopener noreferrer">
                                        {att.name}
                                      </a>
                                      <Tag size="small">{Math.round(att.size / 1024)} KB</Tag>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Reactions */}
                            {Object.keys(msg.reactions || {}).length > 0 && (
                              <div className="message-reactions">
                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <Tooltip 
                                    key={emoji} 
                                    title={users.join(', ')}
                                  >
                                    <Button size="small" className="reaction-btn">
                                      {emoji} {users.length}
                                    </Button>
                                  </Tooltip>
                                ))}
                              </div>
                            )}

                            {/* Message Status */}
                            <div className="message-status">
                              {msg.senderId === userId && (
                                <>
                                  {msg.readBy?.length > 0 ? (
                                    <CheckCheck size={14} className="text-blue-500" />
                                  ) : (
                                    <Check size={14} className="text-gray-400" />
                                  )}
                                  {msg.readBy?.length > 0 && (
                                    <span className="read-by">
                                      Read by {msg.readBy.length} 
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Message Actions */}
                            <div className="message-actions">
                              <Dropdown
                                menu={{
                                  items: [
                                    {
                                      key: 'reply',
                                      label: 'Reply',
                                      icon: <MessageSquare size={14} />,
                                      onClick: () => handleMessageAction('reply', msg),
                                      disabled: msg.isPending
                                    },
                                    msg.senderId === userId && {
                                      key: 'edit',
                                      label: 'Edit',
                                      icon: <Edit2 size={14} />,
                                      onClick: () => handleMessageAction('edit', msg),
                                      disabled: msg.isPending
                                    },
                                    {
                                      key: 'react',
                                      label: 'React',
                                      icon: <Smile size={14} />,
                                      disabled: msg.isPending
                                    },
                                    {
                                      key: 'pin',
                                      label: msg.pinned ? 'Unpin' : 'Pin',
                                      icon: <Pin size={14} />,
                                      onClick: () => handleMessageAction('pin', msg),
                                      disabled: msg.isPending
                                    },
                                    {
                                      key: 'copy',
                                      label: 'Copy',
                                      icon: <Copy size={14} />,
                                      onClick: () => handleMessageAction('copy', msg)
                                    },
                                    (msg.senderId === userId || selectedRoom?.isGroup) && {
                                      key: 'delete',
                                      label: 'Delete',
                                      icon: <Trash2 size={14} />,
                                      danger: true,
                                      onClick: () => handleMessageAction('delete', msg),
                                      disabled: msg.isPending
                                    },
                                    {
                                      key: 'report',
                                      label: 'Report',
                                      icon: <Flag size={14} />,
                                      danger: true
                                    }
                                  ].filter(Boolean)
                                }}
                                trigger={['click']}
                              >
                                <Button 
                                  type="text" 
                                  icon={<MoreVertical size={14} />}
                                  size="small"
                                  disabled={msg.isPending}
                                />
                              </Dropdown>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Media/File View */}
                      {(viewMode === 'media' || viewMode === 'files') && (
                        <div className="media-item">
                          {msg.attachments?.map((att, idx) => (
                            <div key={idx} className="media-preview">
                              {att.type?.startsWith('image/') ? (
                                <img 
                                  src={att.url} 
                                  alt="" 
                                  className="media-image"
                                />
                              ) : (
                                <div className="file-preview">
                                  <File size={24} />
                                  <span>{att.name}</span>
                                </div>
                              )}
                              <div className="media-info">
                                <span>{msg.senderName}</span>
                                <span>{moment(msg.timestamp).format('MMM D')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </Spin>

          {/* Message Input */}
          {selectedRoom && (
            <div className="message-input-container">
              {/* Attachment Button */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'image',
                      label: 'Image',
                      icon: <Image size={14} />,
                      onClick: () => fileInputRef.current?.click(),
                      disabled: !isSocketConnected
                    },
                    {
                      key: 'file',
                      label: 'File',
                      icon: <File size={14} />,
                      onClick: () => fileInputRef.current?.click(),
                      disabled: !isSocketConnected
                    },
                    {
                      key: 'camera',
                      label: 'Camera',
                      icon: <Video size={14} />,
                      disabled: !isSocketConnected
                    },
                    {
                      key: 'audio',
                      label: 'Audio Message',
                      icon: <Mic size={14} />,
                      disabled: !isSocketConnected
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button 
                  type="text" 
                  icon={<Paperclip />} 
                  className="input-action-btn"
                  loading={uploading}
                  disabled={!isSocketConnected}
                />
              </Dropdown>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files[0])}
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />

              {/* Emoji Picker */}
              <Popover
                content={
                  <div style={{ margin: '-12px -16px' }}>
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji) => {
                        setInput(prev => prev + emoji.native);
                        setShowEmojiPicker(false);
                      }}
                      theme="dark"
                      emojiSize={20}
                      perLine={8}
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                }
                open={showEmojiPicker}
                onOpenChange={setShowEmojiPicker}
                trigger="click"
                placement="topLeft"
              >
                <Button 
                  type="text" 
                  icon={<Smile />}
                  className="input-action-btn"
                  disabled={!isSocketConnected}
                />
              </Popover>

              {/* Text Input */}
              <TextArea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  !isSocketConnected 
                    ? "Not connected to chat..." 
                    : editingMessage 
                      ? "Edit your message..." 
                      : `Message ${selectedRoom?.name || ""}...`
                }
                autoSize={{ minRows: 1, maxRows: 4 }}
                className="message-input"
                disabled={!isSocketConnected}
              />

              {/* Send Button */}
              <Button
                type="primary"
                icon={<Send />}
                onClick={sendMessage}
                disabled={!input.trim() || !isSocketConnected}
                className="send-btn"
              >
                {editingMessage ? "Edit" : "Send"}
              </Button>
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
}