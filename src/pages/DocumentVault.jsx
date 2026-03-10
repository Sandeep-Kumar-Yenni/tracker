import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { FileText, Plus, Search, Filter, Download, Trash2, X } from 'lucide-react';


const CATEGORIES = ['Certificate', 'ID', 'Tax', 'Receipt', 'Contract', 'Other'];

const DocumentVault = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState({ name: '', category: 'Certificate', file: null });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/documents');
            setDocuments(data);
            setSelectedIds(new Set()); // clear selection on reload
        } catch (error) {
            console.error('Failed to fetch documents', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) return;

        try {
            // 1. Get presigned URL to upload directly to S3
            const urlRes = await api.post('/api/documents/upload-url', {
                filename: uploadForm.file.name,
                filetype: uploadForm.file.type || 'application/octet-stream'
            });

            // 2. Upload file directly to S3 via PUT
            if (urlRes.uploadUrl !== 'mock_url') {
                const s3UploadRes = await fetch(urlRes.uploadUrl, {
                    method: 'PUT',
                    body: uploadForm.file,
                    headers: {
                        'Content-Type': uploadForm.file.type || 'application/octet-stream'
                    }
                });

                if (!s3UploadRes.ok) throw new Error('Failed to upload to S3');
            }

            // 3. Save reference in database
            const dbRes = await api.post('/api/documents', {
                name: uploadForm.name,
                category: uploadForm.category,
                file_url: urlRes.fileUrl,
                file_key: urlRes.fileKey
            });

            if (dbRes) {
                setShowUploadModal(false);
                setUploadForm({ name: '', category: 'Certificate', file: null });
                fetchDocuments();
            }
        } catch (error) {
            console.error('Failed to upload document', error);
            alert('Upload failed. Please try again.');
        }
    };

    const handleDownloadSingle = async (id, fileUrl) => {
        if (fileUrl && fileUrl.includes('localhost')) {
            window.open(fileUrl, '_blank');
            return;
        }
        try {
            const { url } = await api.get(`/api/documents/${id}/share`);
            if (url) window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to get download URL', error);
            alert('Failed to access document.');
        }
    };

    const handleBulkDownload = async () => {
        const idsArray = Array.from(selectedIds);
        for (const id of idsArray) {
            const doc = documents.find(d => d.id === id);
            if (doc) {
                await handleDownloadSingle(doc.id, doc.file_url);
                // add tiny delay between opens so browser doesn't block them all as spam
                await new Promise(r => setTimeout(r, 500));
            }
        }
        setSelectedIds(new Set()); // clear after download
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} document(s)?`)) return;

        try {
            await api.delete('/api/documents/bulk', { body: JSON.stringify({ ids: Array.from(selectedIds) }) });
            fetchDocuments();
        } catch (error) {
            console.error('Failed to delete documents', error);
            alert('Failed to delete some documents.');
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredDocuments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDocuments.map(d => d.id)));
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'All' || doc.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    const isAllSelected = filteredDocuments.length > 0 && selectedIds.size === filteredDocuments.length;

    return (
        <div className="max-w-6xl mx-auto space-y-6 relative pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Document Vault</h1>
                    <p className="text-gray-400">Securely store and manage your important personal documents.</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={20} />
                    Upload Document
                </button>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search documents by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium placeholder-gray-500"
                    />
                </div>
                <div className="relative md:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium cursor-pointer"
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Document Table */}
            <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading documents...</div>
                ) : documents.length === 0 ? (
                    <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                        <FileText size={48} className="mb-4 opacity-30 text-indigo-400" />
                        <h3 className="text-xl font-medium text-gray-300 mb-2">Vault is Empty</h3>
                        <p>Upload your first certificate or important document to keep it safe.</p>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No documents match your filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-800/80 text-gray-300 uppercase font-semibold text-xs border-b border-gray-700">
                                <tr>
                                    <th className="px-5 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Date Uploaded</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 bg-gray-900/30">
                                {filteredDocuments.map(doc => (
                                    <tr key={doc.id} className={`transition-colors ${selectedIds.has(doc.id) ? 'bg-indigo-500/10' : 'hover:bg-gray-800/50'}`}>
                                        <td className="px-5 py-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => toggleSelection(doc.id)}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <FileText size={18} className="text-indigo-400/70" />
                                            {doc.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-800 px-2.5 py-1 rounded-md border border-gray-700 text-xs">
                                                {doc.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{format(parseISO(doc.created_at), 'MMM d, yyyy')}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDownloadSingle(doc.id, doc.file_url)}
                                                className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors inline-block"
                                                title="View / Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sticky Action Bar */}
            {
                selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 z-40">
                        <span className="text-sm font-medium text-white">
                            {selectedIds.size} document(s) selected
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={handleBulkDownload}
                                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-full transition-colors text-sm font-medium"
                            >
                                <Download size={14} /> Download Selected
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors text-sm font-medium"
                            >
                                <Trash2 size={14} /> Delete Selected
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 transition-colors ml-2"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Upload Modal */}
            {
                showUploadModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Upload to Vault</h3>
                                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Document Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={uploadForm.name}
                                        onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                                        placeholder="e.g. Birth Certificate"
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                    <select
                                        value={uploadForm.category}
                                        onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium cursor-pointer"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">File</label>
                                    <div className="border border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-gray-900/30 transition-all">
                                        <input
                                            type="file"
                                            required
                                            onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer"
                                        />
                                        {uploadForm.file && (
                                            <p className="mt-3 text-sm text-green-400 truncate font-medium">
                                                Selected: {uploadForm.file.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!uploadForm.file || !uploadForm.name}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Upload File
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DocumentVault;
