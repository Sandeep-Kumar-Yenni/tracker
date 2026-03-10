import React, { useState } from 'react';
import { Check, Edit2, Calendar, CheckSquare, RotateCcw, MessageSquare } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfDay, parseISO } from 'date-fns';

const HabitsTab = ({
    habits,
    viewMode,
    selectedDate,
    toggleHabit,
    openEdit,
    isCompletedOnDate,
    fillAll,
    unfillAll,
    openFeedback
}) => {

    const [showBulkOptions, setShowBulkOptions] = useState(false);
    const [bulkStart, setBulkStart] = useState(format(selectedDate, 'yyyy-MM-dd'));
    const [bulkEnd, setBulkEnd] = useState(format(selectedDate, 'yyyy-MM-dd'));

    const handleBulkFill = () => {
        fillAll({ startDate: bulkStart, endDate: bulkEnd });
        setShowBulkOptions(false);
    };

    const handleBulkUndo = () => {
        unfillAll({ startDate: bulkStart, endDate: bulkEnd });
        setShowBulkOptions(false);
    };

    // Calculate habits active on the specifically requested selectedDate viewing tab natively
    const habitsForDate = habits.filter(h => startOfDay(selectedDate) >= startOfDay(parseISO(h.created_at)));

    const endOfWeekDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const habitsForWeek = habits.filter(h => startOfDay(parseISO(h.created_at)) <= startOfDay(endOfWeekDate));

    const endOfMonthDate = endOfMonth(selectedDate);
    const habitsForMonth = habits.filter(h => startOfDay(parseISO(h.created_at)) <= startOfDay(endOfMonthDate));

    return (
        <div className="space-y-6">
            {/* Bulk Actions Toolbar */}
            {habitsForDate.length > 0 && (
                <div className="flex flex-col items-end gap-3 animate-in fade-in">
                    <div className="flex justify-end gap-3 flex-wrap">
                        <button
                            onClick={() => fillAll(selectedDate)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-full text-sm font-semibold transition-colors"
                        >
                            <CheckSquare size={16} />
                            Fill All for {format(selectedDate, 'MMM d')}
                        </button>
                        <button
                            onClick={() => unfillAll(selectedDate)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full text-sm font-semibold transition-colors"
                        >
                            <RotateCcw size={16} />
                            Undo All
                        </button>
                        <button
                            onClick={() => {
                                setBulkStart(format(selectedDate, 'yyyy-MM-dd'));
                                setBulkEnd(format(selectedDate, 'yyyy-MM-dd'));
                                setShowBulkOptions(!showBulkOptions);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${showBulkOptions ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}
                        >
                            <Calendar size={16} />
                            Custom Range
                        </button>
                    </div>

                    {showBulkOptions && (
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2 shadow-xl shadow-black/20">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    <input
                                        type="date"
                                        value={bulkStart}
                                        onChange={(e) => setBulkStart(e.target.value)}
                                        className="bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    <input
                                        type="date"
                                        value={bulkEnd}
                                        onChange={(e) => setBulkEnd(e.target.value)}
                                        min={bulkStart}
                                        className="bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkFill}
                                    className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-green-500/20"
                                >
                                    Fill Range
                                </button>
                                <button
                                    onClick={handleBulkUndo}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
                                >
                                    Undo Range
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'daily' && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4">
                    {habitsForDate.length === 0 ? (
                        <div className="text-center bg-gray-800/50 rounded-2xl border border-gray-700/50 p-10 mt-4">
                            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                            <h3 className="text-lg font-bold text-white mb-1">No habits for this date</h3>
                            <p className="text-gray-500">Tracking information wasn't available or had not started yet.</p>
                        </div>
                    ) : habitsForDate.map(habit => (
                        <div key={habit.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <button
                                    onClick={() => toggleHabit(habit.id)}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${habit.completed_today
                                        ? 'bg-green-500 text-white shadow-green-500/30'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    <Check size={24} strokeWidth={3} />
                                </button>
                                <div>
                                    <h3 className={`font-bold text-lg ${habit.completed_today ? 'text-gray-400 line-through' : 'text-white'}`}>
                                        {habit.title}
                                    </h3>
                                    <p className="text-sm text-gray-500">{habit.description}</p>
                                    {habit.notes && (
                                        <div className="mt-2 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded w-fit">
                                            Note: {habit.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {habit.completed_today && (
                                    <button
                                        onClick={() => openFeedback(habit.id, selectedDate)}
                                        className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-colors"
                                        title="Add Daily Feedback"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                )}
                                <button onClick={() => openEdit(habit)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'weekly' && (
                <div className="overflow-x-auto pb-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="min-w-[800px] bg-gray-800 rounded-2xl border border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">This Week</h3>
                        </div>
                        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-4">
                            <div className="text-gray-500 font-medium pt-2">Habit</div>
                            {eachDayOfInterval({
                                start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                                end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                            }).map(day => (
                                <div key={day.toString()} className={`text-center font-bold ${isToday(day) ? 'text-indigo-400' : 'text-gray-400'}`}>
                                    <div className="text-xs uppercase">{format(day, 'EEE')}</div>
                                    <div className="text-lg">{format(day, 'd')}</div>
                                </div>
                            ))}

                            {/* Rows */}
                            {habitsForWeek.length === 0 ? (
                                <div className="col-span-8 text-center bg-gray-800/50 rounded-2xl border border-gray-700/50 p-10 mt-4">
                                    <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                                    <h3 className="text-lg font-bold text-white mb-1">No data for this week</h3>
                                    <p className="text-gray-500">There were no active habits tracking during this week.</p>
                                </div>
                            ) : habitsForWeek.map(habit => (
                                <React.Fragment key={habit.id}>
                                    <div className="py-2 font-medium text-white truncate pr-4 flex items-center justify-between group">
                                        <span>{habit.title}</span>
                                        <button onClick={() => openEdit(habit)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                    {eachDayOfInterval({
                                        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                                        end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                                    }).map(day => {
                                        const completed = isCompletedOnDate(habit.id, day);
                                        const isTargetDay = habit.frequency !== 'weekly' || !habit.target_days || habit.target_days.length === 0 || habit.target_days.includes(day.getDay());
                                        const isBeforeCreation = day < startOfDay(parseISO(habit.created_at));

                                        return (
                                            <div key={day.toString()} className="flex justify-center py-2">
                                                {isBeforeCreation ? (
                                                    <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-700/50 opacity-30 flex items-center justify-center cursor-not-allowed" title={`Created on ${format(parseISO(habit.created_at), 'MMM d, yyyy')}`}>
                                                        <span className="text-[10px] text-gray-500">-</span>
                                                    </div>
                                                ) : isTargetDay ? (
                                                    <button
                                                        onClick={() => toggleHabit(habit.id, day)}
                                                        className={`w-8 h-8 rounded-lg transition-all ${completed ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-gray-700/50 hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        {completed && <Check size={16} className="text-white mx-auto" />}
                                                    </button>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-gray-800 border-dashed border border-gray-700/50 opacity-50" title="Not a target day"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'monthly' && (
                <div className="overflow-x-auto pb-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="min-w-[1000px] bg-gray-800 rounded-2xl border border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">This Month</h3>
                        </div>
                        <div
                            className="grid gap-x-1 gap-y-2"
                            style={{
                                gridTemplateColumns: `150px repeat(${eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }).length}, minmax(28px, 1fr))`
                            }}
                        >
                            <div className="text-gray-500 font-medium pt-2 sticky left-0 bg-gray-800 z-10">Habit</div>
                            {eachDayOfInterval({
                                start: startOfMonth(selectedDate),
                                end: endOfMonth(selectedDate)
                            }).map(day => (
                                <div key={day.toString()} className={`text-center font-bold ${isToday(day) ? 'text-indigo-400' : 'text-gray-400'}`}>
                                    <div className="text-[10px] uppercase hidden md:block">{format(day, 'E')}</div>
                                    <div className="text-xs">{format(day, 'd')}</div>
                                </div>
                            ))}

                            {/* Rows */}
                            {habitsForMonth.length === 0 ? (
                                <div className="col-span-full text-center bg-gray-800/50 rounded-2xl border border-gray-700/50 p-10 mt-4">
                                    <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                                    <h3 className="text-lg font-bold text-white mb-1">No data for this month</h3>
                                    <p className="text-gray-500">There were no active habits tracking during this month.</p>
                                </div>
                            ) : habitsForMonth.map(habit => (
                                <React.Fragment key={habit.id}>
                                    <div className="py-2 text-sm font-medium text-white truncate pr-2 flex items-center justify-between group sticky left-0 bg-gray-800 z-10">
                                        <span className="truncate" title={habit.title}>{habit.title}</span>
                                        <button onClick={() => openEdit(habit)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white shrink-0 ml-1">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                    {eachDayOfInterval({
                                        start: startOfMonth(selectedDate),
                                        end: endOfMonth(selectedDate)
                                    }).map(day => {
                                        const completed = isCompletedOnDate(habit.id, day);
                                        const isTargetDay = habit.frequency !== 'weekly' || !habit.target_days || habit.target_days.length === 0 || habit.target_days.includes(day.getDay());
                                        const isBeforeCreation = day < startOfDay(parseISO(habit.created_at));

                                        return (
                                            <div key={day.toString()} className="flex justify-center py-2">
                                                {isBeforeCreation ? (
                                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded bg-gray-900 border border-gray-700/50 opacity-30 flex items-center justify-center cursor-not-allowed" title={`Created on ${format(parseISO(habit.created_at), 'MMM d, yyyy')}`}>
                                                        <span className="text-[10px] text-gray-500">-</span>
                                                    </div>
                                                ) : isTargetDay ? (
                                                    <button
                                                        onClick={() => toggleHabit(habit.id, day)}
                                                        className={`w-6 h-6 md:w-7 md:h-7 rounded transition-all flex items-center justify-center ${completed ? 'bg-green-500 shadow-sm shadow-green-500/20' : 'bg-gray-700/50 hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        {completed && <Check size={14} className="text-white mx-auto" />}
                                                    </button>
                                                ) : (
                                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded bg-gray-800 border-dashed border border-gray-700/50 opacity-50" title="Not a target day"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitsTab;
