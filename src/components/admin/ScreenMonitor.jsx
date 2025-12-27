import React, { useState, useEffect } from 'react';
import { socket } from '../../utils/socket';
import { Monitor, Camera, Globe, User, Clock, Eye } from 'lucide-react'; // Added Eye icon
import { Loader } from 'lucide-react'; // Added Loader icon

export default function ScreenMonitor() {
    // Stores stream data: { userId: { screen: dataURL, webcam: dataURL, timestamp: ISOString, user: {name, email} } }
    const [liveStreams, setLiveStreams] = useState({});
    const [activeUsers, setActiveUsers] = useState([]); // List of users to monitor
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Placeholder for STREAM_INTERVAL (must be defined in the component or imported)
    const STREAM_INTERVAL = 5000; // 5 seconds (matched employee component)

    // 1. Socket Listener for Real-time Stream Data
    useEffect(() => {
        const handleStreamData = (data) => {
            setLiveStreams(prev => ({
                ...prev,
                [data.userId]: {
                    screen: data.screen,
                    webcam: data.webcam,
                    timestamp: data.timestamp,
                    user: data.user,
                }
            }));
            
            // Update the list of active users for the sidebar/selector
            setActiveUsers(prev => {
                const isNew = !prev.find(u => u.id === data.userId);
                if (isNew) {
                    return [...prev, { id: data.userId, name: data.user.name, email: data.user.email }];
                }
                return prev;
            });

            if (!selectedUserId) {
                setSelectedUserId(data.userId); // Auto-select the first stream
            }
        };

        // Listen for an employee going offline or checking out (Backend should send this)
        const handleEndStream = (userId) => {
            setLiveStreams(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            setActiveUsers(prev => prev.filter(u => u.id !== userId));
            if (selectedUserId === userId) {
                setSelectedUserId(null); // Deselect if the current stream ends
            }
        };

        socket.on('liveStream', handleStreamData);
        socket.on('endStream', handleEndStream);

        return () => {
            socket.off('liveStream', handleStreamData);
            socket.off('endStream', handleEndStream);
        };
    }, [selectedUserId]);

    const selectedStream = liveStreams[selectedUserId];
    const userList = activeUsers.map(user => ({
        ...user,
        status: liveStreams[user.id] ? 'Online' : 'Offline' // Online means actively streaming now
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[70vh]">
            {/* Sidebar: Active Stream List */}
            <div className="md:col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 overflow-y-auto">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
                    <Globe className='w-5 h-5 text-blue-400' /> Live Streams ({userList.length})
                </h3>
                {userList.length === 0 ? (
                    <p className="text-purple-300 text-sm">No active monitoring sessions.</p>
                ) : (
                    userList.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer mb-2 transition-all ${
                                selectedUserId === user.id ? 'bg-blue-500/30 border-l-4 border-blue-500' : 'hover:bg-white/10'
                            }`}
                        >
                            <div>
                                <p className="text-white font-medium">{user.name}</p>
                                <p className="text-purple-300 text-xs">{user.email}</p>
                            </div>
                            <span className={`text-xs font-semibold ${user.status === 'Online' ? 'text-green-400' : 'text-gray-400'}`}>
                                {user.status}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Main Monitor Area */}
            <div className="md:col-span-3 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
                    <Eye className='w-6 h-6 text-amber-400' /> Live Monitor View
                </h3>

                {!selectedStream ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-purple-300">
                        <Monitor className='w-12 h-12 mb-4' />
                        <p className='text-lg'>Select an active employee from the left panel to view their live screen and webcam.</p>
                        <p className='text-sm mt-2'>Data updates every {STREAM_INTERVAL / 1000} seconds.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stream Info Header */}
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                            <div className='flex items-center gap-3'>
                                <User className='w-5 h-5 text-white' />
                                <div>
                                    <p className="text-lg text-white font-semibold">{selectedStream.user?.name}</p>
                                    <p className="text-sm text-green-400 flex items-center gap-1">
                                        <Clock className='w-3 h-3' /> Active since {new Date(selectedStream.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm text-white font-medium bg-blue-500/50 px-3 py-1 rounded-full">Viewing Live</span>
                        </div>
                        
                        {/* Screen and Webcam Streams */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            
                            {/* Screen Stream (Primary) */}
                            <div className="md:col-span-3 bg-black rounded-xl border border-white/10 p-2">
                                <h4 className='text-white text-sm mb-2 flex items-center gap-1'><Monitor className='w-4 h-4' /> Live Screen</h4>
                                <img 
                                    src={selectedStream.screen} 
                                    alt="Employee Screen Stream"
                                    className="w-full rounded-lg max-h-[500px] object-contain"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "placeholder_image_path"; }}
                                />
                            </div>

                            {/* Webcam Stream (Secondary) */}
                            <div className="md:col-span-1 bg-black rounded-xl border border-white/10 p-2">
                                <h4 className='text-white text-sm mb-2 flex items-center gap-1'><Camera className='w-4 h-4' /> Live Webcam</h4>
                                {selectedStream.webcam ? (
                                    <img 
                                        src={selectedStream.webcam} 
                                        alt="Employee Webcam Stream"
                                        className="w-full rounded-lg object-cover aspect-video"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "placeholder_image_path"; }}
                                    />
                                ) : (
                                    <div className='flex flex-col items-center justify-center bg-gray-800 rounded-lg aspect-video'>
                                        <Camera className='w-6 h-6 text-gray-400 mb-2' />
                                        <p className='text-gray-400 text-sm'>Webcam Offline</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}