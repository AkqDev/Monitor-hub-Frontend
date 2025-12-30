import React, { useEffect, useState, useRef } from "react";
import { 
  Menu, Spin, Typography, Input, Button, 
  Dropdown, Avatar, Badge, Tooltip, Modal, 
  Form, Select, Tag, Divider, message
} from "antd";
import { 
  Search, Plus, Users, Globe, User, 
  Shield, MoreVertical, MessageSquare,
  Video, Phone, Edit2, Trash2, Pin,
  Check, CheckCheck, Clock, Hash,
  Volume2, VolumeX
} from "lucide-react";
import { api, authHeader } from "../../utils/api";
import moment from "moment";
import "../styles/ChatSidebar.css";

const { Title } = Typography;
const { TextArea } = Input;

export default function ChatSidebar({
  userId,
  token,
  selectedRoom,
  setSelectedRoom,
  onlineUsers = [],
  unreadCounts = {},
  onClearUnread,
  onStartCall,
  onStartVideo
}) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupForm] = Form.useForm();
  const searchRef = useRef(null);

  useEffect(() => {
    loadUsers();
  }, [token]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/chat/users", authHeader(token));
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      console.error("Failed to load users:", error);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (values) => {
    try {
      const res = await api.post(
        "/api/chat/rooms/create",
        values,
        authHeader(token)
      );
      setUsers([...users, res.data]);
      setShowGroupModal(false);
      groupForm.resetFields();
      message.success("Group created successfully!");
    } catch (error) {
      console.error("Create group error:", error);
      message.error("Failed to create group");
    }
  };

  const handleRenameChat = async () => {
    if (!selectedRoom || !newGroupName.trim()) return;
    
    try {
      await api.put(
        `/api/chat/rename/${selectedRoom._id}`,
        { name: newGroupName },
        authHeader(token)
      );
      
      setUsers(users.map(user => 
        user._id === selectedRoom._id 
          ? { ...user, name: newGroupName }
          : user
      ));
      
      setSelectedRoom({ ...selectedRoom, name: newGroupName });
      setRenameModal(false);
      setNewGroupName("");
      message.success("Chat renamed!");
    } catch (error) {
      console.error("Rename error:", error);
      message.error("Failed to rename chat");
    }
  };

  const getStatusIcon = (user) => {
    if (user._id === "global") return <Globe className="text-blue-400" />;
    if (user.role === "admin") return <Shield className="text-purple-400" />;
    if (user.isGroup) return <Users className="text-green-400" />;
    return <User className={user.online ? "text-green-400" : "text-gray-400"} />;
  };

  const getStatusText = (user) => {
    if (user._id === "global") return "Public room";
    if (user.online) return "Online";
    if (user.lastSeen) return `Last seen ${moment(user.lastSeen).fromNow()}`;
    return "Offline";
  };

  const getUserMenu = (user) => ({
    items: [
      {
        key: 'message',
        label: 'Message',
        icon: <MessageSquare size={14} />,
        onClick: () => {
          if (user._id !== userId) {
            setSelectedRoom({
              _id: user._id,
              name: user.name,
              isDM: !user.isGroup,
              isGroup: user.isGroup,
              avatar: user.avatar,
              online: user.online,
              lastSeen: user.lastSeen
            });
          }
        }
      },
      user._id !== "global" && user._id !== userId && {
        key: 'call',
        label: 'Voice Call',
        icon: <Phone size={14} />,
        onClick: () => onStartCall && onStartCall(user._id)
      },
      user._id !== "global" && user._id !== userId && {
        key: 'video',
        label: 'Video Call',
        icon: <Video size={14} />,
        onClick: () => onStartVideo && onStartVideo(user._id)
      },
      user.isGroup && {
        key: 'rename',
        label: 'Rename Group',
        icon: <Edit2 size={14} />,
        onClick: () => {
          setNewGroupName(user.name);
          setRenameModal(true);
        }
      },
      user._id !== "global" && user._id !== userId && {
        key: 'mute',
        label: user.muted ? 'Unmute' : 'Mute',
        icon: user.muted ? <Volume2 size={14} /> : <VolumeX size={14} />
      },
      {
        key: 'clear',
        label: 'Clear Chat',
        icon: <Trash2 size={14} />,
        danger: true
      }
    ].filter(Boolean)
  });

  if (loading) {
    return (
      <div className="sidebar-loading">
        <Spin size="large" />
        <p className="mt-4 text-gray-400">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <Title level={3} className="sidebar-title">
          <MessageSquare className="mr-2" />
          Messages
          <Badge 
            count={Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
            className="ml-2"
          />
        </Title>
        
        <Button
          type="primary"
          icon={<Plus />}
          shape="circle"
          size="small"
          onClick={() => setShowGroupModal(true)}
          className="create-group-btn"
        />
      </div>

      <div className="sidebar-search">
        <Input
          ref={searchRef}
          prefix={<Search size={16} />}
          placeholder="Search users or messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="search-input"
        />
      </div>

      <div className="chats-list">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className={`chat-item ${selectedRoom?._id === user._id ? 'active' : ''}`}
            onClick={() => {
              if (user._id !== userId) {
                setSelectedRoom({
                  _id: user._id,
                  name: user.name,
                  isDM: !user.isGroup,
                  isGroup: user.isGroup,
                  avatar: user.avatar,
                  online: user.online,
                  lastSeen: user.lastSeen
                });
                onClearUnread && onClearUnread(user._id);
              }
            }}
          >
            <div className="chat-avatar">
              <Badge 
                dot={user.online && user._id !== userId && user._id !== "global"}
                status={user.online ? "success" : "default"}
                offset={[-2, 32]}
              >
                <Avatar
                  size={40}
                  src={user.avatar}
                  icon={getStatusIcon(user)}
                  className={user._id === "global" ? "global-avatar" : ""}
                />
              </Badge>
            </div>

            <div className="chat-info">
              <div className="chat-header">
                <span className="chat-name">
                  {user._id === userId ? `${user.name} (You)` : user.name}
                  {user.isGroup && <Hash size={12} className="ml-1" />}
                </span>
                <span className="chat-time">
                  {user.lastMessage && moment(user.lastMessage.time).format('HH:mm')}
                </span>
              </div>

              <div className="chat-preview">
                <span className="chat-last-msg">
                  {user.lastMessage 
                    ? `${user.lastMessage.sender}: ${user.lastMessage.text.substring(0, 30)}${user.lastMessage.text.length > 30 ? '...' : ''}`
                    : "No messages yet"}
                </span>
                {unreadCounts[user._id] > 0 && (
                  <Badge count={unreadCounts[user._id]} />
                )}
              </div>

              <div className="chat-status">
                <span className={`status-dot ${user.online ? 'online' : 'offline'}`} />
                <span className="status-text">{getStatusText(user)}</span>
                {user.isGroup && (
                  <Tag color="blue" size="small">
                    {user.participants?.length || 0} members
                  </Tag>
                )}
              </div>
            </div>

            <Dropdown 
              menu={getUserMenu(user)} 
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<MoreVertical size={16} />}
                className="chat-menu-btn"
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        ))}
      </div>

      {/* Group Creation Modal */}
      <Modal
        title="Create Group Chat"
        open={showGroupModal}
        onCancel={() => setShowGroupModal(false)}
        footer={null}
        className="group-modal"
      >
        <Form form={groupForm} onFinish={handleCreateGroup}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Please enter group name' }]}
          >
            <Input placeholder="Group name" prefix={<Hash />} />
          </Form.Item>
          
          <Form.Item
            name="participants"
            rules={[{ required: true, message: 'Select at least one member' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select members"
              options={users
                .filter(u => u._id !== userId && u._id !== "global" && !u.isGroup)
                .map(u => ({
                  label: u.name,
                  value: u._id,
                  avatar: u.avatar
                }))}
              optionRender={(option) => (
                <div className="flex items-center gap-2">
                  <Avatar size={20} src={option.data.avatar} />
                  {option.label}
                </div>
              )}
            />
          </Form.Item>
          
          <Form.Item name="description">
            <TextArea placeholder="Group description (optional)" rows={2} />
          </Form.Item>
          
          <Form.Item name="isPublic" valuePropName="checked">
            <div>
              <input type="checkbox" id="isPublic" />
              <label htmlFor="isPublic" className="ml-2">Public group (anyone can join)</label>
            </div>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create Group
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Rename Chat Modal */}
      <Modal
        title="Rename Chat"
        open={renameModal}
        onCancel={() => {
          setRenameModal(false);
          setNewGroupName("");
        }}
        onOk={handleRenameChat}
        okText="Rename"
        cancelText="Cancel"
      >
        <Input
          placeholder="Enter new chat name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onPressEnter={handleRenameChat}
        />
      </Modal>
    </div>
  );
}