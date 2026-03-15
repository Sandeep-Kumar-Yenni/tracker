import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { Calendar, Users, MapPin, ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

const SharedGallery = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Viewer
    const [viewerIndex, setViewerIndex] = useState(null);

    useEffect(() => {
        fetchSharedCollection();
    }, [token]);

    const fetchSharedCollection = async () => {
        try {
            const data = await api.get(`/api/shared/${token}`);
            setTrip(data.trip);
            setMedia(data.media || []);
            setError('');
        } catch (err) {
            console.error('Error fetching shared collection:', err);
            setError('This shared collection link is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    const openViewer = (index) => setViewerIndex(index);
    const closeViewer = () => setViewerIndex(null);
    const viewNext = () => setViewerIndex((prev) => (prev + 1) % media.length);
    const viewPrev = () => setViewerIndex((prev) => (prev - 1 + media.length) % media.length);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (viewerIndex === null) return;
            if (e.key === 'Escape') closeViewer();
            if (e.key === 'ArrowRight') viewNext();
            if (e.key === 'ArrowLeft') viewPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerIndex, media.length]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-blue-400 font-bold flex items-center gap-3">
                    <ImageIcon className="animate-pulse" size={24} />
                    Loading Collection...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-8">
                <X className="text-red-500 mb-4" size={48} />
                <h1 className="text-2xl font-bold text-white mb-2">Collection Not Found</h1>
                <p className="text-gray-400 max-w-md">{error}</p>
                <button onClick={() => navigate('/')} className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">
                    Return Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8 selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Profile */}
                <header className="bg-gray-900/50 backdrop-blur-md rounded-3xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 border border-blue-400/20 transform -rotate-6">
                            <MapPin className="text-white" size={32} />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight">
                            {trip.title}
                        </h1>
                        <p className="text-gray-400 max-w-2xl text-lg mb-8 leading-relaxed">
                            {trip.description}
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
                            <span className="flex items-center gap-2 bg-gray-800/80 text-gray-300 px-5 py-2.5 rounded-xl border border-gray-700/50 shadow-inner">
                                <Calendar size={18} className="text-blue-400" />
                                {format(new Date(trip.start_date), 'MMM d, yyyy')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-2 bg-gray-800/80 text-gray-300 px-5 py-2.5 rounded-xl border border-gray-700/50 shadow-inner">
                                <Users size={18} className="text-purple-400" />
                                {trip.people || 'Solo Adventure'}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ImageIcon className="text-blue-400" size={20} /> Snapshot Gallery
                    </h2>
                    <span className="text-sm font-medium text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                        {media.length} items
                    </span>
                </div>

                {/* Media Grid */}
                {media.length === 0 ? (
                    <div className="bg-gray-900/30 rounded-3xl border border-gray-800/50 h-64 flex flex-col items-center justify-center text-gray-500">
                        <ImageIcon size={48} className="mb-4 opacity-30" />
                        <p className="text-lg">No media in this collection.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px]">
                        {media.map((item, index) => (
                            <div 
                                key={item.id} 
                                onClick={() => openViewer(index)}
                                className={`relative group rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${index % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                                
                                {item.type === 'video' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 text-gray-400 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mb-2">
                                            <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-blue-400 border-b-8 border-b-transparent ml-1"></div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Video</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={item.file_url !== 'mock_url' ? item.file_url : '/placeholder.jpg'} 
                                        alt="Memory" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Viewer */}
            {viewerIndex !== null && (
                <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center backdrop-blur-xl">
                    <button onClick={closeViewer} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-3 rounded-full hover:bg-white/10 transition-colors z-[101] border border-white/10">
                        <X size={24} />
                    </button>

                    <button onClick={viewPrev} className="absolute left-4 md:left-8 text-white bg-white/5 p-4 rounded-full hover:bg-white/10 transition-colors z-[101] border border-white/10 hover:scale-110">
                        <ChevronLeft size={32} />
                    </button>

                    <div className="max-w-[95vw] max-h-[95vh] relative flex items-center justify-center">
                        {media[viewerIndex].type === 'video' ? (
                            <video src={media[viewerIndex].file_url} controls className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl ring-1 ring-white/10" autoPlay />
                        ) : (
                            <img src={media[viewerIndex].file_url !== 'mock_url' ? media[viewerIndex].file_url : '/placeholder.jpg'} alt="Viewer" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10" />
                        )}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white/10 px-6 py-2 rounded-full text-white font-medium text-sm border border-white/10 shadow-xl backdrop-blur-md">
                            {viewerIndex + 1} of {media.length}
                        </div>
                    </div>

                    <button onClick={viewNext} className="absolute right-4 md:right-8 text-white bg-white/5 p-4 rounded-full hover:bg-white/10 transition-colors z-[101] border border-white/10 hover:scale-110">
                        <ChevronRight size={32} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SharedGallery;
