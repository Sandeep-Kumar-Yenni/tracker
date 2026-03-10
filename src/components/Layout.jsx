import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckCircle, DollarSign, ListTodo, LogOut, Activity, Shield, Archive } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const allNavItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard, permission: null },
        { path: '/habits', label: 'Habits', icon: CheckCircle, permission: 'habits' },
        { path: '/finance', label: 'Finance', icon: DollarSign, permission: 'finance' },
        { path: '/todos', label: 'Todos', icon: ListTodo, permission: 'todos' },
        { path: '/medical', label: 'Medical', icon: Activity, permission: 'medical' },
        { path: '/documents', label: 'Vault', icon: Archive, permission: null },
    ];

    // Filter nav items based on user permissions
    const navItems = allNavItems.filter(item => {
        if (item.permission === null) return true; // Overview is always available
        return user?.permissions?.includes(item.permission);
    });

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Sidebar (Desktop) */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        LifeTracker
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white"
                                    : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    {user?.is_admin && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mt-4 border-t border-gray-700 pt-4",
                                isActive
                                    ? "bg-yellow-600 shadow-lg shadow-yellow-500/20 text-white"
                                    : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                            )}
                        >
                            <Shield className="w-5 h-5" />
                            <span className="font-medium">Admin</span>
                        </NavLink>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">Free Plan</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Nav Header */}
            <div className="md:hidden fixed top-0 w-full bg-gray-800/80 backdrop-blur-md border-b border-gray-700 z-50 px-4 py-3 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    LifeTracker
                </h1>
                <button onClick={handleLogout} className="p-2 text-gray-400">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8 bg-black/20">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 pb-safe z-50">
                <div className="flex justify-around items-center p-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center p-2 rounded-lg transition-colors",
                                isActive ? "text-indigo-400" : "text-gray-500"
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    {user?.is_admin && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => cn(
                                "flex flex-col items-center p-2 rounded-lg transition-colors",
                                isActive ? "text-yellow-400" : "text-gray-500"
                            )}
                        >
                            <Shield className="w-6 h-6" />
                            <span className="text-[10px] mt-1 font-medium">Admin</span>
                        </NavLink>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
