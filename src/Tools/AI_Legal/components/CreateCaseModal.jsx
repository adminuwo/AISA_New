import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  X, Calendar, User, Users, Gavel, FileText, Upload, Plus, Shield, 
  List, ChevronDown, Phone, Globe, Search, Hash, AlertTriangle, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Full Country Dataset ---
const COUNTRIES = [
  { flag: '🇮🇳', name: 'India', iso: 'IN', dial: '+91' },
  { flag: '🇺🇸', name: 'United States', iso: 'US', dial: '+1' },
  { flag: '🇬🇧', name: 'United Kingdom', iso: 'GB', dial: '+44' },
  { flag: '🇦🇺', name: 'Australia', iso: 'AU', dial: '+61' },
  { flag: '🇨🇦', name: 'Canada', iso: 'CA', dial: '+1' },
  { flag: '🇩🇪', name: 'Germany', iso: 'DE', dial: '+49' },
  { flag: '🇫🇷', name: 'France', iso: 'FR', dial: '+33' },
  { flag: '🇯🇵', name: 'Japan', iso: 'JP', dial: '+81' },
  { flag: '🇨🇳', name: 'China', iso: 'CN', dial: '+86' },
  { flag: '🇧🇷', name: 'Brazil', iso: 'BR', dial: '+55' },
  { flag: '🇲🇽', name: 'Mexico', iso: 'MX', dial: '+52' },
  { flag: '🇷🇺', name: 'Russia', iso: 'RU', dial: '+7' },
  { flag: '🇰🇷', name: 'South Korea', iso: 'KR', dial: '+82' },
  { flag: '🇮🇹', name: 'Italy', iso: 'IT', dial: '+39' },
  { flag: '🇪🇸', name: 'Spain', iso: 'ES', dial: '+34' },
  { flag: '🇸🇦', name: 'Saudi Arabia', iso: 'SA', dial: '+966' },
  { flag: '🇦🇪', name: 'UAE', iso: 'AE', dial: '+971' },
  { flag: '🇵🇰', name: 'Pakistan', iso: 'PK', dial: '+92' },
  { flag: '🇧🇩', name: 'Bangladesh', iso: 'BD', dial: '+880' },
  { flag: '🇳🇬', name: 'Nigeria', iso: 'NG', dial: '+234' },
  { flag: '🇿🇦', name: 'South Africa', iso: 'ZA', dial: '+27' },
  { flag: '🇪🇬', name: 'Egypt', iso: 'EG', dial: '+20' },
  { flag: '🇮🇩', name: 'Indonesia', iso: 'ID', dial: '+62' },
  { flag: '🇹🇷', name: 'Turkey', iso: 'TR', dial: '+90' },
  { flag: '🇦🇷', name: 'Argentina', iso: 'AR', dial: '+54' },
  { flag: '🇵🇭', name: 'Philippines', iso: 'PH', dial: '+63' },
  { flag: '🇳🇱', name: 'Netherlands', iso: 'NL', dial: '+31' },
  { flag: '🇧🇪', name: 'Belgium', iso: 'BE', dial: '+32' },
  { flag: '🇸🇪', name: 'Sweden', iso: 'SE', dial: '+46' },
  { flag: '🇳🇴', name: 'Norway', iso: 'NO', dial: '+47' },
  { flag: '🇩🇰', name: 'Denmark', iso: 'DK', dial: '+45' },
  { flag: '🇫🇮', name: 'Finland', iso: 'FI', dial: '+358' },
  { flag: '🇵🇱', name: 'Poland', iso: 'PL', dial: '+48' },
  { flag: '🇨🇭', name: 'Switzerland', iso: 'CH', dial: '+41' },
  { flag: '🇦🇹', name: 'Austria', iso: 'AT', dial: '+43' },
  { flag: '🇵🇹', name: 'Portugal', iso: 'PT', dial: '+351' },
  { flag: '🇬🇷', name: 'Greece', iso: 'GR', dial: '+30' },
  { flag: '🇮🇱', name: 'Israel', iso: 'IL', dial: '+972' },
  { flag: '🇸🇬', name: 'Singapore', iso: 'SG', dial: '+65' },
  { flag: '🇲🇾', name: 'Malaysia', iso: 'MY', dial: '+60' },
  { flag: '🇹🇭', name: 'Thailand', iso: 'TH', dial: '+66' },
  { flag: '🇻🇳', name: 'Vietnam', iso: 'VN', dial: '+84' },
  { flag: '🇳🇿', name: 'New Zealand', iso: 'NZ', dial: '+64' }
];

// --- Case Categories ---
const ALL_CATEGORIES = [
  'Civil', 'Criminal', 'Family', 'Property', 'Corporate', 'Cyber Crime',
  'Consumer', 'Banking', 'Tax', 'Labour', 'Arbitration', 'Immigration',
  'Constitutional', 'Environment', 'Intellectual Property', 'Contract',
  'Insurance', 'Real Estate', 'Employment', 'Company', 'Consumer Protection',
  'Medical Negligence', 'Domestic Violence', 'Bail', 'Appeal', 'Other'
];

const CLIENT_ROLES = ['Petitioner', 'Appellant', 'Applicant', 'Plaintiff'];
const OPPONENT_ROLES = ['Respondent', 'Non-Applicant', 'Opposite Party'];

const CreateCaseModal = ({ isDark, isVisible, onClose, onSave, editingCase }) => {
  const [caseData, setCaseData] = useState({
    title: '',
    regdNo: '',
    clientRole: '',
    clientName: '',
    clientPhone: '',
    countryCode: '+91',
    opponentRole: '',
    opponentName: '',
    caseReceivedOn: '',
    courtName: '',
    caseType: '',
    caseCategories: [],
    hearingDate: '',
    priority: 'Medium',
    description: '',
    documents: []
  });

  const [countrySearch, setCountrySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(c => c.dial === '+91') || COUNTRIES[0]
  );

  // Sub-picker toggles
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showClientRolePicker, setShowClientRolePicker] = useState(false);
  const [showOpponentRolePicker, setShowOpponentRolePicker] = useState(false);

  useEffect(() => {
    if (editingCase) {
      console.log("Fetching Existing Case Data");
      console.log("Case Data Loaded:", editingCase);
      const categories = editingCase.caseCategories || (editingCase.caseType ? editingCase.caseType.split(', ') : []);
      setCaseData({
        id: editingCase.id || editingCase._id || '',
        title: editingCase.title || editingCase.name || '',
        regdNo: editingCase.regdNo || '',
        clientRole: editingCase.clientRole || '',
        clientName: editingCase.clientName || '',
        clientPhone: editingCase.clientPhone || '',
        countryCode: editingCase.countryCode || '+91',
        opponentRole: editingCase.opponentRole || '',
        opponentName: editingCase.opponentName || '',
        caseReceivedOn: editingCase.caseReceivedOn || '',
        courtName: editingCase.courtName || '',
        caseType: editingCase.caseType || '',
        caseCategories: categories,
        hearingDate: editingCase.hearingDate || '',
        priority: editingCase.priority || 'Medium',
        description: editingCase.description || editingCase.summary || '',
        documents: editingCase.documents || [],
        advocateName: editingCase.advocateName || ''
      });
      if (editingCase.countryCode) {
        const foundCountry = COUNTRIES.find(c => c.dial === editingCase.countryCode);
        if (foundCountry) setSelectedCountry(foundCountry);
      }
      console.log("Form Prefilled Successfully");
    } else {
      setCaseData({
        title: '',
        regdNo: '',
        clientRole: '',
        clientName: '',
        clientPhone: '',
        countryCode: '+91',
        opponentRole: '',
        opponentName: '',
        caseReceivedOn: '',
        courtName: '',
        caseType: '',
        caseCategories: [],
        hearingDate: '',
        priority: 'Medium',
        description: '',
        documents: [],
        advocateName: ''
      });
      setSelectedCountry(COUNTRIES.find(c => c.dial === '+91') || COUNTRIES[0]);
    }
  }, [editingCase, isVisible]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter(c => c.toLowerCase().includes(q));
  }, [categorySearch]);

  const toggleCategory = (cat) => {
    setCaseData(prev => {
      const cats = prev.caseCategories || [];
      if (cats.includes(cat)) {
        return { ...prev, caseCategories: cats.filter(c => c !== cat) };
      }
      if (cats.length >= 10) {
        alert('Maximum 10 categories allowed.');
        return prev;
      }
      return { ...prev, caseCategories: [...cats, cat] };
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newDocs = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type || 'file',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uri: URL.createObjectURL(file)
    }));
    setCaseData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), ...newDocs]
    }));
  };

  const handleSave = () => {
    if (!caseData.title.trim()) {
      alert('Please enter a Case Title before saving.');
      return;
    }
    if (!caseData.clientRole) {
      alert('Please select a Client Role.');
      return;
    }
    if (!caseData.clientName.trim()) {
      alert(`Please enter the ${caseData.clientRole} Name.`);
      return;
    }
    if (caseData.opponentRole && !caseData.opponentName.trim()) {
      alert(`Please enter the ${caseData.opponentRole} Name.`);
      return;
    }
    if (!caseData.caseCategories || caseData.caseCategories.length === 0) {
      alert('Please select at least 1 case category.');
      return;
    }

    const savedPayload = {
      ...caseData,
      caseType: caseData.caseCategories.join(', ')
    };
    onSave(savedPayload);
    
    // Reset form
    setCaseData({
      title: '',
      regdNo: '',
      clientRole: '',
      clientName: '',
      clientPhone: '',
      countryCode: '+91',
      opponentRole: '',
      opponentName: '',
      caseReceivedOn: '',
      courtName: '',
      caseType: '',
      caseCategories: [],
      hearingDate: '',
      priority: 'Medium',
      description: '',
      documents: []
    });
  };

  return (
    <Transition.Root show={isVisible} as={Fragment}>
      <Dialog as="div" className="relative z-[120000]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-8"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-8"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-zinc-800">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-6">
                  <div>
                    <Dialog.Title as="h3" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {editingCase ? 'Edit Case Intelligence' : 'New Case Intelligence'}
                    </Dialog.Title>
                    <p className="text-[10px] sm:text-xs text-subtext font-semibold mt-0.5">
                      {editingCase ? 'Modify professional legal case details' : 'Enter professional legal case details'}
                    </p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <X size={20} className="text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Case Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Case Title *</label>
                    <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <FileText size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. Smith vs Matrix Corp"
                        value={caseData.title}
                        onChange={e => setCaseData({ ...caseData, title: e.target.value })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* REGD NO */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Registration Number</label>
                    <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <Hash size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Enter Registration Number"
                        value={caseData.regdNo}
                        onChange={e => setCaseData({ ...caseData, regdNo: e.target.value.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase() })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Client Role & Objector Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Client Role *</label>
                      <button
                        type="button"
                        onClick={() => setShowClientRolePicker(true)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <User size={18} className="text-indigo-600 dark:text-indigo-400" />
                          <span className={`text-sm font-bold ${caseData.clientRole ? 'text-slate-850 dark:text-white' : 'text-slate-400'}`}>
                            {caseData.clientRole || 'Select Client Role'}
                          </span>
                        </div>
                        <ChevronDown size={16} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Objector Type</label>
                      <button
                        type="button"
                        onClick={() => setShowOpponentRolePicker(true)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                          <span className={`text-sm font-bold ${caseData.opponentRole ? 'text-slate-850 dark:text-white' : 'text-slate-400'}`}>
                            {caseData.opponentRole || 'Select Object Type'}
                          </span>
                        </div>
                        <ChevronDown size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Client Name Input */}
                  {caseData.clientRole && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">{caseData.clientRole} Name *</label>
                      <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                        <User size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder={`Enter ${caseData.clientRole} Name`}
                          value={caseData.clientName}
                          onChange={e => setCaseData({ ...caseData, clientName: e.target.value })}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Opponent Name Input */}
                  {caseData.opponentRole && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">{caseData.opponentRole} Name *</label>
                      <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                        <Users size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder={`Enter ${caseData.opponentRole} Name`}
                          value={caseData.opponentName}
                          onChange={e => setCaseData({ ...caseData, opponentName: e.target.value })}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Case Received On */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Case Received On</label>
                    <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <Calendar size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={caseData.caseReceivedOn}
                        onChange={e => setCaseData({ ...caseData, caseReceivedOn: e.target.value })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-850 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Phone + Country Selector */}
                  <div className="flex gap-4">
                    <div className="w-28 space-y-1.5 shrink-0">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Country</label>
                      <button
                        type="button"
                        onClick={() => setShowCountryPicker(true)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-3 py-3 text-left"
                      >
                        <span className="text-lg mr-1 shrink-0">{selectedCountry.flag}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedCountry.dial}</span>
                        <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Client Contact Number *</label>
                      <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                        <Phone size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                        <input
                          type="tel"
                          placeholder="9876543210"
                          value={caseData.clientPhone}
                          onChange={e => setCaseData({ ...caseData, clientPhone: e.target.value.replace(/[^0-9]/g, '') })}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advocate & Categories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Advocate / Counsel</label>
                      <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                        <Shield size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder="Assigned Lawyer"
                          value={caseData.advocateName || ''}
                          onChange={e => setCaseData({ ...caseData, advocateName: e.target.value })}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Case Category *</label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryPicker(true)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-left min-h-[52px]"
                      >
                        <div className="flex items-center gap-2 flex-wrap max-w-[85%]">
                          <List size={18} className="text-indigo-600 dark:text-indigo-400 mr-1 shrink-0" />
                          {caseData.caseCategories && caseData.caseCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {caseData.caseCategories.slice(0, 2).map(cat => (
                                <span key={cat} className="bg-indigo-600 text-white rounded-md text-[9px] font-black uppercase px-2 py-0.5 shrink-0">
                                  {cat}
                                </span>
                              ))}
                              {caseData.caseCategories.length > 2 && (
                                <span className="bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 rounded-md text-[9px] font-black px-1.5 py-0.5">
                                  +{caseData.caseCategories.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-400">Select categories...</span>
                          )}
                        </div>
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Case Priority</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Standard', 'High', 'Critical'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCaseData({ ...caseData, priority: p })}
                          className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                            caseData.priority === p 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                              : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:border-indigo-500'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Court / Jurisdiction */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Court / Jurisdiction</label>
                    <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <Gavel size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Supreme Court, High Court, etc."
                        value={caseData.courtName || ''}
                        onChange={e => setCaseData({ ...caseData, courtName: e.target.value })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Hearing Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Hearing Date</label>
                    <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <Calendar size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={caseData.hearingDate || ''}
                        onChange={e => setCaseData({ ...caseData, hearingDate: e.target.value })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-slate-850 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Documents & File upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Evidence & Documents</label>
                    <div className="flex gap-4">
                      <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-indigo-600/30 rounded-2xl py-4 cursor-pointer hover:border-indigo-600 transition-colors">
                        <Upload size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">Upload PDF, Word or Image</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Doc list */}
                    {caseData.documents && caseData.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {caseData.documents.map((doc, idx) => (
                          <div 
                            key={doc.id || idx} 
                            className="flex items-center gap-2 bg-indigo-55/10 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/30 px-3 py-1.5 rounded-xl max-w-xs shrink-0"
                          >
                            <span className="text-[11px] font-bold truncate max-w-[150px]">{doc.name}</span>
                            <button
                              type="button"
                              onClick={() => setCaseData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== doc.id) }))}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-red-500 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description / Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">Case Description / Notes</label>
                    <div className="flex items-start bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
                      <Plus size={18} className="text-indigo-600 dark:text-indigo-400 mr-2 shrink-0 mt-0.5" />
                      <textarea
                        rows={3}
                        placeholder="Brief summary for AI context..."
                        value={caseData.description}
                        onChange={e => setCaseData({ ...caseData, description: e.target.value })}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-800 dark:text-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Save Button */}
                <div className="flex items-center justify-end border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6">
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                  >
                    {editingCase ? 'Update Case' : 'Create Case'}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>

        {/* --- Sub-picker Modals --- */}
        {/* Country Picker Modal */}
        <Transition.Root show={showCountryPicker} as={Fragment}>
          <Dialog as="div" className="relative z-[130000]" onClose={() => setShowCountryPicker(false)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto flex items-end justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300 transform"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transition ease-in duration-200 transform"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 text-left shadow-2xl border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-md font-extrabold text-slate-900 dark:text-white">Select Country</Dialog.Title>
                    <button onClick={() => setShowCountryPicker(false)} className="p-1"><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 mb-4">
                    <Search size={14} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search country or code..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xs w-full text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredCountries.map(c => (
                      <button
                        key={c.iso}
                        onClick={() => {
                          setSelectedCountry(c);
                          setCaseData(prev => ({ ...prev, countryCode: c.dial }));
                          setShowCountryPicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                          selectedCountry.iso === c.iso ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.flag}</span>
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-400">{c.iso}</span>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400">{c.dial}</span>
                      </button>
                    ))}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Category Picker Modal */}
        <Transition.Root show={showCategoryPicker} as={Fragment}>
          <Dialog as="div" className="relative z-[130000]" onClose={() => setShowCategoryPicker(false)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto flex items-end justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300 transform"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transition ease-in duration-200 transform"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 text-left shadow-2xl border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-1">
                    <Dialog.Title className="text-md font-extrabold text-slate-900 dark:text-white">Case Categories</Dialog.Title>
                    <button onClick={() => setShowCategoryPicker(false)} className="p-1"><X size={18} className="text-slate-400" /></button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mb-4">{caseData.caseCategories.length} selected · max 10</p>
                  <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 mb-4">
                    <Search size={14} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search category..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xs w-full text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredCategories.map(cat => {
                      const isActive = caseData.caseCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`w-full flex items-center gap-3 px-3 py-3.5 text-left text-xs font-bold transition-all ${
                            isActive ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-zinc-700'}`}>
                            {isActive && <span className="text-[10px]">✓</span>}
                          </div>
                          <span className={isActive ? 'text-indigo-650' : 'text-slate-850 dark:text-slate-250'}>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      onClick={() => setCaseData(prev => ({ ...prev, caseCategories: [] }))}
                      className="flex-1 py-3 text-center border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowCategoryPicker(false)}
                      className="flex-[2] py-3 text-center bg-indigo-600 rounded-xl text-xs font-black text-white hover:opacity-90"
                    >
                      {caseData.caseCategories.length === 0 ? 'Skip' : `Confirm ${caseData.caseCategories.length}`}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Client Role Picker Modal */}
        <Transition.Root show={showClientRolePicker} as={Fragment}>
          <Dialog as="div" className="relative z-[130000]" onClose={() => setShowClientRolePicker(false)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto flex items-end justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300 transform"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transition ease-in duration-200 transform"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 text-left shadow-2xl border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-md font-extrabold text-slate-900 dark:text-white">Select Client Role</Dialog.Title>
                    <button onClick={() => setShowClientRolePicker(false)} className="p-1"><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-1">
                    {CLIENT_ROLES.map(role => (
                      <button
                        key={role}
                        onClick={() => {
                          setCaseData(prev => ({ ...prev, clientRole: role }));
                          setShowClientRolePicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs font-bold transition-all rounded-xl ${
                          caseData.clientRole === role ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span>{role}</span>
                        {caseData.clientRole === role && <span className="text-indigo-600 text-[10px]">✓ Selected</span>}
                      </button>
                    ))}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Opponent Role Picker Modal */}
        <Transition.Root show={showOpponentRolePicker} as={Fragment}>
          <Dialog as="div" className="relative z-[130000]" onClose={() => setShowOpponentRolePicker(false)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto flex items-end justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300 transform"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transition ease-in duration-200 transform"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 text-left shadow-2xl border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-md font-extrabold text-slate-900 dark:text-white">Select Objector Type</Dialog.Title>
                    <button onClick={() => setShowOpponentRolePicker(false)} className="p-1"><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-1">
                    {OPPONENT_ROLES.map(role => (
                      <button
                        key={role}
                        onClick={() => {
                          setCaseData(prev => ({ ...prev, opponentRole: role }));
                          setShowOpponentRolePicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs font-bold transition-all rounded-xl ${
                          caseData.opponentRole === role ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span>{role}</span>
                        {caseData.opponentRole === role && <span className="text-indigo-600 text-[10px]">✓ Selected</span>}
                      </button>
                    ))}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

      </Dialog>
    </Transition.Root>
  );
};

export default CreateCaseModal;
