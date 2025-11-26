import React, { useEffect, useRef } from "react";
import { socket } from "../utils/socket.io";
export default function ScreenShare({ room, enabled }) {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let stream;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const canvas = document.createElement("canvas");
        intervalRef.current = setInterval(() => {
          try {
            canvas.width = videoRef.current.videoWidth || 800;
            canvas.height = videoRef.current.videoHeight || 450;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL("image/webp", 0.6);
            socket.emit("screen-data", { room, data });
          } catch (e) {}
        }, 1500); // every 1.5s
      } catch (err) {
        console.error("screen share error", err);
      }
    };

    if (enabled) start();

    return () => {
      clearInterval(intervalRef.current);
      try {
        if (stream) stream.getTracks().forEach(t => t.stop());
      } catch {}
    };
  }, [enabled, room]);

  return <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded" />;
}
