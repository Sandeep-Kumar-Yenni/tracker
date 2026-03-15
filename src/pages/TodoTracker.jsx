import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Square, Trash2, Plus, Calendar, MoveRight, Clock, Activity } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { api } from '../utils/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const AlertModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const TodoTracker = () => {
    const [activeTab, setActiveTab] = useState('tasks');
    const [todos, setTodos] = useState([]);
    const [insightRange, setInsightRange] = useState('weekly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [insightData, setInsightData] = useState({ logs: [], todos: [] });
    const [newTodo, setNewTodo] = useState('');
    const [newPriority, setNewPriority] = useState('Medium');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });
    const closeAlert = () => setAlertConfig({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        if (activeTab === 'tasks') {
            fetchTodos();
        } else {
            fetchInsights();
        }
    }, [date, activeTab, insightRange, customStart, customEnd]);

    const fetchTodos = async () => {
        try {
            const data = await api.get(`/api/todos?date=${date}`);
            setTodos(data);
        } catch (error) { console.error(error) }
    };

    const fetchInsights = async () => {
        try {
            let start = '';
            let end = '';
            const today = new Date();
            
            if (insightRange === 'weekly') {
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                start = format(lastWeek, 'yyyy-MM-dd');
                end = format(today, 'yyyy-MM-dd');
            } else if (insightRange === 'monthly') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                start = format(lastMonth, 'yyyy-MM-dd');
                end = format(today, 'yyyy-MM-dd');
            } else if (insightRange === 'yearly') {
                const lastYear = new Date(today);
                lastYear.setFullYear(today.getFullYear() - 1);
                start = format(lastYear, 'yyyy-MM-dd');
                end = format(today, 'yyyy-MM-dd');
            } else if (insightRange === 'custom') {
                start = customStart;
                end = customEnd;
            }

            let url = '/api/todos/insights';
            if (start && end) {
                // SQLite BETWEEN is inclusive, but for safety with timestamps, let's make sure end is inclusive by appending 23:59:59 if needed on backend, 
                // but our backend uses `date(a.changed_at)` which returns 'YYYY-MM-DD'.
                url += `?startDate=${start}&endDate=${end}`;
            } else if (insightRange !== 'custom') {
                // If it's weekly/monthly/yearly but we somehow missed dates, supply fallback
                url += `?startDate=2000-01-01&endDate=2100-01-01`;
            }

            const data = await api.get(url);
            setInsightData(data);
        } catch(error) { console.error(error) }
    };

    const addTodo = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/todos', { title: newTodo, date, priority: newPriority });
            setNewTodo('');
            setNewPriority('Medium');
            fetchTodos();
        } catch (error) { console.error(error) }
    };

    const toggleTodo = async (id) => {
        try {
            await api.put(`/api/todos/${id}/toggle`, {});
            fetchTodos();
        } catch (error) { console.error(error) }
    };

    const deleteTodo = async (id) => {
        try {
            await api.delete(`/api/todos/${id}`);
            fetchTodos();
        } catch (error) { console.error(error) }
    };

    const updatePriority = async (id, priority) => {
        try {
            await api.put(`/api/todos/${id}/priority`, { priority });
            fetchTodos();
        } catch (error) { console.error(error) }
    };

    const moveTodo = async (id, newDate) => {
        if (!newDate) return;
        try {
            await api.put(`/api/todos/${id}/move`, { newDate });
            fetchTodos();
        } catch (error) { console.error(error) }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'Low': return 'text-green-400 bg-green-500/10 border-green-500/20';
            default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'; // Medium
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Daily Tasks</h1>
                    <p className="text-gray-400">Manage, organize, and track your tasks.</p>
                </div>
                
                <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={cn(
                            "px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                            activeTab === 'tasks' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                        )}
                    >
                        <CheckSquare size={18} />
                        Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={cn(
                            "px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                            activeTab === 'insights' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                        )}
                    >
                        <Activity size={18} />
                        Insights
                    </button>
                </div>
            </header>

            <AlertModal 
                isOpen={alertConfig.isOpen} 
                onClose={closeAlert} 
                title={alertConfig.title} 
                message={alertConfig.message} 
            />

            {activeTab === 'tasks' && (
                <>
                <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-2 text-indigo-400 bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-700">
                        <button 
                            onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))}
                            className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-indigo-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <Calendar size={18} />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="bg-transparent border-none text-lg font-medium outline-none cursor-pointer focus:ring-0 mx-2"
                        />
                        <button 
                            onClick={() => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))}
                            className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-indigo-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                        <form onSubmit={addTodo} className="flex gap-4 flex-col md:flex-row">
                            <input
                                type="text"
                                className="flex-1 bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-600 transition-all"
                                placeholder="What needs to be done?"
                                value={newTodo}
                                onChange={e => setNewTodo(e.target.value)}
                                required
                            />
                            <select
                                value={newPriority}
                                onChange={e => setNewPriority(e.target.value)}
                                className="bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="Low">Low Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="High">High Priority</option>
                            </select>
                            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center font-bold">
                                Add
                            </button>
                        </form>
                    </div>

                    <div className="divide-y divide-gray-700">
                        {todos.map(todo => (
                            <div
                                key={todo.id}
                                className={`group flex flex-col md:flex-row items-center justify-between p-4 hover:bg-gray-700/30 transition-colors ${todo.is_completed ? 'bg-gray-800/30' : ''}`}
                            >
                                <div className="flex items-center gap-4 flex-1 w-full relative">
                                    <button
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`text-gray-400 hover:text-indigo-400 transition-transform active:scale-90 ${todo.is_completed ? 'text-green-500' : ''}`}
                                    >
                                        {todo.is_completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                    </button>
                                    <span className={`text-lg transition-all flex-1 ${todo.is_completed ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-100'}`}>
                                        {todo.title}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => moveTodo(todo.id, format(addDays(new Date(date), 1), 'yyyy-MM-dd'))}
                                        className="text-xs flex items-center gap-1 bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg transition-colors border border-gray-600 hover:border-indigo-500"
                                        title="Move to Tomorrow"
                                    >
                                        <MoveRight size={14} /> Tomorrow
                                    </button>
                                    
                                    <div className="relative flex items-center bg-gray-700 border border-gray-600 rounded-lg pr-2 hover:border-indigo-500 transition-colors">
                                       <input 
                                          type="date"
                                          className="text-xs bg-transparent text-gray-300 px-2 py-1.5 outline-none cursor-pointer"
                                          onChange={(e) => moveTodo(todo.id, e.target.value)}
                                          title="Move to specific date"
                                       />
                                    </div>

                                    <select
                                        value={todo.priority || 'Medium'}
                                        onChange={(e) => updatePriority(todo.id, e.target.value)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border appearance-none text-center cursor-pointer outline-none transition-colors ${getPriorityColor(todo.priority || 'Medium')} ${todo.is_completed ? 'opacity-50 grayscale' : ''}`}
                                        style={{ textAlignLast: 'center' }}
                                    >
                                        <option value="Low" className="bg-gray-800 text-green-400">Low</option>
                                        <option value="Medium" className="bg-gray-800 text-yellow-400">Medium</option>
                                        <option value="High" className="bg-gray-800 text-red-400">High</option>
                                    </select>

                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {todos.length === 0 && (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <CheckSquare size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">No tasks for this day. Enjoy your free time!</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-900/50 text-xs text-gray-500 flex justify-between items-center">
                        <span>{todos.filter(t => !t.is_completed).length} items left</span>
                        <div className="flex gap-2">
                            <span>{todos.length > 0 ? Math.round((todos.filter(t => t.is_completed).length / todos.length) * 100) : 0}% Complete</span>
                        </div>
                    </div>
                </div>
                </>
            )}

            {activeTab === 'insights' && (() => {
                const logs = insightData.logs || [];
                const allTodos = insightData.todos || [];

                const completedCount = allTodos.filter(t => t.is_completed).length;
                const completionRate = allTodos.length ? Math.round((completedCount / allTodos.length) * 100) : 0;
                
                const priorityStats = {
                    High: { total: 0, completed: 0 },
                    Medium: { total: 0, completed: 0 },
                    Low: { total: 0, completed: 0 },
                };

                const dayCounts = {};

                allTodos.forEach(t => {
                    const p = t.priority || 'Medium';
                    if (priorityStats[p]) {
                        priorityStats[p].total++;
                        if (t.is_completed) priorityStats[p].completed++;
                    }
                    
                    dayCounts[t.date] = (dayCounts[t.date] || 0) + 1;
                });

                const maxTaskDay = Object.keys(dayCounts).length ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : 'N/A';
                const minTaskDay = Object.keys(dayCounts).length ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] < dayCounts[b] ? a : b) : 'N/A';
                const maxTaskCount = maxTaskDay !== 'N/A' ? dayCounts[maxTaskDay] : 0;
                const minTaskCount = minTaskDay !== 'N/A' ? dayCounts[minTaskDay] : 0;

                return (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex bg-gray-900 rounded-xl border border-gray-700 p-1 w-full md:w-auto">
                                {['weekly', 'monthly', 'yearly', 'custom'].map(range => (
                                    <button
                                        key={range}
                                        onClick={() => setInsightRange(range)}
                                        className={cn(
                                            "flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                                            insightRange === range ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                            {insightRange === 'custom' && (
                                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full" />
                                    <span className="text-gray-500">to</span>
                                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full" />
                                </div>
                            )}
                        </div>

                        {/* Top Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl text-center flex flex-col items-center justify-center">
                                <h3 className="text-gray-400 font-medium mb-2">Completion Rate</h3>
                                <div className="text-4xl font-bold text-emerald-400">{completionRate}%</div>
                                <p className="text-xs text-gray-500 mt-2">{completedCount} of {allTodos.length} finished</p>
                            </div>
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl text-center flex flex-col items-center justify-center">
                                <h3 className="text-gray-400 font-medium mb-2">Tasks Moved</h3>
                                <div className="text-4xl font-bold text-amber-400">{logs.length}</div>
                                <p className="text-xs text-gray-500 mt-2">Times a task was rescheduled</p>
                            </div>
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl text-center flex flex-col items-center justify-center">
                                <h3 className="text-gray-400 font-medium mb-2">Busiest Day</h3>
                                <div className="text-2xl font-bold text-indigo-400 mt-2">{maxTaskDay !== 'N/A' ? format(new Date(maxTaskDay), 'MMM dd') : '-'}</div>
                                <p className="text-xs text-gray-500 mt-2">{maxTaskCount} tasks scheduled</p>
                            </div>
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl text-center flex flex-col items-center justify-center">
                                <h3 className="text-gray-400 font-medium mb-2">Lightest Day</h3>
                                <div className="text-2xl font-bold text-blue-400 mt-2">{minTaskDay !== 'N/A' ? format(new Date(minTaskDay), 'MMM dd') : '-'}</div>
                                <p className="text-xs text-gray-500 mt-2">{minTaskCount} tasks scheduled</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Priority Breakdown */}
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl lg:col-span-1">
                                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">Priority Completion</h2>
                                <div className="space-y-6">
                                    {['High', 'Medium', 'Low'].map(p => {
                                        const stats = priorityStats[p];
                                        const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                                        const colors = {
                                            High: 'bg-red-500 text-red-400',
                                            Medium: 'bg-yellow-500 text-yellow-400',
                                            Low: 'bg-green-500 text-green-400'
                                        };
                                        return (
                                            <div key={p}>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className={`${colors[p].split(' ')[1]} font-bold`}>{p}</span>
                                                    <span className="text-gray-400 font-medium">{stats.completed}/{stats.total} ({rate}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-900 rounded-full h-3">
                                                    <div className={`${colors[p].split(' ')[0]} h-3 rounded-full transition-all duration-500`} style={{ width: `${rate}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Movement Log */}
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl lg:col-span-2 flex flex-col h-[400px]">
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="text-indigo-400" size={20} /> Movement History
                                    </div>
                                    <span className="text-xs text-gray-500 font-normal">Top 20</span>
                                </h2>
                                
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {logs.length === 0 ? (
                                        <div className="h-full flex items-center justify-center">
                                            <p className="text-gray-500 text-center">No task movements in this period.</p>
                                        </div>
                                    ) : (
                                        logs.slice(0, 20).map((log) => (
                                            <div key={log.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm hover:border-indigo-500/30 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">{log.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1.5">Moved on: {new Date(log.changed_at).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 md:w-auto w-full justify-between">
                                                    <span className="text-red-400 font-medium text-xs truncate max-w-[100px]">{format(new Date(log.old_date), 'MMM d, yy')}</span>
                                                    <MoveRight className="text-gray-500 flex-shrink-0" size={14} />
                                                    <span className="text-green-400 font-medium text-xs truncate max-w-[100px]">{format(new Date(log.new_date), 'MMM d, yy')}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TodoTracker;
