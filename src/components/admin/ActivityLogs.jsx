import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    Search,
    Filter,
    Download,
    Clock,
    User,
    MessageSquare,
    FileText,
    LogOut,
    Calendar,
    AlertCircle
} from 'lucide-react';
// Assuming these are your utility imports
import { api, authHeader } from '../../utils/api'; 
import { message } from 'antd'; // Using Antd message for toasts

// --- Configuration Map for Icons, Colors, and Labels ---
const TYPE_MAP = {
    login: {
        icon: <User className="w-5 h-5 text-green-400" />,
        color: 'bg-green-500/20 border-green-500/50 text-green-300',
        label: 'Login',
    },
    logout: {
        icon: <LogOut className="w-5 h-5 text-red-400" />,
        color: 'bg-red-500/20 border-red-500/50 text-red-300',
        label: 'Logout',
    },
    task_completed: { // FIX: Use more descriptive type for tasks
        icon: <FileText className="w-5 h-5 text-blue-400" />,
        color: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
        label: 'Task Complete',
    },
    message: {
        icon: <MessageSquare className="w-5 h-5 text-purple-400" />,
        color: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
        label: 'Message',
    },
    file_upload: { // FIX: Use more descriptive type for files
        icon: <FileText className="w-5 h-5 text-amber-400" />,
        color: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
        label: 'File Upload',
    },
    meeting_start: { // FIX: Use more descriptive type for meetings
        icon: <Calendar className="w-5 h-5 text-pink-400" />,
        color: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
        label: 'Meeting Start',
    },
    idle_alert: { // FIX: Use more descriptive type for screen/idle alerts
        icon: <AlertCircle className="w-5 h-5 text-indigo-400" />,
        color: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
        label: 'Idle Alert',
    },
};
// Default fallback
const DEFAULT_TYPE = {
    icon: <Activity className="w-5 h-5 text-gray-400" />,
    color: 'bg-gray-500/20 border-gray-500/50 text-gray-300',
    label: 'Other',
};

// --- Example Mock Data Structure (for verification) ---
const MOCK_LOGS = [
    { id: 1, type: 'login', employeeName: 'Alice Johnson', action: 'Successfully logged in.', details: 'IP address identified.', timestamp: '10:00:00 AM', ip: '192.168.1.1' },
    { id: 2, type: 'task_completed', employeeName: 'Bob Smith', action: 'Completed task: Implement API endpoint.', details: 'Task ID: 456', timestamp: '10:15:30 AM' },
    { id: 3, type: 'message', employeeName: 'Alice Johnson', action: 'Sent message in General channel.', details: 'Content: Checking on project status.', timestamp: '10:20:00 AM' },
    { id: 4, type: 'idle_alert', employeeName: 'Charlie Brown', action: 'User idle for 15 minutes.', details: 'No mouse or keyboard input detected.', timestamp: '10:35:45 AM' },
    { id: 5, type: 'logout', employeeName: 'Alice Johnson', action: 'User logged out.', details: 'Session ended.', timestamp: '11:00:00 AM', ip: '192.168.1.1' },
];

export default function ActivityLogs({ token }) {
    const [logs, setLogs] = useState(MOCK_LOGS); // Start with MOCK_LOGS for initial view
    const [loading, setLoading] = useState(false); // Add loading state

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    // --- Utility Functions ---
    const getTypeInfo = (type) => TYPE_MAP[type] || DEFAULT_TYPE;
    const getTypeIcon = (type) => getTypeInfo(type).icon;
    const getTypeColor = (type) => getTypeInfo(type).color;
    const getTypeLabel = (type) => getTypeInfo(type).label;
    
    // FIX: Implement the necessary log fetching function
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            // FIX: Replace with your actual API endpoint for logs
            // const res = await api.get('/api/admin/activity-logs', authHeader(token));
            // setLogs(res.data);
            
            // For now, simulating API call delay:
            await new Promise(resolve => setTimeout(resolve, 500));
            setLogs(MOCK_LOGS); // Replace with setLogs(res.data) in production
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            message.error('Failed to load activity logs.');
            setLogs([]); // Ensure logs are empty on failure
        } finally {
            setLoading(false);
        }
    }, [token]);

    // FIX: Add useEffect hook to fetch logs on component mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log => {
        // Ensure log.employeeName/action/details exist before calling toLowerCase()
        const matchesSearch =
            (log.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = filterType === 'all' || log.type === filterType;

        return matchesSearch && matchesType;
    });

    // Stats Calculation
    const totalLogs = logs.length;
    const activeUsers = new Set(logs.filter(l => l.type === 'login' && !logs.some(out => out.type === 'logout' && out.employeeName === l.employeeName && new Date(out.timestamp) > new Date(l.timestamp))).map(l => l.employeeName)).size;
    // NOTE: Simple count is used here. For true active users, you need real-time presence data.
    const uniqueEmployees = new Set(logs.map(l => l.employeeName).filter(Boolean)).size;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white text-2xl mb-2">Activity Logs</h3>
                    <p className="text-purple-300">Monitor all employee activities in real-time</p>
                </div>
                <button 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 transition-all"
                    // FIX: Implement export functionality here
                    onClick={() => message.info('Export functionality coming soon!')}
                >
                    <Download className="w-5 h-5" />
                    <span>Export Logs</span>
                </button>
            </div>

            {/* Filters */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search logs by employee, action, or details..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={loading} // Disable search while loading
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                        disabled={loading} // Disable filter while loading
                    >
                        <option value="all">All Activities</option>
                        {Object.entries(TYPE_MAP).map(([type, { label }]) => (
                            <option key={type} value={type}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <p className="text-purple-300 text-sm mb-1">Total Logs</p>
                    <p className="text-white text-2xl">{totalLogs}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <p className="text-purple-300 text-sm mb-1">Unique Employees</p>
                    <p className="text-white text-2xl">
                        {/* FIX: Use uniqueEmployees calculated above */}
                        {uniqueEmployees} 
                    </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <p className="text-purple-300 text-sm mb-1">Tasks Completed</p>
                    <p className="text-white text-2xl">
                        {/* FIX: Use the updated type name */}
                        {logs.filter(l => l.type === 'task_completed').length} 
                    </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <p className="text-purple-300 text-sm mb-1">Idle Alerts</p>
                    <p className="text-white text-2xl">
                        {/* FIX: Use the updated type name */}
                        {logs.filter(l => l.type === 'idle_alert').length}
                    </p>
                </div>
            </div>
            
            {/* Loading Indicator */}
            {loading && (
                 <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
                    <p className="text-purple-300">Loading activity data...</p>
                 </div>
            )}

            {/* Timeline */}
            {!loading && (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <div className="space-y-4">
                        {filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                className="relative pl-8 pb-4 border-l-2 border-white/20 last:border-transparent"
                            >
                                {/* Timeline marker */}
                                <div className="absolute left-[-13px] top-0 w-6 h-6 bg-slate-900 rounded-full border-2 border-purple-500 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                </div>

                                <div className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="mt-1">{getTypeIcon(log.type)}</div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="text-white font-semibold">{log.employeeName}</p>
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs border ${getTypeColor(log.type)}`}>
                                                        {getTypeLabel(log.type)}
                                                    </span>
                                                </div>

                                                {/* FIX: Improved hierarchy */}
                                                <p className="text-purple-300 font-medium mb-1">{log.action}</p> 
                                                <p className="text-purple-400 text-sm">{log.details}</p>

                                                {log.ip && (
                                                    <p className="text-purple-500 text-xs mt-2">IP: {log.ip}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-purple-400 text-sm whitespace-nowrap">
                                            <Clock className="w-4 h-4" />
                                            {/* FIX: Use proper Date formatting if necessary, assuming log.timestamp is a string/Date */}
                                            <span>{log.timestamp}</span> 
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12">
                            <Activity className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                            <p className="text-purple-300">
                                {logs.length === 0 
                                    ? "No activity logs available." 
                                    : "No activity logs found matching your criteria."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}