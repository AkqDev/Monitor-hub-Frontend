import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../../utils/socket';
import { Monitor, Camera, Globe, User, Clock, Eye, Users, AlertCircle, Activity, RefreshCw } from 'lucide-react';

export default function ScreenMonitor({ adminUser }) {
    const [liveStreams, setLiveStreams] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [streamQuality, setStreamQuality] = useState('medium'); // low, medium, high
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const mainStreamRef = useRef(null);
    const autoRefreshRef = useRef(null);

    useEffect(() => {
        // Register admin user
        if (adminUser) {
            socket.emit('registerUser', {
                userId: adminUser?.id || adminUser?._id,
                userRole: 'admin',
                userName: adminUser?.name,
                userEmail: adminUser?.email
            });
        }

        const handleStreamData = (data) => {
            setLiveStreams(prev => ({
                ...prev,
                [data.userId]: {
                    screen: data.screen,
                    webcam: data.webcam,
                    timestamp: data.timestamp,
                    user: data.user,
                    lastUpdated: new Date().toISOString()
                }
            }));
            
            if (!selectedUserId) setSelectedUserId(data.userId);
            setLastUpdated(new Date().toLocaleTimeString());
        };

        const handleEndStream = (userId) => {
            setLiveStreams(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            if (selectedUserId === userId) setSelectedUserId(Object.keys(liveStreams)[0] || null);
        };

        const handleUserConnected = (user) => {
            setConnectedUsers(prev => {
                const exists = prev.find(u => u.userId === user.userId);
                if (exists) return prev;
                return [...prev, { ...user, lastSeen: new Date().toISOString() }];
            });
        };

        const handleUserDisconnected = (userId) => {
            setConnectedUsers(prev => prev.filter(u => u.userId !== userId));
        };

        const handleInitialStreams = (streams) => {
            const streamsObj = {};
            streams.forEach(stream => {
                streamsObj[stream.userId] = stream;
            });
            setLiveStreams(streamsObj);
            if (streams.length > 0 && !selectedUserId) {
                setSelectedUserId(streams[0].userId);
            }
        };

        // Request specific stream if needed
        const requestStream = (userId) => {
            socket.emit('requestStream', userId);
        };

        socket.on('liveStream', handleStreamData);
        socket.on('endStream', handleEndStream);
        socket.on('userConnected', handleUserConnected);
        socket.on('userDisconnected', handleUserDisconnected);
        socket.on('initialStreams', handleInitialStreams);
        socket.on('streamUpdate', handleStreamData);

        // Auto-refresh selected stream
        if (autoRefresh && selectedUserId) {
            autoRefreshRef.current = setInterval(() => {
                if (selectedUserId && liveStreams[selectedUserId]) {
                    requestStream(selectedUserId);
                }
            }, 2000);
        }

        return () => {
            socket.off('liveStream', handleStreamData);
            socket.off('endStream', handleEndStream);
            socket.off('userConnected', handleUserConnected);
            socket.off('userDisconnected', handleUserDisconnected);
            socket.off('initialStreams', handleInitialStreams);
            socket.off('streamUpdate', handleStreamData);
            
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
            }
        };
    }, [selectedUserId, autoRefresh, adminUser]);

    const activeUsers = Object.keys(liveStreams).map(id => ({
        id,
        ...liveStreams[id].user,
        status: 'Online',
        lastActivity: liveStreams[id].timestamp
    }));

    const selectedStream = liveStreams[selectedUserId];

    const handleFullscreen = () => {
        if (!mainStreamRef.current) return;
        
        if (!document.fullscreenElement) {
            mainStreamRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const refreshSelectedStream = () => {
        if (selectedUserId) {
            socket.emit('requestStream', selectedUserId);
            message.success("Stream refreshed");
        }
    };

    const getTimeSince = (timestamp) => {
        if (!timestamp) return 'N/A';
        const diff = new Date() - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[80vh]">
            {/* Sidebar */}
            <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                        <Globe className='w-5 h-5 text-blue-400' /> Active Monitors
                    </h3>
                    <div className="text-sm text-gray-300 bg-black/30 p-3 rounded-lg">
                        <p className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{activeUsers.length} employees sharing</span>
                        </p>
                        <p className="text-xs text-gray-400">Click any user to view their activity</p>
                    </div>
                </div>

                {/* User List */}
                <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                        <div className="text-center p-6 text-gray-400">
                            <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No active monitoring sessions</p>
                            <p className="text-sm mt-1">Waiting for employees to start sharing...</p>
                        </div>
                    ) : (
                        activeUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                                    selectedUserId === user.id 
                                        ? 'bg-blue-500/30 border-blue-500 shadow-lg shadow-blue-500/20' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${user.status === 'Online' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                        <div>
                                            <p className="text-white font-medium">{user.name}</p>
                                            <p className="text-gray-400 text-xs truncate max-w-[120px]">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                            LIVE
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {getTimeSince(user.lastActivity)}
                                        </p>
                                    </div>
                                </div>
                                {selectedUserId === user.id && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-300">Role:</span>
                                            <span className="text-blue-300">{user.role || 'Employee'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Statistics */}
                <div className="mt-6 p-4 bg-black/20 rounded-xl">
                    <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Statistics
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-300">Active Sessions:</span>
                            <span className="text-green-400">{activeUsers.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-300">Connected Users:</span>
                            <span className="text-blue-400">{connectedUsers.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-300">Last Update:</span>
                            <span className="text-gray-300">{lastUpdated || 'Never'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main View */}
            <div className="lg:col-span-3 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-white text-xl font-semibold flex items-center gap-2">
                            <Eye className='w-6 h-6 text-amber-400' /> Live Monitor View
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {selectedStream ? `Viewing: ${selectedStream.user?.name}` : 'Select a user to begin monitoring'}
                        </p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                autoRefresh 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-gray-500/20 text-gray-300'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                            Auto-refresh
                        </button>
                    </div>
                </div>

                {!selectedStream ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center">
                        <Monitor className='w-24 h-24 mb-6 text-gray-400 opacity-30' />
                        <p className='text-xl text-white mb-2'>No Stream Selected</p>
                        <p className='text-gray-400 max-w-md'>
                            Select an employee from the sidebar to view their screen and webcam feed in real-time.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6" ref={mainStreamRef}>
                        {/* User Info Bar */}
                        <div className="bg-gradient-to-r from-black/40 to-black/20 rounded-xl p-4 border border-white/10">
                            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                                <div className='flex items-center gap-4'>
                                    <div className="bg-blue-500/20 p-3 rounded-lg">
                                        <User className='w-6 h-6 text-white' />
                                    </div>
                                    <div>
                                        <p className="text-xl text-white font-semibold">{selectedStream.user?.name}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-sm text-gray-300">{selectedStream.user?.email}</p>
                                            <p className="text-sm text-green-400 flex items-center gap-1">
                                                <Clock className='w-3 h-3' /> Updated: {new Date(selectedStream.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleFullscreen}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                                    >
                                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                    </button>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-green-400">LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Stream Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Main Screen */}
                            <div className="lg:col-span-3">
                                <div className="bg-black rounded-xl border-2 border-white/10 overflow-hidden">
                                    <div className="bg-black/80 p-3 border-b border-white/10 flex items-center justify-between">
                                        <h4 className='text-white font-medium flex items-center gap-2'>
                                            <Monitor className='w-5 h-5' /> Live Screen Feed
                                        </h4>
                                        <span className="text-xs text-gray-400">
                                            Resolution: 1280x720 | FPS: ~15
                                        </span>
                                    </div>
                                    <div className="p-2">
                                        <img 
                                            src={selectedStream.screen} 
                                            alt="Screen" 
                                            className="w-full rounded-lg max-h-[500px] object-contain"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Webcam & Info */}
                            <div className="space-y-6">
                                {/* Webcam */}
                                <div className="bg-black rounded-xl border-2 border-white/10 overflow-hidden">
                                    <div className="bg-black/80 p-3 border-b border-white/10">
                                        <h4 className='text-white font-medium flex items-center gap-2'>
                                            <Camera className='w-5 h-5' /> Webcam Feed
                                        </h4>
                                    </div>
                                    <div className="p-2">
                                        {selectedStream.webcam ? (
                                            <img 
                                                src={selectedStream.webcam} 
                                                alt="Webcam" 
                                                className="w-full rounded-lg aspect-video object-cover"
                                            />
                                        ) : (
                                            <div className='flex flex-col items-center justify-center bg-gray-900 rounded-lg aspect-video p-4'>
                                                <Camera className='w-12 h-12 text-gray-600 mb-3' />
                                                <p className="text-gray-400 text-sm text-center">Webcam not available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stream Info */}
                                <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4">
                                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" /> Stream Information
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-400">Session Started</p>
                                            <p className="text-white text-sm">
                                                {new Date(selectedStream.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Last Update</p>
                                            <p className="text-green-400 text-sm">
                                                {getTimeSince(selectedStream.lastUpdated)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Stream Quality</p>
                                            <p className="text-white text-sm capitalize">{streamQuality}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
