import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, X, BarChart2, CheckSquare, AlertTriangle, History, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays, addDays, startOfMonth, endOfMonth, isToday } from 'date-fns';
import HabitsTab from '../components/HabitsTab';
import InsightsTab from '../components/InsightsTab';
import AuditTab from '../components/AuditTab';
import { api } from '../utils/api';

const HabitTracker = () => {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [stats, setStats] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('habits'); // 'habits' or 'insights'
    const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', frequency: 'daily', notes: '', target_days: [] });

    // Feedback Modal State
    const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, habitId: null, date: null, mood: '', feedback: '' });
    const [errorAlert, setErrorAlert] = useState(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        fetchHabits();
        fetchStats();
        fetchHistory();
    }, [selectedDate, viewMode]);

    const fetchHabits = async () => {
        try {
            const data = await api.get('/api/habits');
            setHabits(data);
        } catch (error) { console.error(error) } finally { setLoading(false) }
    };

    const fetchStats = async () => {
        try {
            const data = await api.get('/api/habits/stats');
            setStats(data);
        } catch (error) { console.error(error) }
    };

    const fetchHistory = async () => {
        // Fetch history for the current view range or broader for insights
        // For simplicity, let's fetch last 90 days for insights + current view buffer
        const start = subDays(selectedDate, 90);
        const end = addDays(selectedDate, 7);

        try {
            const query = `startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
            const data = await api.get(`/api/habits/history?${query}`);
            setHistory(data);
        } catch (error) { console.error(error) }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingHabit) {
                await api.put(`/api/habits/${editingHabit.id}`, form);
            } else {
                await api.post('/api/habits', form);
            }
            setForm({ title: '', description: '', frequency: 'daily', notes: '', target_days: [] });
            setShowAdd(false);
            setEditingHabit(null);
            fetchHabits();
            fetchStats();
        } catch (error) {
            console.error('Failed to save habit', error);
            setErrorAlert(error.message || 'An unknown error occurred while saving the habit.');
        }
    };

    const toggleHabit = async (id, date = null) => {
        const targetDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        try {
            await api.post(`/api/habits/${id}/toggle`, { date: targetDate });
            fetchHabits(); // Refresh daily status
            fetchHistory(); // Refresh history view
            fetchStats();
        } catch (error) { console.error(error) }
    };

    const fillAll = async (options) => {
        let payload = {};
        let confirmMessage = '';
        if (options?.startDate && options?.endDate) {
            payload = options;
            confirmMessage = `Mark applicable habits as completed from ${format(new Date(options.startDate), 'MMM d, yyyy')} to ${format(new Date(options.endDate), 'MMM d, yyyy')}?`;
        } else {
            const targetDate = options ? format(new Date(options), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            payload = { date: targetDate };
            confirmMessage = `Mark all applicable habits as completed for ${format(new Date(targetDate), 'MMM d, yyyy')}?`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Fill All Habits',
            message: confirmMessage,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                try {
                    await api.post('/api/habits/fill-all', payload);
                    fetchHabits();
                    fetchHistory();
                    fetchStats();
                } catch (error) { console.error(error); }
            }
        });
    };

    const unfillAll = async (options) => {
        let payload = {};
        let confirmMessage = '';
        if (options?.startDate && options?.endDate) {
            payload = options;
            confirmMessage = `Undo all completions from ${format(new Date(options.startDate), 'MMM d, yyyy')} to ${format(new Date(options.endDate), 'MMM d, yyyy')}?`;
        } else {
            const targetDate = options ? format(new Date(options), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            payload = { date: targetDate };
            confirmMessage = `Undo all completions for ${format(new Date(targetDate), 'MMM d, yyyy')}?`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Undo All Completions',
            message: confirmMessage,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                try {
                    await api.post('/api/habits/unfill-all', payload);
                    fetchHabits();
                    fetchHistory();
                    fetchStats();
                } catch (error) { console.error(error); }
            }
        });
    };

    const deleteHabit = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: 'Are you sure you want to delete this habit? All tracking history will be permanently lost.',
            onConfirm: async () => {
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                try {
                    await api.delete(`/api/habits/${id}`);
                    setShowAdd(false);
                    fetchHabits();
                    fetchStats();
                } catch (error) { console.error(error) }
            }
        });
    };

    const openEdit = async (habit) => {
        setEditingHabit(habit);
        setForm({
            title: habit.title,
            description: habit.description || '',
            frequency: habit.frequency,
            notes: habit.notes || '',
            target_days: habit.target_days || []
        });
        setShowAdd(true);

        try {
            const data = await api.get(`/api/habits/${habit.id}/audit`);
            setAuditLogs(data);
        } catch (error) { console.error(error); setAuditLogs([]); }
    };

    // Helper to check if a habit is completed on a specific date from history
    const isCompletedOnDate = (habitId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return history.some(h => h.habit_id === habitId && h.date === dateStr && h.status === 'completed');
    };

    const getFeedbackOnDate = (habitId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return history.find(h => h.habit_id === habitId && h.date === dateStr);
    };

    const openFeedback = (habitId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existing = getFeedbackOnDate(habitId, date);
        setFeedbackModal({
            isOpen: true,
            habitId,
            date: dateStr,
            mood: existing?.mood || '',
            feedback: existing?.feedback || ''
        });
    };

    const saveFeedback = async () => {
        try {
            await api.post(`/api/habits/${feedbackModal.habitId}/feedback`, {
                date: feedbackModal.date,
                mood: feedbackModal.mood,
                feedback: feedbackModal.feedback
            });
            setFeedbackModal({ isOpen: false, habitId: null, date: null, mood: '', feedback: '' });
            fetchHistory();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <h1 className="text-3xl font-bold text-white">Habit Tracker</h1>
                        {activeTab === 'habits' && viewMode === 'daily' && (
                            <div className="flex items-center gap-2 bg-gray-800/80 px-2 py-1.5 rounded-xl border border-gray-700/50 hover:border-indigo-500/50 transition-all shadow-sm">
                                <button 
                                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                                    className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-indigo-400"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <Calendar size={16} className="text-indigo-400" />
                                <input
                                    type="date"
                                    value={format(selectedDate, 'yyyy-MM-dd')}
                                    onChange={e => {
                                        if (e.target.value) {
                                            setSelectedDate(new Date(e.target.value.replace(/-/g, '/')));
                                        }
                                    }}
                                    className="bg-transparent border-none text-gray-200 text-sm focus:ring-0 outline-none cursor-pointer w-[120px] font-medium"
                                    style={{ colorScheme: 'dark' }}
                                />
                                <button 
                                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                                    className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-indigo-400"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                {!isToday(selectedDate) && (
                                    <button
                                        onClick={() => setSelectedDate(new Date())}
                                        className="text-xs ml-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors border border-indigo-500/20"
                                    >
                                        Today
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-gray-800 rounded-lg p-1 gap-1 w-fit">
                        <button
                            onClick={() => setActiveTab('habits')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'habits' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <CheckSquare size={16} />
                            Habits
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <BarChart2 size={16} />
                            Insights
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <History size={16} />
                            Audit
                        </button>
                    </div>
                </div>

                {activeTab === 'habits' && (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                            {['daily', 'weekly', 'monthly'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setForm({ title: '', description: '', frequency: 'daily', notes: '', target_days: [] });
                                setShowAdd(!showAdd);
                            }}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors"
                        >
                            {showAdd ? <X size={20} /> : <Plus size={20} />}
                            {showAdd ? 'Cancel' : 'New Habit'}
                        </button>
                    </div>
                )}
            </header>

            {/* Add/Edit Form Modal/Panel */}
            {showAdd && (
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 animate-in fade-in slide-in-from-top-4 relative z-10">
                    <h3 className="text-lg font-bold text-white mb-4">{editingHabit ? 'Edit Habit' : 'Create New Habit'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    type="text" required
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Frequency</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.frequency}
                                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            {form.frequency === 'weekly' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-400 mb-2">Target Days</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {DAYS_OF_WEEK.map((day, idx) => {
                                            const isSelected = form.target_days.includes(idx);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => {
                                                        const newDays = isSelected
                                                            ? form.target_days.filter(d => d !== idx)
                                                            : [...form.target_days, idx];
                                                        setForm({ ...form, target_days: newDays });
                                                    }}
                                                    className={`px-4 py-1.5 text-sm rounded-full transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Select the days you want to complete this habit.</p>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-400 mb-1">Notes / Motivation</label>
                                <textarea
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Why do you want to build this habit?"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            {editingHabit && (
                                <button
                                    type="button"
                                    onClick={() => deleteHabit(editingHabit.id)}
                                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                {editingHabit ? 'Update Habit' : 'Save Habit'}
                            </button>
                        </div>
                    </form>

                    {editingHabit && auditLogs.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-700 animate-in fade-in">
                            <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Change History</h4>
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="text-sm bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-indigo-400 capitalize">{log.changed_field.replace('_', ' ')} changed</span>
                                            <span className="text-xs text-gray-500">{format(new Date(log.changed_at), 'MMM d, yyyy HH:mm')}</span>
                                        </div>
                                        <div className="text-gray-400 flex items-center gap-2 overflow-hidden">
                                            <span className="truncate flex-1 bg-gray-800 px-2 py-1 rounded text-xs line-through">{log.old_value || 'none'}</span>
                                            <span className="text-gray-600">→</span>
                                            <span className="truncate flex-1 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">{log.new_value || 'none'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'habits' && (
                <HabitsTab
                    habits={habits}
                    viewMode={viewMode}
                    selectedDate={selectedDate}
                    toggleHabit={toggleHabit}
                    openEdit={openEdit}
                    isCompletedOnDate={isCompletedOnDate}
                    fillAll={fillAll}
                    unfillAll={unfillAll}
                    openFeedback={openFeedback}
                />
            )}

            {activeTab === 'insights' && (
                <InsightsTab
                    habits={habits}
                    stats={stats}
                    history={history}
                />
            )}

            {activeTab === 'audit' && (
                <AuditTab />
            )}

            {/* Confirm Dialog Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-sm animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
                        </div>
                        <p className="text-gray-400 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium border border-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium shadow-lg shadow-indigo-500/20"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert Modal */}
            {errorAlert && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-sm animate-in zoom-in-95 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Notice</h3>
                        <p className="text-gray-400 mb-6">{errorAlert}</p>
                        <button
                            onClick={() => setErrorAlert(null)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors font-medium"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {feedbackModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-white mb-4">How did it feel?</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Mood</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Excited', 'Improved', 'Not feeling well', 'Other'].map(mood => (
                                        <button
                                            key={mood}
                                            onClick={() => setFeedbackModal({ ...feedbackModal, mood: mood === feedbackModal.mood ? '' : mood })}
                                            className={`px-3 py-2 rounded-lg text-sm transition-colors border ${feedbackModal.mood === mood ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                        >
                                            {mood}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {feedbackModal.mood === 'Other' && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Custom Feedback</label>
                                    <textarea
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                        placeholder="Add some notes about today..."
                                        value={feedbackModal.feedback}
                                        onChange={e => setFeedbackModal({ ...feedbackModal, feedback: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setFeedbackModal({ isOpen: false, habitId: null, date: null, mood: '', feedback: '' })}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveFeedback}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                Save Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitTracker;

