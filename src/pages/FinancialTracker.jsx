import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../utils/api';

const FinancialTracker = () => {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0, category_breakdown: [] });
    const [form, setForm] = useState({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [loading, setLoading] = useState(true);

    const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#facc15', '#22c55e', '#06b6d4'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transactionsData, summaryData] = await Promise.all([
                api.get('/api/finance'),
                api.get('/api/finance/summary')
            ]);

            setTransactions(transactionsData);
            setSummary(summaryData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/finance', form);
            setForm({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (error) { console.error(error) }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Finance Tracker</h1>
                    <p className="text-gray-400">Track every penny, watch your wealth grow.</p>
                </div>
                <button onClick={fetchData} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <RefreshCw size={20} />
                </button>
            </header>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Total Balance</h3>
                    <p className={`text-4xl font-bold ${summary.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        ${summary.balance.toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Income</h3>
                        <p className="text-2xl font-bold text-green-400">+${(summary.total_income || 0).toFixed(2)}</p>
                    </div>
                    <ArrowUpCircle className="text-green-500/20 w-12 h-12" />
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Expense</h3>
                        <p className="text-2xl font-bold text-red-400">-${(summary.total_expense || 0).toFixed(2)}</p>
                    </div>
                    <ArrowDownCircle className="text-red-500/20 w-12 h-12" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transaction Form */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-2xl border border-gray-700 h-fit">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Plus size={20} className="text-indigo-400" />
                        Add Transaction
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'income' })}
                                className={`py-2 rounded-lg text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                            >
                                Income
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'expense' })}
                                className={`py-2 rounded-lg text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                            >
                                Expense
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount ($)</label>
                            <input
                                type="number"
                                required step="0.01"
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                placeholder="Food, Rent, Salary..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all mt-2">
                            Add {form.type === 'income' ? 'Income' : 'Expense'}
                        </button>
                    </form>
                </div>

                {/* History & Chart */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Spending Chart */}
                    {summary.category_breakdown && summary.category_breakdown.length > 0 && (
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <h3 className="text-lg font-bold text-white mb-4">Expense Breakdown</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={summary.category_breakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="total"
                                            nameKey="category"
                                        >
                                            {summary.category_breakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Recent Transactions List */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                        <div className="space-y-3">
                            {transactions.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="text-white font-medium">{t.description || t.category}</p>
                                            <p className="text-xs text-gray-500">{t.date}</p>
                                        </div>
                                    </div>
                                    <div className={`font-mono font-medium ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.type === 'income' ? '+' : '-'}${(t.amount || 0).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                            {transactions.length === 0 && <p className="text-gray-500 text-center text-sm">No transactions yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialTracker;
