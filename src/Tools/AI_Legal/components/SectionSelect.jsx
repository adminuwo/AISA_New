import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X, Scale, Check, Plus } from 'lucide-react';
import { CRIMINAL_SECTIONS } from '../data/criminalLawData';

const SectionSelect = ({
  value = '',
  onChange,
  filled = false,
  placeholder = 'Search and select sections...',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [selected, setSelected] = useState([]);
  
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Synchronize incoming value string to selected list state
  useEffect(() => {
    if (!value) {
      setSelected([]);
      return;
    }
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    const parsed = parts.map(part => {
      const cleanedPart = part.toLowerCase();
      
      // Look for a match in CRIMINAL_SECTIONS
      const match = CRIMINAL_SECTIONS.find(sec => {
        const idMatch = cleanedPart === sec.id.toLowerCase();
        const ipcMatch = cleanedPart === sec.ipc.toLowerCase() ||
                         cleanedPart === `ipc ${sec.ipc.toLowerCase()}` ||
                         cleanedPart === `ipc section ${sec.ipc.toLowerCase()}`;
        const bnsMatch = sec.bns && (
                         cleanedPart === sec.bns.toLowerCase() ||
                         cleanedPart === `bns ${sec.bns.toLowerCase()}` ||
                         cleanedPart === `bns section ${sec.bns.toLowerCase()}`);
        const fullTitleMatch = cleanedPart.includes(`ipc section ${sec.ipc.toLowerCase()}`) ||
                               cleanedPart.includes(`ipc ${sec.ipc.toLowerCase()}`);
        return idMatch || ipcMatch || bnsMatch || fullTitleMatch;
      });

      if (match) {
        return match;
      } else {
        // Return custom section
        return {
          id: `custom_${part}`,
          ipc: part,
          title: '',
          isCustom: true
        };
      }
    });

    // Deduplicate
    const seen = new Set();
    const unique = [];
    parsed.forEach(item => {
      const key = item.isCustom ? item.ipc : item.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    setSelected(unique);
  }, [value]);

  // Filter sections by search query
  const filtered = query.trim()
    ? CRIMINAL_SECTIONS.filter(sec => {
        const q = query.toLowerCase();
        return sec.ipc.toLowerCase().includes(q) ||
               (sec.bns && sec.bns.toLowerCase().includes(q)) ||
               sec.title.toLowerCase().includes(q) ||
               (sec.bnsTitle && sec.bnsTitle.toLowerCase().includes(q)) ||
               `ipc ${sec.ipc}`.toLowerCase().includes(q) ||
               `bns ${sec.bns}`.toLowerCase().includes(q);
      })
    : CRIMINAL_SECTIONS;

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setHighlighted(0);
    }
  }, [open]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlighted];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const triggerChange = useCallback((newSelected) => {
    const str = newSelected.map(sec => {
      if (sec.isCustom) return sec.ipc;
      return `IPC Section ${sec.ipc} – ${sec.title}`;
    }).join(', ');
    onChange(str);
  }, [onChange]);

  const handleToggle = useCallback((sec) => {
    const isSelected = selected.some(s => s.isCustom ? s.ipc === sec.ipc : s.id === sec.id);
    let next;
    if (isSelected) {
      next = selected.filter(s => s.isCustom ? s.ipc !== sec.ipc : s.id !== sec.id);
    } else {
      next = [...selected, sec];
    }
    setSelected(next);
    triggerChange(next);
  }, [selected, triggerChange]);

  const handleRemove = useCallback((sec, e) => {
    e.stopPropagation();
    const next = selected.filter(s => s.isCustom ? s.ipc !== sec.ipc : s.id !== sec.id);
    setSelected(next);
    triggerChange(next);
  }, [selected, triggerChange]);

  const handleAddCustom = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Check if already selected
    const isAlreadySelected = selected.some(s => s.ipc.toLowerCase() === trimmedQuery.toLowerCase());
    if (isAlreadySelected) {
      setQuery('');
      return;
    }

    const customSec = {
      id: `custom_${trimmedQuery}`,
      ipc: trimmedQuery,
      title: '',
      isCustom: true
    };

    const next = [...selected, customSec];
    setSelected(next);
    triggerChange(next);
    setQuery('');
    setHighlighted(0);
  }, [query, selected, triggerChange]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setOpen(true);
      }
      return;
    }
    
    const showCustomOption = query.trim() && !CRIMINAL_SECTIONS.some(s => 
      s.ipc.toLowerCase() === query.trim().toLowerCase() ||
      (s.bns && s.bns.toLowerCase() === query.trim().toLowerCase())
    );
    const maxIndex = filtered.length + (showCustomOption ? 1 : 0) - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, maxIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted < filtered.length) {
          if (filtered[highlighted]) handleToggle(filtered[highlighted]);
        } else if (showCustomOption) {
          handleAddCustom();
        }
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  const getDisplayLabel = (sec) => {
    if (sec.isCustom) return sec.ipc;
    if (sec.bns) return `IPC ${sec.ipc} (BNS ${sec.bns}) – ${sec.title}`;
    return `IPC ${sec.ipc} – ${sec.title}`;
  };

  const getChipLabel = (sec) => {
    if (sec.isCustom) return sec.ipc;
    return `IPC ${sec.ipc}`;
  };

  const borderClass = filled || selected.length > 0
    ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-950/10'
    : 'border-slate-200 dark:border-white/8 bg-white dark:bg-[#141E35]';

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger Area containing Selected Chips */}
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full min-h-[46px] flex flex-wrap items-center gap-1.5 border rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer transition-all ${
          open ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-white dark:bg-[#1A2540]' : borderClass
        }`}
      >
        <Scale size={15} className="text-slate-400 shrink-0 mr-1" />
        
        {selected.length === 0 ? (
          <span className="text-slate-400 select-none flex-1 truncate">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {selected.map(sec => (
              <span
                key={sec.isCustom ? sec.ipc : sec.id}
                className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-black"
              >
                <span>✓ {getChipLabel(sec)}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(sec, e)}
                  className="p-0.5 hover:bg-indigo-150 dark:hover:bg-indigo-900/60 rounded-full shrink-0 transition-colors"
                  aria-label={`Remove ${getChipLabel(sec)}`}
                >
                  <X size={10} className="text-indigo-600 dark:text-indigo-400" />
                </button>
              </span>
            ))}
          </div>
        )}

        <ChevronDown
          size={15}
          className={`text-slate-400 shrink-0 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute z-[9999] left-0 right-0 mt-1.5 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '320px' }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1A2540] z-10">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
              placeholder="Search section number or name (e.g., 302, Theft)..."
              className="flex-1 text-xs font-medium text-slate-800 dark:text-white bg-transparent border-none outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setHighlighted(0); }}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-full"
              >
                <X size={11} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* List of Sections */}
          <div
            ref={listRef}
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '230px' }}
          >
            {filtered.map((sec, idx) => {
              const isSelected = selected.some(s => s.isCustom ? s.ipc === sec.ipc : s.id === sec.id);
              const isHovered = idx === highlighted;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleToggle(sec)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : isHovered
                      ? 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-semibold flex-1 truncate pr-2">
                    {getDisplayLabel(sec)}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                        : 'border-slate-300 dark:border-zinc-600 bg-transparent'
                    }`}>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Custom option when search doesn't match list exactly */}
            {query.trim() && !CRIMINAL_SECTIONS.some(s => 
              s.ipc.toLowerCase() === query.trim().toLowerCase() ||
              (s.bns && s.bns.toLowerCase() === query.trim().toLowerCase())
            ) && (
              <button
                type="button"
                onClick={handleAddCustom}
                onMouseEnter={() => setHighlighted(filtered.length)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                  highlighted === filtered.length
                    ? 'bg-indigo-50/85 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-xs font-bold truncate flex-1 pr-2 flex items-center gap-1">
                  <Plus size={12} /> Add Custom Section: "{query.trim()}"
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-4 h-4 rounded-full border border-dashed border-indigo-500 bg-transparent" />
                </div>
              </button>
            )}

            {filtered.length === 0 && !query.trim() && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Scale size={24} className="text-slate-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs font-bold text-slate-400">No sections found. Type to add custom.</p>
              </div>
            )}
          </div>

          {/* Footer count */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/10 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-medium">
              {filtered.length} of {CRIMINAL_SECTIONS.length} sections database
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected([]); triggerChange([]); }}
                className="text-[10px] text-indigo-500 hover:underline font-bold"
              >
                Clear All ({selected.length})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionSelect;
