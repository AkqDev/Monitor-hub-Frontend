// components/shared/ChatPanel.jsx 

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Input, Button, List, message, Spin, Layout } from 'antd';
import { MessageSquare, Send } from 'lucide-react';
import moment from 'moment';
import ChatSidebar from './ChatSidebar'; 
import { socket } from "../../utils/socket";
import { api, authHeader } from '../../utils/api';

const { Sider, Content } = Layout;

// Helper to get consistent DM room ID (must match backend)
const getPrivateRoomId = (user1Id, user2Id) => {
    const sortedIds = [user1Id, user2Id].sort();
    return sortedIds.join('_');
};

export default function ChatPanel({ userId, userName, token }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null); 
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getCurrentHistoryRoomId = selectedRoom?.isDM 
        ? getPrivateRoomId(userId, selectedRoom._id) // Corrected DM Room ID calculation
        : 'global';

    const fetchChatHistory = useCallback(async (roomId) => {
        if (!roomId) return;

        setLoadingHistory(true);
        let timeout;

        // Start a 5-second timeout for the spinner
        timeout = setTimeout(() => {
            setLoadingHistory(false);
            if (!messages.length) {
                // Only show an error if no messages were loaded at all
                message.warning('Chat history loading timed out.');
            }
        }, 5000); // 5-second maximum display time for spinner

        try {
            const res = await api.get(`/api/chat/history/${roomId}`, authHeader(token)); 
            
            const history = res.data.map(m => ({
                senderId: m.sender._id,
                senderName: m.sender.name,
                message: m.message,
                timestamp: m.createdAt,
                room: m.room, 
            }));
            setMessages(history);
        } catch (error) {
            message.error('Failed to load chat history.');
            console.error(error);
            setMessages([]);
        } finally {
            clearTimeout(timeout); // Clear timeout if history loads fast
            setLoadingHistory(false);
        }
    }, [token, messages.length, userId]); // Include userId in dependencies

    // Socket Connection Setup
    useEffect(() => {
        if (token && !socket.connected) {
            socket.auth = { token };
            socket.connect();
        }

        socket.on('connect', () => {
            message.success('Real-time chat connected!');
        });
        
        socket.on('disconnect', () => {
            message.warning('Real-time chat disconnected.');
        });
        
        socket.on('connect_error', (err) => {
             console.error("Socket Connection Error:", err.message);
             if (err.message.includes('Authentication error')) {
                 message.error('Chat authentication failed. Please re-login.');
             }
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [token]);

    // Message Receiving and History Loading
    useEffect(() => {
        if (!selectedRoom) return;
        
        // This calculates the necessary room ID for filtering incoming messages
        const currentDmRoomId = selectedRoom._id === 'global' 
            ? 'global' 
            : getPrivateRoomId(userId, selectedRoom._id);

        const isMessageForCurrentRoom = (msg) => {
            return msg.room === currentDmRoomId;
        };

        const handleReceiveMessage = (msg) => {
            if (isMessageForCurrentRoom(msg)) {
                setMessages(prev => [...prev, msg]);
            }
        };

        socket.on('receiveChatMessage', handleReceiveMessage);
        socket.on('receivePrivateMessage', handleReceiveMessage);

        fetchChatHistory(currentDmRoomId); // Pass the calculated room ID for history

        return () => {
            socket.off('receiveChatMessage', handleReceiveMessage);
            socket.off('receivePrivateMessage', handleReceiveMessage);
        };
    }, [selectedRoom, fetchChatHistory, userId]);

    // Scroll to bottom when messages update
    useEffect(() => {
        // Only scroll when loading is complete to ensure scroll position is correct
        if (!loadingHistory) {
            scrollToBottom();
        }
    }, [messages, loadingHistory]);

    const handleSendMessage = () => {
        if (!inputMessage.trim() || !selectedRoom || !socket.connected) return;

        const msgData = {
            message: inputMessage,
            recipientId: selectedRoom._id, // This is the target ID (global or user ID)
        };

        socket.emit('sendChatMessage', msgData);

        setInputMessage('');
    };

    const isMyMessage = (msg) => msg.senderId === userId;

    return (
        <Layout className='h-[70vh] bg-transparent'>
            {/* Sidebar for Users/Rooms */}
            <Sider width={250} className='!bg-gray-800 rounded-l-2xl border-r border-white/20'>
                <ChatSidebar 
                    userId={userId}
                    token={token}
                    selectedRoom={selectedRoom}
                    setSelectedRoom={setSelectedRoom}
                />
            </Sider>

            {/* Main Chat Panel */}
            <Content>
                <Card
                    title={<div className="flex items-center gap-2 text-white">
                        <MessageSquare className='w-5 h-5 text-purple-400' /> 
                        {selectedRoom ? selectedRoom.name : 'Select a Chat'} 
                    </div>}
                    className="bg-white/10 backdrop-blur-xl rounded-r-2xl border border-white/20 h-full flex flex-col"
                    // FIXED: Replaced bodyStyle with styles.body
                    styles={{ body: { flexGrow: 1, padding: 0 } }} 
                >
                    <Spin 
                        spinning={loadingHistory} 
                        // Removed the 'tip' prop to meet the requirement (show no text)
                        className='h-full'
                    >
                        <div className='flex-grow overflow-y-auto p-4' style={{ height: 'calc(100% - 70px)' }}>
                            <List
                                dataSource={messages}
                                locale={{ emptyText: <span className='text-purple-300'>No messages yet. Start the conversation!</span> }}
                                renderItem={msg => (
                                    <div className={`flex mb-3 ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                                            isMyMessage(msg) 
                                                ? 'bg-purple-600 text-white rounded-br-none' 
                                                : 'bg-gray-700 text-white rounded-tl-none'
                                        }`}>
                                            <div className='flex justify-between items-center mb-1'>
                                                <span className={`text-sm font-semibold ${isMyMessage(msg) ? 'text-purple-200' : 'text-blue-300'}`}>
                                                    {isMyMessage(msg) ? 'You' : msg.senderName}
                                                </span>
                                                <span className='text-xs text-gray-400 ml-3'>
                                                    {moment(msg.timestamp).format('h:mm A')}
                                                </span>
                                            </div>
                                            <p className='text-sm'>{msg.message}</p>
                                        </div>
                                    </div>
                                )}
                            />
                            <div ref={messagesEndRef} />
                        </div>
                    </Spin>

                    <div className='p-4 border-t border-white/20 flex gap-2'>
                        <Input
                            placeholder={`Message ${selectedRoom ? selectedRoom.name : '...'}`}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onPressEnter={handleSendMessage}
                            className='dark-input'
                            disabled={!selectedRoom || !socket.connected}
                        />
                        <Button 
                            type="primary" 
                            onClick={handleSendMessage} 
                            icon={<Send className='w-4 h-4' />}
                            className='!bg-blue-500 hover:!bg-blue-600 border-none'
                            disabled={!inputMessage.trim() || !selectedRoom || !socket.connected}
                        >
                            Send
                        </Button>
                    </div>
                </Card>
            </Content>
        </Layout>
    );
}