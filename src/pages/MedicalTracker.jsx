import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Activity, FileText, Plus, Upload, Link2, Search, Download, Trash2, Heart, Scale, Thermometer, BriefcaseMedical, Edit, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MedicalTracker = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('vitals'); // 'vitals', 'documents', 'issues'
    const [vitals, setVitals] = useState([]);
    const [records, setRecords] = useState([]);
    const [issues, setIssues] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);

    // Modals
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // Form States
    const [vitalsForm, setVitalsForm] = useState({ id: null, date: new Date().toISOString().split('T')[0], heart_rate: '', blood_pressure: '', weight: '', temperature: '', notes: '' });
    const [uploadForm, setUploadForm] = useState({ title: '', type: 'lab_result', date: new Date().toISOString().split('T')[0], notes: '', issue_id: '', file: null });
    const [issueForm, setIssueForm] = useState({ id: null, title: '', description: '', doctor_name: '', clinic_details: '', start_date: new Date().toISOString().split('T')[0], status: 'active' });

    // Follow-ups State
    const [followups, setFollowups] = useState([]);
    const [showFollowupModal, setShowFollowupModal] = useState(false);
    const [followupForm, setFollowupForm] = useState({ id: null, date: new Date().toISOString().split('T')[0], doctor_name: '', clinic_details: '', description: '' });

    // Family Members State
    const [familyMembers, setFamilyMembers] = useState([]);
    const [selectedFamilyMember, setSelectedFamilyMember] = useState('self');
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [familyForm, setFamilyForm] = useState({ id: null, name: '', relationship: '', otherRelationship: '' });

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    useEffect(() => {
        if (activeTab === 'vitals') fetchVitals();
        if (activeTab === 'documents') {
            fetchRecords();
            fetchIssues(); // For the dropdown map
        }
        if (activeTab === 'issues') fetchIssues();
    }, [activeTab, selectedFamilyMember]);

    useEffect(() => {
        if (selectedIssue) {
            fetchFollowups(selectedIssue.id);
        } else {
            setFollowups([]);
        }
    }, [selectedIssue]);

    const fetchFamilyMembers = async () => {
        try {
            const data = await api.get('/api/medical/family');
            setFamilyMembers(data);
        } catch (error) { console.error('Failed to fetch family members', error); }
    };

    const fetchVitals = async () => {
        try {
            const url = `/api/medical/vitals${selectedFamilyMember !== 'self' ? `?family_member_id=${selectedFamilyMember}` : ''}`;
            const data = await api.get(url);
            setVitals(data);
        } catch (error) { console.error('Failed to fetch vitals', error); }
    };

    const fetchRecords = async () => {
        try {
            const url = `/api/medical/records${selectedFamilyMember !== 'self' ? `?family_member_id=${selectedFamilyMember}` : ''}`;
            const data = await api.get(url);
            setRecords(data);
        } catch (error) { console.error('Failed to fetch records', error); }
    };

    const fetchIssues = async () => {
        try {
            const url = `/api/medical/issues${selectedFamilyMember !== 'self' ? `?family_member_id=${selectedFamilyMember}` : ''}`;
            const data = await api.get(url);
            setIssues(data);
        } catch (error) { console.error('Failed to fetch issues', error); }
    };

    const fetchFollowups = async (issueId) => {
        try {
            const data = await api.get(`/api/medical/issues/${issueId}/followups`);
            setFollowups(data);
        } catch (error) { console.error('Failed to fetch followups', error); }
    };

    const handleSaveVitals = async (e) => {
        e.preventDefault();
        try {
            const isEdit = vitalsForm.id !== null;
            const data = { ...vitalsForm, family_member_id: selectedFamilyMember !== 'self' ? selectedFamilyMember : null };

            if (isEdit) {
                await api.put(`/api/medical/vitals/${vitalsForm.id}`, data);
            } else {
                await api.post('/api/medical/vitals', data);
            }
            setShowVitalsModal(false);
            setVitalsForm({ id: null, date: new Date().toISOString().split('T')[0], heart_rate: '', blood_pressure: '', weight: '', temperature: '', notes: '' });
            fetchVitals();
        } catch (error) { console.error('Failed to save vitals', error); }
    };

    const handleEditVitals = (vital) => {
        setVitalsForm({ ...vital });
        setShowVitalsModal(true);
    };

    const handleDeleteVitals = (id) => {
        setConfirmModal({
            isOpen: true, title: 'Delete Vitals log', message: 'Are you sure you want to delete this specific vitals entry?',
            onConfirm: async () => {
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                try {
                    await api.delete(`/api/medical/vitals/${id}`);
                    fetchVitals();
                } catch (error) { console.error('Failed to delete vitals', error); }
            }
        });
    };

    const handleUploadRecord = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) return alert('Please select a file');

        try {
            // 1. Get presigned URL
            const urlRes = await api.post('/api/medical/records/upload-url', {
                filename: uploadForm.file.name,
                filetype: uploadForm.file.type || 'application/octet-stream'
            });

            // 2. Upload directly to S3
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
            const data = {
                title: uploadForm.title,
                type: uploadForm.type,
                date: uploadForm.date,
                notes: uploadForm.notes,
                issue_id: uploadForm.issue_id,
                family_member_id: selectedFamilyMember !== 'self' ? selectedFamilyMember : null,
                file_url: urlRes.fileUrl,
                file_key: urlRes.fileKey
            };

            const dbRes = await api.post('/api/medical/records', data);

            if (dbRes) {
                setShowUploadModal(false);
                setUploadForm({ title: '', type: 'lab_result', date: new Date().toISOString().split('T')[0], notes: '', issue_id: '', file: null });
                fetchRecords();
                if (selectedIssue) {
                    // Refresh issue details
                }
            }
        } catch (error) {
            console.error('Failed to upload record', error);
            alert('Upload failed. Please try again.');
        }
    };

    const handleDeleteRecord = (id) => {
        setConfirmModal({
            isOpen: true, title: 'Delete Medical Record', message: 'Are you sure you want to permanently delete this document?',
            onConfirm: async () => {
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                try {
                    await api.delete(`/api/medical/records/${id}`);
                    fetchRecords();
                    // Also trigger fetch issues if we were viewing one to refresh the list
                    if (activeTab === 'issues') fetchIssues();
                } catch (error) { console.error('Failed to delete record', error); }
            }
        });
    };

    const handleShareRecord = async (id) => {
        try {
            const { url } = await api.get(`/api/medical/records/${id}/share`);
            await navigator.clipboard.writeText(url);
            alert('Secure sharing link copied to clipboard! (Valid for 1 hour)');
        } catch (error) { console.error('Failed to generate share link', error); }
    };

    const handleDownloadRecord = async (id, fileUrl) => {
        // If it's a mock url/localhost, open directly
        if (fileUrl && fileUrl.includes('localhost')) {
            window.open(fileUrl, '_blank');
            return;
        }

        try {
            const { url } = await api.get(`/api/medical/records/${id}/share`);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to get secure download link', error);
            alert('Failed to access document. Access Denied or file missing.');
        }
    };

    const filteredRecords = records.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Medical Profile</h1>
                    <p className="text-gray-400">Track your health vitals and securely manage medical records.</p>
                </div>
                {/* Context Switcher */}
                <div className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-xl border border-gray-700/50">
                    <span className="text-gray-400 text-sm font-medium pl-2">Viewing:</span>
                    <select
                        value={selectedFamilyMember}
                        onChange={(e) => { setSelectedFamilyMember(e.target.value); setSelectedIssue(null); }}
                        className="bg-gray-800 border border-gray-700 text-white px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium cursor-pointer"
                    >
                        <option value="self">Self (Primary)</option>
                        {familyMembers.map(fm => (
                            <option key={fm.id} value={fm.id}>{fm.name} ({fm.relationship})</option>
                        ))}
                    </select>
                    <button onClick={() => setShowFamilyModal(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700" title="Manage Family Profiles">
                        <Plus size={16} />
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex bg-gray-800/50 p-1 rounded-2xl w-fit border border-gray-700/50 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('vitals')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'vitals' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                >
                    <Activity size={18} />
                    Vitals Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                >
                    <FileText size={18} />
                    Document Vault
                </button>
                <button
                    onClick={() => { setActiveTab('issues'); setSelectedIssue(null); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'issues' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                >
                    <BriefcaseMedical size={18} />
                    Issues & Cases
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden min-h-[500px] p-6">
                {activeTab === 'vitals' && (
                    <div className="animate-in fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Health Metrics</h2>
                            <button onClick={() => setShowVitalsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium">
                                <Plus size={16} />
                                Log Vitals
                            </button>
                        </div>

                        {vitals.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50 text-indigo-400" />
                                <p>No vitals logged yet. Start tracking your health metrics!</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {vitals.map(v => (
                                    <div key={v.id} className="bg-gray-900 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors group">
                                        <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-800">
                                            <span className="text-sm text-gray-400">{format(parseISO(v.date), 'MMMM d, yyyy')}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditVitals(v)} className="text-gray-500 hover:text-indigo-400 transition-colors"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteVitals(v.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {v.heart_rate && <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Heart size={14} className="text-red-400" /> Heart Rate</span> <span className="font-bold text-white">{v.heart_rate} bpm</span></div>}
                                            {v.blood_pressure && <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Activity size={14} className="text-blue-400" /> Blood Pressure</span> <span className="font-bold text-white">{v.blood_pressure}</span></div>}
                                            {v.weight && <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Scale size={14} className="text-green-400" /> Weight</span> <span className="font-bold text-white">{v.weight} kg</span></div>}
                                            {v.temperature && <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Thermometer size={14} className="text-orange-400" /> Temp</span> <span className="font-bold text-white">{v.temperature} °C</span></div>}
                                        </div>
                                        {v.notes && <p className="mt-4 text-xs text-gray-500 bg-gray-800 p-2 rounded-lg">{v.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="animate-in fade-in space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h2 className="text-xl font-bold text-white">Secure Records</h2>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search documents..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium shrink-0">
                                    <Upload size={16} />
                                    Upload
                                </button>
                            </div>
                        </div>

                        {filteredRecords.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50 text-indigo-400" />
                                <p>Your vault is empty or no documents match your search.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-700">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-gray-900/80 text-gray-300 uppercase font-semibold text-xs border-b border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4">Document</th>
                                            <th className="px-6 py-4 hidden md:table-cell">Type</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800 bg-gray-900/30">
                                        {filteredRecords.map(record => (
                                            <tr key={record.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white">{record.title}</div>
                                                    {record.notes && <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{record.notes}</div>}
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell capitalize">
                                                    <span className="bg-gray-800 px-2.5 py-1 rounded-md border border-gray-700 text-xs">
                                                        {record.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{format(parseISO(record.date), 'MMM d, yyyy')}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleDownloadRecord(record.id, record.file_url)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="View/Download">
                                                            <Download size={16} />
                                                        </button>
                                                        <button onClick={() => handleShareRecord(record.id)} className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Generate Secure Sharing Link">
                                                            <Link2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Document">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'issues' && (
                    <div className="animate-in fade-in space-y-6">
                        {!selectedIssue ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-white">Medical Issues & Cases</h2>
                                    <button onClick={() => { setIssueForm({ id: null, title: '', description: '', doctor_name: '', clinic_details: '', start_date: new Date().toISOString().split('T')[0], status: 'active' }); setShowIssueModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium">
                                        <Plus size={16} />
                                        Log New Issue
                                    </button>
                                </div>

                                {issues.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                                        <BriefcaseMedical className="w-16 h-16 mx-auto mb-4 opacity-50 text-indigo-400" />
                                        <p>No medical issues logged. Group your doctor visits and documents by tracking cases here.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {issues.map(issue => (
                                            <div
                                                key={issue.id}
                                                onClick={() => setSelectedIssue(issue)}
                                                className="bg-gray-900 rounded-xl p-5 border border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{issue.title}</h3>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${issue.status === 'active' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {issue.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{issue.description || 'No description provided.'}</p>

                                                <div className="space-y-2 mt-auto">
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span>Doctor</span>
                                                        <span className="text-gray-300 font-medium">{issue.doctor_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span>Date</span>
                                                        <span className="text-gray-300 font-medium">{format(parseISO(issue.start_date), 'MMM d, yyyy')}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><FileText size={14} /> {issue.records_count} linked docs</span>
                                                    <ChevronRight size={16} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            // Selected Issue View
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 border-b border-gray-700 pb-4">
                                    <button onClick={() => setSelectedIssue(null)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                                        <ChevronRight size={20} className="rotate-180" />
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold text-white">{selectedIssue.title}</h2>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedIssue.status === 'active' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {selectedIssue.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{format(parseISO(selectedIssue.start_date), 'MMMM d, yyyy')}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setIssueForm(selectedIssue); setShowIssueModal(true); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
                                            <Edit size={16} /> Edit Details
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true, title: 'Delete Medical Issue', message: 'Delete this issue? Connected documents will be kept in the vault but unlinked.',
                                                    onConfirm: async () => {
                                                        try {
                                                            await api.delete(`/api/medical/issues/${selectedIssue.id}`);
                                                            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                            setSelectedIssue(null);
                                                            fetchIssues();
                                                        } catch (error) {
                                                            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                            console.error('Failed to delete issue', error);
                                                        }
                                                    }
                                                });
                                            }}
                                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1 space-y-4">
                                        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                                            <h4 className="text-xs uppercase text-gray-500 font-bold mb-3">Case Information</h4>
                                            <div className="space-y-4 text-sm">
                                                <div>
                                                    <span className="block text-gray-500 mb-1">Doctor / Provider</span>
                                                    <span className="text-white font-medium">{selectedIssue.doctor_name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-gray-500 mb-1">Clinic / Facility</span>
                                                    <span className="text-white">{selectedIssue.clinic_details || 'N/A'}</span>
                                                </div>
                                                {selectedIssue.description && (
                                                    <div>
                                                        <span className="block text-gray-500 mb-1">Description</span>
                                                        <span className="text-gray-300 leading-relaxed">{selectedIssue.description}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 mt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-xs uppercase text-gray-500 font-bold">Follow-ups</h4>
                                                <button
                                                    onClick={() => {
                                                        setFollowupForm({ id: null, date: new Date().toISOString().split('T')[0], doctor_name: selectedIssue.doctor_name || '', clinic_details: selectedIssue.clinic_details || '', description: '' });
                                                        setShowFollowupModal(true);
                                                    }}
                                                    className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded flex items-center gap-1"
                                                >
                                                    <Plus size={12} /> Add
                                                </button>
                                            </div>

                                            {followups.length === 0 ? (
                                                <div className="text-sm text-gray-500 text-center py-4">No follow-ups recorded yet.</div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {followups.map((fu, i) => (
                                                        <div key={fu.id} className="relative pl-4 border-l-2 border-indigo-500/30 pb-2">
                                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500"></div>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-sm font-bold text-white">{format(parseISO(fu.date), 'MMM d, yyyy')}</span>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => { setFollowupForm(fu); setShowFollowupModal(true); }} className="text-gray-500 hover:text-indigo-400 transition-colors"><Edit size={12} /></button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmModal({
                                                                                isOpen: true, title: 'Delete Follow-up', message: 'Delete this specific follow-up log?',
                                                                                onConfirm: async () => {
                                                                                    try {
                                                                                        await api.delete(`/api/medical/followups/${fu.id}`);
                                                                                        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                                                        fetchFollowups(selectedIssue.id);
                                                                                    } catch (error) {
                                                                                        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                                                        console.error('Failed to delete followup', error);
                                                                                    }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                            {(fu.doctor_name || fu.clinic_details) && (
                                                                <div className="text-xs text-indigo-300/70 mb-1 flex items-center gap-1">
                                                                    <Activity size={10} /> {fu.doctor_name} {fu.clinic_details && `• ${fu.clinic_details}`}
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-gray-400 leading-relaxed">{fu.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-white flex items-center gap-2"><FileText size={18} /> Related Documents</h3>
                                            <button
                                                onClick={() => {
                                                    setUploadForm({ title: '', type: 'lab_result', date: new Date().toISOString().split('T')[0], notes: '', issue_id: selectedIssue.id, file: null });
                                                    setShowUploadModal(true);
                                                }}
                                                className="text-xs px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg"
                                            >
                                                + Upload Document
                                            </button>
                                        </div>

                                        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                                            {(records.filter(r => r.issue_id === selectedIssue.id).length === 0) ? (
                                                <div className="p-8 text-center text-gray-500 text-sm">No documents linked to this issue yet.</div>
                                            ) : (
                                                <table className="w-full text-left text-sm text-gray-400">
                                                    <tbody className="divide-y divide-gray-800">
                                                        {records.filter(r => r.issue_id === selectedIssue.id).map(record => (
                                                            <tr key={record.id} className="hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-white">{record.title}</div>
                                                                    <div className="text-xs capitalize">{record.type.replace('_', ' ')} • {format(parseISO(record.date), 'MMM d')}</div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button onClick={() => handleDownloadRecord(record.id, record.file_url)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-lg" title="Download"><Download size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Vitals Modal */}
            {
                showVitalsModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Log Health Vitals</h3>
                                <button onClick={() => setShowVitalsModal(false)} className="text-gray-400 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                            </div>
                            <form onSubmit={handleSaveVitals} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Date</label>
                                    <input type="date" value={vitalsForm.date} onChange={e => setVitalsForm({ ...vitalsForm, date: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Heart Rate (bpm)</label>
                                        <input type="number" placeholder="e.g. 72" value={vitalsForm.heart_rate} onChange={e => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Blood Pressure</label>
                                        <input type="text" placeholder="e.g. 120/80" value={vitalsForm.blood_pressure} onChange={e => setVitalsForm({ ...vitalsForm, blood_pressure: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
                                        <input type="number" step="0.1" placeholder="e.g. 70.5" value={vitalsForm.weight} onChange={e => setVitalsForm({ ...vitalsForm, weight: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Temp (°C)</label>
                                        <input type="number" step="0.1" placeholder="e.g. 36.6" value={vitalsForm.temperature} onChange={e => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Notes</label>
                                    <textarea rows="2" placeholder="Feeling okay..." value={vitalsForm.notes} onChange={e => setVitalsForm({ ...vitalsForm, notes: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
                                </div>
                                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                                    Save Vitals
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Upload Modal */}
            {
                showUploadModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Upload Medical Record</h3>
                                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                            </div>
                            <form onSubmit={handleUploadRecord} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Document Title</label>
                                    <input type="text" placeholder="e.g. Annual Blood Test" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Category</label>
                                        <select value={uploadForm.type} onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="lab_result">Lab Result</option>
                                            <option value="prescription">Prescription</option>
                                            <option value="receipt">Medical Receipt</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Date</label>
                                        <input type="date" value={uploadForm.date} onChange={e => setUploadForm({ ...uploadForm, date: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm text-gray-400 mb-1">Link to Medical Issue (Optional)</label>
                                        <select value={uploadForm.issue_id} onChange={e => setUploadForm({ ...uploadForm, issue_id: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- No Issue Linked --</option>
                                            {issues.map(iss => (
                                                <option key={iss.id} value={iss.id}>{iss.title} ({format(parseISO(iss.start_date), 'MMM yyyy')})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">File Attachment (PDF/Image)</label>
                                    <input type="file" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })} className="w-full bg-gray-900 border border-gray-700 text-gray-400 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Notes (Optional)</label>
                                    <textarea rows="2" placeholder="Doctor's comments..." value={uploadForm.notes} onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
                                </div>
                                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                    <Upload size={18} /> Securely Upload to Vault
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Issue Modal */}
            {
                showIssueModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{issueForm.id ? 'Edit Medical Issue' : 'Log New Medical Issue'}</h3>
                                <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const isEdit = issueForm.id !== null;
                                    const data = { ...issueForm, family_member_id: selectedFamilyMember !== 'self' ? selectedFamilyMember : null };

                                    if (isEdit) {
                                        await api.put(`/api/medical/issues/${issueForm.id}`, data);
                                    } else {
                                        await api.post('/api/medical/issues', data);
                                    }
                                    setShowIssueModal(false);
                                    fetchIssues();
                                    if (selectedIssue && isEdit) {
                                        setSelectedIssue({ ...selectedIssue, ...issueForm });
                                    }
                                } catch (err) { console.error(err); }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Issue Title (e.g. Broken Ankle)</label>
                                    <input type="text" value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                        <input type="date" value={issueForm.start_date} onChange={e => setIssueForm({ ...issueForm, start_date: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Status</label>
                                        <select value={issueForm.status} onChange={e => setIssueForm({ ...issueForm, status: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="active">Active</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Doctor / Provider Name</label>
                                    <input type="text" placeholder="Dr. Smith" value={issueForm.doctor_name} onChange={e => setIssueForm({ ...issueForm, doctor_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Clinic / Facility Details</label>
                                    <input type="text" placeholder="City General Hospital" value={issueForm.clinic_details} onChange={e => setIssueForm({ ...issueForm, clinic_details: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description & Notes</label>
                                    <textarea rows="3" placeholder="Describe the symptoms or treatment..." value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
                                </div>

                                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                                    Save Medical Issue
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Follow-up Modal */}
            {
                showFollowupModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{followupForm.id ? 'Edit Follow-up' : 'Log Follow-up Visit'}</h3>
                                <button onClick={() => setShowFollowupModal(false)} className="text-gray-400 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const isEdit = followupForm.id !== null;

                                    if (isEdit) {
                                        await api.put(`/api/medical/followups/${followupForm.id}`, followupForm);
                                    } else {
                                        await api.post(`/api/medical/issues/${selectedIssue.id}/followups`, followupForm);
                                    }
                                    setShowFollowupModal(false);
                                    fetchFollowups(selectedIssue.id);
                                } catch (err) { console.error(err); }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Visit Date</label>
                                    <input type="date" value={followupForm.date} onChange={e => setFollowupForm({ ...followupForm, date: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Seen By</label>
                                        <input type="text" placeholder="Dr. Smith" value={followupForm.doctor_name} onChange={e => setFollowupForm({ ...followupForm, doctor_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Clinic Name</label>
                                        <input type="text" placeholder="General Medical..." value={followupForm.clinic_details} onChange={e => setFollowupForm({ ...followupForm, clinic_details: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Treatment / Progress Notes</label>
                                    <textarea rows="4" placeholder="Update on symptoms, changes in medication..." value={followupForm.description} onChange={e => setFollowupForm({ ...followupForm, description: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" required></textarea>
                                </div>

                                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2">
                                    <Edit size={16} /> Save Follow-up
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Family Member Modal */}
            {
                showFamilyModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Manage Family Profiles</h3>
                                <button onClick={() => setShowFamilyModal(false)} className="text-gray-400 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                            </div>

                            {familyMembers.length > 0 && (
                                <div className="mb-6 space-y-2">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase">Existing Profiles</h4>
                                    {familyMembers.map(fm => (
                                        <div key={fm.id} className="flex justify-between items-center p-3 bg-gray-900 border border-gray-700 rounded-lg">
                                            <div>
                                                <span className="text-white font-medium">{fm.name}</span>
                                                <span className="text-xs text-gray-500 ml-2 capitalize">({fm.relationship})</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    const standardRelationships = ['spouse', 'child', 'parent', 'pet'];
                                                    const isOther = !standardRelationships.includes(fm.relationship);
                                                    setFamilyForm({
                                                        id: fm.id,
                                                        name: fm.name,
                                                        relationship: isOther ? 'other' : fm.relationship,
                                                        otherRelationship: isOther ? fm.relationship : ''
                                                    });
                                                }} className="text-gray-400 hover:text-indigo-400"><Edit size={14} /></button>
                                                <button
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true, title: 'Delete Profile', message: 'Delete this profile? Existing medical records will be kept but unlinked.',
                                                            onConfirm: async () => {
                                                                try {
                                                                    await api.delete(`/api/medical/family/${fm.id}`);
                                                                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                                    fetchFamilyMembers();
                                                                    if (selectedFamilyMember == fm.id) setSelectedFamilyMember('self');
                                                                } catch (error) {
                                                                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                                                                    console.error('Failed to delete family member', error);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    className="text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const isEdit = familyForm.id !== null;
                                    const relationshipValue = familyForm.relationship === 'other' ? familyForm.otherRelationship : familyForm.relationship;
                                    const data = { name: familyForm.name, relationship: relationshipValue };

                                    if (isEdit) {
                                        await api.put(`/api/medical/family/${familyForm.id}`, data);
                                    } else {
                                        await api.post('/api/medical/family', data);
                                    }
                                    setFamilyForm({ id: null, name: '', relationship: '', otherRelationship: '' });
                                    fetchFamilyMembers();
                                } catch (err) { console.error(err); }
                            }} className="space-y-4 border-t border-gray-700 pt-6">
                                <h4 className="text-sm font-bold text-gray-400 uppercase">{familyForm.id ? 'Edit Profile' : 'Add New Profile'}</h4>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                                    <input type="text" value={familyForm.name} onChange={e => setFamilyForm({ ...familyForm, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Relationship</label>
                                    <select value={familyForm.relationship} onChange={e => setFamilyForm({ ...familyForm, relationship: e.target.value, otherRelationship: e.target.value === 'other' ? familyForm.otherRelationship : '' })} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required>
                                        <option value="">-- Select --</option>
                                        <option value="spouse">Spouse</option>
                                        <option value="child">Child</option>
                                        <option value="parent">Parent</option>
                                        <option value="pet">Pet</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                {familyForm.relationship === 'other' && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Enter Relationship</label>
                                        <input
                                            type="text"
                                            value={familyForm.otherRelationship}
                                            onChange={e => setFamilyForm({ ...familyForm, otherRelationship: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g., Cousin, Friend, etc."
                                            required
                                        />
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    {familyForm.id && <button type="button" onClick={() => setFamilyForm({ id: null, name: '', relationship: '', otherRelationship: '' })} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel Edit</button>}
                                    <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                                        {familyForm.id ? 'Save Changes' : 'Add Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Global Confirm Modal */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-gray-400 text-sm mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium">Cancel</button>
                                <button onClick={confirmModal.onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-500/20">Delete Action</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MedicalTracker;
