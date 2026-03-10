import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Square, Trash2, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../utils/api';

const TodoTracker = () => {
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [newPriority, setNewPriority] = useState('Medium');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchTodos();
    }, [date]);

    const fetchTodos = async () => {
        try {
            const data = await api.get(`/api/todos?date=${date}`);
            setTodos(data);
        } catch (error) { console.error(error) }
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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'Low': return 'text-green-400 bg-green-500/10 border-green-500/20';
            default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'; // Medium
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Daily Tasks</h1>
                <div className="flex items-center justify-center gap-2 text-indigo-400">
                    <Calendar size={18} />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-transparent border-none text-lg font-medium outline-none cursor-pointer focus:ring-0"
                    />
                </div>
            </header>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                {/* Add Task Input */}
                <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                    <form onSubmit={addTodo} className="flex gap-4">
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
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                            <Plus size={24} />
                        </button>
                    </form>
                </div>

                {/* Todo List */}
                <div className="divide-y divide-gray-700">
                    {todos.map(todo => (
                        <div
                            key={todo.id}
                            className={`group flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors ${todo.is_completed ? 'bg-gray-800/30' : ''}`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <button
                                    onClick={() => toggleTodo(todo.id)}
                                    className={`text-gray-400 hover:text-indigo-400 transition-transform active:scale-90 ${todo.is_completed ? 'text-green-500' : ''}`}
                                >
                                    {todo.is_completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                </button>
                                <span className={`text-lg transition-all ${todo.is_completed ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-100'}`}>
                                    {todo.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Interactive Priority Badge */}
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
                                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {todos.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            <p>No tasks for this day. Enjoy your free time!</p>
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="p-4 bg-gray-900/50 text-xs text-gray-500 flex justify-between items-center">
                    <span>{todos.filter(t => !t.is_completed).length} items left</span>
                    <div className="flex gap-2">
                        <span>{Math.round((todos.filter(t => t.is_completed).length / (todos.length || 1)) * 100)}% Complete</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodoTracker;
