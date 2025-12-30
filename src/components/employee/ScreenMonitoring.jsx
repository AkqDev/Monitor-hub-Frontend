import React, { useState, useRef } from "react";
import { socket } from "../../utils/socket";
import { Monitor, Camera, Play, StopCircle } from "lucide-react";
import { message } from "antd";

const STREAM_INTERVAL = 5000;

export default function ScreenMonitoring({ user }) {
    const [isStreaming, setIsStreaming] = useState(false);
    const screenVideoRef = useRef(null);
    const webcamVideoRef = useRef(null);
    const intervalRef = useRef(null);
    const streamsRef = useRef({ screen: null, webcam: null });

    const captureFrame = (video) => {
        if (!video || video.paused || video.ended || video.readyState < 2) return null;
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.4);
    };

    const startMonitoring = async () => {
        try {
            // ✅ Screen capture (audio explicitly disabled)
            const screen = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });

            // ✅ Webcam capture (optional)
            let webcam = null;
            try {
                webcam = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            } catch (camErr) {
                console.warn("Webcam not available:", camErr.name);
                message.warning("Webcam access denied. Screen only mode started.");
            }

            streamsRef.current = { screen, webcam };

            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = screen;
            }

            if (webcam && webcamVideoRef.current) {
                webcamVideoRef.current.srcObject = webcam;
            }

            setIsStreaming(true);
            message.success("Monitoring session started.");

            intervalRef.current = setInterval(() => {
                const screenData = captureFrame(screenVideoRef.current);
                const webcamData = webcam
                    ? captureFrame(webcamVideoRef.current)
                    : null;

                if (screenData) {
                    socket.emit("streamData", {
                        userId: user?.id || user?._id,
                        user: {
                            name: user?.name,
                            email: user?.email,
                        },
                        screen: screenData,
                        webcam: webcamData,
                        timestamp: new Date().toISOString(),
                    });
                }
            }, STREAM_INTERVAL);

            // ✅ Auto stop when user clicks "Stop Sharing" in browser
            screen.getVideoTracks()[0].onended = stopMonitoring;

        } catch (err) {
            console.error("STREAM ERROR:", err.name, err.message);
            message.error(`${err.name}: ${err.message}`);
        }
    };

    const stopMonitoring = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (streamsRef.current.screen) {
            streamsRef.current.screen.getTracks().forEach((t) => t.stop());
        }

        if (streamsRef.current.webcam) {
            streamsRef.current.webcam.getTracks().forEach((t) => t.stop());
        }

        streamsRef.current = { screen: null, webcam: null };
        setIsStreaming(false);

        socket.emit("endStream", user?.id || user?._id);
        message.info("Monitoring stopped.");
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
            <h3 className="text-white font-semibold mb-4 flex items-center justify-start gap-2">
                <Monitor className="w-5 h-5" /> Work Session Monitoring
            </h3>

            <div className="!bg-black/20 !border-2 !border-white/10 rounded-xl mb-4 p-4 min-h-[400px] flex items-center justify-center !text-green-500 !font-semibold !font-[poppins]">
                shows my screen here 
            </div>

            {!isStreaming ? (
                <button
                    onClick={startMonitoring}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 !text-gray-200 px-6 py-3 rounded-xl mx-auto transition-all !w-full !text-center !font-semibold !font-[poppins] mt-5"
                >
                    <Play className="w-4 h-4" /> Start Sharing Screen
                </button>
            ) : (
                <button
                    onClick={stopMonitoring}
                    className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 px-6 py-3 rounded-xl mx-auto transition-all"
                >
                    <StopCircle className="w-4 h-4" /> Stop Monitoring
                </button>
            )}

            {/* Hidden videos for frame capture */}
            <div className="hidden">
                <video ref={screenVideoRef} autoPlay muted playsInline />
                <video ref={webcamVideoRef} autoPlay muted playsInline />
            </div>

            {isStreaming && (
                <p className="text-green-400 text-sm mt-4 animate-pulse">
                    ● System is actively monitoring for security purposes
                </p>
            )}
        </div>
    );
}
