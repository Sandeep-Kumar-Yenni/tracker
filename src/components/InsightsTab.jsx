import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays, isSameDay, parseISO, differenceInDays, addDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Flame, Calendar, TrendingUp, Check, MessageSquare } from 'lucide-react';

const InsightsTab = ({ habits, stats, history }) => {
    const [dateRange, setDateRange] = useState('30'); // '7', '30', '90', 'custom', 'all'
    const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Enforce 31 day limit on custom dates
    useEffect(() => {
        if (dateRange === 'custom') {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            const diff = differenceInDays(end, start);

            if (diff > 31) {
                // If the end date was just changed and pushed it over 31
                // or if it's over 31 days just clamp the start date forward 31 days from end
                setCustomStart(format(subDays(end, 31), 'yyyy-MM-dd'));
            }
        }
    }, [customStart, customEnd, dateRange]);

    // Filter history based on selected range
    const filteredHistory = useMemo(() => {
        if (dateRange === 'all') return history;
        let start, end;
        if (dateRange === 'custom') {
            start = new Date(customStart);
            end = new Date(customEnd);
        } else {
            end = new Date();
            start = subDays(end, parseInt(dateRange));
        }
        return history.filter(h => {
            const d = new Date(h.date);
            return d >= start && d <= end;
        });
    }, [history, dateRange, customStart, customEnd]);

    // Calculate streaks for each habit
    const habitStreaks = useMemo(() => {
        // Find the effective end date of the selected range 
        let endWindowDate;
        if (dateRange === 'custom') {
            endWindowDate = startOfDay(new Date(customEnd));
        } else {
            endWindowDate = startOfDay(new Date());
        }

        // Filter out habits that were created after the selected window timeframe
        const activeHabits = habits.filter(h => startOfDay(parseISO(h.created_at)) <= endWindowDate);

        return activeHabits.map(habit => {
            const habitLogs = filteredHistory
                .filter(h => h.habit_id === habit.id && h.status === 'completed')
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending

            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;

            // Current Streak Calculation
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');
            const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

            // Check if completed today or yesterday to maintain active streak
            const hasToday = habitLogs.some(h => h.date === todayStr);
            const hasYesterday = habitLogs.some(h => h.date === yesterdayStr);

            if (hasToday || hasYesterday) {
                let checkDate = hasToday ? today : subDays(today, 1);

                // Count backwards
                for (let i = 0; i < habitLogs.length + 1; i++) { // +1 to check virtually infinite
                    const checkStr = format(checkDate, 'yyyy-MM-dd');
                    const log = habitLogs.find(h => h.date === checkStr);
                    if (log) {
                        currentStreak++;
                        checkDate = subDays(checkDate, 1);
                    } else {
                        break;
                    }
                }
            }

            // Longest Streak Calculation (simplified for now)
            // This requires scanning the whole history which might be gaps.
            // For MVP, letting currentStreak be the main focus.

            return {
                ...habit,
                currentStreak,
                totalCompletions: habitLogs.length
            };
        });
    }, [habits, history]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Controls */}
            <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">Performance Insights</h2>
                    </div>
                    <div className="flex gap-2 bg-gray-900 p-1 rounded-lg flex-wrap justify-center">
                        {['7', '30', '90', 'custom'].map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${dateRange === range ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {range === 'custom' ? 'Custom' : `Last ${range} Days`}
                            </button>
                        ))}
                    </div>
                </div>

                {dateRange === 'custom' && (
                    <div className="flex justify-end items-center gap-3 animate-in fade-in slide-in-from-top-2 border-t border-gray-700 pt-4 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">From</span>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    max={customEnd}
                                    className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-1.5 rounded-full text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                />
                            </div>
                        </div>
                        <div className="w-4 h-px bg-gray-600"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">To</span>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    min={customStart}
                                    className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-1.5 rounded-full text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Check if any habits exist within this date range bounds */}
            {habitStreaks.length === 0 ? (
                <div className="text-center bg-gray-800/50 rounded-2xl border border-gray-700/50 p-12 mt-4 animate-in fade-in">
                    <TrendingUp className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-30" />
                    <h3 className="text-xl font-bold text-white mb-2">No data for this period</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        There were no active habits tracking during this selected date range.
                    </p>
                </div>
            ) : (
                <>
                    {/* Streaks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {habitStreaks.map(habit => (
                            <div key={habit.id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white">{habit.title}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${habit.frequency === 'daily' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-green-500/20 text-green-300'}`}>
                                            {habit.frequency}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">Current Streak</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-orange-500">{habit.currentStreak}</span>
                                    <Flame className={`w-8 h-8 ${habit.currentStreak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-gray-600'}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Completion Count Chart */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-96">
                            <h3 className="text-lg font-bold text-white mb-6">Total Completions</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={stats}>
                                    <XAxis dataKey="title" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#374151', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                                    />
                                    <Bar dataKey="completion_count" radius={[4, 4, 0, 0]}>
                                        {stats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#22c55e'][index % 4]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 overflow-x-auto">
                            <h3 className="text-lg font-bold text-white mb-6">Consistency Grid</h3>
                            <div className="min-w-fit pr-4 pb-2">
                                {(() => {
                                    let startD, endD;
                                    if (dateRange === 'custom') {
                                        startD = new Date(customStart);
                                        endD = new Date(customEnd);
                                    } else if (dateRange === 'all') {
                                        endD = new Date();
                                        startD = subDays(endD, 90);
                                    } else {
                                        endD = new Date();
                                        startD = subDays(endD, parseInt(dateRange));
                                    }

                                    const days = eachDayOfInterval({ start: startD, end: endD });

                                    return (
                                        <div
                                            className="grid gap-x-1 gap-y-3"
                                            style={{
                                                gridTemplateColumns: `120px repeat(${days.length}, minmax(32px, 1fr))`
                                            }}
                                        >
                                            <div className="text-gray-500 font-medium pt-2 sticky left-0 bg-gray-800 z-10 w-[120px]">Habit</div>
                                            {days.map(day => (
                                                <div key={day.toString()} className="text-center">
                                                    <div className="text-[10px] text-gray-500 uppercase">{format(day, 'E')}</div>
                                                    <div className="text-xs font-bold text-gray-400">{format(day, 'd')}</div>
                                                </div>
                                            ))}

                                            {habitStreaks.map(habit => (
                                                <React.Fragment key={habit.id}>
                                                    <div className="py-1 text-sm font-medium text-white truncate pr-2 flex items-center sticky left-0 bg-gray-800 z-10 w-[120px]" title={habit.title}>
                                                        {habit.title}
                                                    </div>
                                                    {days.map(day => {
                                                        const dStr = format(day, 'yyyy-MM-dd');
                                                        const log = filteredHistory.find(h => h.habit_id === habit.id && h.date === dStr);
                                                        const isCompleted = log?.status === 'completed';

                                                        // Phase 4 Bounds Check
                                                        const isBeforeCreation = day < startOfDay(parseISO(habit.created_at));

                                                        if (isBeforeCreation) {
                                                            return (
                                                                <div key={day.toString()} className="flex justify-center items-center h-8">
                                                                    <div className="w-8 h-8 rounded bg-gray-900 border border-gray-700/50 opacity-30 flex items-center justify-center cursor-not-allowed" title={`Created on ${format(parseISO(habit.created_at), 'MMM d, yyyy')}`}>
                                                                        <span className="text-[10px] text-gray-500">-</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={day.toString()} className="flex justify-center relative group h-8">
                                                                <div className={`w-8 h-8 rounded transition-all flex items-center justify-center ${isCompleted ? 'bg-indigo-500 shadow-sm shadow-indigo-500/20' : 'bg-gray-700/50'}`}>
                                                                    {isCompleted && log.mood ? (
                                                                        <MessageSquare size={14} className="text-white" />
                                                                    ) : isCompleted ? (
                                                                        <Check size={14} className="text-white" />
                                                                    ) : null}
                                                                </div>

                                                                {/* Tooltip on hover */}
                                                                {isCompleted && (log.mood || log.feedback) && (
                                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 p-3 bg-gray-900 border border-gray-700 rounded-xl shadow-xl">
                                                                        <div className="text-xs font-bold text-indigo-400 mb-1">{format(day, 'MMMM d, yyyy')}</div>
                                                                        {log.mood && <div className="text-sm font-semibold text-white mb-1">Mood: {log.mood}</div>}
                                                                        {log.feedback && <div className="text-xs text-gray-300 italic">"{log.feedback}"</div>}
                                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default InsightsTab;
