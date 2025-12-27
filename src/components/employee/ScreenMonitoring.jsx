import React, { useEffect, useState, useRef } from "react";
import { socket } from "../../utils/socket.io";
import { Monitor, Camera, XCircle } from "lucide-react";
import { message } from "antd";

// Configuration for monitoring frequency
const STREAM_INTERVAL = 5000; // 5 seconds

export default function ScreenMonitoring({ userId }) {
    const [screenStream, setScreenStream] = useState(null);
    const [webcamStream, setWebcamStream] = useState(null);
    const screenVideoRef = useRef(null);
    const webcamVideoRef = useRef(null);
    const intervalRef = useRef(null);

    // Helper to capture a frame from a video stream
    const captureFrame = (videoRef) => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended || video.readyState < 2) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 320; // Reduce size to limit bandwidth
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.5); // JPEG with 50% quality
    };

    // 1. Start Streams (Screen + Webcam)
    useEffect(() => {
        const startStreams = async () => {
            try {
                const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                setScreenStream(screen);

                const webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setWebcamStream(webcam);
                
                message.info("Screen and Webcam monitoring started.");
            } catch (err) {
                console.error("Monitoring stream error:", err);
                message.error("Failed to start screen/webcam monitoring. Check permissions.");
            }
        };

        // Delay starting stream until user is checked in, usually managed by parent component logic
        // startStreams(); 

        // Cleanup function to stop streams
        return () => {
            if (screenStream) screenStream.getTracks().forEach(track => track.stop());
            if (webcamStream) webcamStream.getTracks().forEach(track => track.stop());
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []); // Run only once on mount

    // 2. Attach Streams to Video Elements
    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
        }
        if (webcamVideoRef.current && webcamStream) {
            webcamVideoRef.current.srcObject = webcamStream;
        }
    }, [screenStream, webcamStream]);

    // 3. Start Sending Data to Admin via Socket
    useEffect(() => {
        // Start streaming only if both streams are active
        if (userId && screenStream && webcamStream && !intervalRef.current) {
            intervalRef.current = setInterval(() => {
                const screenData = captureFrame(screenVideoRef);
                const webcamData = captureFrame(webcamVideoRef);
                
                if (screenData || webcamData) {
                    socket.emit('streamData', { 
                        userId, 
                        screen: screenData, 
                        webcam: webcamData,
                        timestamp: new Date().toISOString() 
                    });
                }
            }, STREAM_INTERVAL);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [userId, screenStream, webcamStream]);

    if (!screenStream || !webcamStream) {
        return (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center text-red-300 border border-red-500/30">
                <XCircle className="w-6 h-6 mx-auto mb-2" />
                <p>Awaiting screen/webcam permission to begin monitoring...</p>
            </div>
        );
    }

    return (
        <div className="hidden">
            <video ref={screenVideoRef} autoPlay muted playsInline style={{ width: 320, height: 240 }} />
            <video ref={webcamVideoRef} autoPlay muted playsInline style={{ width: 320, height: 240 }} />
            <p>Monitoring is actively running in the background.</p>
        </div>
    );
}