// components/shared/ChatSidebar.jsx 

import React, { useState, useEffect } from 'react';
import { Menu, message, Spin, Typography } from 'antd';
import { Globe, User, Shield } from 'lucide-react';
import { api, authHeader } from '../../utils/api'; 

const { Title } = Typography;

export default function ChatSidebar({ userId, token, selectedRoom, setSelectedRoom }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all users for the sidebar list
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/chat/users', authHeader(token));
                const chatUsers = res.data;
                setUsers(chatUsers);
                
                // If no room is selected yet, default to the Global Chat
                if (!selectedRoom) {
                    const globalRoom = chatUsers.find(u => u._id === 'global');
                    if (globalRoom) {
                        setSelectedRoom({ 
                            _id: globalRoom._id, 
                            name: globalRoom.name, 
                            isDM: false 
                        });
                    }
                }
            } catch (error) {
                message.error('Failed to load user list.');
                console.error('User list fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [token, selectedRoom, setSelectedRoom]);
    
    // Icon mapping function
    const getItemIcon = (user) => {
        if (user._id === 'global') return <Globe className='w-4 h-4' />;
        if (user.role === 'admin') return <Shield className='w-4 h-4 text-red-400' />;
        return <User className='w-4 h-4' />;
    };

    const handleRoomSelect = ({ key }) => {
        const user = users.find(u => u._id === key);
        if (user) {
            setSelectedRoom({
                _id: user._id,
                name: user.name,
                isDM: user._id !== 'global'
            });
        }
    };

    if (loading) {
        return <Spin tip="Loading users..." className='p-4 h-full' />;
    }

    return (
        <div className="bg-gray-800 border-r border-white/20 p-4 h-full">
            <Title level={4} className="text-white mb-4 border-b border-white/20 pb-2">Chats</Title>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[selectedRoom?._id || 'global']}
                onClick={handleRoomSelect}
                className="!bg-gray-800 text-white chat-sidebar-menu"
                items={users.map(user => ({
                    key: user._id,
                    icon: getItemIcon(user),
                    label: user._id === userId ? `${user.name} (You)` : user.name, 
                    disabled: user._id === userId 
                }))}
            />
        </div>
    );
}