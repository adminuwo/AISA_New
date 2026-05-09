import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ value, options, onChange, label, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState('bottom');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 260) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className={`relative w-full ${isOpen ? 'z-[50]' : 'z-[1]'}`} ref={containerRef}>
            <button
                onClick={handleOpen}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300
                    ${isOpen
                        ? 'border-primary bg-primary/10 ring-4 ring-primary/5 shadow-lg'
                        : 'border-border dark:border-white/[0.06] bg-gray-50 dark:bg-[#18233A] hover:border-primary/40 group'
                    }
                `}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-4 h-4 transition-colors ${isOpen ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />}
                    <span className="text-sm font-bold text-gray-700 dark:text-maintext">
                        {value}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? 12 : -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: dropdownPosition === 'bottom' ? 8 : -8, scale: 1 }}
                        exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? 12 : -12, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className={`absolute z-[99999] left-0 right-0 p-1.5 bg-white dark:bg-[#131C31] rounded-[1.5rem] border border-gray-100 dark:border-white/[0.06] shadow-2xl backdrop-blur-xl ${dropdownPosition === 'bottom' ? 'origin-top top-full' : 'origin-bottom bottom-full'}`}
                    >
                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1">
                            {options.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => {
                                        onChange({ target: { value: opt } });
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all group
                                        ${value === opt
                                            ? 'bg-primary/10 text-primary font-black shadow-inner shadow-primary/5'
                                            : 'text-gray-600 dark:text-subtext hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-maintext'
                                        }
                                    `}
                                >
                                    <span className="tracking-tight">{opt}</span>
                                    {value === opt && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -45 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                        >
                                            <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomSelect;
