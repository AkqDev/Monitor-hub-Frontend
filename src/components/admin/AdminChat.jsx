// components/admin/AdminChat.jsx 
import React from 'react';
import ChatPanel from '../shared/ChatPanel';

export default function AdminChat({ userId, userName, token }) {
    // This component simply acts as a wrapper to render the main chat panel
    return (
        <ChatPanel 
            userId={userId} 
            userName={userName} 
            token={token} 
        />
    );
}