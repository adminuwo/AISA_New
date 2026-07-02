import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, TrendingUp, BarChart3, Globe, Zap, Loader2, Check, ExternalLink, ChevronDown, Activity, Sparkles, AlertCircle, Maximize, BookOpen, Shield, TrendingDown, Award, ChevronRight, Maximize2, Minimize2, Lock, Unlock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import AISnapshot from '../../landingpage/AISnapshot';
// import { io } from 'socket.io-client';
import { io } from 'socket.io-client';
import apiService from '../../services/apiService';

const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "http://localhost:8080/api";

const PRESET_STOCKS = [
   { symbol: 'TCS.BSE', name: 'Tata Consultancy', region: 'IN' },
   { symbol: 'RELIANCE.BSE', name: 'Reliance Ind.', region: 'IN' },
   { symbol: 'HDFCBANK.BSE', name: 'HDFC Bank', region: 'IN' },
   { symbol: 'INFY.BSE', name: 'Infosys Ltd', region: 'IN' },
   { symbol: 'ICICIBANK.BSE', name: 'ICICI Bank', region: 'IN' },
   { symbol: 'TCS.NSE', name: 'Tata Consultancy', region: 'IN' },
   { symbol: 'RELIANCE.NSE', name: 'Reliance Ind.', region: 'IN' },
   { symbol: 'HDFCBANK.NSE', name: 'HDFC Bank', region: 'IN' },
   { symbol: 'INFY.NSE', name: 'Infosys Ltd', region: 'IN' },
   { symbol: 'ICICIBANK.NSE', name: 'ICICI Bank', region: 'IN' }

   //   { symbol: 'AAPL', name: 'Apple Inc.', region: 'US' },
   //   { symbol: 'MSFT', name: 'Microsoft Corp.', region: 'US' },
   //   { symbol: 'NVDA', name: 'NVIDIA Corp.', region: 'US' }
];

const TradingViewWidget = ({ symbol, interval = "D", containerId = "tv_chart_container", isDarkMode = false }) => {
   const containerRef = React.useRef(null);

   useEffect(() => {
      let tvSymbol = "BSE:SENSEX";
      if (symbol) {
         // Standardize symbol for TradingView (NSE:TCS, BSE:RELIANCE, etc.)
         const cleanSymbol = symbol.split('.')[0];
         if (symbol.includes('.BSE')) tvSymbol = `BSE:${cleanSymbol}`;
         else if (symbol.includes('.NSE')) tvSymbol = `NSE:${cleanSymbol}`;
         else if (!symbol.includes('.')) tvSymbol = `NASDAQ:${cleanSymbol}`;
         else tvSymbol = symbol;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      // Clear any previous widget content immediately
      currentContainer.innerHTML = '';

      // Guard: track if this effect is still current when the async script loads
      let isMounted = true;

      const initWidget = () => {
         // Double-check the container is still in the DOM and this render is still live
         if (!isMounted || !containerRef.current || !window.TradingView) return;
         try {
            new window.TradingView.widget({
               "autosize": true,
               "symbol": tvSymbol,
               "interval": interval,
               "timezone": "Asia/Kolkata",
               "theme": isDarkMode ? "dark" : "light",
               "style": "1",
               "locale": "en",
               "backgroundColor": isDarkMode ? "#161B2E" : "#ffffff",
               "toolbar_bg": isDarkMode ? "#161B2E" : "#f1f3f6",
               "enable_publishing": false,
               "hide_side_toolbar": false,
               "allow_symbol_change": true,
               "container_id": containerId,
               "studies": ["Volume@tv-basicstudies"],
               "show_popup_button": true,
               "popup_width": "1000",
               "popup_height": "650"
            });
         } catch (e) {
            // Widget init may fail if container was removed between load and init
         }
      };

      // Reuse existing tv.js if already loaded "” avoids duplicate script tags on re-renders
      if (window.TradingView) {
         initWidget();
      } else {
         const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
         if (existingScript) {
            existingScript.addEventListener('load', initWidget);
         } else {
            const script = document.createElement("script");
            script.src = "https://s3.tradingview.com/tv.js";
            script.async = true;
            script.onload = initWidget;
            document.head.appendChild(script);
         }
      }

      // Cleanup: mark stale + clear container so TV's internal callbacks find no DOM to act on
      return () => {
         isMounted = false;
         if (containerRef.current) {
            containerRef.current.innerHTML = '';
         }
      };
   }, [symbol, interval, containerId, isDarkMode]);

   return <div ref={containerRef} id={containerId} className="w-full h-full" />;
};

const COUNTRIES = [
   { code: 'IN', name: 'India', flag: '🇮🇳', supported: true },
   { code: 'US', name: 'United States', flag: '🇺🇸', supported: false },
   { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', supported: false },
   { code: 'DE', name: 'Germany', flag: '🇩🇪', supported: false },
   { code: 'JP', name: 'Japan', flag: '🇯🇵', supported: false },
   { code: 'CN', name: 'China', flag: '🇨🇳', supported: false },
   { code: 'AU', name: 'Australia', flag: '🇦🇺', supported: false },
   { code: 'CA', name: 'Canada', flag: '🇨🇦', supported: false },
   { code: 'SG', name: 'Singapore', flag: '🇸🇬', supported: false },
   { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', supported: false },
];

const isIndianSymbol = (symbol) => {
   if (!symbol) return false;
   const upper = symbol.toUpperCase();
   return upper.endsWith('.BSE') || upper.endsWith('.NSE') || upper.endsWith('.BO') || upper.endsWith('.NS') ||
      ['TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'SBIN', 'ICICIBANK'].includes(upper);
};

const CashFlowStockModal = ({ isOpen, onClose, onSelect, isDarkMode, initialStock }) => {
   const [searchTerm, setSearchTerm] = useState('');
   const [searchResults, setSearchResults] = useState([]);
   const [isSearching, setIsSearching] = useState(false);
   const [selectedCountry, setSelectedCountry] = useState('IN');
   const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
   const [selectedStock, setSelectedStock] = useState(PRESET_STOCKS[0]);
   const [activeTab, setActiveTab] = useState('Realtime chart');
   const [isStockSelectOpen, setIsStockSelectOpen] = useState(false);
   const [chartInterval, setChartInterval] = useState('D');
   const [fullScreenChart, setFullScreenChart] = useState(null);
   const [chartType, setChartType] = useState('tradingview'); // 'tradingview' or 'standard'
   const [cashflowCost, setCashflowCost] = useState(5);
   const [isMaximized, setIsMaximized] = useState(false);

   // Tab-specific data states
   const [tabData, setTabData] = useState({
      'Realtime chart': null,
      'News': null,
      'Historical chart': null,
      'Advisory': null,
      'Research and recommendation': null
   });
   const [isLoadingTab, setIsLoadingTab] = useState(false);
   const [tabError, setTabError] = useState(null);

   // Benjamin Graham analysis state
   const [grahamData, setGrahamData] = useState(null);
   const [isGrahamLoading, setIsGrahamLoading] = useState(false);
   const [showGrahamPanel, setShowGrahamPanel] = useState(false);

   // Robert Kiyosaki analysis state
   const [kiyosakiData, setKiyosakiData] = useState(null);
   const [isKiyosakiLoading, setIsKiyosakiLoading] = useState(false);
   const [showKiyosakiPanel, setShowKiyosakiPanel] = useState(false);

   const [socket, setSocket] = useState(null);

   useEffect(() => {
      if (isOpen && !socket) {
         const wsUrl = baseURL.replace('/api', '');
         const newSocket = io(wsUrl, {
            path: '/api/socket.io',
            transports: ['websocket', 'polling'],
         });
         setSocket(newSocket);
      }
      if (!isOpen && socket) {
         socket.disconnect();
         setSocket(null);
      }
   }, [isOpen]);

   // Sync with external initialStock if provided
   useEffect(() => {
      if (isOpen && initialStock) {
         setSelectedStock(initialStock);
      }
   }, [isOpen, initialStock]);

   // Fetch Dynamic Cashflow Credit Cost
   useEffect(() => {
      const fetchCost = async () => {
         try {
            const res = await apiService.getPublicFeatureCosts();
            if (res.success && res.features) {
               const feature = res.features.find(f => f.featureKey === 'ai_cashflow');
               if (feature) setCashflowCost(feature.cost);
            }
         } catch (err) {
            console.error("Failed to load cashflow cost", err);
         }
      };
      if (isOpen) fetchCost();
   }, [isOpen]);

   const [unlockedTabs, setUnlockedTabs] = useState([]);

   const fetchUnlockedTabs = async (symbol) => {
      try {
         const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
         const res = await axios.get(`${baseURL}/stock/unlocked-tabs`, {
            params: { symbol },
            headers: { 'Authorization': `Bearer ${token}` }
         });
         if (res.data && Array.isArray(res.data.unlockedTabs)) {
            setUnlockedTabs(prev => {
               const combined = new Set([...prev, ...res.data.unlockedTabs]);
               return Array.from(combined);
            });
         }
      } catch (err) {
         console.error("Failed to fetch unlocked tabs:", err);
      }
   };

   // Load stock data cache and fetch unlocked tabs when selectedStock changes
   useEffect(() => {
      if (isOpen && selectedStock) {
         const symbol = selectedStock.symbol.toUpperCase().trim();

         // 1. Fetch unlocked tabs from backend
         fetchUnlockedTabs(symbol);

         // 2. Load cached data from sessionStorage if exists
         const cacheKey = `aisa_cashflow_cache_${symbol}`;
         const cached = sessionStorage.getItem(cacheKey);
         if (cached) {
            try {
               const parsed = JSON.parse(cached);
               setTabData(parsed.tabData || {
                  'Realtime chart': null,
                  'News': null,
                  'Historical chart': null,
                  'Advisory': null,
                  'Research and recommendation': null
               });
               setGrahamData(parsed.grahamData || null);
               setKiyosakiData(parsed.kiyosakiData || null);
               setUnlockedTabs(parsed.unlockedTabs || []);
               setShowGrahamPanel(!!parsed.grahamData);
               setShowKiyosakiPanel(!!parsed.kiyosakiData);
            } catch (e) {
               console.error("Failed to parse cached data for symbol " + symbol, e);
            }
         } else {
            // Reset to empty
            setTabData({
               'Realtime chart': null,
               'News': null,
               'Historical chart': null,
               'Advisory': null,
               'Research and recommendation': null
            });
            setGrahamData(null);
            setKiyosakiData(null);
            setShowGrahamPanel(false);
            setShowKiyosakiPanel(false);
            setUnlockedTabs([]);
         }

         setActiveTab('Realtime chart');
         setTabError(null);
      }
   }, [isOpen, selectedStock]);

   // Save/Sync state updates to sessionStorage for the active stock
   useEffect(() => {
      if (isOpen && selectedStock) {
         const symbol = selectedStock.symbol.toUpperCase().trim();
         const cacheKey = `aisa_cashflow_cache_${symbol}`;
         const dataToCache = {
            tabData,
            grahamData,
            kiyosakiData,
            unlockedTabs
         };
         sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      }
   }, [tabData, grahamData, kiyosakiData, unlockedTabs, selectedStock, isOpen]);

   // Search debounce
   useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
         if (searchTerm.length >= 2) {
            handleSearch();
         } else {
            setSearchResults([]);
         }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
   }, [searchTerm]);

   const handleSearch = async () => {
      setIsSearching(true);
      try {
         const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
         const res = await axios.get(`${baseURL}/cashflow/search`, {
            params: { keywords: searchTerm, country: selectedCountry },
            headers: { 'Authorization': `Bearer ${token}` }
         });
         if (Array.isArray(res.data)) {
            setSearchResults(res.data);
         } else {
            setSearchResults([]);
         }
      } catch (error) {
         console.error("Search Error:", error);
         setSearchResults([]);
      } finally {
         setIsSearching(false);
      }
   };

   // Main data coordination
   useEffect(() => {
      if (!isOpen || !selectedStock) return;

      if (!isIndianSymbol(selectedStock.symbol)) {
         setTabError("Only Indian stocks are currently available.");
         setIsLoadingTab(false);
         return;
      }

      const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
      const headers = { 'Authorization': `Bearer ${token}` };

      const params = { symbol: selectedStock.symbol };
      const hasLoadedSession = sessionStorage.getItem('aisa_has_cashflow_loaded');
      if (!hasLoadedSession) {
         params.isInitialLoad = 'true';
         sessionStorage.setItem('aisa_has_cashflow_loaded', 'true');
      }

      if (activeTab === 'Realtime chart') {
         // Check if we already have intraday data for this stock to prevent double deduction
         if (tabData['Realtime chart']?.intraday) {
            // We have data, but we might still want to subscribe to the socket for live price updates
            if (socket) {
               socket.emit('subscribe_realtime', { symbol: selectedStock.symbol });
               const handleRealtime = (data) => {
                  setTabData(prev => ({
                     ...prev,
                     'Realtime chart': { quote: data.quote, intraday: prev['Realtime chart']?.intraday || [] }
                  }));
               };
               socket.on('realtime_update', handleRealtime);
               return () => socket.off('realtime_update', handleRealtime);
            }
            return;
         }

         setIsLoadingTab(true);
         setTabError(null);

         // HTTP for Intraday (Chart Area)
         axios.get(`${baseURL}/stock/intraday`, { params, headers })
            .then(res => {
               setTabData(prev => ({ ...prev, 'Realtime chart': { quote: prev['Realtime chart']?.quote, intraday: res.data.intraday } }));
               setIsLoadingTab(false);
               setUnlockedTabs(prev => prev.includes('intraday') ? prev : [...prev, 'intraday']);
            })
            .catch((err) => {
               setIsLoadingTab(false);
               if (err.response?.status === 403 && err.response?.data?.code === 'OUT_OF_CREDITS') {
                  setTabError(`Insufficient Credits (Required: ${cashflowCost})`);
               } else {
                  const errMsg = err.response?.data?.error || `Failed to load intraday data.`;
                  setTabError(errMsg);
               }
            });

         if (socket) {
            socket.emit('subscribe_realtime', { symbol: selectedStock.symbol });

            const handleRealtime = (data) => {
               setIsLoadingTab(false);
               setTabData(prev => ({
                  ...prev,
                  'Realtime chart': { quote: data.quote, intraday: prev['Realtime chart']?.intraday || [] }
               }));
            };
            socket.on('realtime_update', handleRealtime);

            return () => socket.off('realtime_update', handleRealtime);
         }
      } else if (activeTab === 'Historical chart') {
         if (tabData['Historical chart']?.historical) return; // Already cached

         if (socket) {
            setIsLoadingTab(true);
            setTabError(null);
            const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
            socket.emit('request_historical', { symbol: selectedStock.symbol, token });

            const handleHistorical = (data) => {
               setIsLoadingTab(false);
               if (data.error) {
                  if (data.code === 'OUT_OF_CREDITS') {
                     setTabError(`Insufficient Credits (Required: ${cashflowCost})`);
                  } else {
                     setTabError(data.error);
                  }
               } else {
                  setTabData(prev => ({ ...prev, 'Historical chart': { historical: data.historical } }));
                  setUnlockedTabs(prev => prev.includes('historical') ? prev : [...prev, 'historical']);
               }
            };
            socket.on('historical_data_response', handleHistorical);

            return () => socket.off('historical_data_response', handleHistorical);
         }
      } else {
         // Other tabs via traditional HTTP
         if (tabData[activeTab]) return; // Already cached
         setIsLoadingTab(true);
         setTabError(null);

         let promise = null;
         if (activeTab === 'News') promise = axios.get(`${baseURL}/stock/news`, { params, headers }).then(r => ({ news: r.data.news }));
         else if (activeTab === 'Advisory') promise = axios.get(`${baseURL}/stock/advisory`, { params, headers }).then(r => ({ advisory: r.data.advisory }));
         else if (activeTab === 'Research and recommendation') promise = axios.get(`${baseURL}/stock/research`, { params: { symbol: selectedStock.symbol }, headers }).then(r => ({ research: r.data.research }));

         if (promise) {
            promise.then(result => {
               setTabData(prev => ({ ...prev, [activeTab]: result }));
               const mappedTab = activeTab === 'News' ? 'news' : activeTab === 'Advisory' ? 'advisory' : 'research';
               setUnlockedTabs(prev => prev.includes(mappedTab) ? prev : [...prev, mappedTab]);
            }).catch(err => {
               if (err.response?.status === 403 && err.response?.data?.code === 'OUT_OF_CREDITS') {
                  setTabError(`Insufficient Credits (Required: ${cashflowCost})`);
               } else {
                  const errMsg = err.response?.data?.error || `Failed to load ${activeTab}.`;
                  setTabError(errMsg);
               }
            }).finally(() => setIsLoadingTab(false));
         }
      }
   }, [activeTab, selectedStock, isOpen, socket]);

   const handleFinalSelect = () => {
      onSelect(selectedStock);
      onClose();
   };

   const fetchGrahamAnalysis = async () => {
      if (grahamData || isGrahamLoading) return;
      if (!isIndianSymbol(selectedStock?.symbol)) {
         setTabError("Only Indian stocks are currently available.");
         return;
      }
      setIsGrahamLoading(true);
      setShowGrahamPanel(true);
      try {
         const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
         const price = tabData['Realtime chart']?.quote?.price || '';
         const res = await axios.get(`${baseURL}/stock/graham-analysis`, {
            params: { symbol: selectedStock.symbol, name: selectedStock.name, price },
            headers: { 'Authorization': `Bearer ${token}` }
         });
         setGrahamData(res.data.graham);
         setUnlockedTabs(prev => prev.includes('graham-analysis') ? prev : [...prev, 'graham-analysis']);
      } catch (err) {
         console.error('[Graham] Analysis failed:', err);
      } finally {
         setIsGrahamLoading(false);
      }
   };

   const fetchKiyosakiAnalysis = async () => {
      if (kiyosakiData || isKiyosakiLoading) return;
      if (!isIndianSymbol(selectedStock?.symbol)) {
         setTabError("Only Indian stocks are currently available.");
         return;
      }
      setIsKiyosakiLoading(true);
      setShowKiyosakiPanel(true);
      try {
         const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
         const price = tabData['Realtime chart']?.quote?.price || '';
         const res = await axios.get(`${baseURL}/stock/kiyosaki-analysis`, {
            params: { symbol: selectedStock.symbol, name: selectedStock.name, price },
            headers: { 'Authorization': `Bearer ${token}` }
         });
         setKiyosakiData(res.data.kiyosaki);
         setUnlockedTabs(prev => prev.includes('kiyosaki-analysis') ? prev : [...prev, 'kiyosaki-analysis']);
      } catch (err) {
         console.error('[Kiyosaki] Analysis failed:', err);
      } finally {
         setIsKiyosakiLoading(false);
      }
   };

   const getRelativeTime = (timeStr) => {
      if (!timeStr) return '';
      try {
         const pubDate = new Date(timeStr);
         const diffInMs = new Date() - pubDate;
         const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
         if (diffInHours < 1) return 'Just now';
         if (diffInHours < 24) return `${diffInHours}h ago`;
         return `${Math.floor(diffInHours / 24)}d ago`;
      } catch (e) { return ''; }
   };

   const currencySymbol = useMemo(() => {
      if (tabData['Realtime chart']?.quote?.currency === 'INR') return '₹';
      if (selectedStock?.region === 'IN' || selectedStock?.symbol.includes('.BSE') || selectedStock?.symbol.includes('.NSE') || selectedStock?.symbol.endsWith('.BO') || selectedStock?.symbol.endsWith('.NS')) {
         return '₹';
      }
      return '$';
   }, [selectedStock, tabData['Realtime chart']]);

   const realtimeLineData = useMemo(() => {
      const data = tabData['Realtime chart']?.intraday || [];
      return data.map(d => ({
         date: d.date.split(' ')[1] || d.date, // Time portion
         price: d.close
      }));
   }, [tabData['Realtime chart']]);

   const historicalLineData = useMemo(() => {
      const data = tabData['Historical chart']?.historical || [];
      return data.map(d => ({
         date: d.date.split('-').slice(1).join('/'),
         price: parseFloat(d.close)
      }));
   }, [tabData['Historical chart']]);

   const isRealtimePositiveTrend = useMemo(() => {
      if (realtimeLineData.length < 2) return true;
      return parseFloat(realtimeLineData[realtimeLineData.length - 1].price) >= parseFloat(realtimeLineData[0].price);
   }, [realtimeLineData]);

   const isHistoricalPositiveTrend = useMemo(() => {
      if (historicalLineData.length < 2) return true;
      return parseFloat(historicalLineData[historicalLineData.length - 1].price) >= parseFloat(historicalLineData[0].price);
   }, [historicalLineData]);

   const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
         return (
            <div className="bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
               <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">{label}</p>
               <p className="text-sm font-black text-[#111] dark:text-white">
                  {currencySymbol}{Number(payload[0].value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
               </p>
            </div>
         );
      }
      return null;
   };

   if (!isOpen) return null;

   return createPortal(
      <AnimatePresence>
         {isOpen && (
            <div className={`fixed inset-0 z-[110000] flex items-center justify-center bg-black/40 backdrop-blur-sm ${isMaximized ? 'p-0' : 'p-0 sm:p-4'}`}>
               <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`relative w-full h-full ${isMaximized ? 'sm:w-full sm:h-full max-w-none sm:rounded-none' : 'sm:w-[95vw] sm:h-[94vh] max-w-7xl sm:rounded-[14px]'} bg-[#fdfaf5] dark:bg-[#161B2E] rounded-none shadow-[0_30px_70px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-white/10 dark:border-white/5 transition-all duration-300`}
               >
                  {/* Header */}
                  <div className="px-3 py-3 sm:px-6 sm:py-5 bg-[#5154ff] flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/5 shadow-inner shrink-0">
                           <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 shadow-sm" />
                        </div>
                        <div className="min-w-0">
                           <h2 className="text-base sm:text-2xl font-black text-white leading-tight font-sans tracking-tight truncate">AI CashFlow Explorer</h2>
                           <p className="text-[8px] sm:text-[10px] text-white/60 font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] mt-0.5 truncate">Market Intelligence Â· Real-time Analytics Â· Strategy</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button onClick={() => setIsMaximized(!isMaximized)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white group transition-transform" title={isMaximized ? 'Restore' : 'Maximize'}>
                           {isMaximized ? <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6 transition-transform" /> : <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />}
                        </button>
                        <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white group transition-transform">
                           <X className="w-6 h-6 sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform" />
                        </button>
                     </div>
                  </div>

                  {/* Stock Selection Section */}
                  <div className="px-3 py-3 sm:px-8 sm:py-8 border-b border-gray-100 dark:border-white/8 flex flex-col sm:flex-row gap-3 sm:gap-6 bg-[#fdfaf5] dark:bg-[#161B2E] shrink-0">
                     <div className="flex-1 sm:max-w-[320px] relative">
                        <label className="block text-[10px] sm:text-[11px] font-black text-[#999] uppercase tracking-[0.1em] mb-1.5 sm:mb-2.5 ml-1">Country</label>
                        <div
                           onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                           className={`bg-white dark:bg-[#1E2438] border ${isCountryDropdownOpen ? 'border-[#5154ff] ring-4 ring-[#5154ff]/10' : 'border-gray-200 dark:border-white/8'
                              } rounded-[10px] sm:rounded-[14px] px-3 py-2.5 sm:px-5 sm:py-4 text-[13px] sm:text-[14px] font-bold flex items-center gap-2 sm:gap-3 shadow-sm cursor-pointer group transition-all min-h-[44px] sm:min-h-[54px] select-none`}
                        >
                           <span className="text-[18px] sm:text-[22px] leading-none">{COUNTRIES.find(c => c.code === selectedCountry)?.flag || '🌐'}</span>
                           <span className="text-[#888] dark:text-zinc-500 font-extrabold text-[12px] sm:text-[13px]">{selectedCountry}</span>
                           <span className="text-[#111] dark:text-white flex-1 text-[13px] sm:text-[14px] truncate">{COUNTRIES.find(c => c.code === selectedCountry)?.name || 'Unknown'}</span>
                           <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isCountryDropdownOpen ? 'rotate-180 text-[#5154ff]' : 'text-[#ccc] dark:text-zinc-600 group-hover:text-[#5154ff]'
                              }`} />
                        </div>

                        <AnimatePresence>
                           {isCountryDropdownOpen && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                 className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#1E2438] border border-black/5 dark:border-white/8 rounded-[18px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] overflow-hidden z-[110]"
                              >
                                 <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {COUNTRIES.filter(c => c.supported).map(country => (
                                       <button
                                          key={country.code}
                                          onClick={() => {
                                             setSelectedCountry(country.code);
                                             setIsCountryDropdownOpen(false);
                                             // Auto-select first matching preset stock for chosen country
                                             const match = PRESET_STOCKS.find(s => s.region === country.code);
                                             if (match) {
                                                setSelectedStock(match);
                                                setSearchTerm('');
                                             }
                                          }}
                                          className="w-full text-left px-5 py-3 hover:bg-[#fdfaf5] dark:hover:bg-white/5 transition-colors flex items-center gap-3 group border-b border-gray-50/50 dark:border-white/5 last:border-0"
                                       >
                                          <span className="text-[20px] leading-none">{country.flag}</span>
                                          <span className="text-[12px] font-black text-[#888] dark:text-zinc-500 w-8">{country.code}</span>
                                          <span className="text-[14px] font-bold text-[#111] dark:text-white group-hover:text-[#5154ff] flex-1">{country.name}</span>
                                          {selectedCountry === country.code && <Check className="w-4 h-4 text-[#5154ff]" />}
                                       </button>
                                    ))}
                                 </div>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>

                     <div className="flex-1 relative">
                        <label className="block text-[10px] sm:text-[11px] font-black text-[#999] uppercase tracking-[0.1em] mb-1.5 sm:mb-2.5 ml-1">Stock</label>
                        <div
                           onClick={() => setIsStockSelectOpen(!isStockSelectOpen)}
                           className={`bg-white dark:bg-[#1E2438] border ${isStockSelectOpen ? 'border-[#5154ff] ring-4 ring-[#5154ff]/10' : 'border-gray-200 dark:border-white/8'} rounded-[10px] sm:rounded-[14px] px-3 py-2.5 sm:px-5 sm:py-4 text-[13px] sm:text-[14px] font-bold flex items-center justify-between shadow-sm cursor-pointer group transition-all min-h-[44px] sm:min-h-[54px]`}
                        >
                           <span className="text-[#111] dark:text-white truncate text-[12px] sm:text-[14px]">{selectedStock?.symbol} - {selectedStock?.name}</span>
                           <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[#5154ff]" />}
                              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isStockSelectOpen ? 'rotate-180 text-[#5154ff]' : 'text-[#ccc] dark:text-zinc-600 group-hover:text-[#5154ff]'}`} />
                           </div>
                        </div>

                        <AnimatePresence>
                           {isStockSelectOpen && (
                              <motion.div
                                 initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 15, scale: 0.98 }}
                                 className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white dark:bg-[#1E2438] border border-black/5 dark:border-white/8 rounded-[18px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] overflow-hidden z-[100] max-h-80 overflow-y-auto"
                              >
                                 <div className="p-4 border-b border-gray-50 dark:border-white/5 flex items-center bg-[#fdfaf5]/50 dark:bg-[#161B2E]/80 sticky top-0 backdrop-blur-xl z-10">
                                    <Search className="w-5 h-5 text-[#aaa] dark:text-zinc-500 ml-2" />
                                    <input
                                       type="text"
                                       value={searchTerm}
                                       onChange={(e) => setSearchTerm(e.target.value)}
                                       placeholder="Search symbols..."
                                       className="w-full bg-transparent border-0 outline-none px-4 text-sm font-bold text-[#111] dark:text-white"
                                       autoFocus
                                    />
                                 </div>
                                 <div className="py-2">
                                    {searchTerm.length >= 2 && searchResults.length === 0 ? (
                                       <div className="px-6 py-8 text-center text-rose-500">
                                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                                          <p className="text-sm font-black uppercase tracking-wider">This stock is not supported by the selected market.</p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold mt-1">Only Indian stocks are currently available.</p>
                                       </div>
                                    ) : (
                                       (searchTerm.length >= 2 ? searchResults : PRESET_STOCKS).map((stock) => (
                                          <button
                                             key={stock.symbol}
                                             onClick={() => {
                                                setSelectedStock(stock);
                                                setIsStockSelectOpen(false);
                                                setSearchTerm('');
                                             }}
                                             className="w-full text-left px-6 py-4 hover:bg-[#fdfaf5] dark:hover:bg-white/5 transition-colors border-b border-gray-50/50 dark:border-white/5 last:border-0 flex items-center justify-between group"
                                          >
                                             <div>
                                                <div className="text-[14px] font-black text-[#111] dark:text-white group-hover:text-[#5154ff]">{stock.symbol}</div>
                                                <div className="text-[11px] text-[#888] dark:text-zinc-500 font-bold uppercase tracking-wider">{stock.name}</div>
                                             </div>
                                             {selectedStock?.symbol === stock.symbol && <Check className="w-5 h-5 text-[#5154ff]" />}
                                          </button>
                                       ))
                                    )}
                                 </div>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="px-2 sm:px-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 sm:gap-10 overflow-x-auto no-scrollbar bg-white dark:bg-[#161B2E] shrink-0">
                     {['Realtime chart', 'News', 'Historical chart', 'Advisory', 'Research and recommendation'].map(tab => {
                        const tabMap = {
                           'Realtime chart': 'intraday',
                           'News': 'news',
                           'Historical chart': 'historical',
                           'Advisory': 'advisory',
                           'Research and recommendation': 'research'
                        };
                        const isUnlocked = unlockedTabs.includes(tabMap[tab]);
                        return (
                           <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={`py-3 sm:py-5 text-[10px] sm:text-[14px] font-black whitespace-nowrap transition-all border-b-2 tracking-wide uppercase flex items-center gap-1.5 ${activeTab === tab ? 'text-[#5154ff] border-[#5154ff]' : 'text-gray-400 dark:text-zinc-500 border-transparent hover:text-gray-600 dark:hover:text-zinc-300'}`}
                           >
                              {tab}
                              {isUnlocked ? (
                                 <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                 <Lock className="w-3.5 h-3.5 text-gray-400/80" />
                              )}
                           </button>
                        );
                     })}
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-8 sm:py-8 bg-white dark:bg-[#1E2438] custom-scrollbar">
                     {isLoadingTab ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6 text-[#999] dark:text-zinc-500">
                           <div className="relative">
                              <Loader2 className="w-16 h-16 animate-spin text-[#5154ff] opacity-20 dark:opacity-40" />
                              <Activity className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#5154ff] animate-pulse" />
                           </div>
                           <p className="text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Network Data...</p>
                        </div>
                     ) : tabError ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-rose-500">
                           <AlertCircle className="w-12 h-12 opacity-80" />
                           <p className="text-[14px] font-black uppercase tracking-wider">{tabError}</p>
                           <p className="text-[12px] text-[#888] dark:text-zinc-500 font-bold text-center max-w-sm mt-2">
                              If using AngelOne SmartAPI, ensure your API_KEY and AUTHORIZATION_TOKEN are correctly configured in your Backend .env file.
                           </p>
                        </div>
                     ) : !tabData[activeTab] ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-[#999] dark:text-zinc-500">
                           <Activity className="w-12 h-12 opacity-20 dark:opacity-40" />
                           <p className="text-[14px] font-black uppercase tracking-wider">No Data Available</p>
                        </div>
                     ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
                           {/* Realtime Chart Tab */}
                           {activeTab === 'Realtime chart' && tabData['Realtime chart'] && (
                              <div className="space-y-4 sm:space-y-8">
                                 <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-6">
                                    <div className="bg-[#fcf8f0] dark:bg-[#1E2438] rounded-[12px] sm:rounded-[20px] p-3 sm:p-6 border border-[#f0ebe0] dark:border-white/8 shadow-sm relative overflow-hidden group hover:shadow-md dark:hover:border-[#5154ff]/30 transition-all">
                                       <p className="text-[8px] sm:text-[11px] font-black text-[#aaa] dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                                          Live Price <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500 animate-pulse" />
                                       </p>
                                       <p className="text-lg sm:text-4xl font-black text-[#111] dark:text-white tracking-tight">
                                          {tabData['Realtime chart'].quote?.price ? `${currencySymbol}${parseFloat(tabData['Realtime chart'].quote.price).toLocaleString()}` : currencySymbol + '---'}
                                       </p>
                                       <div className={`flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-3 text-[10px] sm:text-[13px] font-bold ${parseFloat(tabData['Realtime chart'].quote?.change) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 ${parseFloat(tabData['Realtime chart'].quote?.change) < 0 ? 'rotate-180' : ''}`} />
                                          {tabData['Realtime chart'].quote?.changePercent || '0.00%'}
                                       </div>
                                    </div>
                                    <div className="bg-[#fcf8f0] dark:bg-[#1E2438] rounded-[12px] sm:rounded-[20px] p-3 sm:p-6 border border-[#f0ebe0] dark:border-white/8 shadow-sm relative overflow-hidden group hover:shadow-md dark:hover:border-[#5154ff]/30 transition-all">
                                       <p className="text-[8px] sm:text-[11px] font-black text-[#aaa] dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2">Day high</p>
                                       <p className="text-lg sm:text-4xl font-black text-[#111] dark:text-white tracking-tight">
                                          {tabData['Realtime chart'].quote?.high ? `${currencySymbol}${parseFloat(tabData['Realtime chart'].quote.high).toLocaleString()}` : currencySymbol + '---'}
                                       </p>
                                       <div className="mt-1 sm:mt-3 w-full bg-black/5 dark:bg-white/10 h-1 rounded-full overflow-hidden">
                                          <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-[#5154ff]" />
                                       </div>
                                    </div>
                                    <div className="bg-[#fcf8f0] dark:bg-[#1E2438] rounded-[12px] sm:rounded-[20px] p-3 sm:p-6 border border-[#f0ebe0] dark:border-white/8 shadow-sm relative overflow-hidden group hover:shadow-md dark:hover:border-[#5154ff]/30 transition-all">
                                       <p className="text-[8px] sm:text-[11px] font-black text-[#aaa] dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2">Volume (24h)</p>
                                       <p className="text-lg sm:text-4xl font-black text-[#111] dark:text-white tracking-tight">
                                          {tabData['Realtime chart'].quote?.volume ? (parseFloat(tabData['Realtime chart'].quote.volume) / 1000).toFixed(1) + 'k' : '---'}
                                       </p>
                                       <div className="mt-2 sm:mt-4 flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[11px] font-black text-[#5154ff] uppercase tracking-wider">
                                          <span className="hidden sm:inline">AngelOne Live Data</span><span className="sm:hidden">Live</span> <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                       </div>
                                    </div>
                                 </div>

                                 <div className="bg-white dark:bg-[#1E2438] rounded-[16px] sm:rounded-[24px] p-3 sm:p-8 border border-gray-100 dark:border-white/8 shadow-sm dark:shadow-[0_0_0_1px_rgba(81,84,255,0.05)] min-h-[350px] sm:min-h-[700px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-3">
                                       <div>
                                          <h3 className="text-sm sm:text-lg font-black text-[#111] dark:text-white flex items-center gap-2">
                                             Advanced Market Dynamics <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#5154ff]" />
                                          </h3>
                                          <p className="text-[9px] sm:text-[11px] font-bold text-[#aaa] dark:text-zinc-500 uppercase tracking-[0.15em] mt-1 mb-2 sm:mb-3">Professional Dynamic Chart</p>
                                          <div className="flex bg-gray-100/80 dark:bg-white/5 p-0.5 sm:p-1 rounded-lg sm:rounded-xl gap-0.5 sm:gap-1 w-fit border border-black/5 dark:border-white/8">
                                             {[{ label: '15m', val: '15' }, { label: '1H', val: '60' }, { label: '1D', val: 'D' }, { label: '1W', val: 'W' }, { label: '1M', val: 'M' }].map(intv => (
                                                <button
                                                   key={intv.val}
                                                   onClick={() => setChartInterval(intv.val)}
                                                   className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-md sm:rounded-lg transition-all 
                                               ${chartInterval === intv.val ? 'bg-white dark:bg-zinc-700 text-[#5154ff] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-black/5 dark:border-white/5' : 'text-[#888] dark:text-zinc-500 hover:text-[#555] dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                                                >
                                                   {intv.label}
                                                </button>
                                             ))}
                                          </div>
                                       </div>
                                       {tabData['Realtime chart'].quote?.price && (
                                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                             <button onClick={() => setFullScreenChart('realtime')} className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 text-gray-700 dark:text-zinc-300 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors sm:mr-4 border border-gray-200 dark:border-zinc-700 shadow-sm">
                                                <Maximize className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Pro View
                                             </button>
                                             <div className="flex flex-col items-center justify-center px-3 py-1 sm:px-5 sm:py-1.5 bg-[#fffafb] dark:bg-red-500/10 border border-[#f23645] rounded-[6px] min-w-[70px] sm:min-w-[100px] shadow-sm cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors">
                                                <span className="text-[14px] sm:text-[18px] font-semibold text-[#f23645] leading-tight">
                                                   {parseFloat(tabData['Realtime chart'].quote.price - 0.25).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] sm:text-[12px] font-medium text-[#f23645] uppercase tracking-wide">SELL</span>
                                             </div>
                                             <span className="text-[11px] sm:text-[13px] font-medium text-[#333] dark:text-zinc-400">0.50</span>
                                             <div className="flex flex-col items-center justify-center px-3 py-1 sm:px-5 sm:py-1.5 bg-[#f8fbff] dark:bg-blue-500/10 border border-[#2962ff] rounded-[6px] min-w-[70px] sm:min-w-[100px] shadow-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors">
                                                <span className="text-[14px] sm:text-[18px] font-semibold text-[#2962ff] leading-tight">
                                                   {parseFloat(tabData['Realtime chart'].quote.price + 0.25).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] sm:text-[12px] font-medium text-[#2962ff] uppercase tracking-wide">BUY</span>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    <div className="h-[280px] sm:h-[550px] w-full pt-2 sm:pt-4 relative rounded-xl overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                                       <TradingViewWidget symbol={selectedStock?.symbol} interval={chartInterval} containerId="tv_chart_realtime" isDarkMode={isDarkMode} />
                                    </div>
                                 </div>
                              </div>
                           )}

                           {/* News Tab */}
                           {activeTab === 'News' && tabData['News'] && (
                              <div className="space-y-3 sm:space-y-6">
                                 {tabData['News'].news?.length === 0 ? (
                                    <div className="p-8 sm:p-12 text-center text-[#aaa] dark:text-zinc-500 font-bold uppercase tracking-widest bg-gray-50 dark:bg-[#1E2438] rounded-2xl border border-dashed border-gray-200 dark:border-white/8 text-xs sm:text-sm">
                                       No news detected
                                    </div>
                                 ) : (
                                    tabData['News'].news?.map((item, idx) => (
                                       <motion.div
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.1 }}
                                          key={idx}
                                          className="bg-[#fcf8f0] dark:bg-[#1E2438] rounded-[14px] sm:rounded-[20px] p-3 sm:p-6 border border-[#f0ebe0] dark:border-white/8 group hover:border-[#5154ff]/40 dark:hover:border-[#5154ff]/40 transition-all cursor-pointer shadow-sm"
                                       >
                                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                             <span className="text-[9px] sm:text-[10px] font-black text-[#5154ff] bg-white dark:bg-white/5 border border-[#5154ff]/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg uppercase tracking-wider">{item.source || 'Finance'}</span>
                                             <span className="text-[9px] sm:text-[10px] font-bold text-[#888] dark:text-zinc-500 uppercase tracking-wider">{getRelativeTime(item.time_published)}</span>
                                          </div>
                                          <h4 className="text-[14px] sm:text-[17px] font-black text-[#111] dark:text-white mb-2 sm:mb-3 group-hover:text-[#5154ff] transition-colors leading-snug">{item.title}</h4>
                                          <p className="text-[11px] sm:text-[13px] text-[#777] dark:text-zinc-400 mb-3 sm:mb-4 line-clamp-2 leading-relaxed">{item.summary}</p>
                                          <div className="flex items-center justify-between">
                                             <span className={`text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-[0.05em] ${(item.overall_sentiment_label || 'Neutral').includes('Bullish') ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600' : (item.overall_sentiment_label || 'Neutral').includes('Bearish') ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600' : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-700 text-[#999] dark:text-zinc-500'}`}>
                                                Sentiment: {item.overall_sentiment_label || 'Neutral'}
                                             </span>
                                             <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 sm:p-2.5 bg-white dark:bg-white/5 rounded-xl text-[#5154ff] hover:bg-[#5154ff] hover:text-white transition-all shadow-sm">
                                                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                             </a>
                                          </div>
                                       </motion.div>
                                    ))
                                 )}
                              </div>
                           )}

                           {/* Historical Chart Tab */}
                           {activeTab === 'Historical chart' && tabData['Historical chart'] && (
                              <div className="bg-white dark:bg-[#1E2438] rounded-[16px] sm:rounded-[24px] p-3 sm:p-8 border border-gray-100 dark:border-white/8 shadow-sm min-h-[350px] sm:min-h-[700px]">
                                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-3">
                                    <div>
                                       <h3 className="text-sm sm:text-xl font-black text-[#111] dark:text-white flex items-center gap-2 sm:gap-3">
                                          Advanced Historical Chart <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-[#5154ff]" />
                                       </h3>
                                       <p className="text-[9px] sm:text-[12px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-1">Interactive TradingView Historical Record</p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                       <button
                                          onClick={() => setChartType('standard')}
                                          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors border shadow-sm
                                          ${chartType === 'standard'
                                                ? 'bg-[#5154ff]/10 text-[#5154ff] border-[#5154ff]/20'
                                                : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
                                             }`}
                                       >
                                          <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Standard
                                       </button>
                                       <button
                                          onClick={() => setChartType('tradingview')}
                                          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors border shadow-sm
                                          ${chartType === 'tradingview'
                                                ? 'bg-[#5154ff]/10 text-[#5154ff] border-[#5154ff]/20'
                                                : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
                                             }`}
                                       >
                                          <Activity className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${chartType === 'tradingview' ? 'animate-pulse' : ''}`} /> TradingView
                                       </button>
                                       <button onClick={() => setFullScreenChart('historical')} className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 text-gray-700 dark:text-zinc-300 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors border border-gray-200 dark:border-zinc-700 shadow-sm">
                                          <Maximize className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Pro View
                                       </button>
                                    </div>
                                 </div>
                                 <div className="h-[280px] sm:h-[550px] w-full pt-2 sm:pt-4 relative rounded-xl overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                                    {chartType === 'tradingview' ? (
                                       <TradingViewWidget symbol={selectedStock?.symbol} interval="D" containerId="tv_chart_historical" isDarkMode={isDarkMode} />
                                    ) : (
                                       <div className="w-full h-full p-2 sm:p-4 bg-white dark:bg-[#1E2438]">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <AreaChart data={historicalLineData}>
                                                <defs>
                                                   <linearGradient id="colorHistoricalPrice" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor={isHistoricalPositiveTrend ? '#10b981' : '#e11d48'} stopOpacity={0.2} />
                                                      <stop offset="95%" stopColor={isHistoricalPositiveTrend ? '#10b981' : '#e11d48'} stopOpacity={0} />
                                                   </linearGradient>
                                                </defs>
                                                <XAxis
                                                   dataKey="date"
                                                   axisLine={false}
                                                   tickLine={false}
                                                   tick={{ fontSize: 9, fill: isDarkMode ? '#71717a' : '#94a3b8' }}
                                                   dy={5}
                                                />
                                                <YAxis
                                                   domain={['auto', 'auto']}
                                                   axisLine={false}
                                                   tickLine={false}
                                                   tick={{ fontSize: 9, fill: isDarkMode ? '#71717a' : '#94a3b8' }}
                                                   tickFormatter={(val) => `${currencySymbol}${val}`}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area
                                                   type="monotone"
                                                   dataKey="price"
                                                   stroke={isHistoricalPositiveTrend ? '#10b981' : '#e11d48'}
                                                   strokeWidth={2}
                                                   fillOpacity={1}
                                                   fill="url(#colorHistoricalPrice)"
                                                />
                                             </AreaChart>
                                          </ResponsiveContainer>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}

                           {/* Advisory Tab */}
                           {activeTab === 'Advisory' && tabData['Advisory'] && (
                              <div className="h-full flex items-center justify-center py-2 overflow-hidden">
                                 <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`w-full max-w-3xl border border-black/5 dark:border-white/5 rounded-[18px] sm:rounded-[28px] p-4 sm:p-6 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-4 sm:gap-6
                                     ${tabData['Advisory'].advisory.verdict === 'BUY' ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/20 dark:to-teal-900/20' :
                                          tabData['Advisory'].advisory.verdict === 'SELL' ? 'bg-gradient-to-br from-rose-50/70 to-orange-50/70 dark:from-rose-900/20 dark:to-orange-900/20' :
                                             'bg-gradient-to-br from-[#fcf8f0] to-[#f5f0e1] dark:from-zinc-900 dark:to-zinc-800'}
                                 `}
                                 >
                                    {/* Left: Verdict Card */}
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2">
                                       <div className={`p-3 sm:p-4 rounded-full bg-white/60 dark:bg-black/20 shadow-sm 
                                        ${tabData['Advisory'].advisory.verdict === 'BUY' ? 'text-emerald-500' :
                                             tabData['Advisory'].advisory.verdict === 'SELL' ? 'text-rose-500' :
                                                'text-yellow-500'}
                                    `}>
                                          <Zap fill="currentColor" className="w-8 h-8 sm:w-12 sm:h-12" />
                                       </div>
                                       <div>
                                          <h3 className="text-[10px] sm:text-[12px] font-black text-[#888] uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5">System Signal</h3>
                                          <p className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter
                                             ${tabData['Advisory'].advisory.verdict === 'BUY' ? 'text-emerald-600' :
                                                tabData['Advisory'].advisory.verdict === 'SELL' ? 'text-rose-600' :
                                                   'text-yellow-600'}
                                       `}>
                                             {tabData['Advisory'].advisory.verdict}
                                          </p>
                                       </div>
                                    </div>

                                    {/* Right: Indicators Grid */}
                                    <div className="w-full md:w-[320px] grid grid-cols-2 gap-2 sm:gap-3">
                                       <div className="bg-white/80 dark:bg-[#1E2438]/80 p-2.5 sm:p-3.5 rounded-[14px] sm:rounded-[20px] border border-white dark:border-white/8 shadow-sm hover:shadow-md transition-shadow">
                                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#aaa] dark:text-zinc-500 mb-0.5">RSI</p>
                                          <p className="text-base sm:text-xl font-black text-[#111] dark:text-white">{tabData['Advisory'].advisory.indicators?.RSI}</p>
                                       </div>
                                       <div className="bg-white/80 dark:bg-[#1E2438]/80 p-2.5 sm:p-3.5 rounded-[14px] sm:rounded-[20px] border border-white dark:border-white/8 shadow-sm hover:shadow-md transition-shadow">
                                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#aaa] dark:text-zinc-500 mb-0.5">MACD</p>
                                          <p className="text-base sm:text-xl font-black text-[#111] dark:text-white">{tabData['Advisory'].advisory.indicators?.MACD}</p>
                                       </div>
                                       <div className="bg-white/80 dark:bg-[#1E2438]/80 p-2.5 sm:p-3.5 rounded-[14px] sm:rounded-[20px] border border-white dark:border-white/8 shadow-sm hover:shadow-md transition-shadow">
                                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#aaa] dark:text-zinc-500 mb-0.5">Ichimoku</p>
                                          <p className={`text-xs sm:text-sm font-black ${tabData['Advisory'].advisory.indicators?.Ichimoku === 'Bullish' ? 'text-emerald-600' : tabData['Advisory'].advisory.indicators?.Ichimoku === 'Bearish' ? 'text-rose-600' : 'text-[#111] dark:text-white'}`}>
                                             {tabData['Advisory'].advisory.indicators?.Ichimoku || 'Neutral'}
                                          </p>
                                       </div>
                                       <div className="bg-white/80 dark:bg-[#1E2438]/80 p-2.5 sm:p-3.5 rounded-[14px] sm:rounded-[20px] border border-white dark:border-white/8 shadow-sm hover:shadow-md transition-shadow">
                                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#aaa] dark:text-zinc-500 mb-0.5">SMA20</p>
                                          <p className="text-base sm:text-xl font-black text-[#111] dark:text-white">{tabData['Advisory'].advisory.indicators?.SMA}</p>
                                       </div>
                                       <div className="col-span-2 bg-white/80 dark:bg-[#1E2438]/80 p-2.5 sm:p-3 rounded-[14px] sm:rounded-[20px] border border-white dark:border-white/8 shadow-sm flex justify-between items-center px-4 sm:px-6">
                                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#aaa] dark:text-zinc-500">Fibonacci Level</p>
                                          <p className="text-base sm:text-xl font-black text-[#5154ff]">₹{tabData['Advisory'].advisory.indicators?.Fibonacci || '---'}</p>
                                       </div>
                                    </div>
                                 </motion.div>
                              </div>
                           )}

                           {/* Research Tab "” Button always visible when tab is active */}
                           {activeTab === 'Research and recommendation' && selectedStock && (
                              <div className="space-y-6">

                                 {/* â”€â”€ Benjamin Graham Button "” TOP, always visible â”€â”€ */}
                                 <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                 >
                                    <button
                                       id="graham-analysis-btn"
                                       onClick={() => showGrahamPanel ? setShowGrahamPanel(false) : fetchGrahamAnalysis()}
                                       className={`group relative w-full flex items-center justify-between px-4 py-3 sm:px-8 sm:py-5 rounded-[14px] sm:rounded-[20px] border-2 transition-all duration-300 overflow-hidden
                                       ${showGrahamPanel
                                             ? 'bg-amber-950 border-amber-800'
                                             : 'bg-gradient-to-r from-amber-950 to-stone-900 border-amber-800/60 hover:border-amber-600 hover:shadow-xl hover:shadow-amber-900/30'
                                          }`}
                                    >
                                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-700/40 border border-amber-600/30 flex items-center justify-center shadow-inner shrink-0 relative">
                                             <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-amber-300" />
                                             {unlockedTabs.includes('graham-analysis') ? (
                                                <Unlock className="w-3 h-3 text-emerald-400 absolute -bottom-1 -right-1" />
                                             ) : (
                                                <Lock className="w-3 h-3 text-amber-400/80 absolute -bottom-1 -right-1" />
                                             )}
                                          </div>
                                          <div className="text-left min-w-0">
                                             <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-amber-400/70 mb-0.5 truncate">Value Investing Analysis</p>
                                             <p className="text-sm sm:text-lg font-black text-amber-100 truncate">Benjamin Graham <span className="text-amber-400">Perspective</span></p>
                                             <p className="text-[9px] sm:text-[11px] text-amber-300/60 font-semibold mt-0.5 truncate">Based on &quot;The Intelligent Investor&quot;</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                          {isGrahamLoading
                                             ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-400" />
                                             : <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform duration-300 group-hover:translate-x-1 ${showGrahamPanel ? 'rotate-90' : ''}`} />
                                          }
                                       </div>
                                    </button>

                                    {/* Graham Analysis Panel */}
                                    <AnimatePresence>
                                       {showGrahamPanel && (
                                          <motion.div
                                             initial={{ opacity: 0, height: 0 }}
                                             animate={{ opacity: 1, height: 'auto' }}
                                             exit={{ opacity: 0, height: 0 }}
                                             transition={{ duration: 0.4 }}
                                             className="overflow-hidden"
                                          >
                                             {isGrahamLoading ? (
                                                <div className="mt-4 flex flex-col items-center justify-center gap-4 py-16 bg-amber-950/30 rounded-[20px] border border-amber-900/40">
                                                   <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                                                   <p className="text-sm font-black text-amber-400 uppercase tracking-widest animate-pulse">Consulting The Intelligent Investor...</p>
                                                </div>
                                             ) : grahamData ? (
                                                <div className="mt-4 bg-gradient-to-br from-amber-950/20 to-stone-900/10 border border-amber-900/30 rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 space-y-4 sm:space-y-6">
                                                   {/* Header */}
                                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-5 border-b border-amber-900/30 gap-3">
                                                      <div className="flex items-center gap-2 sm:gap-3">
                                                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-700/30 flex items-center justify-center shrink-0">
                                                            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                                                         </div>
                                                         <div>
                                                            <h3 className="text-sm sm:text-lg font-black text-stone-800 dark:text-white">Graham&apos;s Verdict</h3>
                                                            <p className="text-[9px] sm:text-[11px] text-stone-500 dark:text-zinc-500 font-bold uppercase tracking-wider">{grahamData.source}</p>
                                                         </div>
                                                      </div>
                                                      <div className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest w-fit
                                                      ${grahamData.graham_verdict === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                                                            grahamData.graham_verdict === 'AVOID' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                                                               'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}
                                                   `}>
                                                         {grahamData.graham_verdict === 'AVOID' ? 'â›” AVOID' : grahamData.graham_verdict === 'BUY' ? 'âœ… BUY' : 'â¸ HOLD'}
                                                      </div>
                                                   </div>

                                                   {/* Quote */}
                                                   <blockquote className="relative pl-6 border-l-4 border-amber-400 italic text-stone-700 dark:text-zinc-300 text-[13px] sm:text-[15px] font-semibold leading-relaxed">
                                                      <span className="absolute -left-3 -top-2 text-4xl sm:text-5xl text-amber-300/50 font-serif leading-none">&ldquo;</span>
                                                      {grahamData.graham_quote}
                                                   </blockquote>

                                                   {/* Key Principle */}
                                                   <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-[16px] p-4 flex items-center gap-3">
                                                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                      <div>
                                                         <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Key Principle Applied</p>
                                                         <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{grahamData.key_principle_applied}</p>
                                                      </div>
                                                   </div>

                                                   {/* Analysis Grid */}
                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      {[
                                                         { label: 'Margin of Safety', value: grahamData.margin_of_safety, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900' },
                                                         { label: 'Intrinsic Value', value: grahamData.intrinsic_value_note, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900' },
                                                         { label: 'For Defensive Investor', value: grahamData.defensive_investor, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900' },
                                                         { label: 'For Enterprising Investor', value: grahamData.enterprising_investor, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900' },
                                                      ].map((item, i) => (
                                                         <div key={i} className={`rounded-[16px] border p-4 sm:p-5 ${item.color.split(' ').slice(1).join(' ')}`}>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${item.color.split(' ')[0]}`}>{item.label}</p>
                                                            <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300 leading-relaxed">{item.value}</p>
                                                         </div>
                                                      ))}
                                                   </div>

                                                   {/* Graham Number */}
                                                   <div className="bg-stone-100 dark:bg-white/5/50 border border-stone-200 dark:border-zinc-700 rounded-[16px] p-5">
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-zinc-500 mb-2">Graham Number &amp; Valuation</p>
                                                      <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300 leading-relaxed">{grahamData.graham_number_note}</p>
                                                   </div>

                                                   {/* Final Advice */}
                                                   <div className="bg-gradient-to-r from-amber-900/10 to-stone-800/5 dark:from-amber-900/20 dark:to-zinc-900/20 border border-amber-800/20 dark:border-amber-900 rounded-[20px] p-6">
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-3">Graham&apos;s Final Advice</p>
                                                      <p className="text-[15px] font-semibold text-stone-800 dark:text-white leading-relaxed">{grahamData.final_advice}</p>
                                                   </div>

                                                   {/* Footer */}
                                                   <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-zinc-600 font-bold pt-2 border-t border-stone-200 dark:border-white/8">
                                                      <BookOpen className="w-4 h-4" />
                                                      Source: {grahamData.source} &middot; {grahamData.rag_used ? 'ðŸ“š Knowledge Base Retrieved' : 'ðŸ¤– AI Generated'}
                                                   </div>
                                                </div>
                                             ) : null}
                                          </motion.div>
                                       )}
                                    </AnimatePresence>
                                 </motion.div>

                                 {/* â”€â”€ Robert Kiyosaki Button "” NEXT â”€â”€ */}
                                 <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                 >
                                    <button
                                       id="kiyosaki-analysis-btn"
                                       onClick={() => showKiyosakiPanel ? setShowKiyosakiPanel(false) : fetchKiyosakiAnalysis()}
                                       className={`group relative w-full flex items-center justify-between px-4 py-3 sm:px-8 sm:py-5 rounded-[14px] sm:rounded-[20px] border-2 transition-all duration-300 overflow-hidden
                                       ${showKiyosakiPanel
                                             ? 'bg-blue-950 border-blue-800'
                                             : 'bg-gradient-to-r from-blue-950 to-indigo-950 border-blue-800/60 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-900/30'
                                          }`}
                                    >
                                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-700/40 border border-blue-600/30 flex items-center justify-center shadow-inner shrink-0 relative">
                                             <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-blue-300" />
                                             {unlockedTabs.includes('kiyosaki-analysis') ? (
                                                <Unlock className="w-3 h-3 text-emerald-400 absolute -bottom-1 -right-1" />
                                             ) : (
                                                <Lock className="w-3 h-3 text-blue-400/80 absolute -bottom-1 -right-1" />
                                             )}
                                          </div>
                                          <div className="text-left min-w-0">
                                             <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-blue-400/70 mb-0.5 truncate">Finance IQ & Cashflow</p>
                                             <p className="text-sm sm:text-lg font-black text-blue-100 truncate">Robert Kiyosaki <span className="text-blue-400">Perspective</span></p>
                                             <p className="text-[9px] sm:text-[11px] text-blue-300/60 font-semibold mt-0.5 truncate">Based on &quot;Rich Dad Poor Dad&quot;</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                          {isKiyosakiLoading
                                             ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-400" />
                                             : <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-blue-400 transition-transform duration-300 group-hover:translate-x-1 ${showKiyosakiPanel ? 'rotate-90' : ''}`} />
                                          }
                                       </div>
                                    </button>

                                    {/* Kiyosaki Analysis Panel */}
                                    <AnimatePresence>
                                       {showKiyosakiPanel && (
                                          <motion.div
                                             initial={{ opacity: 0, height: 0 }}
                                             animate={{ opacity: 1, height: 'auto' }}
                                             exit={{ opacity: 0, height: 0 }}
                                             transition={{ duration: 0.4 }}
                                             className="overflow-hidden"
                                          >
                                             {isKiyosakiLoading ? (
                                                <div className="mt-4 flex flex-col items-center justify-center gap-4 py-16 bg-blue-950/30 rounded-[20px] border border-blue-900/40">
                                                   <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                                   <p className="text-sm font-black text-blue-400 uppercase tracking-widest animate-pulse">Building Financial IQ with Rich Dad...</p>
                                                </div>
                                             ) : kiyosakiData ? (
                                                <div className="mt-4 bg-gradient-to-br from-blue-950/20 to-indigo-900/10 border border-blue-900/30 rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 space-y-4 sm:space-y-6">
                                                   {/* Header */}
                                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-5 border-b border-blue-900/30 gap-3">
                                                      <div className="flex items-center gap-2 sm:gap-3">
                                                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-700/30 flex items-center justify-center shrink-0">
                                                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                                         </div>
                                                         <div>
                                                            <h3 className="text-sm sm:text-lg font-black text-stone-800 dark:text-white">Rich Dad&apos;s Verdict</h3>
                                                            <p className="text-[9px] sm:text-[11px] text-stone-500 dark:text-zinc-500 font-bold uppercase tracking-wider">{kiyosakiData.source}</p>
                                                         </div>
                                                      </div>
                                                      <div className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest w-fit
                                                      ${kiyosakiData.kiyosaki_verdict === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                                                            kiyosakiData.kiyosaki_verdict === 'AVOID' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                                                               'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}
                                                   `}>
                                                         {kiyosakiData.kiyosaki_verdict === 'AVOID' ? 'â›” AVOID' : kiyosakiData.kiyosaki_verdict === 'BUY' ? 'âœ… BUY' : 'â¸ HOLD'}
                                                      </div>
                                                   </div>

                                                   {/* Quote */}
                                                   <blockquote className="relative pl-6 border-l-4 border-blue-400 italic text-stone-700 dark:text-zinc-300 text-[13px] sm:text-[15px] font-semibold leading-relaxed">
                                                      <span className="absolute -left-3 -top-2 text-4xl sm:text-5xl text-blue-300/50 font-serif leading-none">&ldquo;</span>
                                                      {kiyosakiData.kiyosaki_quote}
                                                   </blockquote>

                                                   {/* Key Perspective */}
                                                   <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-[16px] p-4 flex items-center gap-3">
                                                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                      <div>
                                                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Financial Literacy Tip</p>
                                                         <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{kiyosakiData.financial_literacy_tip}</p>
                                                      </div>
                                                   </div>

                                                   {/* Analysis Grid */}
                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      {[
                                                         { label: 'Cashflow Perspective', value: kiyosakiData.cashflow_perspective, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900' },
                                                         { label: 'Asset vs Liability', value: kiyosakiData.asset_vs_liability, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900' },
                                                         { label: 'Risk Assessment', value: kiyosakiData.risk_assessment, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900' },
                                                         { label: 'Rich Dad Advice', value: kiyosakiData.rich_dad_advice, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900' },
                                                      ].map((item, i) => (
                                                         <div key={i} className={`rounded-[16px] border p-5 ${item.color.split(' ').slice(1).join(' ')}`}>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${item.color.split(' ')[0]}`}>{item.label}</p>
                                                            <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300 leading-relaxed">{item.value}</p>
                                                         </div>
                                                      ))}
                                                   </div>

                                                   {/* Final Summary */}
                                                   <div className="bg-gradient-to-r from-blue-900/10 to-indigo-800/5 dark:from-blue-900/20 dark:to-zinc-900/20 border border-blue-800/20 dark:border-blue-900 rounded-[20px] p-6">
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-3">Wealth Building Summary</p>
                                                      <p className="text-[15px] font-semibold text-stone-800 dark:text-white leading-relaxed">{kiyosakiData.final_summary}</p>
                                                   </div>

                                                   {/* Footer */}
                                                   <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-zinc-600 font-bold pt-2 border-t border-blue-200 dark:border-white/8">
                                                      <Activity className="w-4 h-4" />
                                                      Source: {kiyosakiData.source} &middot; {kiyosakiData.rag_used ? 'ðŸ“š Knowledge Base Retrieved' : 'ðŸ¤– AI Generated'}
                                                   </div>
                                                </div>
                                             ) : null}
                                          </motion.div>
                                       )}
                                    </AnimatePresence>
                                 </motion.div>

                                 {/* Analyst Estimates Block */}
                                 {tabData['Research and recommendation']?.research?.analyst_estimates && (
                                    <motion.div
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="bg-white dark:bg-[#1E2438] border-2 border-[#5154ff]/5 dark:border-white/8 rounded-[20px] sm:rounded-[32px] p-4 sm:p-8 shadow-sm"
                                    >
                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-white/8 gap-2">
                                          <h3 className="text-sm sm:text-xl font-black text-[#111] dark:text-white flex items-center gap-2 sm:gap-3">
                                             Analyst Estimates & Target Price
                                          </h3>
                                          <div className="flex items-center gap-2 px-2 py-0.5 sm:px-3 sm:py-1 bg-black/5 dark:bg-white/5 rounded-lg text-[8px] sm:text-[10px] font-bold text-[#555] dark:text-zinc-500 uppercase tracking-wider w-fit">
                                             <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Live Analysis <span className="bg-[#5154ff] text-white px-1 py-0.5 sm:px-1.5 rounded-[4px] ml-1">+4</span>
                                          </div>
                                       </div>
                                       <ul className="space-y-3 sm:space-y-4">
                                          {[
                                             { label: 'Average Target Price', value: tabData['Research and recommendation'].research.analyst_estimates.average_target_price },
                                             { label: 'High Estimate', value: tabData['Research and recommendation'].research.analyst_estimates.high_estimate },
                                             { label: 'Low Estimate', value: tabData['Research and recommendation'].research.analyst_estimates.low_estimate },
                                             { label: 'Analyst Sentiment', value: tabData['Research and recommendation'].research.analyst_estimates.analyst_sentiment },
                                             { label: 'Context', value: tabData['Research and recommendation'].research.analyst_estimates.context }
                                          ].map((item, idx) => (
                                             <li key={idx} className="text-[12px] sm:text-[16px] text-[#333] dark:text-zinc-300 leading-relaxed relative pl-5 sm:pl-6 before:content-[''] before:absolute before:left-0 before:top-[8px] sm:before:top-[10px] before:w-1.5 before:h-1.5 before:bg-[#111] dark:before:bg-white before:rounded-full">
                                                <span className="font-bold text-[#111] dark:text-white">{item.label}:</span> {item.value}
                                             </li>
                                          ))}
                                       </ul>
                                    </motion.div>
                                 )}

                                 {/* Advisory Report "” shows if Advisory tab was visited */}
                                 {tabData['Advisory']?.advisory?.report && (
                                    <motion.div
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="bg-white dark:bg-[#1E2438] border-2 border-[#5154ff]/5 dark:border-white/8 rounded-[20px] sm:rounded-[32px] p-4 sm:p-8 shadow-sm"
                                    >
                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-gray-100 dark:border-white/8 gap-3">
                                          <div>
                                             <h3 className="text-base sm:text-2xl font-black text-[#111] dark:text-white flex items-center gap-2 sm:gap-3">
                                                Detailed Stock Analysis <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-[#5154ff]" />
                                             </h3>
                                             <p className="text-[9px] sm:text-[12px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-1">AI-Powered Research &amp; Recommendation for {selectedStock?.name}</p>
                                          </div>
                                          <div className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest w-fit
                                           ${tabData['Advisory'].advisory.verdict === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}
                                       `}>
                                             Signal: {tabData['Advisory'].advisory.verdict}
                                          </div>
                                       </div>
                                       <div className="prose prose-slate dark:prose-invert max-w-none">
                                          <ReactMarkdown components={{
                                             p: ({ node, ...props }) => <p className="text-[13px] sm:text-[16px] text-[#333] dark:text-zinc-300 font-semibold mb-3 sm:mb-4 leading-relaxed" {...props} />,
                                             li: ({ node, ...props }) => <li className="text-[13px] sm:text-[16px] font-bold text-[#111] dark:text-white mb-2 sm:mb-3 list-none pl-6 sm:pl-8 relative before:content-[''] before:absolute before:left-0 before:top-[10px] sm:before:top-[12px] before:w-2 before:h-2 sm:before:w-2.5 sm:before:h-2.5 before:bg-[#5154ff] before:rounded-full before:opacity-20" {...props} />
                                          }}>
                                             {tabData['Advisory'].advisory.report}
                                          </ReactMarkdown>
                                       </div>
                                    </motion.div>
                                 )}

                              </div>
                           )}
                        </div>
                     )}
                  </div>


               </motion.div>

               <AnimatePresence>
                  {fullScreenChart && (
                     <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed inset-0 z-[2000] bg-[#fdfaf5] dark:bg-[#161B2E] flex flex-col"
                     >
                        <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2E] border-b border-gray-100 dark:border-white/8 shadow-sm shrink-0">
                           <h2 className="text-sm sm:text-xl font-black text-[#111] dark:text-white flex items-center gap-2 sm:gap-3 min-w-0">
                              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#5154ff] animate-pulse shrink-0" />
                              <span className="truncate">{selectedStock?.symbol} - {selectedStock?.name}</span>
                              <span className="text-[9px] sm:text-[12px] text-[#5154ff] font-black uppercase tracking-widest bg-[#5154ff]/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[#5154ff]/20 ml-1 sm:ml-4 shadow-inner whitespace-nowrap shrink-0 hidden xs:inline">
                                 {fullScreenChart === 'realtime' ? 'Realtime Pro View' : 'Historical Pro View'}
                              </span>
                           </h2>
                           <button onClick={() => setFullScreenChart(null)} className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-rose-500 hover:text-white text-gray-500 dark:text-zinc-400 transition-all shadow-sm active:scale-95 shrink-0">
                              <X className="w-5 h-5 sm:w-6 sm:h-6" />
                           </button>
                        </div>
                        <div className="flex-1 bg-white dark:bg-[#161B2E] relative p-2 sm:p-6">
                           <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-inner border border-black/5 dark:border-white/5 relative">
                              <TradingViewWidget
                                 symbol={selectedStock?.symbol}
                                 interval={fullScreenChart === 'realtime' ? chartInterval : 'D'}
                                 containerId={`tv_chart_fullscreen_${fullScreenChart}`}
                                 isDarkMode={isDarkMode}
                              />
                           </div>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>

            </div>
         )}
      </AnimatePresence>,
      document.body
   );
};

export default CashFlowStockModal;
