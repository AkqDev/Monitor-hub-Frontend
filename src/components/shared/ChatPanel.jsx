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
  MessageSquare  // ADD THIS LINE
} from "lucide-react";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import moment from "moment";
import ChatSidebar from "./ChatSidebar";
import { socket } from "../../utils/socket";
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
  const [viewMode, setViewMode] = useState("chat"); // chat, media, files
  const [callStatus, setCallStatus] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);

  const roomId = selectedRoom?.isDM
    ? getPrivateRoomId(userId, selectedRoom._id)
    : selectedRoom?.isGroup ? selectedRoom._id : "global";

  // Socket Connection
  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();

    socket.on("connect", () => {
      message.success("Connected to chat");
      socket.emit("joinRoom", roomId);
    });

    socket.on("disconnect", () => message.warning("Disconnected"));
    
    socket.on("userOnline", (userId) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });
    
    socket.on("userOffline", (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });
    
    socket.on("typing", ({ userId: typingUserId, roomId: typingRoomId }) => {
      if (typingRoomId === roomId) {
        setTypingUsers(prev => ({ ...prev, [typingUserId]: true }));
        setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [typingUserId]: false }));
        }, 3000);
      }
    });

    socket.on("callIncoming", ({ from, signal }) => {
      setCallStatus({ from, signal, type: 'incoming' });
    });

    socket.on("callAccepted", ({ signal }) => {
      setCallStatus(prev => ({ ...prev, connected: true }));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("typing");
      socket.off("callIncoming");
      socket.off("callAccepted");
    };
  }, [token, roomId]);

  // Load Chat History
  const loadHistory = useCallback(async () => {
    if (!roomId || !selectedRoom) return;

    setLoading(true);
    try {
      const res = await api.get(
        `/api/chat/history/${selectedRoom._id}`,
        authHeader(token)
      );

      setMessages(
        res.data.map((m) => ({
          _id: m._id,
          senderId: m.sender._id,
          senderName: m.sender.name,
          senderAvatar: m.sender.avatar,
          message: m.message,
          timestamp: m.createdAt,
          room: m.room,
          readBy: m.readBy || [],
          reactions: m.reactions || {},
          attachments: m.attachments || [],
          edited: m.edited,
          pinned: m.pinned
        }))
      );
    } catch {
      message.error("Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  }, [roomId, token, selectedRoom]);

  useEffect(() => {
    if (selectedRoom) {
      loadHistory();
      // Clear unread count when opening chat
      if (unreadCounts[selectedRoom._id]) {
        setUnreadCounts(prev => ({ ...prev, [selectedRoom._id]: 0 }));
      }
    }
  }, [selectedRoom, loadHistory]);

  // Receive Messages
  useEffect(() => {
    const handler = (msg) => {
      if (msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
        scrollBottom();
      } else {
        // Increment unread count for other rooms
        const msgRoom = msg.recipientId === userId ? msg.senderId : msg.room;
        setUnreadCounts(prev => ({
          ...prev,
          [msgRoom]: (prev[msgRoom] || 0) + 1
        }));
      }
    };

    socket.on("receiveChatMessage", handler);
    return () => socket.off("receiveChatMessage", handler);
  }, [roomId, userId]);

  // Typing Indicator
  const handleTyping = () => {
    if (!selectedRoom) return;
    
    socket.emit("typing", {
      roomId,
      userId
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  // Send Message
  const sendMessage = async () => {
    if (!input.trim() || !selectedRoom) return;

    const messageData = {
      recipientId: selectedRoom._id,
      message: input,
      replyTo: replyingTo?._id,
      attachments: []
    };

    if (editingMessage) {
      // Edit existing message
      socket.emit("editMessage", {
        messageId: editingMessage._id,
        newContent: input,
        roomId
      });
      setEditingMessage(null);
    } else {
      // Send new message
      socket.emit("sendChatMessage", messageData);
    }

    setInput("");
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  // File Upload
  const handleFileUpload = async (file) => {
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
        message: "",
        attachments: [res.data]
      };

      socket.emit("sendChatMessage", messageData);
      message.success("File uploaded successfully");
    } catch {
      message.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Message Actions
  const handleMessageAction = (action, message) => {
    switch (action) {
      case 'reply':
        setReplyingTo(message);
        break;
      case 'edit':
        setEditingMessage(message);
        setInput(message.message);
        break;
      case 'delete':
        Modal.confirm({
          title: 'Delete Message',
          content: 'Are you sure you want to delete this message?',
          onOk: () => {
            socket.emit("deleteMessage", {
              messageId: message._id,
              roomId
            });
          }
        });
        break;
      case 'pin':
        socket.emit("pinMessage", {
          messageId: message._id,
          roomId
        });
        break;
      case 'react':
        // Open reaction picker
        break;
      case 'copy':
        navigator.clipboard.writeText(message.message);
        message.success("Copied to clipboard");
        break;
    }
  };

  // Start Call
  const startCall = (type = 'audio') => {
    if (!selectedRoom) return;

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

  return (
    <Layout className="chat-container">
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
                  socket.emit("callRejected", { to: callStatus.from });
                  setCallStatus(null);
                }}>
                  Reject
                </Button>
                <Button key="accept" type="primary" onClick={() => {
                  socket.emit("callAccepted", { 
                    to: callStatus.from,
                    signal: "accept"
                  });
                }}>
                  Accept
                </Button>
              </>
            ),
            callStatus.type === 'outgoing' && (
              <Button key="cancel" onClick={() => setCallStatus(null)}>
                Cancel
              </Button>
            )
          ]}
        >
          <div className="call-modal">
            <Avatar size={80} src={selectedRoom?.avatar} />
            <Title level={4} className="mt-4">
              {callStatus.type === 'incoming' 
                ? `Call from ${callStatus.from}`
                : `Calling ${selectedRoom?.name}...`
              }
            </Title>
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
                  />
                </Tooltip>
                
                <Tooltip title="Video Call">
                  <Button 
                    type="text" 
                    icon={<Video />}
                    onClick={() => startCall('video')}
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
                <p>{replyingTo.message}</p>
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
                  <Title level={4}>No messages yet</Title>
                  <p>Start a conversation by sending a message!</p>
                </div>
              ) : (
                <List
                  dataSource={filteredMessages}
                  renderItem={(msg) => (
                    <div
                      className={`message-item ${
                        msg.senderId === userId ? 'sent' : 'received'
                      } ${msg.pinned ? 'pinned' : ''}`}
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
                                <p>{msg.replyTo.message}</p>
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
                                      <a href={att.url} download>
                                        {att.name}
                                      </a>
                                      <Tag size="small">{att.size}</Tag>
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
                                      onClick: () => handleMessageAction('reply', msg)
                                    },
                                    msg.senderId === userId && {
                                      key: 'edit',
                                      label: 'Edit',
                                      icon: <Edit2 size={14} />,
                                      onClick: () => handleMessageAction('edit', msg)
                                    },
                                    {
                                      key: 'react',
                                      label: 'React',
                                      icon: <Smile size={14} />
                                    },
                                    {
                                      key: 'pin',
                                      label: msg.pinned ? 'Unpin' : 'Pin',
                                      icon: <Pin size={14} />,
                                      onClick: () => handleMessageAction('pin', msg)
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
                                      onClick: () => handleMessageAction('delete', msg)
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
                      onClick: () => fileInputRef.current?.click()
                    },
                    {
                      key: 'file',
                      label: 'File',
                      icon: <File size={14} />,
                      onClick: () => fileInputRef.current?.click()
                    },
                    {
                      key: 'camera',
                      label: 'Camera',
                      icon: <Video size={14} />
                    },
                    {
                      key: 'audio',
                      label: 'Audio Message',
                      icon: <Mic size={14} />
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
  />
</Popover>
              {/* Text Input */}
              <TextArea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  editingMessage 
                    ? "Edit your message..." 
                    : `Message ${selectedRoom?.name || ""}...`
                }
                autoSize={{ minRows: 1, maxRows: 4 }}
                className="message-input"
              />

              {/* Send Button */}
              <Button
                type="primary"
                icon={<Send />}
                onClick={sendMessage}
                disabled={!input.trim()}
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
