import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Edit, Trash2, Save, X, Shield, Lock } from 'lucide-react';
import { api } from '../utils/api';

const AdminPanel = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        permissions: {
            habits: true,
            finance: true,
            todos: true,
            medical: true,
            trips: true
        },
        is_admin: false
    });

    const availablePermissions = [
        { key: 'habits', label: 'Habits' },
        { key: 'finance', label: 'Finance' },
        { key: 'todos', label: 'Todos' },
        { key: 'medical', label: 'Medical' },
        { key: 'trips', label: 'Trips' }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/api/admin/users');
            setUsers(data);
            setError('');
        } catch (err) {
            if (err.message.includes('403') || err.message.includes('Admin')) {
                setError('Admin access required');
            } else {
                setError('Error fetching users');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const permissions = Object.keys(formData.permissions).filter(key => formData.permissions[key]);
            await api.post('/api/admin/users', {
                username: formData.username,
                password: formData.password,
                permissions: permissions,
                is_admin: formData.is_admin
            });
            setShowAddModal(false);
            setFormData({
                username: '',
                password: '',
                permissions: { habits: true, finance: true, todos: true, medical: true, trips: true },
                is_admin: false
            });
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Error creating user');
        }
    };

    const handleEditUser = (userToEdit) => {
        const permissionsObj = {};
        availablePermissions.forEach(p => {
            permissionsObj[p.key] = userToEdit.permissions.includes(p.key);
        });
        setEditingUser(userToEdit.id);
        setFormData({
            username: userToEdit.username,
            password: '',
            permissions: permissionsObj,
            is_admin: userToEdit.is_admin
        });
    };

    const handleUpdateUser = async (userId) => {
        try {
            const permissions = Object.keys(formData.permissions).filter(key => formData.permissions[key]);
            const updateData = {
                username: formData.username,
                permissions: permissions,
                is_admin: formData.is_admin
            };
            
            if (formData.password) {
                updateData.password = formData.password;
            }

            await api.put(`/api/admin/users/${userId}`, updateData);
            setEditingUser(null);
            setFormData({
                username: '',
                password: '',
                permissions: { habits: true, finance: true, todos: true, medical: true, trips: true },
                is_admin: false
            });
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Error updating user');
        }
    };

    const handleDeleteUser = (userId) => {
        showConfirm('Delete User', 'Are you sure you want to delete this user? This cannot be undone.', async () => {
            try {
                await api.delete(`/api/admin/users/${userId}`);
                fetchUsers();
            } catch (err) {
                setError(err.message || 'Error deleting user');
            }
            closeConfirm();
        });
    };

    const togglePermission = (key) => {
        setFormData({
            ...formData,
            permissions: {
                ...formData.permissions,
                [key]: !formData.permissions[key]
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-indigo-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                    <p className="text-gray-400">Manage users and their access permissions</p>
                </div>
                <button
                    onClick={() => {
                        setShowAddModal(true);
                        setFormData({
                            username: '',
                            password: '',
                            permissions: { habits: true, finance: true, todos: true, medical: true, trips: true },
                            is_admin: false
                        });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Add User
                </button>
            </header>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900 border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Username</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Permissions</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        {editingUser === u.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    className="bg-gray-900 border border-gray-600 text-white px-3 py-1 rounded w-full"
                                                    placeholder="Username"
                                                />
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="bg-gray-900 border border-gray-600 text-white px-3 py-1 rounded w-full"
                                                    placeholder="Reset Password"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">{u.username}</span>
                                                {u.id === user?.id && (
                                                    <span className="text-xs text-gray-500">(You)</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser === u.id ? (
                                            <div className="flex flex-wrap gap-2">
                                                {availablePermissions.map((p) => (
                                                    <label key={p.key} className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions[p.key]}
                                                            onChange={() => togglePermission(p.key)}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm text-gray-300">{p.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {u.permissions.map((p) => (
                                                    <span
                                                        key={p}
                                                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                                                    >
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser === u.id ? (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_admin}
                                                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm text-gray-300">Admin</span>
                                            </label>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {u.is_admin ? (
                                                    <>
                                                        <Shield size={16} className="text-yellow-400" />
                                                        <span className="text-yellow-400 text-sm">Admin</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={16} className="text-gray-500" />
                                                        <span className="text-gray-500 text-sm">User</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            {editingUser === u.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateUser(u.id)}
                                                        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                                                        title="Save"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(null);
                                                            setFormData({
                                                                username: '',
                                                                password: '',
                                                                permissions: { habits: true, finance: true, todos: true, medical: true, trips: true },
                                                                is_admin: false
                                                            });
                                                        }}
                                                        className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditUser(u)}
                                                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {u.id !== user?.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Add New User</h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setFormData({
                                        username: '',
                                        password: '',
                                        permissions: { habits: true, finance: true, todos: true, medical: true },
                                        is_admin: false
                                    });
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                                <div className="space-y-2">
                                    {availablePermissions.map((p) => (
                                        <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions[p.key]}
                                                onChange={() => togglePermission(p.key)}
                                                className="rounded"
                                            />
                                            <span className="text-gray-300">{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_admin}
                                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-gray-300">Admin Access</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setFormData({
                                            username: '',
                                            password: '',
                                            permissions: { habits: true, finance: true, todos: true, medical: true, trips: true },
                                            is_admin: false
                                        });
                                    }}
                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
