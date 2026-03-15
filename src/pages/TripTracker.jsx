import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { MapPin, Plus, Calendar, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const TripTracker = () => {
    const [trips, setTrips] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', start_date: '', end_date: '', people: '', description: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrips();
    }, []);

    const fetchTrips = async () => {
        try {
            const data = await api.get('/api/trips');
            setTrips(data);
        } catch (error) { console.error('Failed to load trips', error); }
    };

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/trips', formData);
            setShowCreateModal(false);
            setFormData({ title: '', start_date: '', end_date: '', people: '', description: '' });
            navigate(`/trips/${res.id}`); // navigate directly to new trip details
        } catch (error) { console.error('Failed to create trip', error); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">My Trips</h1>
                    <p className="text-gray-400">Log your travels, create timelines, and store unforgettable memories.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={20} />
                    Plan New Trip
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map(trip => (
                    <div 
                        key={trip.id} 
                        className="group bg-gray-800 rounded-3xl border border-gray-700 p-6 hover:border-emerald-500/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer flex flex-col"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <MapPin size={24} />
                            </div>
                            <span className="bg-gray-900 border border-gray-700 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Calendar size={12} />
                                {format(new Date(trip.start_date), 'MMM yyyy')}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 line-clamp-1">{trip.title}</h2>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-1">{trip.description || 'No description provided.'}</p>
                        
                        <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Users size={16} />
                                <span className="truncate max-w-[120px]">{trip.people || 'Solo'}</span>
                            </div>
                            <span className="text-emerald-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                View <ArrowRight size={16} />
                            </span>
                        </div>
                    </div>
                ))}

                {trips.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-gray-800/50 rounded-3xl border border-gray-700 border-dashed">
                        <MapPin size={48} className="text-emerald-500/50 mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">No trips planned yet</h3>
                        <p className="text-gray-500 max-w-sm mb-6">Start documenting your adventures by creating your very first trip record.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-emerald-400 font-medium hover:text-emerald-300"
                        >
                            + Create a Trip
                        </button>
                    </div>
                )}
            </div>

            {/* Create Trip Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 w-full max-w-lg shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-6">Plan New Trip</h2>
                        <form onSubmit={handleCreateTrip} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Destination / Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. Summer in Tokyo"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Travel Companions</label>
                                <input
                                    type="text"
                                    value={formData.people}
                                    onChange={e => setFormData({...formData, people: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. Alice, Bob (Leave empty if Solo)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24"
                                    placeholder="Brief details about the trip..."
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Create Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripTracker;
