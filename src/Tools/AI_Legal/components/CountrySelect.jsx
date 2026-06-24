import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X, Globe, Check } from 'lucide-react';

// ─── All countries of the world ───────────────────────────────────────────────
export const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile',
  'China', 'Colombia', 'Comoros', 'Congo (Brazzaville)', 'Congo (Kinshasa)',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
  'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea',
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
  'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

// Country flag emoji lookup (top countries)
const FLAG_EMOJI = {
  'India': '🇮🇳', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
  'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Germany': '🇩🇪',
  'France': '🇫🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Japan': '🇯🇵',
  'China': '🇨🇳', 'Singapore': '🇸🇬', 'United Arab Emirates': '🇦🇪',
  'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦', 'Brazil': '🇧🇷',
  'Russia': '🇷🇺', 'South Africa': '🇿🇦', 'Pakistan': '🇵🇰',
  'Bangladesh': '🇧🇩', 'Sri Lanka': '🇱🇰', 'Nepal': '🇳🇵',
  'Malaysia': '🇲🇾', 'Indonesia': '🇮🇩', 'Philippines': '🇵🇭',
  'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'South Korea': '🇰🇷',
  'Turkey': '🇹🇷', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Switzerland': '🇨🇭',
  'Poland': '🇵🇱', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷',
  'Chile': '🇨🇱', 'New Zealand': '🇳🇿', 'Ireland': '🇮🇪',
  'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Egypt': '🇪🇬',
  'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Ethiopia': '🇪🇹',
  'Ghana': '🇬🇭', 'Morocco': '🇲🇦', 'Israel': '🇮🇱',
  'Iraq': '🇮🇶', 'Iran': '🇮🇷', 'Kuwait': '🇰🇼',
  'Bahrain': '🇧🇭', 'Oman': '🇴🇲', 'Jordan': '🇯🇴',
  'Lebanon': '🇱🇧', 'Myanmar': '🇲🇲', 'Cambodia': '🇰🇭',
  'Ukraine': '🇺🇦', 'Belarus': '🇧🇾', 'Kazakhstan': '🇰🇿',
};

// ─── CountrySelect Component ──────────────────────────────────────────────────
const CountrySelect = ({
  value = '',
  onChange,
  filled = false,
  placeholder = 'Search and select country...',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Filter countries
  const filtered = query.trim()
    ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : ALL_COUNTRIES;

  // Close on outside click
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

  // Focus input when opening
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setHighlighted(0);
    }
  }, [open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlighted];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const handleSelect = useCallback((country) => {
    onChange(country);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') setOpen(true); return; }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlighted]) handleSelect(filtered[highlighted]);
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  const flag = value ? (FLAG_EMOJI[value] || '🌍') : null;
  const borderClass = filled
    ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-950/10'
    : 'border-slate-200 dark:border-white/8 bg-white dark:bg-[#141E35]';

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-2 border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${borderClass} text-left`}
      >
        {flag ? (
          <span className="text-base shrink-0">{flag}</span>
        ) : (
          <Globe size={15} className="text-slate-400 shrink-0" />
        )}
        <span className={`flex-1 truncate ${value ? 'text-slate-800 dark:text-white font-semibold' : 'text-slate-400'} flex items-center gap-1.5`}>
          {value || placeholder}
          {value && <Check size={14} className="text-emerald-500 shrink-0" />}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full shrink-0 transition-colors"
            aria-label="Clear selection"
          >
            <X size={12} className="text-slate-400" />
          </button>
        )}
        <ChevronDown
          size={15}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-[9999] left-0 right-0 mt-1.5 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '320px' }}
          role="listbox"
          aria-label="Country selection"
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1A2540] z-10">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
              placeholder="Type to search country..."
              className="flex-1 text-xs font-medium text-slate-800 dark:text-white bg-transparent border-none outline-none placeholder:text-slate-400"
              aria-label="Search countries"
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

          {/* Country list */}
          <div
            ref={listRef}
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '260px' }}
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Globe size={24} className="text-slate-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs font-bold text-slate-400">No country found for "{query}"</p>
              </div>
            ) : (
              filtered.map((country, idx) => {
                const isSelected = country === value;
                const isHovered = idx === highlighted;
                return (
                  <button
                    key={country}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : isHovered
                        ? 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base w-6 text-center shrink-0">
                        {FLAG_EMOJI[country] || '🌍'}
                      </span>
                      <span className="text-xs font-semibold truncate">{country}</span>
                    </div>

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
              })
            )}
          </div>

          {/* Footer count */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/10">
            <p className="text-[10px] text-slate-400 font-medium">
              {filtered.length} of {ALL_COUNTRIES.length} countries
              {query && ` · "${query}"`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
