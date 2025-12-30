import React, { useState, useEffect } from 'react';
import { socket } from '../../utils/socket';
import { Monitor, Camera, Globe, User, Clock, Eye } from 'lucide-react';

export default function ScreenMonitor() {
    const [liveStreams, setLiveStreams] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);

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
            
            if (!selectedUserId) setSelectedUserId(data.userId);
        };

        const handleEndStream = (userId) => {
            setLiveStreams(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            if (selectedUserId === userId) setSelectedUserId(null);
        };

        socket.on('liveStream', handleStreamData);
        socket.on('endStream', handleEndStream);

        return () => {
            socket.off('liveStream', handleStreamData);
            socket.off('endStream', handleEndStream);
        };
    }, [selectedUserId]);

    const activeUsers = Object.keys(liveStreams).map(id => ({
        id,
        ...liveStreams[id].user,
        status: 'Online'
    }));

    const selectedStream = liveStreams[selectedUserId];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[70vh]">
            {/* Sidebar */}
            <div className="md:col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 overflow-y-auto">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
                    <Globe className='w-5 h-5 text-blue-400' /> Live Streams ({activeUsers.length})
                </h3>
                {activeUsers.length === 0 ? (
                    <p className="text-purple-300 text-sm">No active monitoring sessions.</p>
                ) : (
                    activeUsers.map(user => (
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
                            <span className="text-xs font-semibold text-green-400">Online</span>
                        </div>
                    ))
                )}
            </div>

            {/* Main View */}
            <div className="md:col-span-3 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
                    <Eye className='w-6 h-6 text-amber-400' /> Live Monitor View
                </h3>

                {!selectedStream ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center text-purple-300">
                        <Monitor className='w-12 h-12 mb-4 opacity-20' />
                        <p className='text-lg'>Select a user to view their activity</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                            <div className='flex items-center gap-3'>
                                <User className='w-5 h-5 text-white' />
                                <div>
                                    <p className="text-lg text-white font-semibold">{selectedStream.user?.name}</p>
                                    <p className="text-sm text-green-400 flex items-center gap-1">
                                        <Clock className='w-3 h-3' /> Updated: {new Date(selectedStream.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-3 bg-black rounded-xl border border-white/10 p-2">
                                <h4 className='text-white text-sm mb-2 flex items-center gap-1'><Monitor className='w-4 h-4' /> Live Screen</h4>
                                <img src={selectedStream.screen} alt="Screen" className="w-full rounded-lg" />
                            </div>

                            <div className="md:col-span-1 bg-black rounded-xl border border-white/10 p-2">
                                <h4 className='text-white text-sm mb-2 flex items-center gap-1'><Camera className='w-4 h-4' /> Webcam</h4>
                                {selectedStream.webcam ? (
                                    <img src={selectedStream.webcam} alt="Webcam" className="w-full rounded-lg aspect-video object-cover" />
                                ) : (
                                    <div className='flex items-center justify-center bg-gray-800 rounded-lg aspect-video'>
                                        <Camera className='w-6 h-6 text-gray-400' />
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