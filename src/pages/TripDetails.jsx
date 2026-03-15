import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { format } from 'date-fns';
import {
    MapPin, Calendar, Users, Clock, Plus, Trash2,
    Image as ImageIcon, Share2, UploadCloud, ChevronLeft, ChevronRight, X, ArrowLeft, CheckSquare, Download
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const AlertModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-300 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-300 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors font-medium">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-medium">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const TripDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [media, setMedia] = useState([]);
    
    // Timeline Form
    const [showTimelineForm, setShowTimelineForm] = useState(false);
    const [timelineData, setTimelineData] = useState({ place: '', date: '', time: '', details: '' });

    // Media Upload
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Media Gallery & Selection
    const [selectedMedia, setSelectedMedia] = useState(new Set());
    const [viewerIndex, setViewerIndex] = useState(null);

    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });
    const closeAlert = () => setAlertConfig({ isOpen: false, title: '', message: '' });
    
    const showConfirm = (title, message, onConfirm) => setConfirmConfig({ isOpen: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });

    const [activeTab, setActiveTab] = useState('gallery'); // Assuming we have state for tabs somewhere if it was missing? Wait, earlier there was no activeTab state in my chunk, let me just add these new states. Oh wait, activeTab is defined further down if at all? Wait, TripDetails has an activeTab implicitly.
    // Let me just stick these before useEffect.

    useEffect(() => {
        fetchTripDetails();
    }, [id]);

    const fetchTripDetails = async () => {
        try {
            const data = await api.get(`/api/trips/${id}`);
            setTrip(data);
            setTimeline(data.timeline || []);
            setMedia(data.media || []);
        } catch (error) {
            console.error('Error fetching trip details', error);
        }
    };

    // --- Timeline Handlers ---
    const handleAddTimeline = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/trips/${id}/timeline`, timelineData);
            setShowTimelineForm(false);
            setTimelineData({ place: '', date: '', time: '', details: '' });
            fetchTripDetails();
        } catch (error) { 
            console.error(error); 
            alert(error.response?.data?.error || 'Failed to add timeline entry');
        }
    };

    const handleDeleteTimeline = async (timelineId) => {
        try {
            await api.delete(`/api/trips/${id}/timeline/${timelineId}`);
            fetchTripDetails();
        } catch (error) { console.error(error); }
    };

    // --- Media Upload Handlers ---
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setUploading(true);
        let completed = 0;

        for (const file of files) {
            try {
                // 1. Get presigned URL
                const { uploadUrl, fileUrl, fileKey } = await api.post(`/api/trips/${id}/media/upload-url`, {
                    filename: file.name,
                    filetype: file.type
                });

                if (uploadUrl && uploadUrl !== 'mock_url') {
                    // 2. Upload to S3
                    await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': file.type },
                        body: file
                    });
                }

                // 3. Save to DB
                await api.post(`/api/trips/${id}/media`, {
                    file_url: fileUrl,
                    file_key: fileKey,
                    type: file.type.startsWith('video/') ? 'video' : 'photo',
                    tag: 'general'
                });

                completed++;
                setUploadProgress((completed / files.length) * 100);
            } catch (error) {
                console.error('Error uploading file', file.name, error);
            }
        }
        
        setUploading(false);
        setUploadProgress(0);
        fetchTripDetails();
    };

    // --- Media Selection & Actions ---
    const toggleSelection = (mediaId) => {
        const newSet = new Set(selectedMedia);
        if (newSet.has(mediaId)) {
            newSet.delete(mediaId);
        } else {
            newSet.add(mediaId);
        }
        setSelectedMedia(newSet);
    };

    const clearSelection = () => setSelectedMedia(new Set());

    const handleBulkDelete = () => {
        if (!selectedMedia.size) return;
        
        showConfirm('Delete Media', `Are you sure you want to delete ${selectedMedia.size} items?`, async () => {
            try {
                await api.delete(`/api/trips/${id}/media/bulk`, { body: { ids: Array.from(selectedMedia) } });
                clearSelection();
                fetchTripDetails();
            } catch (error) { console.error('Error deleting media', error); }
            closeConfirm();
        });
    };

    const selectAllMedia = () => {
        setSelectedMedia(new Set(media.map(m => m.id)));
    };

    const handleBulkShare = async () => {
        if (!selectedMedia.size) return;
        try {
            const res = await api.post(`/api/trips/${id}/media/share`, { mediaIds: Array.from(selectedMedia) });
            const shareLink = window.location.origin + res.shareUrl;
            navigator.clipboard.writeText(shareLink);
            showAlert('Share Link Ready', `Copied shared collection link to clipboard!\n\n${shareLink}`);
            clearSelection();
        } catch (error) { console.error('Error sharing media', error); }
    };

    const handleDownloadZip = () => {
        if (!selectedMedia.size) return;
        const ids = Array.from(selectedMedia).join(',');
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3003' : '';
        window.open(`${baseUrl}/api/trips/${id}/media/download-zip?mediaIds=${ids}`, '_blank');
        clearSelection();
    };

    // --- Media Viewer ---
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


    if (!trip) return <div className="p-8 text-center text-gray-400 font-medium">Loading Trip...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <header className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-2xl relative overflow-hidden">
                <button onClick={() => navigate('/trips')} className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
                    <ArrowLeft size={20} /> Back to Trips
                </button>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">{trip.title}</h1>
                        <p className="text-gray-400 max-w-2xl text-lg mb-6">{trip.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm font-medium">
                            <span className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20">
                                <Calendar size={18} />
                                {format(new Date(trip.start_date), 'MMM d, yyyy')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-xl border border-purple-500/20">
                                <Users size={18} />
                                {trip.people || 'Solo'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Timeline Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex justify-between items-center bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="text-emerald-400" /> Timeline
                        </h2>
                        <button 
                            onClick={() => setShowTimelineForm(!showTimelineForm)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {showTimelineForm && (
                        <form onSubmit={handleAddTimeline} className="bg-gray-800 p-6 rounded-3xl border border-gray-700 space-y-4 shadow-xl">
                            <input type="text" required placeholder="Place" value={timelineData.place} onChange={e => setTimelineData({...timelineData, place: e.target.value})} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" required min={trip.start_date} max={trip.end_date} value={timelineData.date} onChange={e => setTimelineData({...timelineData, date: e.target.value})} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                                <input type="time" title="Time (Optional)" value={timelineData.time || ''} onChange={e => setTimelineData({...timelineData, time: e.target.value})} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <input type="text" placeholder="Details (e.g. Lunch at Cafe)" value={timelineData.details} onChange={e => setTimelineData({...timelineData, details: e.target.value})} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowTimelineForm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">Add</button>
                            </div>
                        </form>
                    )}

                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute left-10 top-10 bottom-10 w-px bg-gray-700"></div>
                        {timeline.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No timeline entries yet.</p>
                        ) : (
                            <div className="space-y-6 relative z-10">
                                {timeline.map((item) => (
                                    <div key={item.id} className="group flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-gray-900 border-2 border-emerald-500 rounded-full flex items-center justify-center mt-1">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 bg-gray-900 border border-gray-700 p-4 rounded-2xl hover:border-emerald-500/50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-white font-bold text-lg">{item.place}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 font-medium bg-gray-800 px-2 py-1 rounded-lg">
                                                        {item.date && `${item.date} `}{item.time || ''}
                                                    </span>
                                                    <button onClick={() => handleDeleteTimeline(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            {item.details && <p className="text-sm text-gray-400">{item.details}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Gallery Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="text-blue-400" /> Media Gallery
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {selectedMedia.size > 0 && (
                                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-700">
                                    <span className="text-xs font-bold text-white">{selectedMedia.size} selected</span>
                                    <button onClick={clearSelection} className="text-gray-400 hover:text-white px-2"><X size={14} /></button>
                                    <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                    <button onClick={handleDownloadZip} className="text-emerald-400 hover:text-emerald-300 p-1" title="Download ZIP"><Download size={16} /></button>
                                    <button onClick={handleBulkShare} className="text-blue-400 hover:text-blue-300 p-1" title="Share Selected"><Share2 size={16} /></button>
                                    <button onClick={handleBulkDelete} className="text-red-400 hover:text-red-300 p-1" title="Delete Selected"><Trash2 size={16} /></button>
                                </div>
                            )}

                            {media.length > 0 && selectedMedia.size !== media.length && (
                                <button onClick={selectAllMedia} className="text-sm font-medium text-gray-400 hover:text-white transition-colors bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl">
                                    Select All
                                </button>
                            )}

                            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer w-full md:w-auto justify-center">
                                <UploadCloud size={20} />
                                {uploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload Media'}
                                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    {uploading && (
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    )}

                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-6 shadow-xl min-h-[400px]">
                        {media.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20">
                                <ImageIcon size={64} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium text-gray-400 mb-2">No photos or videos yet</p>
                                <p className="text-sm">Click "Upload Media" to add your memories to this trip.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {media.map((item, index) => (
                                    <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 cursor-pointer shadow-md hover:shadow-xl transition-all">
                                        <div onClick={() => openViewer(index)} className="w-full h-full">
                                            {item.type === 'video' ? (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                                                    Video
                                                </div>
                                            ) : (
                                                <img src={item.file_url !== 'mock_url' ? item.file_url : '/placeholder.jpg'} alt="Trip memory" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            )}
                                        </div>
                                        
                                        {/* Selection Overlay */}
                                        <div className={`absolute inset-0 bg-blue-500/20 transition-opacity ${selectedMedia.has(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} pointer-events-none`}></div>
                                        
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                                            className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMedia.has(item.id) ? 'bg-blue-500 border-blue-500 text-white scale-110' : 'bg-black/40 border-white text-transparent hover:border-blue-400'}`}
                                        >
                                            <CheckSquare size={14} className={selectedMedia.has(item.id) ? 'block' : 'hidden'} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fullscreen Media Viewer */}
            {viewerIndex !== null && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-md">
                    <button onClick={closeViewer} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-black/50 p-3 rounded-full hover:bg-white/10 transition-colors z-[101]">
                        <X size={24} />
                    </button>

                    <button onClick={viewPrev} className="absolute left-4 md:left-8 text-white bg-black/50 p-4 rounded-full hover:bg-white/10 transition-colors z-[101]">
                        <ChevronLeft size={32} />
                    </button>

                    <div className="max-w-[90vw] max-h-[90vh] relative flex items-center justify-center">
                        {media[viewerIndex].type === 'video' ? (
                            <video src={media[viewerIndex].file_url} controls className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" autoPlay />
                        ) : (
                            <img src={media[viewerIndex].file_url !== 'mock_url' ? media[viewerIndex].file_url : '/placeholder.jpg'} alt="Viewer" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl scale-in" />
                        )}
                        <div className="absolute bottom-4 right-4 bg-black/60 px-4 py-2 rounded-xl text-white font-medium text-sm backdrop-blur-sm">
                            {viewerIndex + 1} / {media.length}
                        </div>
                    </div>

                    <button onClick={viewNext} className="absolute right-4 md:right-8 text-white bg-black/50 p-4 rounded-full hover:bg-white/10 transition-colors z-[101]">
                        <ChevronRight size={32} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TripDetails;
