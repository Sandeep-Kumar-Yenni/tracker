import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, TrendingUp, CheckCircle, ArrowRight, Map } from 'lucide-react';

const Dashboard = () => {
    // We could fetch aggregate stats here, but for now let's just show quick links and static welcome
    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl shadow-indigo-500/20 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to your Life Tracker</h1>
                    <p className="text-indigo-100 text-lg max-w-2xl mb-8">
                        The all-in-one workspace to manage your habits, finances, and daily tasks.
                        master your day, every day.
                    </p>
                    <Link
                        to="/todos"
                        className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                        Start Your Day <ArrowRight size={20} />
                    </Link>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/habits" className="group bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-indigo-500/50 transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Activity size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Habits</h2>
                    <p className="text-gray-400">Build consistency and track your daily rituals.</p>
                </Link>

                <Link to="/finance" className="group bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
                    <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <TrendingUp size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Finance</h2>
                    <p className="text-gray-400">Monitor income, expenses, and savings goals.</p>
                </Link>

                <Link to="/todos" className="group bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
                    <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                        <CheckCircle size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Todo</h2>
                    <p className="text-gray-400">Manage daily tasks and stay organized.</p>
                </Link>
                <Link to="/trips" className="group bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Map size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Trips</h2>
                    <p className="text-gray-400">Log and relive your travel memories.</p>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
