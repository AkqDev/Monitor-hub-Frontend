import React, { useState, useRef, useEffect } from "react";
import { socket } from "../../utils/socket";
import { Monitor, Camera, Play, StopCircle, Eye, Users } from "lucide-react";
import { message } from "antd";

const STREAM_INTERVAL = 3000; // Increased frequency for smoother updates

export default function ScreenMonitoring({ user }) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [localScreenPreview, setLocalScreenPreview] = useState(null);
    const [localWebcamPreview, setLocalWebcamPreview] = useState(null);
    const [streamStats, setStreamStats] = useState({
        fps: 0,
        lastUpdate: null,
        frameCount: 0
    });
    
    const screenVideoRef = useRef(null);
    const webcamVideoRef = useRef(null);
    const intervalRef = useRef(null);
    const streamsRef = useRef({ screen: null, webcam: null });
    const frameCountRef = useRef(0);
    const lastUpdateRef = useRef(Date.now());

    useEffect(() => {
        // Register user with socket
        if (user) {
            socket.emit('registerUser', {
                userId: user?.id || user?._id,
                userRole: 'employee',
                userName: user?.name,
                userEmail: user?.email
            });
        }

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (isStreaming) {
                stopMonitoring();
            }
        };
    }, [user]);

    const captureFrame = (video) => {
        if (!video || video.paused || video.ended || video.readyState < 2) return null;
        
        const canvas = document.createElement("canvas");
        // Adjust dimensions for better quality/performance balance
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.7); // Increased quality
    };

    const startMonitoring = async () => {
        try {
            // Request screen sharing with system audio (optional)
            const screen = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "monitor",
                    frameRate: { ideal: 15, max: 30 }
                },
                audio: false, // Set to true if you want system audio
            });

            // Request webcam
            let webcam = null;
            try {
                webcam = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 15 }
                    },
                    audio: false
                });
            } catch (camErr) {
                console.warn("Webcam not available:", camErr);
                message.warning("Webcam access denied. Screen only mode.");
            }

            streamsRef.current = { screen, webcam };

            // Set up video elements
            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = screen;
                screenVideoRef.current.play();
            }

            if (webcam && webcamVideoRef.current) {
                webcamVideoRef.current.srcObject = webcam;
                webcamVideoRef.current.play();
            }

            setIsStreaming(true);
            message.success("Screen sharing started! Admins can now view your screen.");
            
            // Reset stats
            frameCountRef.current = 0;
            lastUpdateRef.current = Date.now();

            // Start sending frames
            intervalRef.current = setInterval(() => {
                const screenData = captureFrame(screenVideoRef.current);
                const webcamData = webcam ? captureFrame(webcamVideoRef.current) : null;
                
                if (screenData) {
                    // Update local preview
                    setLocalScreenPreview(screenData);
                    if (webcamData) setLocalWebcamPreview(webcamData);
                    
                    // Send to server
                    socket.emit("streamData", {
                        userId: user?.id || user?._id,
                        user: {
                            name: user?.name,
                            email: user?.email,
                            role: user?.role
                        },
                        screen: screenData,
                        webcam: webcamData,
                        timestamp: new Date().toISOString(),
                    });

                    // Update FPS stats
                    frameCountRef.current++;
                    const now = Date.now();
                    if (now - lastUpdateRef.current >= 1000) {
                        const fps = Math.round((frameCountRef.current * 1000) / (now - lastUpdateRef.current));
                        setStreamStats({
                            fps,
                            lastUpdate: new Date().toLocaleTimeString(),
                            frameCount: frameCountRef.current
                        });
                        frameCountRef.current = 0;
                        lastUpdateRef.current = now;
                    }
                }
            }, STREAM_INTERVAL);

            // Auto stop when browser sharing stops
            screen.getVideoTracks()[0].onended = () => {
                message.warning("Screen sharing stopped by browser");
                stopMonitoring();
            };

            if (webcam) {
                webcam.getVideoTracks()[0].onended = () => {
                    message.info("Webcam disconnected");
                    // Don't stop screen sharing, just update state
                    streamsRef.current.webcam = null;
                };
            }

        } catch (err) {
            console.error("Stream Error:", err);
            if (err.name === 'NotAllowedError') {
                message.error("Permission denied. Please allow screen sharing.");
            } else if (err.name === 'NotFoundError') {
                message.error("No screen/window available to share.");
            } else {
                message.error(`Error: ${err.message}`);
            }
        }
    };

    const stopMonitoring = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Stop all tracks
        if (streamsRef.current.screen) {
            streamsRef.current.screen.getTracks().forEach(track => track.stop());
        }
        if (streamsRef.current.webcam) {
            streamsRef.current.webcam.getTracks().forEach(track => track.stop());
        }

        streamsRef.current = { screen: null, webcam: null };
        setIsStreaming(false);
        setLocalScreenPreview(null);
        setLocalWebcamPreview(null);

        // Notify server
        socket.emit("endStream", user?.id || user?._id);
        message.info("Screen sharing stopped.");
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-xl flex items-center gap-2">
                    <Monitor className="w-6 h-6 text-blue-400" /> Work Session Monitoring
                </h3>
                {isStreaming && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span>LIVE</span>
                        </div>
                        <div className="text-xs text-gray-300">
                            FPS: {streamStats.fps} | Frames: {streamStats.frameCount}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Screen Display */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Screen Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-black/50 rounded-xl border-2 border-white/10 overflow-hidden">
                        <div className="bg-black/80 p-3 border-b border-white/10">
                            <h4 className="text-white font-medium flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Your Screen Preview
                            </h4>
                        </div>
                        <div className="min-h-[400px] flex items-center justify-center p-4">
                            {localScreenPreview ? (
                                <img 
                                    src={localScreenPreview} 
                                    alt="Screen Preview" 
                                    className="w-full max-h-[400px] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg">Screen preview will appear here</p>
                                    <p className="text-sm mt-2">Click "Start Sharing" to begin</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Webcam Preview & Stats */}
                <div className="space-y-6">
                    {/* Webcam Preview */}
                    <div className="bg-black/50 rounded-xl border-2 border-white/10 overflow-hidden">
                        <div className="bg-black/80 p-3 border-b border-white/10">
                            <h4 className="text-white font-medium flex items-center gap-2">
                                <Camera className="w-4 h-4" /> Webcam Preview
                            </h4>
                        </div>
                        <div className="min-h-[200px] flex items-center justify-center p-4">
                            {localWebcamPreview ? (
                                <img 
                                    src={localWebcamPreview} 
                                    alt="Webcam Preview" 
                                    className="w-full h-[180px] object-cover rounded-lg"
                                />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Webcam feed will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4">
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Sharing Status
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Status:</span>
                                <span className={isStreaming ? "text-green-400 font-semibold" : "text-yellow-400"}>
                                    {isStreaming ? "ACTIVE" : "INACTIVE"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Last Update:</span>
                                <span className="text-gray-300">{streamStats.lastUpdate || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Admins Viewing:</span>
                                <span className="text-blue-400">Real-time</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                {!isStreaming ? (
                    <button
                        onClick={startMonitoring}
                        className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold text-lg group"
                    >
                        <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Start Screen Sharing
                    </button>
                ) : (
                    <button
                        onClick={stopMonitoring}
                        className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold text-lg group"
                    >
                        <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Stop Sharing
                    </button>
                )}

                {isStreaming && (
                    <button
                        onClick={() => {
                            // Force refresh stream
                            const screenData = captureFrame(screenVideoRef.current);
                            if (screenData) {
                                setLocalScreenPreview(screenData);
                                message.success("Preview refreshed");
                            }
                        }}
                        className="px-6 py-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/50 rounded-xl transition-colors"
                    >
                        Refresh Preview
                    </button>
                )}
            </div>

            {/* Hidden video elements for capture */}
            <div className="hidden">
                <video ref={screenVideoRef} autoPlay muted playsInline />
                <video ref={webcamVideoRef} autoPlay muted playsInline />
            </div>

            {/* Status Message */}
            {isStreaming && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-400 text-center font-medium">
                        ✓ Your screen is being shared with administrators in real-time
                    </p>
                    <p className="text-green-300/80 text-sm text-center mt-2">
                        Remember: Only share work-related content. Your activity is being monitored for security purposes.
                    </p>
                </div>
            )}

            {/* Tips */}
            {!isStreaming && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <h4 className="text-blue-300 font-medium mb-2">Tips for better sharing:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Select "Entire Screen" for the best experience</li>
                        <li>• Close unnecessary applications for better performance</li>
                        <li>• Ensure good lighting for webcam visibility</li>
                        <li>• Use Chrome or Edge for optimal performance</li>
                    </ul>
                </div>
            )}
        </div>
    );
}