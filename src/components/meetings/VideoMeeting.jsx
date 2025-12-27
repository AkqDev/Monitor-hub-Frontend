import React, { useRef, useEffect, useState } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, User, Monitor } from 'lucide-react';
import { Button, Tooltip, message } from 'antd';
import { socket } from '../../utils/socket';

export default function VideoMeeting({ meetingId, userId, userName, onLeave, isAdmin = false }) {
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const screenRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState({});

  useEffect(() => {
    if (!meetingId) return;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        message.error("Could not access camera/microphone");
      }
    };
    startMedia();

    socket.emit("joinMeeting", { meetingId, userId, name: userName });

    socket.on("meetingUserJoined", ({ userId: joinedId, name }) => {
      setParticipants(p => ({ ...p, [joinedId]: name }));
    });

    socket.on("meetingUserLeft", ({ userId: leftId }) => {
      setParticipants(p => {
        const copy = { ...p };
        delete copy[leftId];
        return copy;
      });
    });

    socket.on("forceLeave", () => {
      message.warning("Meeting ended by admin");
      onLeave();
    });

    return () => {
      socket.emit("leaveMeeting", { meetingId, userId });
      socket.off("meetingUserJoined");
      socket.off("meetingUserLeft");
      socket.off("forceLeave");

      streamRef.current?.getTracks().forEach(track => track.stop());
      screenRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [meetingId, userId, userName, onLeave]);

  const toggleScreenShare = async () => {
    if (!screenStream) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenRef.current = stream;
        setScreenStream(stream);

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          screenRef.current = null;
        };
      } catch {
        console.error("Screen share cancelled");
      }
    } else {
      screenStream.getTracks().forEach(t => t.stop());
      screenRef.current = null;
      setScreenStream(null);
    }
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(track => (track.enabled = isMuted));
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach(track => (track.enabled = isVideoOff));
    setIsVideoOff(!isVideoOff);
  };

  const endMeetingForAll = () => {
    socket.emit("endMeetingForAll", { meetingId }); // fixed event name
    onLeave();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
        <div className="relative bg-black rounded-xl overflow-hidden border border-zinc-700">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">{userName} (You)</div>
        </div>

        {Object.entries(participants).map(([id, name]) => (
          <div key={id} className="relative bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
            <User className="w-12 h-12 text-zinc-600" />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">{name}</div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-zinc-950 flex justify-center items-center gap-4">
        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
          <Button shape="circle" size="large" icon={isMuted ? <MicOff /> : <Mic />} danger={isMuted} onClick={toggleMute} />
        </Tooltip>

        <Tooltip title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}>
          <Button shape="circle" size="large" icon={isVideoOff ? <VideoOff /> : <Video />} danger={isVideoOff} onClick={toggleVideo} />
        </Tooltip>

        <Tooltip title="Share Screen">
          <Button shape="circle" size="large" icon={<Monitor />} type={screenStream ? "primary" : "default"} onClick={toggleScreenShare} />
        </Tooltip>

        <Button type="primary" danger shape="round" icon={<PhoneOff />} size="large" onClick={isAdmin ? endMeetingForAll : onLeave}>
          {isAdmin ? "End Meeting" : "Leave"}
        </Button>
      </div>
    </div>
  );
}
