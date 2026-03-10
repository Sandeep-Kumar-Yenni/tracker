import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../utils/api';

const AuditTab = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            const data = await api.get('/api/habits/audit');
            setAuditLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 bg-gray-800 p-4 rounded-xl border border-gray-700">
                <History className="text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Global Audit Logs</h2>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Loading logs...</div>
                ) : auditLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">No changes have been logged yet.</div>
                ) : (
                    <div className="space-y-4">
                        {auditLogs.map((log) => (
                            <div key={log.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-white mb-1">{log.habit_title}</h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span className="font-medium text-indigo-400 capitalize">{log.changed_field.replace('_', ' ')}</span> changed
                                    </div>
                                    <div className="text-sm mt-3 flex items-center gap-3">
                                        <span className="truncate max-w-[150px] bg-gray-800 px-2 py-1 rounded text-gray-500 line-through" title={log.old_value || 'none'}>{log.old_value || 'none'}</span>
                                        <span className="text-gray-600">→</span>
                                        <span className="truncate max-w-[150px] bg-gray-800 px-2 py-1 rounded text-green-400" title={log.new_value || 'none'}>{log.new_value || 'none'}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 shrink-0">
                                    {format(new Date(log.changed_at), 'MMM d, yyyy HH:mm')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditTab;
